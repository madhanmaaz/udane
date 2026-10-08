const path = require("node:path");
const http = require("node:http");

const fastify = require("fastify");
const tarkine = require("tarkine");

const {
    listDirectory,
    resolveDirectory,
} = require("./helpers/directory.helper");
const templateEngine = require("./helpers/templateEngine.helper");
const { PUBLIC_DIR_PREFIX } = require("./constants/index.constant");

const noStore = {
    cacheControl: false,
    setHeaders(reply) {
        reply.header("cache-control", "no-store");
    },
};

module.exports = function buildApp(appConfig = {}, fastifyOptions = {}) {
    const app = fastify(fastifyOptions);

    if (appConfig.cors) {
        app.addHook("onRequest", async (request, reply) => {
            reply.header("access-control-allow-origin", "*");
        });
    }

    // plugins
    app.decorateReply("render", tarkine.adapters.fastify(templateEngine));

    // inject script
    app.addHook("onSend", require("./middleware/inject.middleware"));

    // udane's own assets. This is the first static instance, so it owns the reply decorator.
    app.register(require("@fastify/static"), {
        root: path.join(__dirname, "public"),
        prefix: `/${PUBLIC_DIR_PREFIX}/`,
    });

    // extra folders from appConfig.mount
    for (const [prefix, root] of Object.entries(appConfig.mount)) {
        app.register(require("@fastify/static"), {
            root,
            prefix: `${prefix}/`,
            decorateReply: false,
            ...noStore,
        });
    }

    // the project being served
    app.register(require("@fastify/static"), {
        root: appConfig.root,
        index: appConfig.index,
        decorateReply: false,
        ...noStore,
    });

    app.setErrorHandler((error, request, reply) => {
        const statusCode = error.statusCode || 500;
        const title = http.STATUS_CODES[statusCode];

        reply.render("/error", {
            PUBLIC_DIR_PREFIX,
            statusCode,
            title,
        });
    });

    app.setNotFoundHandler(async (request, reply) => {
        const { pathname } = new URL(request.url, "http://localhost");

        if (request.method === "GET") {
            const folder = resolveDirectory(pathname, appConfig);

            if (folder) {
                const listing = await listDirectory(folder, pathname);

                return reply.render("listing", {
                    PUBLIC_DIR_PREFIX,
                    listing,
                });
            }
        }

        return reply.render("/error", {
            statusCode: 404,
            title: "Not Found",
            PUBLIC_DIR_PREFIX,
        });
    });

    return app;
};
