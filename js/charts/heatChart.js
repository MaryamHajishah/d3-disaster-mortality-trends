// Step 5: deaths from extreme temperatures, on its own.
// This is the one series moving against the overall trend, so it gets a
// plain single line with nothing to compete against.

import { mountSVG, size, observeResize, formatDecade, decadeTickFormat } from './baseChart.js';

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
            .call(d3.axisBottom(x).tickValues(decades.filter((_, i) => i % 2 === 0)).tickFormat(decadeTickFormat(data.partial_decade)));
        g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d3.format('.2s')(d)));

        g.append('path')
            .datum(values)
            .attr('fill', AREA_COLOR)
            .attr('d', d3.area()
                .x((_, i) => x(decades[i]))
                .y0(innerHeight)
                .y1((v) => y(v)));

        // the segment into the incomplete decade is dashed, newspaper style
        const isPartialEnd = data.partial_decade === decades[decades.length - 1];
        const solidValues = isPartialEnd ? values.slice(0, -1) : values;

        g.append('path')
            .datum(solidValues)
            .attr('fill', 'none')
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', 3)
            .attr('d', d3.line().x((_, i) => x(decades[i])).y((v) => y(v)));

        if (isPartialEnd) {
            const n = decades.length;
            g.append('path')
                .datum(values.slice(n - 2))
                .attr('fill', 'none')
                .attr('stroke', LINE_COLOR)
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '5 4')
                .attr('d', d3.line()
                    .x((_, i) => x(decades[n - 2 + i]))
                    .y((v) => y(v)));
        }

        g.selectAll('.dot').data(values).join('circle')
            .attr('cx', (_, i) => x(decades[i]))
            .attr('cy', (v) => y(v))
            .attr('r', 4)
            .attr('fill', (_, i) => (isPartialEnd && i === values.length - 1 ? '#ffffff' : LINE_COLOR))
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', (_, i) => (isPartialEnd && i === values.length - 1 ? 2 : 0))
            .on('pointermove', (event, v) => {
                const i = values.indexOf(v);
                const suffix = data.partial_decade === decades[i] ? ' (partial decade)' : '';
                tooltip.show(
                    `<strong>${formatDecade(decades[i])}${suffix}</strong>${v.toLocaleString()} deaths from heat and cold waves`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());

    };

    draw();
    return observeResize(container, draw);
}
