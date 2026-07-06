// Ambient hero backdrop: a living seismograph trace drawn on a canvas behind
// the headline. It is decorative (aria-hidden) and never blocks the text:
// a horizontal gradient fades it out on the left where the copy sits, so it
// lives in the open space on the right.
//
// Interaction: the trace lifts where the cursor hovers, as if the ground were
// trembling under the pointer, and a click sends a seismic pulse rippling
// outward. Pure canvas and requestAnimationFrame, no dependency, and it falls
// back to a single static trace when the reader prefers reduced motion.

const LAYERS = [
    { color: '160, 92, 59', amp: 1.0, freq: 0.013, speed: 1.3, y: 0.52, alpha: 0.42, phase: 0.0 },
    { color: '194, 149, 75', amp: 0.72, freq: 0.021, speed: -0.9, y: 0.55, alpha: 0.34, phase: 2.1 },
    { color: '95, 125, 108', amp: 0.5, freq: 0.031, speed: 0.6, y: 0.58, alpha: 0.24, phase: 4.2 },
];

const BASE_AMP = 26;           // peak wobble in px, scaled per layer
const STEP = 5;                // sample spacing along x in px
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHeroBackdrop(canvas, hero) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;
    let mouseX = -999, lastMove = -9999;
    const pulses = [];

    function resize() {
        const rect = hero.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // fades the trace in from the left so it never sits behind the headline
    function maskGradient() {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0.0, 'rgba(0,0,0,0)');
        g.addColorStop(0.42, 'rgba(0,0,0,0)');
        g.addColorStop(0.62, 'rgba(0,0,0,1)');
        g.addColorStop(1.0, 'rgba(0,0,0,1)');
        return g;
    }

    function amplitudeAt(x, t, layer, mouseLift) {
        let a = layer.amp * BASE_AMP * (
            0.6 * Math.sin(x * layer.freq + t * layer.speed + layer.phase)
            + 0.4 * Math.sin(x * layer.freq * 2.3 - t * layer.speed * 0.7 + layer.phase)
        );
        // ground trembles under the cursor
        if (mouseLift > 0.01) {
            const d = x - mouseX;
            a += mouseLift * 34 * Math.exp(-(d * d) / (2 * 70 * 70)) * Math.sin(t * 7 + x * 0.18);
        }
        // click shockwaves: a bump that widens and fades as it ages
        for (const p of pulses) {
            const age = (t - p.t);
            const strength = Math.exp(-age * 2.4);
            const width = 26 + age * 260;
            const d = x - p.x;
            a += p.power * 46 * strength
                * Math.exp(-(d * d) / (2 * width * width))
                * Math.sin(t * 9 + d * 0.14);
        }
        return a;
    }

    function drawFrame(t) {
        ctx.clearRect(0, 0, w, h);
        const mouseLift = Math.max(0, 1 - (t - lastMove) / 0.5);   // decays ~0.5s after moving

        for (const layer of LAYERS) {
            const baseY = layer.y * h;
            ctx.beginPath();
            for (let x = 0; x <= w; x += STEP) {
                const y = baseY + amplitudeAt(x, t, layer, mouseLift);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.globalAlpha = layer.alpha;
            ctx.strokeStyle = `rgb(${layer.color})`;
            ctx.lineWidth = 1.6;
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        // apply the left-fade mask over the whole trace in one pass
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = maskGradient();
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }

    // ---- static fallback ----
    if (REDUCE) {
        resize();
        drawFrame(0);
        window.addEventListener('resize', () => { resize(); drawFrame(0); });
        return;
    }

    // ---- interaction ----
    hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        lastMove = performance.now() / 1000;
    });
    hero.addEventListener('pointerdown', (e) => {
        const rect = hero.getBoundingClientRect();
        pulses.push({ x: e.clientX - rect.left, t: performance.now() / 1000, power: 1 });
    });

    resize();
    window.addEventListener('resize', resize);

    let raf = null;
    function loop() {
        const t = performance.now() / 1000;
        // drop spent pulses so the array stays tiny
        for (let i = pulses.length - 1; i >= 0; i--) {
            if (t - pulses[i].t > 3.2) pulses.splice(i, 1);
        }
        drawFrame(t);
        raf = requestAnimationFrame(loop);
    }
    loop();

    // pause when the hero scrolls out of view to save the battery
    const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting && !raf) {
                loop();
            } else if (!entry.isIntersecting && raf) {
                cancelAnimationFrame(raf);
                raf = null;
            }
        }
    }, { threshold: 0 });
    io.observe(hero);
}
