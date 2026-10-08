const fs = require("node:fs");
const path = require("node:path");

// Maps a URL path to a real folder inside a mount or root. Returns null if it is not one.
function resolveDirectory(pathname, config) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        return null;
    }

    // longest mount prefix first, root last
    const targets = [
        ...Object.entries(config.mount)
            .map(([prefix, dir]) => ({ prefix, dir }))
            .sort((a, b) => b.prefix.length - a.prefix.length),
        { prefix: "", dir: config.root },
    ];

    for (const { prefix, dir } of targets) {
        if (prefix && decoded !== prefix && !decoded.startsWith(`${prefix}/`))
            continue;

        const full = path.resolve(dir, `.${decoded.slice(prefix.length)}`);
        const inside = path.relative(dir, full);

        // blocks "../" traversal outside the served folder
        if (inside.startsWith("..") || path.isAbsolute(inside)) continue;

        try {
            if (fs.statSync(full).isDirectory()) return full;
        } catch {
            // not found in this target, try the next one
        }
    }

    return null;
}

async function listDirectory(full, pathname) {
    const base = pathname.endsWith("/") ? pathname : `${pathname}/`;
    const items = await fs.promises.readdir(full, { withFileTypes: true });

    const entries = items
        .filter((item) => !item.name.startsWith("."))
        .map((item) => {
            const isDirectory = item.isDirectory();
            return {
                name: isDirectory ? `${item.name}/` : item.name,
                href:
                    base +
                    encodeURIComponent(item.name) +
                    (isDirectory ? "/" : ""),
                isDirectory,
            };
        })
        .sort(
            (a, b) =>
                Number(b.isDirectory) - Number(a.isDirectory) ||
                a.name.localeCompare(b.name),
        );

    return {
        parent: base === "/" ? null : base.replace(/[^/]+\/$/, ""),
        base,
        entries,
    };
}

module.exports = {
    resolveDirectory,
    listDirectory,
};
