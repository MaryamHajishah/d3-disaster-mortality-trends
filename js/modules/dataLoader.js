export class DataLoader {
    constructor() {
        this.cache = new Map();
    }

    async load(path) {
        if (this.cache.has(path)) return this.cache.get(path);
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        const json = await res.json();
        this.cache.set(path, json);
        return json;
    }

    async loadAll(paths) {
        const entries = await Promise.all(
            Object.entries(paths).map(async ([key, path]) => [key, await this.load(path)])
        );
        return Object.fromEntries(entries);
    }
}
