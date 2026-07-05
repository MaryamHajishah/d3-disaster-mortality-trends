# The Quiet Victory

A data-driven scrollytelling website about a century of natural disasters, built with D3.js on EM-DAT data.

**Course**: Data Visualization, University of Genova (2025/2026)
**Team**: Maryam Hajishah (data collection, preprocessing, visualization, and design)
**Live site**: https://maryamhajishah.github.io/d3-disaster-mortality-trends/
**Repository**: https://github.com/MaryamHajishah/d3-disaster-mortality-trends

---

## What the story argues

The number of recorded natural disasters has grown about 46 times over since the 1900s, so it is easy to assume the danger grew with it. It did not. Your odds of dying in a disaster dropped by 93 percent over the same period. The site explains where that drop came from (mostly the end of large drought famines) and closes on the one figure heading the wrong way: deaths from extreme heat and cold, already 2.4 times the whole 2010s total in the first years of the 2020s.

The narrative runs across three chapters and six scroll steps, one chart per step:

1. Stacked bars of recorded events per decade
2. The falling global death rate
3. Deaths by disaster type
4. The same chart again, with the drought layer highlighted
5. A rising line for extreme-temperature deaths
6. A country choropleth with a decade toggle

## Data sources

- **EM-DAT**, the international disaster database maintained by CRED at UCLouvain (https://www.emdat.be/)
- Retrieved as CSV plus metadata through the [Our World in Data API](https://ourworldindata.org/natural-disasters) (`ourworldindata.org/grapher/<slug>.csv`)
- ISO 3166 crosswalk for joining country codes to the map: [lukes/ISO-3166-Countries-with-Regional-Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes)
- World basemap: [world-atlas](https://github.com/topojson/world-atlas) `countries-110m.json`, loaded at runtime from jsDelivr

Per-dataset citations come from OWID's own metadata and are rendered in the site's methodology section from `data/sources.json`.

## Methodology in brief

The full methodology lives on the site. The short version:

- **Cleaning.** For the country map, the notebook drops OWID aggregate rows (World, continents, income groups, identified by their `OWID_*` codes) and joins the remaining country codes to the map's ISO 3166 numeric codes through a published crosswalk. One entity has no ISO match and is left off the map. The events chart also drops the redundant "All disasters excluding…" series so a stacked bar never double-counts the same events.
- **Imputation.** The main judgment call is telling a recorded zero apart from an unrecorded gap. EM-DAT's annual file only has a row when an event was recorded, so a country-decade (or disaster type) with no records is written as `null`, "no data", rather than 0. About 1,368 country-decade cells that showed 0 with no coverage were flipped to `null` this way, and extreme-temperature deaths stay `null` in the earliest decades for the same reason.
- **Processing.** Annual event and death counts are summed into decades. The death rate (deaths per 100,000 people) already comes decade-averaged from OWID and is extracted directly. Deaths are grouped into eight disaster types, and per-country rates are keyed by ISO numeric code for the map.
- **Uncertainty.** The current decade is incomplete (2020 to 2025) and flagged as partial in every output file, so the charts can label it rather than let it read as a sudden drop. The notebook ends with assertions that fail the run if, for example, the death rate stops falling or a known-empty early decade comes back non-null.

## Project structure

```
d3-disaster-mortality-trends/
├── index.html                       # main entry point
├── css/
│   ├── main.css                     # design tokens, layout, header, hero, footer
│   ├── typography.css               # font choices, type scale, text styles
│   ├── charts.css                   # axes, gridlines, and tooltip styling
│   ├── scrollytelling.css           # scroll narrative layout and chapter rail
│   └── responsive.css               # small-screen and touch adjustments
├── js/
│   ├── main.js                      # wires data, charts, and the scroll narrative together
│   ├── modules/
│   │   ├── dataLoader.js            # JSON fetching with a small cache
│   │   ├── storyScroller.js         # scroll-position step tracking
│   │   ├── tooltip.js               # shared tooltip component
│   │   └── nav.js                   # header behavior
│   └── charts/
│       ├── index.js                 # chart exports
│       ├── baseChart.js             # shared mounting, sizing, and color scales
│       ├── eventsChart.js           # step 1: recorded events per decade
│       ├── deathRateChart.js        # step 2: the falling death rate
│       ├── deathsByTypeChart.js     # steps 3 and 4: deaths stacked by type
│       ├── heatChart.js             # step 5: extreme-temperature deaths
│       └── disasterMap.js           # step 6: choropleth with decade toggle
├── data/
│   ├── events_by_decade.json        # recorded events per decade, by type
│   ├── death_rate_world.json        # world death rate per 100,000, by decade
│   ├── deaths_by_type_decade.json   # absolute deaths per decade, by type
│   ├── country_death_rate_map.json  # per-country decade rates, keyed by ISO code
│   └── sources.json                 # citations shown in the methodology section
├── preprocessing/
│   ├── data_preprocessing.ipynb     # pandas pipeline: raw/*.csv to ../data/*.json
│   ├── raw/                         # raw CSVs from OWID, committed for reproducibility
│   └── requirements.txt
├── assets/
│   └── images/                      # favicon
└── README.md
```

The site has no backend. The charts fetch the JSON files in `data/` directly. Those files are generated only by the preprocessing notebook; nothing in `data/` is edited by hand.

## Running the preprocessing

The raw CSVs are already in `preprocessing/raw/`, so the notebook runs offline:

```bash
cd preprocessing
pip install -r requirements.txt
jupyter notebook data_preprocessing.ipynb   # then Run All
```

Or without opening the browser UI:

```bash
jupyter execute data_preprocessing.ipynb
```

Either path regenerates the five files in `data/`. The notebook ends with sanity checks that fail loudly if a re-run produces broken output.

To pull fresh raw data (for example after an EM-DAT update):

```bash
for slug in natural-disasters-deaths number-of-natural-disaster-events \
            decadal-average-death-rates-from-natural-disasters; do
  curl -sL "https://ourworldindata.org/grapher/$slug.csv?csvType=full" -o "preprocessing/raw/$slug.csv"
  curl -sL "https://ourworldindata.org/grapher/$slug.metadata.json?csvType=full" -o "preprocessing/raw/$slug.metadata.json"
done
curl -s "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv" \
  -o preprocessing/raw/iso3166_lookup.csv
```

## Running the site locally

Plain HTML, CSS, and JavaScript, with D3 from a CDN. There is no build step. The page fetches local JSON, so it needs an HTTP server rather than a `file://` path:

```bash
python -m http.server 8000
# open http://localhost:8000
```

Any other static server works too.

## Deploying to GitHub Pages

Push the folder to a public repo and enable Pages on the `master` branch, root directory. The site is already static, so there is nothing to build.

## Tech stack

- HTML, CSS, and vanilla JavaScript (ES modules)
- [D3.js v7](https://d3js.org/) for the charts, with a small scroll controller for the narrative (`js/modules/storyScroller.js`)
- Python, pandas, and Jupyter for preprocessing

## Limitations

The methodology section on the site has the full list. In short: EM-DAT's coverage improved a great deal after the 1980s, so early decades undercount smaller events, and part of the rise in disaster *counts* reflects better reporting rather than more disasters. The 2020s are incomplete (2020 to 2025) and flagged as partial wherever they appear. Historical famine death tolls are rough estimates. None of this threatens the central claim, because the collapse in death rates is far too large to be an artifact of reporting.
