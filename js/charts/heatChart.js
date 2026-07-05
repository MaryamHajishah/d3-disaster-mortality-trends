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

        // nulls mean the decade had no heat or cold records, so the line and
        // area skip them instead of dropping to a false zero
        const defined = (v) => v != null;
        const lastIndex = values.length - 1;
        const isPartialEnd = data.partial_decade === decades[lastIndex];

        g.append('path')
            .datum(values)
            .attr('fill', AREA_COLOR)
            .attr('d', d3.area()
                .defined(defined)
                .x((_, i) => x(decades[i]))
                .y0(innerHeight)
                .y1((v) => y(v)));

        // the segment into the incomplete decade is dashed, newspaper style
        const solidValues = isPartialEnd ? values.slice(0, -1) : values;

        g.append('path')
            .datum(solidValues)
            .attr('fill', 'none')
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', 3)
            .attr('d', d3.line().defined(defined).x((_, i) => x(decades[i])).y((v) => y(v)));

        if (isPartialEnd) {
            g.append('path')
                .datum(values.slice(lastIndex - 1))
                .attr('fill', 'none')
                .attr('stroke', LINE_COLOR)
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '5 4')
                .attr('d', d3.line().defined(defined)
                    .x((_, i) => x(decades[lastIndex - 1 + i]))
                    .y((v) => y(v)));
        }

        g.selectAll('.dot')
            .data(values.map((v, i) => ({ v, i })).filter((d) => d.v != null))
            .join('circle')
            .attr('cx', (d) => x(decades[d.i]))
            .attr('cy', (d) => y(d.v))
            .attr('r', 4)
            .attr('fill', (d) => (isPartialEnd && d.i === lastIndex ? '#ffffff' : LINE_COLOR))
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', (d) => (isPartialEnd && d.i === lastIndex ? 2 : 0))
            .on('pointermove', (event, d) => {
                const suffix = data.partial_decade === decades[d.i] ? ' (partial decade)' : '';
                tooltip.show(
                    `<strong>${formatDecade(decades[d.i])}${suffix}</strong>${d.v.toLocaleString()} deaths from heat and cold waves`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());

    };

    draw();
    return observeResize(container, draw);
}
