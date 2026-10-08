(function () {
    if (!("WebSocket" in window)) {
        console.error(
            "[udane] This browser does not support WebSocket, live reload is disabled.",
        );
        return;
    }

    const PARAM = "_udaneCacheOverride";
    const RETRY_MS = 7000;

    function refreshCSS() {
        const links = document.querySelectorAll(
            'link[rel~="stylesheet"][href]',
        );

        for (const link of links) {
            const url = new URL(link.href, location.href);
            if (url.origin !== location.origin) continue;

            url.searchParams.set(PARAM, Date.now());

            // load the new copy first, remove the old one after it is ready
            const next = link.cloneNode();
            next.href = url.href;
            next.addEventListener("load", () => link.remove());
            next.addEventListener("error", () => next.remove());
            link.after(next);
        }
    }

    let wasConnected = false;

    function connect() {
        const protocol = location.protocol === "https:" ? "wss://" : "ws://";
        const socket = new WebSocket(`${protocol}${location.host}/__udane-ws`);

        socket.addEventListener("open", () => {
            // the server came back after a restart, so the page may be stale
            if (wasConnected) return location.reload();
            wasConnected = true;
        });

        socket.addEventListener("message", (event) => {
            if (event.data === "reload") {
                location.reload();
            } else if (event.data === "refreshcss") {
                refreshCSS();
            }
        });

        socket.addEventListener("close", () => setTimeout(connect, RETRY_MS));
    }

    connect();
})();
