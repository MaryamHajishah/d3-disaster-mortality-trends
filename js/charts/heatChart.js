// Step 5: deaths from extreme temperatures, on its own.
// This is the one series moving against the overall trend, so it gets a
// plain single line with nothing to compete against.

import { mountSVG, size, observeResize, formatDecade } from './baseChart.js';

const LINE_COLOR = '#a05c3b';
const AREA_COLOR = 'rgba(194, 149, 75, 0.18)';

export function renderHeatChart(container, data, tooltip) {
    const decades = data.decades;
    const values = data.by_type['Extreme temperatures'];

    const draw = () => {
        const { innerWidth, innerHeight } = size(container);
        const { g } = mountSVG(container);

        const x = d3.scalePoint().domain(decades).range([0, innerWidth]).padding(0.5);
        const y = d3.scaleLinear().domain([0, d3.max(values)]).nice().range([innerHeight, 0]);

        g.append('g')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(decades.filter((_, i) => i % 2 === 0)).tickFormat(formatDecade));
        g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d3.format('.2s')(d)));

        g.append('path')
            .datum(values)
            .attr('fill', AREA_COLOR)
            .attr('d', d3.area()
                .x((_, i) => x(decades[i]))
                .y0(innerHeight)
                .y1((v) => y(v)));

        g.append('path')
            .datum(values)
            .attr('fill', 'none')
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', 3)
            .attr('d', d3.line().x((_, i) => x(decades[i])).y((v) => y(v)));

        g.selectAll('.dot').data(values).join('circle')
            .attr('cx', (_, i) => x(decades[i]))
            .attr('cy', (v) => y(v))
            .attr('r', 4)
            .attr('fill', LINE_COLOR)
            .on('pointermove', (event, v) => {
                const i = values.indexOf(v);
                const suffix = data.partial_decade === decades[i] ? ' (partial decade)' : '';
                tooltip.show(
                    `<strong>${formatDecade(decades[i])}${suffix}</strong>${v.toLocaleString()} deaths from heat and cold waves`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());

        // the six-year decade needs a flag right on the chart, not only in the text
        if (data.partial_decade) {
            const px = x(data.partial_decade);
            if (px != null) {
                g.append('text')
                    .attr('x', px).attr('y', -8)
                    .attr('text-anchor', 'end').attr('class', 'axis')
                    .text('2020 to 2025 only');
            }
        }
    };

    draw();
    return observeResize(container, draw);
}
