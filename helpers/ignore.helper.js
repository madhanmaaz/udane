// Builds the `ignored` function for chokidar from config.ignore.
// - a pattern without "/" matches any file or folder name ("node_modules", "*.log", ".git")
// - a pattern with "/" matches a path fragment ("dist/cache")
// - "*" matches any characters, "?" matches one character
// Matching ignores the part of the path above the watched root, so serving a
// project that lives inside a folder like "node_modules" still works.

const escape = (text) => text.replace(/[.+^${}()|[\]\\]/g, "\\$&");

const toRegex = (pattern) =>
    new RegExp(`^${escape(pattern).replace(/\*/g, ".*").replace(/\?/g, ".")}$`);

module.exports = function createIgnore(patterns, roots) {
    const matchers = patterns.map((pattern) => {
        const clean = pattern
            .replace(/\\/g, "/")
            .replace(/^\.?\//, "")
            .replace(/\/+$/, "");

        return { clean, hasSlash: clean.includes("/"), regex: toRegex(clean) };
    });

    const bases = roots.map((root) =>
        root.replace(/\\/g, "/").replace(/\/+$/, ""),
    );

    return (filepath) => {
        let normalized = filepath.replace(/\\/g, "/");

        const base = bases.find(
            (item) => normalized === item || normalized.startsWith(`${item}/`),
        );

        if (base) {
            normalized = normalized.slice(base.length);
        }

        const segments = normalized.split("/").filter(Boolean);

        return matchers.some(({ clean, hasSlash, regex }) =>
            hasSlash
                ? normalized.endsWith(`/${clean}`) ||
                  normalized.includes(`/${clean}/`)
                : segments.some((segment) => regex.test(segment)),
        );
    };
};
