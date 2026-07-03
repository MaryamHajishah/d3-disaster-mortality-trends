// Steps 3 and 4: absolute deaths per decade, stacked by disaster type.
// Step 4 passes { highlight: 'Droughts' } and the other layers fade so the
// reader can follow one story (famine deaths disappearing) inside the same
// chart they just saw.

import { mountSVG, size, observeResize, formatDecade, colorForType } from './baseChart.js';

export function renderDeathsByTypeChart(container, data, tooltip, options = {}) {
    const { highlight = null } = options;
    const keys = Object.keys(data.by_type);
    const rows = data.decades.map((decade, i) => {
        const row = { decade };
        keys.forEach((k) => { row[k] = data.by_type[k][i]; });
        return row;
    });

    const draw = () => {
        const { innerWidth, innerHeight } = size(container);
        const { g } = mountSVG(container);

        const x = d3.scaleBand().domain(rows.map((d) => d.decade)).range([0, innerWidth]).padding(0.12);
        const stacked = d3.stack().keys(keys)(rows);
        const yMax = d3.max(stacked[stacked.length - 1], (d) => d[1]);
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

        g.append('g')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 2 === 0)).tickFormat(formatDecade).tickSizeOuter(0));
        g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d3.format('.2s')(d)));

        const layers = g.selectAll('.layer').data(stacked).join('g')
            .attr('class', 'layer')
            .attr('fill', (d) => colorForType(d.key))
            .attr('opacity', (d) => (highlight && d.key !== highlight ? 0.18 : 1));

        layers.selectAll('rect').data((d) => d.map((v) => ({ ...v, key: d.key }))).join('rect')
            .attr('x', (d) => x(d.data.decade))
            .attr('y', (d) => y(d[1]))
            .attr('width', x.bandwidth())
            .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
            .on('mousemove', (event, d) => {
                const value = d[1] - d[0];
                tooltip.show(
                    `<strong>${d.key} &middot; ${formatDecade(d.data.decade)}</strong>${Math.round(value).toLocaleString()} deaths`,
                    event.clientX, event.clientY
                );
            })
            .on('mouseleave', () => tooltip.hide());
    };

    draw();
    return observeResize(container, draw);
}
