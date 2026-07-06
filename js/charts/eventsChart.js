import { mountSVG, size, observeResize, formatDecade, colorForEventType, typeLabel, hatchFill, decadeTickFormat } from './baseChart.js';

// stacking order, bottom to top; exported so the legend in main.js can be
// sorted to match the chart instead of the arbitrary data order (Guideline 3)
export const EVENT_STACK_KEYS = ['Drought', 'Earthquake', 'Extreme weather', 'Flood', 'Landslide', 'Volcanic activity', 'Wildfire', 'Extreme temperature'];

export function renderEventsChart(container, data, tooltip) {
    const rows = data.decades.map((decade, i) => {
        const row = { decade };
        EVENT_STACK_KEYS.forEach((k) => { row[k] = data.series[k]?.[i] ?? 0; });
        return row;
    });

    const draw = () => {
        const { innerWidth, innerHeight } = size(container);
        const { svg, g } = mountSVG(container);

        const x = d3.scaleBand().domain(rows.map((d) => d.decade)).range([0, innerWidth]).padding(0.12);
        const stacked = d3.stack().keys(EVENT_STACK_KEYS)(rows);
        const yMax = d3.max(stacked[stacked.length - 1], (d) => d[1]);
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

        g.append('g').attr('class', 'gridline-group')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 2 === 0)).tickFormat(decadeTickFormat(data.partial_decade)).tickSizeOuter(0));

        g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));

        const layers = g.selectAll('.layer').data(stacked).join('g')
            .attr('class', 'layer')
            .attr('fill', (d) => colorForEventType(d.key));

        layers.selectAll('rect').data((d) => d.map((v) => ({ ...v, key: d.key }))).join('rect')
            .attr('x', (d) => x(d.data.decade))
            .attr('y', (d) => y(d[1]))
            .attr('width', x.bandwidth())
            .attr('height', (d) => y(d[0]) - y(d[1]))
            .on('pointermove', (event, d) => {
                const value = d[1] - d[0];
                tooltip.show(
                    `<strong>${typeLabel(d.key)} &middot; ${formatDecade(d.data.decade)}</strong>${value.toLocaleString()} events`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());

        // stripe the incomplete decade's bar instead of labeling it with text
        if (data.partial_decade) {
            const i = rows.findIndex((r) => r.decade === data.partial_decade);
            const px = x(data.partial_decade);
            if (i !== -1 && px != null) {
                const barTop = stacked[stacked.length - 1][i][1];
                g.append('rect')
                    .attr('x', px).attr('width', x.bandwidth())
                    .attr('y', y(barTop)).attr('height', Math.max(0, innerHeight - y(barTop)))
                    .attr('fill', hatchFill(svg))
                    .attr('pointer-events', 'none');
            }
        }
    };

    draw();
    return observeResize(container, draw);
}
