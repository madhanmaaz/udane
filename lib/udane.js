const net = require("node:net");
const path = require("node:path");

const { LogController } = require("fastify");
const chokidar = require("chokidar");
const { WebSocketServer, WebSocket } = require("ws");

const getConfig = require("../helpers/getConfig.helper");
const createIgnore = require("../helpers/ignore.helper");
const { WS_PATH, PUBLIC_DIR_PREFIX } = require("../constants/index.constant");
const buildApp = require("../app");

const PORT_ATTEMPTS = 20;

function isFree(host, port) {
    return new Promise((resolve) => {
        const probe = net.createServer();
        probe.once("error", () => resolve(false));
        probe.once("listening", () => probe.close(() => resolve(true)));
        probe.listen(port, host);
    });
}

// Returns the first free port starting at `port`.
async function findPort(host, port) {
    const last = Math.min(port + PORT_ATTEMPTS - 1, 65535);

    for (let candidate = port; candidate <= last; candidate++) {
        if (await isFree(host, candidate)) {
            return candidate;
        }
    }

    throw new Error(`No free port found between ${port} and ${last}`);
}

function broadcast(wss, message) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

module.exports = async function udane(options = {}) {
    const config = getConfig(options);
    const port = await findPort(config.host, config.port);

    const logger = config.logRequests
        ? {
              transport: {
                  target: "@fastify/one-line-logger",
                  options: { timeOnly: true },
              },
          }
        : false;

    const app = buildApp(config, {
        logController: new LogController({
            disableRequestLogging: (request) => {
                // Disable logs for /__udane/*
                return request.url.startsWith(`/${PUBLIC_DIR_PREFIX}/`);
            },
        }),
        logger,
    });

    await app.listen({ host: config.host, port });

    const wss = new WebSocketServer({ server: app.server, path: WS_PATH });

    let timer = null;
    let pending = null;

    function schedule(message) {
        if (pending !== "reload") pending = message;

        clearTimeout(timer);
        timer = setTimeout(() => {
            const next = pending;
            pending = null;
            broadcast(wss, next);
        }, config.debounce);
    }

    const watcher = chokidar
        .watch(config.watch, {
            ignored: createIgnore(config.ignore, config.watch),
            ignoreInitial: true,
        })
        .on("all", (event, filepath) => {
            if (config.logChanges) {
                console.log(
                    `[+] ${event} ${path.relative(process.cwd(), filepath)}`,
                );
            }

            const cssOnly =
                config.cssHotSwap &&
                event === "change" &&
                filepath.endsWith(".css");

            schedule(cssOnly ? "refreshcss" : "reload");
        })
        .on("error", (error) => {
            console.error("[-] watcher error:", error.message);
        });

    let closed = false;

    async function close() {
        if (closed) return;
        closed = true;

        clearTimeout(timer);

        // open sockets would keep app.close() waiting
        for (const client of wss.clients) {
            client.terminate();
        }
        wss.close();

        await watcher.close();
        await app.close();
    }

    return {
        app,
        config: { ...config, port },
        requestedPort: config.port,
        port,
        close,
    };
};
