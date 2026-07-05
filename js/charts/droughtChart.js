// Step 4: drought deaths per decade as a lollipop chart.
//
// This step is about one series collapsing, so it drops the other disaster
// types entirely rather than fading them. A lollipop keeps each decade a
// discrete mark (stems, not a continuous line) and lets the millions-to-near
// -zero fall read as tall early stems shrinking to floor-level dots.

import { mountSVG, size, observeResize, formatDecade, colorForType, decadeTickFormat } from './baseChart.js';

const COLOR = colorForType('Droughts');

export function renderDroughtChart(container, data, tooltip) {
    const decades = data.decades;
    const values = data.by_type.Droughts;

    const draw = () => {
        const { innerWidth, innerHeight } = size(container);
        const { g } = mountSVG(container);

        const x = d3.scalePoint().domain(decades).range([0, innerWidth]).padding(0.5);
        const y = d3.scaleLinear()
            .domain([0, d3.max(values.filter((v) => v != null))]).nice()
            .range([innerHeight, 0]);

        g.append('g')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(decades.filter((_, i) => i % 2 === 0)).tickFormat(decadeTickFormat(data.partial_decade)));
        g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d3.format('.2s')(d)));

        const lastIndex = values.length - 1;
        const isPartialEnd = data.partial_decade === decades[lastIndex];
        const points = values.map((v, i) => ({ v, i })).filter((d) => d.v != null);

        // stems
        g.selectAll('.stem').data(points).join('line')
            .attr('class', 'stem')
            .attr('x1', (d) => x(decades[d.i])).attr('x2', (d) => x(decades[d.i]))
            .attr('y1', innerHeight).attr('y2', (d) => y(d.v))
            .attr('stroke', COLOR)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', (d) => (isPartialEnd && d.i === lastIndex ? '4 3' : null));

        // heads
        g.selectAll('.head').data(points).join('circle')
            .attr('class', 'head')
            .attr('cx', (d) => x(decades[d.i])).attr('cy', (d) => y(d.v))
            .attr('r', 5)
            .attr('fill', (d) => (isPartialEnd && d.i === lastIndex ? '#ffffff' : COLOR))
            .attr('stroke', COLOR)
            .attr('stroke-width', 2)
            .on('pointermove', (event, d) => {
                const suffix = data.partial_decade === decades[d.i] ? ' (partial decade)' : '';
                tooltip.show(
                    `<strong>${formatDecade(decades[d.i])}${suffix}</strong>${d.v.toLocaleString()} drought deaths`,
                    event.clientX, event.clientY
                );
            })
            .on('pointerleave', () => tooltip.hide());

        // mark decades with no record so the gap is not read as zero
        const missing = values.map((v, i) => ({ v, i })).filter((d) => d.v == null);
        g.selectAll('.nodata').data(missing).join('text')
            .attr('class', 'axis')
            .attr('x', (d) => x(decades[d.i])).attr('y', innerHeight - 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .text('no data');
    };

    draw();
    return observeResize(container, draw);
}
