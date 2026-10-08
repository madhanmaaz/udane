#!/usr/bin/env node

const process = require("node:process");
const { parseArgs } = require("node:util");
const path = require("node:path");
const fs = require("node:fs");

const udane = require("./udane");
const pkg = require("../package.json");

const HELP = `
udane v${pkg.version}
Live-reload development server.

Usage
  udane [root] [options]
  udane init [--force]

Commands
  init                     Copy the default config file into the current folder

Options
  -p, --port <number>      Port to listen on
  -H, --host <address>     Interface to bind (0.0.0.0 = network, 127.0.0.1 = local only)
      --cors               Send Access-Control-Allow-Origin: *
      --debounce <ms>      Wait time after the last file change
      --watch <path>       Path to watch (repeatable)
      --ignore <pattern>   Pattern to ignore (repeatable)
  -f, --force              Overwrite an existing config file (init only)
  -h, --help               Show this help
  -v, --version            Show the version
`;

function readArgs(argv) {
    const { values, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            port: { type: "string", short: "p" },
            host: { type: "string", short: "H" },
            cors: { type: "boolean" },
            debounce: { type: "string" },
            watch: { type: "string", multiple: true },
            ignore: { type: "string", multiple: true },
            force: { type: "boolean", short: "f" },
            help: { type: "boolean", short: "h" },
            version: { type: "boolean", short: "v" },
        },
    });

    const number = (value) => (value === undefined ? undefined : Number(value));
    const command = positionals[0] === "init" ? "init" : undefined;

    return {
        command,
        force: values.force,
        help: values.help,
        version: values.version,

        // undefined values are dropped by getConfig, so unset flags never override config
        options: {
            root: command ? undefined : positionals[0],
            port: number(values.port),
            host: values.host,
            cors: values.cors,
            debounce: number(values.debounce),
            watch: values.watch,
            ignore: values.ignore,
        },
    };
}

function init(force) {
    const source = path.join(__dirname, "..", "config", "udane.config.js");
    const target = path.join(process.cwd(), "udane.config.js");

    if (fs.existsSync(target) && !force) {
        throw new Error(
            "udane.config.js already exists (use --force to overwrite)",
        );
    }

    fs.copyFileSync(source, target);
    console.log(`[+] Created ${target}`);
}

async function main() {
    const { command, force, help, version, options } = readArgs(
        process.argv.slice(2),
    );

    if (help) return console.log(HELP);
    if (version) return console.log(pkg.version);
    if (command === "init") return init(force);

    const server = await udane(options);

    if (server.port !== server.requestedPort) {
        console.log(
            `[+] Port ${server.requestedPort} is busy, using ${server.port}`,
        );
    }

    console.log(
        `\n[+] udane v${pkg.version} by https://madhanmaaz.netlify.app`,
    );
    console.log(`[+] Root: ${server.config.root}\n`);

    let closing = false;
    const shutdown = async () => {
        if (closing) return;
        closing = true;
        await server.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((error) => {
    // console.log(error);
    console.error(`[-] ${error.message}`);
    process.exit(1);
});
