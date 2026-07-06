// Step 3: an animated beeswarm where every dot is a country, positioned by
// its decade-average disaster death rate. Pressing play sweeps from the
// 1900s to the 2020s and the whole swarm slides left toward zero and
// lightens. The previous step showed the world average falling; this one
// shows the fall was not an average hiding regional losers.
//
// Reuses data/country_death_rate_map.json and the same dry color bins as
// the choropleth in step 7, so the encoding the reader learns here (right
// and dark means deadly) carries over to the map. Pure D3: a force
// simulation retargets each dot's x position on every decade change.

import { observeResize } from './baseChart.js';

// same ramp and bins as disasterMap.js, kept local so the chart has no
// cross-chart dependency
const DRY_SCALE = ['#efe6c8', '#e3d3a3', '#c2954b', '#a05c3b', '#5e3023'];
const BIN_EDGES = [0.1, 0.5, 2, 10, 50];
const NO_DATA_FILL = '#dedad0';
const ramp = d3.interpolateRgbBasis(DRY_SCALE);
const BIN_COLORS = [0.06, 0.24, 0.44, 0.64, 0.84, 1].map((t) => d3.color(ramp(t)).formatHex());
const binColor = d3.scaleThreshold().domain(BIN_EDGES).range(BIN_COLORS);

const STEP_MS = 1100;

