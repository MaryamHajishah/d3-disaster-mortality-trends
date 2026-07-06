// Step 2, the hero chart: global disaster death rate per decade.
// The total line is drawn in sage because falling deaths is the one
// "good news" series on the site; everything else stays grey.

import { mountSVG, size, observeResize, formatDecade, decadeTickFormat } from './baseChart.js';

const LINE_COLOR = '#5f7d6c';
const CONTEXT_COLOR = '#cfc8bb';

export function renderDeathRateChart(container, data, tooltip) {
    const decades = data.decades;
    const typeKeys = Object.keys(data.by_type);

    const draw = () => {
        const { innerWidth, innerHeight } = size(container);
        const { g } = mountSVG(container);

        const x = d3.scalePoint().domain(decades).range([0, innerWidth]).padding(0.5);
        const y = d3.scaleLinear().domain([0, d3.max(data.total)]).nice().range([innerHeight, 0]);

        g.append('g')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(decades.filter((_, i) => i % 2 === 0)).tickFormat(decadeTickFormat(data.partial_decade)));
        g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));

        const line = d3.line().x((_, i) => x(decades[i])).y((v) => y(v));

        // per-type lines stay in the background as quiet context
        typeKeys.forEach((key) => {
            g.append('path')
                .datum(data.by_type[key])
                .attr('fill', 'none')
                .attr('stroke', CONTEXT_COLOR)
                .attr('stroke-width', 1)
                .attr('d', line);
        });

        // the segment into the incomplete decade is dashed, newspaper style
        const isPartialEnd = data.partial_decade === decades[decades.length - 1];
        const solidValues = isPartialEnd ? data.total.slice(0, -1) : data.total;

        g.append('path')
            .datum(solidValues)
            .attr('fill', 'none')
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', 3)
            .attr('d', line);

        if (isPartialEnd) {
            const n = decades.length;
            g.append('path')
                .datum(data.total.slice(n - 2))
                .attr('fill', 'none')
                .attr('stroke', LINE_COLOR)
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '5 4')
                .attr('d', d3.line()
                    .x((_, i) => x(decades[n - 2 + i]))
                    .y((v) => y(v)));
        }

        // Direct labels instead of a legend (Guideline 3: integrate graphics
        // and text). The sage total line is named at its high left end where
        // it stands alone; the grey bundle gets one quiet label above it.
        g.append('text')
            .attr('x', x(decades[0]) + 8)
            .attr('y', y(data.total[0]) + 4)
            .attr('fill', LINE_COLOR)
            .attr('font-size', '12px')
            .attr('font-weight', 700)
            .text('All disasters');

        const greyTopEarly = d3.max(typeKeys, (k) => data.by_type[k]?.[1] ?? 0);
        g.append('text')
            .attr('x', x(decades[1]) + 6)
            .attr('y', y(greyTopEarly) - 8)
            .attr('fill', '#8a8078')
            .attr('font-size', '11px')
            .text('individual disaster types');

        g.selectAll('.dot').data(data.total).join('circle')
            .attr('class', 'dot')
            .attr('cx', (_, i) => x(decades[i]))
            .attr('cy', (v) => y(v))
            .attr('r', 4)
            .attr('fill', (_, i) => (isPartialEnd && i === data.total.length - 1 ? '#ffffff' : LINE_COLOR))
            .attr('stroke', LINE_COLOR)
            .attr('stroke-width', (_, i) => (isPartialEnd && i === data.total.length - 1 ? 2 : 0))
            .on('pointermove', (event, v) => {
                const i = data.total.indexOf(v);
                const suffix = data.partial_decade === decades[i] ? ' (partial decade)' : '';
                tooltip.show(
                    `<strong>${formatDecade(decades[i])}${suffix}</strong>${v.toFixed(2)} deaths per 100,000 people`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());
    };

    draw();
    return observeResize(container, draw);
}
