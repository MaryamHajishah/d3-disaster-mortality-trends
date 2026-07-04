// Shared helpers for the D3 charts: mounting, sizing, resize handling,
// and the color scales every chart draws from.

const MARGIN = { top: 24, right: 24, bottom: 32, left: 52 };

export function mountSVG(container, margin = MARGIN) {
    container.innerHTML = '';
    const svg = d3.select(container).append('svg');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    return { svg, g, margin };
}

export function size(container, margin = MARGIN) {
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    const height = Math.max(rect.height, 200);
    return {
        width, height,
        innerWidth: width - margin.left - margin.right,
        innerHeight: height - margin.top - margin.bottom,
    };
}

// Redraws a chart when its container changes size. The rAF debounce stops
// ResizeObserver from firing a redraw storm while the panel animates.
export function observeResize(container, draw) {
    let frame = null;
    const ro = new ResizeObserver(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(draw);
    });
    ro.observe(container);
    return ro;
}

export const formatDecade = (d) => `${d}s`;

// Reader-facing names for EM-DAT's category labels. The two source datasets
// name the same hazard differently ("Storms" vs "Extreme weather", confirmed
// equivalent in the OWID metadata), and "extreme temperature" reads like
// jargon, so tooltips translate before display.
const TYPE_LABELS = {
    'Extreme weather': 'Storms',
    'Extreme temperature': 'Heat and cold waves',
    'Extreme temperatures': 'Heat and cold waves',
    'Volcanic activity': 'Volcanoes',
};
export const typeLabel = (key) => TYPE_LABELS[key] ?? key;

// Every categorical color sits in the same dusty, low-saturation family.
// Drought gets the sienna and extreme temperature gets the ochre on purpose:
// those two are the stars of chapters two and three.
export const colorForType = d3.scaleOrdinal()
    .domain(['Droughts', 'Earthquakes', 'Volcanoes', 'Floods', 'Landslides', 'Storms', 'Wildfires', 'Extreme temperatures'])
    .range(['#a05c3b', '#8a7a68', '#5e5044', '#9aa08b', '#b8a888', '#7f8a80', '#a8784a', '#c2954b']);

// The events dataset spells its categories differently (singular, and
// "Extreme weather" as its own type), so it needs its own scale.
export const colorForEventType = d3.scaleOrdinal()
    .domain(['Drought', 'Earthquake', 'Extreme weather', 'Flood', 'Landslide', 'Volcanic activity', 'Wildfire', 'Extreme temperature'])
    .range(['#a05c3b', '#8a7a68', '#7f8a80', '#9aa08b', '#b8a888', '#5e5044', '#a8784a', '#c2954b']);
