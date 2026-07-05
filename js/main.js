// Entry point. Loads the preprocessed JSON, wires the scroll narrative to
// the chart panel, and fills in the hero numbers.

import { DataLoader } from './modules/dataLoader.js';
import { Tooltip } from './modules/tooltip.js';
import { StoryScroller } from './modules/storyScroller.js';
import { setupNav } from './modules/nav.js';

import {
    renderEventsChart,
    renderDeathRateChart,
    renderDeathsByTypeChart,
    renderHeatChart,
    renderDisasterMap,
    mapLegendBins,
    colorForType,
    colorForEventType,
    typeLabel,
} from './charts/index.js';

// Chapter accents step through the dry scale so the page darkens as the
// story moves from setup to warning. Values mirror the tokens in tokens.css.
const CHAPTERS = {
    expect: { color: '#6f6242', tint: 'rgba(111, 98, 66, 0.10)' },
    surprise: { color: '#9a5432', tint: 'rgba(154, 84, 50, 0.10)' },
    threat: { color: '#5e3023', tint: 'rgba(94, 48, 35, 0.10)' },
};

async function main() {
    setupNav();
    const tooltip = new Tooltip(document.getElementById('chart-tooltip'));
    const loader = new DataLoader();

    const data = await loader.loadAll({
        events: 'data/events_by_decade.json',
        deathRate: 'data/death_rate_world.json',
        deathsByType: 'data/deaths_by_type_decade.json',
        countryMap: 'data/country_death_rate_map.json',
    });

    renderHeroStats(data);
    loader.load('data/sources.json').then(renderSourceList).catch(() => {});

    const chartSlot = document.getElementById('chart-slot');
    const chartTitle = document.getElementById('chart-title');
    const chartUnit = document.getElementById('chart-unit');
    const visualPanel = document.getElementById('story-visual');

    let mapController = null;
    let currentChart = null;

    // Two entries share the deaths-by-type chart: step 4 re-renders it with
    // the drought layer highlighted and everything else faded.
    const renderers = {
        events: () => renderEventsChart(chartSlot, data.events, tooltip),
        deathRate: () => renderDeathRateChart(chartSlot, data.deathRate, tooltip),
        deathsAll: () => renderDeathsByTypeChart(chartSlot, data.deathsByType, tooltip),
        deathsDrought: () => renderDeathsByTypeChart(chartSlot, data.deathsByType, tooltip, { highlight: 'Droughts' }),
        heat: () => renderHeatChart(chartSlot, data.deathsByType, tooltip),
        map: async () => {
            mapController = await renderDisasterMap(chartSlot, data.countryMap, tooltip, { world: data.deathRate });
            setupMapControls(mapController, data.countryMap);
        },
    };

    // legend entries per chart; the map draws its own legend inside the svg
    // and the heat chart is a single named series, so both leave this empty
    const eventKeys = Object.keys(data.events.series).filter((k) => k !== 'All disasters');
    const deathKeys = Object.keys(data.deathsByType.by_type);
    const partialNote = { label: '* 2020 to 2025 only', note: true };
    const legends = {
        events: [...eventKeys.map((k) => ({ label: typeLabel(k), color: colorForEventType(k) })), partialNote],
        deathsAll: [...deathKeys.map((k) => ({ label: typeLabel(k), color: colorForType(k) })), partialNote],
        deathsDrought: [
            ...deathKeys.map((k) => ({
                label: typeLabel(k),
                color: colorForType(k),
                faded: k !== 'Droughts',
            })),
            partialNote,
        ],
        deathRate: [
            { label: 'All disasters (world total)', color: '#5f7d6c' },
            { label: 'Individual disaster types', color: '#cfc8bb' },
            partialNote,
        ],
        heat: [partialNote],
        map: mapLegendBins(),
    };

    const meta = {
        events: { title: 'Recorded disasters per decade, by type', unit: 'events per decade' },
        deathRate: { title: 'Global deaths from natural disasters', unit: 'deaths per 100,000 people' },
        deathsAll: { title: 'Deaths per decade, by disaster type', unit: 'people' },
        deathsDrought: { title: 'Drought deaths per decade', unit: 'people' },
        heat: { title: 'Deaths from heat and cold waves', unit: 'people per decade' },
        map: { title: 'Decade-average death rate by country', unit: 'deaths per 100,000 people' },
    };

    async function activate(chartKey, chapter) {
        if (currentChart === chartKey) return;
        currentChart = chartKey;
        if (mapController) {
            stopMapPlayback();
            mapController.destroy();
            mapController = null;
        }

        chartTitle.textContent = meta[chartKey].title;
        chartUnit.textContent = meta[chartKey].unit;
        renderLegend(legends[chartKey]);

        const theme = CHAPTERS[chapter];
        if (theme && visualPanel) {
            visualPanel.style.setProperty('--chapter-color', theme.color);
        }

        await renderers[chartKey]();
    }

    function updateRail(chapter) {
        document.querySelectorAll('.chapter-rail a').forEach((link) => {
            const active = link.dataset.rail === chapter;
            link.classList.toggle('is-active', active);
            if (active) link.style.setProperty('--rail-color', CHAPTERS[chapter].color);
        });
    }

    new StoryScroller({
        steps: '.story-step',
        onEnter: (stepEl) => {
            const chapter = stepEl.dataset.chapter;
            const theme = CHAPTERS[chapter];
            const card = stepEl.querySelector('.story-card');
            if (theme && card) {
                card.style.setProperty('--chapter-color', theme.color);
                card.style.setProperty('--chapter-tint', theme.tint);
            }
            updateRail(chapter);
            activate(stepEl.dataset.chart, chapter);
        },
        onProgress: (progress) => {
            const fill = document.querySelector('.story-progress-fill');
            if (fill) fill.style.width = `${progress * 100}%`;
        },
    });

    // draw something before the first scroll so the panel is never empty
    activate('events', 'expect');
}

