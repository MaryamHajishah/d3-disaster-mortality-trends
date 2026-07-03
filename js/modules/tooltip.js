export class Tooltip {
    constructor(el) {
        this.el = el;
    }

    show(html, x, y) {
        this.el.innerHTML = html;
        this.move(x, y);
        this.el.classList.add('is-visible');
    }

    move(x, y) {
        const pad = 14;
        const rect = this.el.getBoundingClientRect();
        let left = x + pad;
        let top = y + pad;
        if (left + rect.width > window.innerWidth) left = x - rect.width - pad;
        if (top + rect.height > window.innerHeight) top = y - rect.height - pad;
        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
    }

    hide() {
        this.el.classList.remove('is-visible');
    }
}
