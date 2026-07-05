// Step 6: choropleth of decade-average death rates by country, with a
// decade slider, play-through animation, and a click-to-open side panel
// comparing one country against the world average.
//
// Colors use discrete threshold bins rather than a continuous scale: the
// data spans 0.01 to about 2,500 deaths per 100,000, so any continuous
// ramp leaves 95 percent of countries nearly white. Bin edges follow the
// observed distribution (median 0.2, p90 about 4.5, p95 about 15).

import { size, observeResize, formatDecade } from './baseChart.js';

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DRY_SCALE = ['#efe6c8', '#e3d3a3', '#c2954b', '#a05c3b', '#5e3023'];
const NO_DATA_FILL = '#dedad0';

const BIN_EDGES = [0.1, 0.5, 2, 10, 50];
const BIN_LABELS = ['under 0.1', '0.1 to 0.5', '0.5 to 2', '2 to 10', '10 to 50', '50 and above'];
const ramp = d3.interpolateRgbBasis(DRY_SCALE);
const BIN_COLORS = [0.06, 0.24, 0.44, 0.64, 0.84, 1].map((t) => d3.color(ramp(t)).formatHex());

// feeds the shared legend strip in main.js
export function mapLegendBins() {
    return [
        ...BIN_LABELS.map((label, i) => ({ label, color: BIN_COLORS[i] })),
        { label: 'no data', color: NO_DATA_FILL },
    ];
}