let mapPlayTimer = null;

function stopMapPlayback() {
    if (mapPlayTimer) {
        clearInterval(mapPlayTimer);
        mapPlayTimer = null;
    }
    const playBtn = document.getElementById('map-play');
    if (playBtn) playBtn.textContent = 'Play';
}

function setupMapControls(controller, mapData) {
    const slider = document.getElementById('map-decade-slider');
    const label = document.getElementById('map-decade-label');
    const playBtn = document.getElementById('map-play');
    if (!slider) return;

    stopMapPlayback();
    slider.min = 0;
    slider.max = mapData.decades.length - 1;

    const apply = () => {
        const decade = mapData.decades[Number(slider.value)];
        label.textContent = `${decade}s${mapData.partial_decade === decade ? ' (2020 to 2025)' : ''}`;
        controller.setDecade(decade);
    };

    slider.oninput = () => {
        stopMapPlayback();
        apply();
    };

    // sweeps through the century, one decade per beat, then stops at the end
    playBtn.onclick = () => {
        if (mapPlayTimer) {
            stopMapPlayback();
            return;
        }
        if (Number(slider.value) >= mapData.decades.length - 1) slider.value = 0;
        apply();
        playBtn.textContent = 'Pause';
        mapPlayTimer = setInterval(() => {
            const next = Number(slider.value) + 1;
            if (next > mapData.decades.length - 1) {
                stopMapPlayback();
                return;
            }
            slider.value = next;
            apply();
        }, 900);
    };

    apply();
}

// The hero numbers are computed from the data rather than typed in, so they
// stay correct if the pipeline is re-run on newer EM-DAT releases.
function renderHeroStats(data) {
    const first = data.deathRate.total[0];
    const last = data.deathRate.total[data.deathRate.total.length - 1];
    const declinePct = Math.round(((first - last) / first) * 100);

    const eventsFirst = data.events.series['All disasters'][0];
    const eventsLastFull = data.events.series['All disasters'][data.events.decades.length - 2];
    const eventsMultiplier = Math.round(eventsLastFull / eventsFirst);

    const heat = data.deathsByType.by_type['Extreme temperatures'];
    const heatMultiplier = (heat[heat.length - 1] / heat[heat.length - 2]).toFixed(1);

    setText('stat-decline', `-${declinePct}%`);
    setText('stat-events-multiplier', `${eventsMultiplier}x`);
    setText('stat-heat-multiplier', `${heatMultiplier}x`);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderLegend(items) {
    const legend = document.getElementById('chart-legend');
    if (!legend) return;
    legend.innerHTML = (items || []).map((item) => item.note
        ? `<span class="legend-item legend-note">${item.label}</span>`
        : `<span class="legend-item"${item.faded ? ' style="opacity:0.45"' : ''}>
            <span class="legend-swatch" style="background:${item.color}"></span>${item.label}
        </span>`
    ).join('');
}

function renderSourceList(sources) {
    const list = document.getElementById('source-list');
    if (!list) return;
    list.innerHTML = sources.map((s) => `
        <li>
            <a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>
            <br><span style="color: var(--ink-500)">${s.citation}</span>
        </li>
    `).join('');
}

main().catch((err) => {
    console.error('Failed to initialize the story:', err);
});
