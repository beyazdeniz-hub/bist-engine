const fs = require("fs");
const { analyzeMarket } = require("./engine");

const raw = fs.readFileSync("./marketData.json", "utf8");
const marketData = JSON.parse(raw);

const result = analyzeMarket(marketData);

console.log("\n=== GUNCEL SINYALLER ===\n");
console.table(
  result.signals.map(item => ({
    ticker: item.ticker,
    buyLevel: item.buyLevel,
    stopLevel: item.stopLevel,
    riskPercent: item.riskPercent,
    score: item.score,
    pattern: item.pattern,
    confirmed: item.confirmed,
    rsi: item.rsi,
    stochastic: item.stochastic
  }))
);

console.log("\n=== ERKEN ALIM SINYALLERI ===\n");
console.table(
  result.earlySignals.map(item => ({
    ticker: item.ticker,
    buyLevel: item.buyLevel,
    stopLevel: item.stopLevel,
    riskPercent: item.riskPercent,
    score: item.score,
    pattern: item.pattern,
    confirmed: item.confirmed,
    rsi: item.rsi,
    stochastic: item.stochastic
  }))
);

console.log("\nDETAYLI JSON SONUCU:\n");
console.log(JSON.stringify(result, null, 2));
