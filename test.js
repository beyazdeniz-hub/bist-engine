const fs = require("fs");
const { analyzeMarket } = require("./engine");

const raw = fs.readFileSync("./marketData.json", "utf8");
const data = JSON.parse(raw);

const result = analyzeMarket(data);

console.log(result);
