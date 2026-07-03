"""
Turns the raw EM-DAT CSVs (downloaded from Our World in Data, see the README
for the exact URLs) into the small JSON files the charts load.

Run from the repo root:

    python preprocessing/clean_data.py

Reads  preprocessing/raw/*.csv
Writes data/*.json (one file per chart, plus sources.json for the citations)

The raw CSVs are committed to the repo on purpose: the pipeline should run
offline and give the same output every time.
"""

import json
from pathlib import Path

import pandas as pd

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent.parent / "data"
OUT.mkdir(exist_ok=True)

# The decade containing this year is incomplete, and every output flags it
# so the charts can label it "partial" instead of letting it look like a drop.
CURRENT_YEAR = 2026

TYPE_COLUMNS = [
    "Droughts", "Earthquakes", "Volcanoes", "Floods", "Landslides",
    "Storms", "Wildfires", "Extreme temperatures",
]


def decade_of(year: int) -> int:
    return (year // 10) * 10


def is_partial_decade(decade: int) -> bool:
    return decade_of(CURRENT_YEAR) == decade


def load(name: str) -> pd.DataFrame:
    return pd.read_csv(RAW / f"{name}.csv")


def load_metadata(name: str) -> dict:
    with open(RAW / f"{name}.metadata.json", encoding="utf-8") as f:
        return json.load(f)


def write_json(name: str, payload) -> None:
    with open(OUT / name, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  wrote data/{name}")


def build_events_by_decade():
    """Recorded disaster events per decade, by type (step 1)."""
    df = load("number-of-natural-disaster-events")
    # The source ships two derived "excluding X" series. They repeat the same
    # events minus one category, so a stacked chart would double count them.
    df = df[~df["Entity"].str.startswith("All disasters excluding")]
    df["Decade"] = df["Year"].apply(decade_of)

    grouped = df.groupby(["Decade", "Entity"], as_index=False)["Disasters"].sum()
    decades = sorted(grouped["Decade"].unique().tolist())

    series = {}
    for entity in grouped["Entity"].unique():
        sub = grouped[grouped["Entity"] == entity].set_index("Decade")["Disasters"]
        series[entity] = [int(sub.get(d, 0)) for d in decades]

    write_json("events_by_decade.json", {
        "decades": decades,
        "partial_decade": decades[-1] if is_partial_decade(decades[-1]) else None,
        "series": series,
    })


def build_death_rate_world():
    """World death rate per 100,000 people, decade averages (step 2)."""
    df = load("decadal-average-death-rates-from-natural-disasters")
    world = df[df["Entity"] == "World"].sort_values("Year")

    decades = world["Year"].tolist()
    write_json("death_rate_world.json", {
        "decades": decades,
        "partial_decade": decades[-1] if is_partial_decade(decades[-1]) else None,
        "by_type": {col: world[col].round(4).tolist() for col in TYPE_COLUMNS},
        "total": world["All disasters"].round(4).tolist(),
    })


def build_deaths_by_type_decade():
    """Absolute deaths per decade by disaster type (steps 3, 4 and 5)."""
    df = load("natural-disasters-deaths")
    world = df[df["Entity"] == "World"].copy()
    world["Decade"] = world["Year"].apply(decade_of)

    grouped = world.groupby("Decade")[TYPE_COLUMNS].sum(min_count=1)
    decades = grouped.index.tolist()

    write_json("deaths_by_type_decade.json", {
        "decades": decades,
        "partial_decade": decades[-1] if is_partial_decade(decades[-1]) else None,
        "by_type": {
            col: [int(v) if pd.notna(v) else 0 for v in grouped[col]]
            for col in TYPE_COLUMNS
        },
    })


def build_country_death_rate_map():
    """Per-country decade-average death rates, keyed by numeric ISO id (step 6).

    The world-atlas topojson identifies countries by ISO 3166 numeric code,
    while the source data carries alpha-3 codes, so this joins through a
    published crosswalk. Aggregate rows (World, continents, income groups)
    have OWID_* pseudo-codes and are dropped here; they are covered by the
    world-level charts instead.
    """
    df = load("decadal-average-death-rates-from-natural-disasters")
    lookup = pd.read_csv(RAW / "iso3166_lookup.csv", dtype=str)
    lookup["country-code"] = lookup["country-code"].str.zfill(3)

    countries = df[~df["Code"].isna() & ~df["Code"].str.startswith("OWID_")].copy()

    merged = countries.merge(
        lookup[["alpha-3", "country-code"]],
        left_on="Code", right_on="alpha-3", how="inner",
    )

    decades = sorted(merged["Year"].unique().tolist())
    countries_out = {}
    for _, row in merged.iterrows():
        entry = countries_out.setdefault(row["country-code"], {
            "name": row["Entity"], "iso3": row["Code"], "rates": {},
        })
        rate = row["All disasters"]
        entry["rates"][str(int(row["Year"]))] = None if pd.isna(rate) else round(float(rate), 4)

    dropped = countries["Entity"].nunique() - len(countries_out)
    write_json("country_death_rate_map.json", {
        "decades": decades,
        "partial_decade": decades[-1] if is_partial_decade(decades[-1]) else None,
        "countries": countries_out,
    })
    if dropped:
        print(f"  note: {dropped} entities had no ISO 3166 match and were left off the map")


def build_source_metadata():
    """Citations and caveats, copied from the OWID metadata files so the
    methodology section always matches what was actually downloaded."""
    files = [
        "natural-disasters-deaths",
        "number-of-natural-disaster-events",
        "decadal-average-death-rates-from-natural-disasters",
    ]
    sources = []
    for name in files:
        chart = load_metadata(name).get("chart", {})
        sources.append({
            "dataset": name,
            "title": chart.get("title"),
            "note": chart.get("note"),
            "citation": chart.get("citation"),
            "url": chart.get("originalChartUrl"),
            "date_downloaded": load_metadata(name).get("dateDownloaded"),
        })
    write_json("sources.json", sources)


def main():
    print("Cleaning the EM-DAT CSVs...")
    build_events_by_decade()
    build_death_rate_world()
    build_deaths_by_type_decade()
    build_country_death_rate_map()
    build_source_metadata()
    print("Done.")


if __name__ == "__main__":
    main()