export function renderSwarmChart(container, mapData, tooltip) {
    const decades = mapData.decades;
    const partial = mapData.partial_decade;

    const nodes = Object.entries(mapData.countries).map(([id, c]) => ({
        id, name: c.name, rates: c.rates, x: 0, y: 0,
    }));

    const rateAt = (d, dec) => {
        const v = d.rates[String(dec)];
        return v == null ? null : v;
    };
    const maxRate = d3.max(nodes, (d) => d3.max(decades, (dec) => rateAt(d, dec) ?? 0)) || 1;

    let index = 0;
    let playing = false;
    let timer = null;

    // ---- scaffold ----
    container.innerHTML = '';
    const root = d3.select(container).append('div').attr('class', 'swarm');

    const head = root.append('div').attr('class', 'swarm-head');
    const playBtn = head.append('button')
        .attr('type', 'button')
        .attr('class', 'swarm-play')
        .attr('aria-label', 'Play the animation from the 1900s to the 2020s');
    playBtn.append('span').attr('class', 'swarm-play-icon').attr('aria-hidden', 'true');

    const readout = head.append('div').attr('class', 'swarm-readout');
    const decadeLabel = readout.append('span').attr('class', 'swarm-decade');
    const countLabel = readout.append('span').attr('class', 'swarm-count');

    const strip = root.append('div')
        .attr('class', 'swarm-strip')
        .attr('role', 'group')
        .attr('aria-label', 'Jump to a decade');
    const chips = strip.selectAll('button').data(decades).join('button')
        .attr('type', 'button')
        .attr('class', 'swarm-chip')
        .text((d) => (d === partial ? `${d}*` : d))
        .on('click', (event, d) => {
            pause();
            goTo(decades.indexOf(d));
        });

    const figure = root.append('div').attr('class', 'swarm-figure');
    const svg = figure.append('svg').attr('class', 'swarm-svg');
    const gAxis = svg.append('g').attr('class', 'swarm-axis');
    const gDots = svg.append('g').attr('class', 'swarm-dots');

    // ---- geometry, rebuilt on resize ----
    let x;
    let R = 4.5;
    let sim;

    const targetX = (d) => {
        const r = rateAt(d, decades[index]);
        return r == null ? -40 : x(r);       // park no-data dots off the left edge
    };
    const radiusOf = (d) => (rateAt(d, decades[index]) == null ? 0 : R);

    const circles = gDots.selectAll('circle').data(nodes, (d) => d.id).join('circle')
        .attr('r', 0)
        .attr('fill', NO_DATA_FILL)
        .attr('stroke', 'rgba(38,34,29,0.15)')
        .attr('stroke-width', 0.5)
        .on('pointermove', function (event, d) {
            const dec = decades[index];
            const r = rateAt(d, dec);
            if (r == null) return;
            d3.select(this).attr('stroke', '#26221d').attr('stroke-width', 1.2).raise();
            tooltip.show(
                `<strong>${d.name} &middot; ${dec}s</strong>`
                + `${r.toFixed(2)} deaths per 100,000 people`,
                event.clientX, event.clientY,
            );
        })
        .on('pointerleave', function () {
            d3.select(this).attr('stroke', 'rgba(38,34,29,0.15)').attr('stroke-width', 0.5);
            tooltip.hide();
        });

    function setup() {
        const rect = figure.node().getBoundingClientRect();
        const width = Math.max(rect.width, 260);
        const height = Math.max(rect.height, 180);
        const margin = { top: 12, right: 18, bottom: 30, left: 18 };
        const axisY = height - margin.bottom;
        const centerY = margin.top + (axisY - margin.top) / 2;
        R = width < 520 ? 3 : 4.5;

        x = d3.scaleSqrt().domain([0, maxRate]).range([margin.left, width - margin.right]);

        const ticks = [0, 1, 10, 100, 1000].filter((t) => t <= maxRate);
        gAxis.attr('transform', `translate(0,${axisY})`)
            .call(d3.axisBottom(x).tickValues(ticks).tickSize(4).tickFormat(d3.format('~s')));
        gAxis.select('.domain').remove();

        if (sim) sim.stop();
        sim = d3.forceSimulation(nodes)
            .force('x', d3.forceX(targetX).strength(0.32))
            .force('y', d3.forceY(centerY).strength(0.05))
            .force('collide', d3.forceCollide((d) => radiusOf(d) + 0.6))
            .alpha(0.9)
            .alphaDecay(0.02)
            .on('tick', () => circles.attr('cx', (d) => d.x).attr('cy', (d) => d.y));
    }

    function goTo(i, animate = true) {
        index = Math.max(0, Math.min(decades.length - 1, i));
        const dec = decades[index];
        const withData = nodes.reduce((n, d) => n + (rateAt(d, dec) == null ? 0 : 1), 0);

        decadeLabel.text(`${dec}s`);
        countLabel.text(`${withData} countries with recorded disaster deaths`);
        chips.classed('is-active', (d) => d === dec);

        circles.transition().duration(animate ? 600 : 0)
            .attr('r', (d) => radiusOf(d))
            .attr('fill', (d) => {
                const r = rateAt(d, dec);
                return r == null ? NO_DATA_FILL : binColor(r);
            })
            .attr('opacity', (d) => (rateAt(d, dec) == null ? 0 : 0.9))
            .style('pointer-events', (d) => (rateAt(d, dec) == null ? 'none' : 'auto'));

        sim.force('collide').radius((d) => radiusOf(d) + 0.6);
        sim.alpha(0.7).restart();
    }

    function step() {
        if (!playing) return;
        if (index >= decades.length - 1) { pause(); return; }
        goTo(index + 1);
        timer = setTimeout(step, STEP_MS);
    }
    function play() {
        if (index >= decades.length - 1) goTo(0, false);
        playing = true;
        playBtn.classed('is-playing', true).attr('aria-label', 'Pause the animation');
        step();
    }
    function pause() {
        playing = false;
        playBtn.classed('is-playing', false).attr('aria-label', 'Play the animation from the 1900s to the 2020s');
        clearTimeout(timer);
    }
    playBtn.on('click', () => (playing ? pause() : play()));

    setup();
    goTo(index, false);

    // let the swarm settle, then play through the century once as the
    // reader arrives at this step
    const autoTimer = setTimeout(() => { if (!playing && index === 0) play(); }, 1200);

    const ro = observeResize(figure.node(), () => { setup(); goTo(index, false); });

    return {
        destroy() {
            clearTimeout(autoTimer);
            pause();
            if (sim) sim.stop();
            ro.disconnect();
        },
    };
}
