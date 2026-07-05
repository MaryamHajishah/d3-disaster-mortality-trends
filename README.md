# The Quiet Victory

A data-driven scrollytelling website on a century of natural disasters, built
with D3.js and EM-DAT data.

**Course**: Data Visualization

**Team**: Maryam Hajishah: data collection, preprocessing, visualization and design


---

## Project overview

Recorded natural disasters have multiplied more than fortyfold since 1900,
and it is easy to assume the danger grew with it. The data shows the
opposite: the chance of dying in a disaster fell by over 90 percent. The
site walks through why that happened (mostly the end of drought famines)
and ends on the one number moving the wrong way, deaths from extreme heat.

The story unfolds in three chapters over six scroll steps, with one chart
per step: stacked bars of recorded events, the falling death-rate line,
deaths by disaster type (twice, the second time with the drought layer
highlighted), a rising extreme-temperature line, and a choropleth map with
a decade toggle.

## Data sources

- EM-DAT, the international disaster database maintained by CRED at
  UCLouvain (https://www.emdat.be/)
- Retrieved as CSV plus metadata through the
  [Our World in Data API](https://ourworldindata.org/natural-disasters)
  (`ourworldindata.org/grapher/<slug>.csv`)
- ISO 3166 crosswalk for joining country codes to the map:
  [lukes/ISO-3166-Countries-with-Regional-Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes)
- World basemap: [world-atlas](https://github.com/topojson/world-atlas)
  `countries-110m.json`, loaded at runtime from jsDelivr

Per-dataset citations, taken from OWID's own metadata, are rendered in the
site's methodology section from `data/sources.json`.

## Project structure

```
natural-disasters-story/
├── index.html                       # main entry point
├── css/
│   ├── main.css                     # design tokens, layout, header, hero, footer
│   ├── typography.css               # font choices, type scale, text styles
│   ├── charts.css                   # axes, gridlines and tooltip styling
│   ├── scrollytelling.css           # scroll narrative layout and chapter rail
│   └── responsive.css               # small-screen and touch adjustments
├── js/
│   ├── main.js                      # wires data, charts and scroll narrative together
│   ├── modules/
│   │   ├── dataLoader.js            # JSON fetching with a small cache
│   │   ├── storyScroller.js         # scroll-position step tracking
│   │   ├── tooltip.js               # shared tooltip component
│   │   └── nav.js                   # header behavior
│   └── charts/
│       ├── index.js                 # chart exports
│       ├── baseChart.js             # shared mounting, sizing and color scales
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

The site has no backend. The charts fetch the JSON files in `data/` directly.
Those files are generated only by the preprocessing notebook; nothing in
`data/` is edited by hand.

## Running the preprocessing

The raw CSVs are already in `preprocessing/raw/`, so the notebook runs
offline:

```bash
cd preprocessing
pip install -r requirements.txt
jupyter notebook data_preprocessing.ipynb   # then Run All
```

Or without opening the browser UI:

```bash
jupyter execute data_preprocessing.ipynb
```

Either way regenerates the five files in `data/`. The notebook ends with
sanity checks that fail loudly if a re-run produces broken output.

To fetch fresh raw data (for example after an EM-DAT update):

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

Plain HTML, CSS and JavaScript with D3 from a CDN. No build step. The page
fetches local JSON, so it needs an HTTP server rather than a `file://` path:

```bash
python -m http.server 8000
# open http://localhost:8000
```

Any other static server works too.

## Deploying to GitHub Pages

Push the folder to a public repo and enable Pages on the main branch, root
directory. The site is already static, so there is nothing to build.

## Tech stack

- HTML, CSS and vanilla JavaScript (ES modules)
- [D3.js v7](https://d3js.org/) for the charts, with a small scroll
  controller for the narrative (`js/modules/storyScroller.js`)
- Python, pandas and Jupyter for preprocessing

## Known limitations

The methodology section on the site has the full list. In short: EM-DAT's
coverage improved a lot after the 1980s, so early decades undercount smaller
events and the rise in disaster *counts* partly reflects better reporting.
The 2020s are incomplete (2020 to 2025) and are flagged as partial wherever
they appear. Historical famine death tolls are rough estimates. The central
claim, the collapse in death rates, is large enough that none of these
caveats threaten it.
