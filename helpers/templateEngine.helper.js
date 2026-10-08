const path = require("node:path");

const tarkine = require("tarkine");

const engine = tarkine.createEngine({
    templateRoot: path.resolve(__dirname, "../views"),
    cache: false
});

module.exports = engine;
