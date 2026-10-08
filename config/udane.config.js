// config/udane.config.js
// Default configuration for udane.
// Priority (lowest to highest): these defaults < udane.config.js in the user's cwd < CLI flags.
// Every option is listed here so this file doubles as the reference.

module.exports = {
    // "0.0.0.0" exposes the server to the local network (phone testing, other devices).
    // Use "127.0.0.1" to keep it private to this machine.
    host: "0.0.0.0",

    // Port to listen on. If it is busy, udane tries the next free port.
    port: 5300,

    // Folder to serve, relative to the current working directory.
    root: ".",

    // Extra folders served under a URL prefix. Empty by default, because with
    // host "0.0.0.0" everything mounted here is visible to the whole network.
    // Keys are URL prefixes, values are folders ("~" is expanded to the home directory).
    // Example: { "/downloads": "~/Downloads" }
    mount: {},

    // Entry files tried for a directory, in order.
    index: ["index.html"],

    // Send "Access-Control-Allow-Origin: *" on every response.
    cors: false,

    // Swap changed CSS in place without a full page reload.
    cssHotSwap: true,

    // Milliseconds to wait after the last file change before notifying the browser.
    // Prevents several reloads when an editor writes many files at once.
    debounce: 100,

    // Paths to watch, relative to root. Empty array means watch the whole root.
    watch: [],

    // Paths and patterns the watcher ignores.
    ignore: ["node_modules", ".git", ".DS_Store", "*.log"],

    // Print one line per request.
    logRequests: true,

    // Print a line when a watched file changes.
    logChanges: true,
};
