// Entry point. Loads the preprocessed JSON, wires the scroll narrative to
// the chart panel, and fills in the hero numbers.

import { DataLoader } from './modules/dataLoader.js';
import { Tooltip } from './modules/tooltip.js';
import { StoryScroller } from './modules/storyScroller.js';
import { setupNav } from './modules/nav.js';

import { renderEventsChart } from './charts/eventsChart.js';
import { renderDeathRateChart } from './charts/deathRateChart.js';
import { renderDeathsByTypeChart } from './charts/deathsByTypeChart.js';
import { renderHeatChart } from './charts/heatChart.js';
import { renderDisasterMap } from './charts/disasterMap.js';

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
            mapController = await renderDisasterMap(chartSlot, data.countryMap, tooltip);
            setupMapToggle(mapController);
        },
    };

    const meta = {
        events: { title: 'Recorded disasters per decade, by type', unit: 'events per decade' },
        deathRate: { title: 'Global deaths from natural disasters', unit: 'deaths per 100,000 people' },
        deathsAll: { title: 'Deaths per decade, by disaster type', unit: 'people' },
        deathsDrought: { title: 'Drought deaths per decade', unit: 'people' },
        heat: { title: 'Deaths from extreme temperatures', unit: 'people per decade' },
        map: { title: 'Decade-average death rate by country', unit: 'deaths per 100,000 people' },
    };

    async function activate(chartKey, chapter) {
        if (currentChart === chartKey) return;
        currentChart = chartKey;
        if (mapController) { mapController.destroy(); mapController = null; }

        chartTitle.textContent = meta[chartKey].title;
        chartUnit.textContent = meta[chartKey].unit;

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

function setupMapToggle(controller) {
    const buttons = document.querySelectorAll('.decade-btn');
    buttons.forEach((btn) => {
        btn.onclick = () => {
            buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
            controller.setDecade(Number(btn.dataset.decade));
        };
    });
    const active = document.querySelector('.decade-btn.is-active');
    if (active) controller.setDecade(Number(active.dataset.decade));
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
