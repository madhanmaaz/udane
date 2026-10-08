const { PUBLIC_DIR_PREFIX } = require("../constants/index.constant");

const SCRIPT = `<script src="/${PUBLIC_DIR_PREFIX}/js/client.js"></script>`;
const CLOSING_BODY = /<\/body\s*>/gi;

async function toText(payload) {
    if (typeof payload === "string") return payload;
    if (Buffer.isBuffer(payload)) return payload.toString("utf8");

    // static files are streamed
    const chunks = [];
    for await (const chunk of payload) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
}

function inject(html) {
    if (html.includes(SCRIPT)) return html;

    const last = [...html.matchAll(CLOSING_BODY)].at(-1);
    if (!last) return html + SCRIPT;

    return html.slice(0, last.index) + SCRIPT + "\n" + html.slice(last.index);
}

module.exports = async function injectMiddleware(request, reply, payload) {
    if (request.method !== "GET" || payload == null) return payload;

    // 304 and 206 have no full body to rewrite
    if (reply.statusCode === 304 || reply.statusCode === 206) return payload;

    const type = String(reply.getHeader("content-type") ?? "");
    if (!type.includes("text/html")) return payload;

    // compressed bodies cannot be edited as text
    if (reply.getHeader("content-encoding")) return payload;

    reply.removeHeader("content-length");
    reply.removeHeader("accept-ranges");
    reply.header("cache-control", "no-store");

    return inject(await toText(payload));
};