export async function renderDisasterMap(container, mapData, tooltip, options = {}) {
    const worldSeries = options.world ?? null;
    const decades = mapData.decades;

    const world = await fetch(WORLD_ATLAS_URL).then((r) => r.json());
    const features = topojson.feature(world, world.objects.countries).features;

    const binColor = d3.scaleThreshold().domain(BIN_EDGES).range(BIN_COLORS);

    let currentDecade = decades[decades.length - 1];
    let selectedId = null;
    let paths;

    // layout: map on the left, country detail panel on the right
    container.innerHTML = '';
    const layout = d3.select(container).append('div').attr('class', 'map-layout');
    const mapPane = layout.append('div').attr('class', 'map-main');
    const aside = layout.append('div').attr('class', 'map-aside');

    const draw = () => {
        const rect = mapPane.node().getBoundingClientRect();
        const width = Math.max(rect.width, 240);
        const height = Math.max(rect.height, 200);

        mapPane.selectAll('svg').remove();
        const svg = mapPane.append('svg').attr('width', '100%').attr('height', '100%');
        const g = svg.append('g');

        const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
        const path = d3.geoPath(projection);

        g.append('path')
            .attr('d', path({ type: 'Sphere' }))
            .attr('fill', '#fbf8f2')
            .attr('stroke', '#cfc8bb')
            .on('click', () => select(null));

        paths = g.selectAll('path.country').data(features).join('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('stroke', '#f6f2ea')
            .attr('stroke-width', 0.5)
            .on('pointermove', function (event, d) {
                d3.select(this).attr('stroke', '#26221d').attr('stroke-width', 1.2).raise();
                const entry = mapData.countries[d.id];
                const rate = entry?.rates?.[String(currentDecade)];
                const label = entry ? entry.name : (d.properties?.name ?? 'Unknown');
                const text = rate == null
                    ? 'No recorded disaster deaths this decade'
                    : `${rate.toFixed(2)} deaths per 100,000 people`;
                tooltip.show(`<strong>${label} &middot; ${formatDecade(currentDecade)}</strong>${text}<br>Click for this country's history`, event.clientX, event.clientY);
            })
            .on('pointerleave', function (event, d) {
                d3.select(this)
                    .attr('stroke', d.id === selectedId ? '#26221d' : '#f6f2ea')
                    .attr('stroke-width', d.id === selectedId ? 1.4 : 0.5);
                tooltip.hide();
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                select(d.id === selectedId ? null : d.id, d.properties?.name);
            });

        // zoom by double click, pinch or drag; plain mouse wheel keeps
        // scrolling the page (ctrl+wheel zooms), so the story stays scrollable
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .filter((event) => event.type !== 'wheel' || event.ctrlKey)
            .on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

        colorPaths();
    };

    const colorPaths = () => {
        if (!paths) return;
        paths
            .attr('fill', (d) => {
                const rate = mapData.countries[d.id]?.rates?.[String(currentDecade)];
                return rate == null ? NO_DATA_FILL : binColor(rate);
            })
            .attr('stroke', (d) => (d.id === selectedId ? '#26221d' : '#f6f2ea'))
            .attr('stroke-width', (d) => (d.id === selectedId ? 1.4 : 0.5));
    };

    let selectedName = null;

    const select = (id, name = null) => {
        selectedId = id;
        selectedName = name;
        colorPaths();
        renderAside();
    };

    const renderAside = () => {
        aside.html('');
        const entry = selectedId ? mapData.countries[selectedId] : null;

        if (!entry) {
            if (selectedId && selectedName) {
                // clicked a country that has no EM-DAT records at all
                aside.append('h4').text(selectedName);
                aside.append('p').attr('class', 'aside-hint')
                    .text('No EM-DAT records for this country.');
                return;
            }
            aside.append('p').attr('class', 'aside-hint')
                .text('Click a country to compare its death rate with the world average across the century.');
            return;
        }

        aside.append('h4').text(entry.name);
        aside.append('p').attr('class', 'aside-sub').text('deaths per 100,000, decade averages');

        const values = decades.map((dec) => entry.rates[String(dec)] ?? null);
        const worldValues = worldSeries ? worldSeries.total : [];

        const w = 220, h = 150, m = { top: 8, right: 8, bottom: 20, left: 34 };
        const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

        const svg = aside.append('svg').attr('viewBox', `0 0 ${w} ${h}`);
        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        const x = d3.scalePoint().domain(decades).range([0, iw]).padding(0.3);
        // sqrt scale for the same reason as the map: the world famine spike
        // would otherwise flatten a typical country's line onto the floor
        const yMax = d3.max([...values.filter((v) => v != null), ...worldValues]) || 1;
        const y = d3.scaleSqrt().domain([0, yMax]).nice().range([ih, 0]);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`)
            .call(d3.axisBottom(x).tickValues([decades[0], decades[decades.length - 1]]).tickFormat(formatDecade));
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(3));

        // current decade marker
        g.append('line')
            .attr('x1', x(currentDecade)).attr('x2', x(currentDecade))
            .attr('y1', 0).attr('y2', ih)
            .attr('stroke', '#c2954b').attr('stroke-dasharray', '3 3');

        if (worldValues.length) {
            g.append('path')
                .datum(worldValues)
                .attr('fill', 'none').attr('stroke', '#cfc8bb').attr('stroke-width', 1.5)
                .attr('d', d3.line().x((_, i) => x(decades[i])).y((v) => y(v)));
        }

        g.append('path')
            .datum(values)
            .attr('fill', 'none').attr('stroke', '#a05c3b').attr('stroke-width', 2)
            .attr('d', d3.line().defined((v) => v != null).x((_, i) => x(decades[i])).y((v) => y(v)));

        g.selectAll('.adot')
            .data(values.map((v, i) => ({ v, i })).filter((d) => d.v != null))
            .join('circle')
            .attr('cx', (d) => x(decades[d.i])).attr('cy', (d) => y(d.v)).attr('r', 2)
            .attr('fill', '#a05c3b');

        const nowRate = entry.rates[String(currentDecade)];
        aside.append('p').attr('class', 'aside-value')
            .html(`${formatDecade(currentDecade)}: <strong>${nowRate == null ? 'no recorded deaths' : nowRate.toFixed(2)}</strong>`);
        aside.append('p').attr('class', 'aside-hint')
            .text('Sienna: this country. Grey: world average.');
    };

    draw();
    renderAside();
    const ro = observeResize(container, draw);

    return {
        setDecade(decade) {
            currentDecade = decade;
            colorPaths();
            renderAside();
        },
        decades,
        destroy() { ro.disconnect(); },
    };
}
