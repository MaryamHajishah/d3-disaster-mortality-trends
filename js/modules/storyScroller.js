// Watches scroll position and reports which story step currently sits at
// the middle of the viewport, plus overall progress through the story.
// Runs plain rect math directly in the scroll handler: with six steps the
// work is trivial, and skipping requestAnimationFrame keeps it responsive
// even in embedded views that throttle animation frames.

export class StoryScroller {
    constructor({ steps, onEnter, onProgress }) {
        this.steps = Array.from(document.querySelectorAll(steps));
        this.onEnter = onEnter;
        this.onProgress = onProgress;
        this.current = -1;

        this.section = this.steps.length ? this.steps[0].closest('.story') : null;

        const handler = () => this.update();
        window.addEventListener('scroll', handler, { passive: true });
        window.addEventListener('resize', handler, { passive: true });

        // some embedded webviews coalesce or drop scroll events, so poll the
        // scroll position as a fallback and update on any change it catches
        this.lastY = null;
        setInterval(() => {
            if (window.scrollY !== this.lastY) {
                this.lastY = window.scrollY;
                this.update();
            }
        }, 250);

        this.update();
    }

    update() {
        const midpoint = window.innerHeight / 2;

        // pick the step whose box contains the viewport midpoint; if none
        // does (gaps between steps), keep the last one that was active
        let index = -1;
        this.steps.forEach((step, i) => {
            const rect = step.getBoundingClientRect();
            if (rect.top <= midpoint && rect.bottom >= midpoint) index = i;
        });

        if (index !== -1 && index !== this.current) {
            this.current = index;
            this.steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
            this.onEnter?.(this.steps[index], index);
        }

        if (this.section) {
            const rect = this.section.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            const scrolled = Math.min(Math.max(-rect.top, 0), total);
            this.onProgress?.(total > 0 ? scrolled / total : 0);
        }
    }
}
