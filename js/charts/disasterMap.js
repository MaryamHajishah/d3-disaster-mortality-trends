// Step 6: choropleth of decade-average death rates by country.
// The fill runs along the dry scale (straw to umber) used across the site.
// A square-root scale keeps a few catastrophic decades from washing out
// every other country.

import { mountSVG, size, observeResize, formatDecade } from './baseChart.js';

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const DRY_SCALE = ['#efe6c8', '#e3d3a3', '#c2954b', '#a05c3b', '#5e3023'];
const NO_DATA_FILL = '#dedad0';
const MAP_MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };

export async function renderDisasterMap(container, mapData, tooltip) {
    const world = await fetch(WORLD_ATLAS_URL).then((r) => r.json());
    const features = topojson.feature(world, world.objects.countries).features;

    const maxRate = d3.max(Object.values(mapData.countries), (c) =>
        d3.max(Object.values(c.rates).filter((v) => v != null))
    );
    const colorScale = d3.scaleSequentialSqrt(d3.interpolateRgbBasis(DRY_SCALE)).domain([0, maxRate]);

    let currentDecade = 2020;
    let paths;

    const draw = () => {
        const { width, height } = size(container, MAP_MARGIN);
        const { g } = mountSVG(container, MAP_MARGIN);

        const projection = d3.geoNaturalEarth1().fitSize([width - 16, height - 16], { type: 'Sphere' });
        const path = d3.geoPath(projection);

        g.append('path').attr('d', path({ type: 'Sphere' })).attr('fill', '#fbf8f2').attr('stroke', '#cfc8bb');

        drawLegend(g, height);

        paths = g.selectAll('path.country').data(features).join('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('stroke', '#f6f2ea')
            .attr('stroke-width', 0.5)
            .on('mousemove', (event, d) => {
                const entry = mapData.countries[d.id];
                const rate = entry?.rates?.[String(currentDecade)];
                const label = entry ? entry.name : (d.properties?.name ?? 'Unknown');
                const text = rate == null
                    ? 'No recorded disaster deaths this decade'
                    : `${rate.toFixed(2)} deaths per 100,000 people`;
                tooltip.show(`<strong>${label} &middot; ${formatDecade(currentDecade)}</strong>${text}`, event.clientX, event.clientY);
            })
            .on('mouseleave', () => tooltip.hide());

        colorPaths();
    };

    const drawLegend = (g, height) => {
        const legendW = 140, legendH = 10;
        const legendY = height - 16 - legendH - 14;
        const gradId = 'map-legend-gradient';

        const grad = g.append('defs').append('linearGradient')
            .attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
        d3.range(0, 1.01, 0.1).forEach((t) => {
            grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', colorScale(t * maxRate));
        });

        const legend = g.append('g').attr('transform', `translate(0,${legendY})`);
        legend.append('rect').attr('width', legendW).attr('height', legendH).attr('fill', `url(#${gradId})`).attr('stroke', '#cfc8bb');
        legend.append('rect').attr('x', legendW + 14).attr('width', 12).attr('height', legendH).attr('fill', NO_DATA_FILL).attr('stroke', '#cfc8bb');
        legend.append('text').attr('x', 0).attr('y', legendH + 14).attr('class', 'axis').text('0');
        legend.append('text').attr('x', legendW).attr('y', legendH + 14).attr('text-anchor', 'end').attr('class', 'axis').text(maxRate.toFixed(1));
        legend.append('text').attr('x', legendW + 30).attr('y', legendH + 14).attr('class', 'axis').text('no data');
        legend.append('text').attr('x', 0).attr('y', -4).attr('class', 'axis').text('deaths per 100,000 people');
    };

    const colorPaths = () => {
        if (!paths) return;
        paths.attr('fill', (d) => {
            const rate = mapData.countries[d.id]?.rates?.[String(currentDecade)];
            return rate == null ? NO_DATA_FILL : colorScale(rate);
        });
    };

    draw();
    const ro = observeResize(container, draw);

    return {
        setDecade(decade) {
            currentDecade = decade;
            colorPaths();
        },
        destroy() { ro.disconnect(); },
    };
}
