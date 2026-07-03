# The Quiet Victory

A data-driven storytelling website built for a university visualization
course. It uses EM-DAT disaster records to tell one story: recorded natural
disasters have multiplied more than fortyfold since 1900, yet the chance of
dying in one fell by over 90 percent. The site walks through why that
happened (mostly the end of drought famines) and ends on the one number
moving the wrong way, deaths from extreme heat.

**Live site:** add the GitHub Pages URL here after deploying

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

## Folder structure

```
natural-disasters-story/
├── index.html              # the whole site; structure only, no data or logic
├── css/                    # one stylesheet per concern
├── js/
│   ├── main.js             # wires data, charts and the scroll narrative together
│   ├── modules/            # data loading, tooltip, scroll controller, header
│   └── charts/             # one D3 render function per chart
├── data/                   # cleaned JSON the charts fetch (pipeline output)
├── preprocessing/
│   ├── raw/                # raw CSVs from OWID, committed for reproducibility
│   ├── clean_data.py       # pandas pipeline: raw/*.csv to ../data/*.json
│   └── requirements.txt
└── assets/images/
```

The site has no backend. The charts fetch the JSON files in `data/` directly.
Those files are generated only by `preprocessing/clean_data.py`; nothing in
`data/` is edited by hand.

## Reproducing the data

The raw CSVs are already in `preprocessing/raw/`, so the pipeline runs
offline. To fetch fresh copies (for example after an EM-DAT update):

```bash
for slug in natural-disasters-deaths number-of-natural-disaster-events \
            decadal-average-death-rates-from-natural-disasters; do
  curl -sL "https://ourworldindata.org/grapher/$slug.csv?csvType=full" -o "preprocessing/raw/$slug.csv"
  curl -sL "https://ourworldindata.org/grapher/$slug.metadata.json?csvType=full" -o "preprocessing/raw/$slug.metadata.json"
done
curl -s "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv" \
  -o preprocessing/raw/iso3166_lookup.csv
```

Then run the pipeline:

```bash
cd preprocessing
pip install -r requirements.txt
python clean_data.py
```

This regenerates the five files in `data/`. Each builder function in the
script says which chart its output feeds.

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
- [D3.js v7](https://d3js.org/) for the charts, with a small
  IntersectionObserver controller for the scroll narrative
  (`js/modules/storyScroller.js`)
- Python and pandas for preprocessing

## Known limitations

The methodology section on the site has the full list. In short: EM-DAT's
coverage improved a lot after the 1980s, so early decades undercount smaller
events and the rise in disaster *counts* partly reflects better reporting.
The 2020s are incomplete (2020 to 2025) and are flagged as partial wherever
they appear. Historical famine death tolls are rough estimates. The central
claim, the collapse in death rates, is large enough that none of these
caveats threaten it.
