const process = require("node:process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const { z } = require("zod");

const defaults = require("../config/udane.config");
const { PUBLIC_DIR_PREFIX } = require("../constants/index.constant");

const NESTED = ["mount"];
const CONFIG_NAME = "udane.config.js";
const RESERVED_PREFIX = `/${PUBLIC_DIR_PREFIX}`;

const configSchema = z
    .object({
        host: z.string(),
        port: z.number().int().min(1).max(65535),
        root: z.string(),
        mount: z.record(z.string().startsWith("/"), z.string()),
        index: z.array(z.string()),
        cors: z.boolean(),
        cssHotSwap: z.boolean(),
        debounce: z.number().int().min(0),
        watch: z.array(z.string()),
        ignore: z.array(z.string()),
        logRequests: z.boolean(),
        logChanges: z.boolean(),
    })
    .strict();

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Drops undefined values so an unset CLI flag never overwrites a real value.
function clean(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined),
    );
}

// Looks for udane.config.js inside a folder. Returns { path, config } or null.
function loadConfigFile(dir) {
    const file = path.join(dir, CONFIG_NAME);
    if (!fs.existsSync(file)) return null;

    let config;
    try {
        config = require(file);
    } catch (err) {
        throw new Error(`Failed to load ${file}: ${err.message}`);
    }

    if (!isPlainObject(config)) {
        throw new Error(
            `${file} must export an object (module.exports = { ... })`,
        );
    }

    return { path: file, config };
}

function mergeConfigs(...sources) {
    const result = {};

    for (const source of sources) {
        for (const [key, value] of Object.entries(source)) {
            result[key] =
                NESTED.includes(key) && isPlainObject(value)
                    ? { ...result[key], ...value }
                    : value;
        }
    }

    return result;
}

function formatIssues(error, files) {
    const where = files.length ? ` (config: ${files.join(", ")})` : "";
    const lines = error.issues.map((issue) => {
        const key =
            issue.code === "unrecognized_keys"
                ? issue.keys.join(", ")
                : issue.path.join(".") || "(root)";
        return `  ${key}: ${issue.message}`;
    });

    return `Invalid config${where}\n${lines.join("\n")}`;
}

// Expands "~" (Node does not) and resolves to an absolute path.
function expandPath(target, cwd) {
    let value = target;

    if (value === "~") {
        value = os.homedir();
    } else if (value.startsWith("~/") || value.startsWith("~\\")) {
        value = path.join(os.homedir(), value.slice(2));
    }

    return path.resolve(cwd, value);
}

function assertFolder(folder, label) {
    let stat;

    try {
        stat = fs.statSync(folder);
    } catch {
        throw new Error(`${label} not found: ${folder}`);
    }

    if (!stat.isDirectory()) {
        throw new Error(`${label} is not a folder: ${folder}`);
    }
}

function normalizeMount(mount, cwd) {
    const result = {};

    for (const [prefix, target] of Object.entries(mount)) {
        const key = prefix.replace(/\/+$/, "");

        if (!key) {
            throw new Error(`mount: "/" is not allowed as a prefix`);
        }

        if (key === RESERVED_PREFIX || key.startsWith(`${RESERVED_PREFIX}/`)) {
            throw new Error(`mount: "${prefix}" is reserved by udane`);
        }

        const folder = expandPath(target, cwd);
        assertFolder(folder, `mount "${prefix}"`);
        result[key] = folder;
    }

    return result;
}

function normalize(config, cwd) {
    const root = expandPath(config.root, cwd);
    assertFolder(root, "root");

    return {
        ...config,
        root,
        mount: normalizeMount(config.mount, cwd),
        // Empty list means watch the whole root.
        watch: config.watch.length
            ? config.watch.map((item) => path.resolve(root, item))
            : [root],
    };
}

// Priority (lowest to highest):
// defaults < ~/.config/udane.config.js < udane.config.js in cwd < options (CLI flags)
module.exports = function getConfig(options = {}) {
    const cwd = process.cwd();

    const files = [
        loadConfigFile(path.join(os.homedir(), ".config")),
        loadConfigFile(cwd),
    ].filter(Boolean);

    const merged = mergeConfigs(
        defaults,
        ...files.map((file) => file.config),
        clean(options),
    );

    const result = configSchema.safeParse(merged);

    if (!result.success) {
        throw new Error(
            formatIssues(
                result.error,
                files.map((file) => file.path),
            ),
        );
    }

    return Object.freeze({
        ...normalize(result.data, cwd),
        configFiles: files.map((file) => file.path),
    });
};
