import { mountSVG, size, observeResize, formatDecade, colorForEventType } from './baseChart.js';

const KEYS = ['Drought', 'Earthquake', 'Extreme weather', 'Flood', 'Landslide', 'Volcanic activity', 'Wildfire', 'Extreme temperature'];

export function renderEventsChart(container, data, tooltip) {
    const rows = data.decades.map((decade, i) => {
        const row = { decade };
        KEYS.forEach((k) => { row[k] = data.series[k]?.[i] ?? 0; });
        return row;
    });

    const draw = () => {
        const { width, height, innerWidth, innerHeight } = size(container);
        const { g } = mountSVG(container);

        const x = d3.scaleBand().domain(rows.map((d) => d.decade)).range([0, innerWidth]).padding(0.12);
        const stacked = d3.stack().keys(KEYS)(rows);
        const yMax = d3.max(stacked[stacked.length - 1], (d) => d[1]);
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

        g.append('g').attr('class', 'gridline-group')
            .selectAll('line').data(y.ticks(5)).join('line')
            .attr('class', 'gridline')
            .attr('x1', 0).attr('x2', innerWidth).attr('y1', y).attr('y2', y);

        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 2 === 0)).tickFormat(formatDecade).tickSizeOuter(0));

        g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));

        const layers = g.selectAll('.layer').data(stacked).join('g')
            .attr('class', 'layer')
            .attr('fill', (d) => colorForEventType(d.key));

        layers.selectAll('rect').data((d) => d.map((v) => ({ ...v, key: d.key }))).join('rect')
            .attr('x', (d) => x(d.data.decade))
            .attr('y', (d) => y(d[1]))
            .attr('width', x.bandwidth())
            .attr('height', (d) => y(d[0]) - y(d[1]))
            .on('mousemove', (event, d) => {
                const value = d[1] - d[0];
                tooltip.show(
                    `<strong>${d.key} &middot; ${formatDecade(d.data.decade)}</strong>${value.toLocaleString()} events`,
                    event.clientX, event.clientY
                );
            })
            .on('mouseleave', () => tooltip.hide());

        if (data.partial_decade) {
            const px = x(data.partial_decade);
            if (px != null) {
                g.append('text')
                    .attr('x', px + x.bandwidth() / 2).attr('y', -6)
                    .attr('text-anchor', 'middle').attr('class', 'axis')
                    .text('partial');
            }
        }
    };

    draw();
    return observeResize(container, draw);
}
