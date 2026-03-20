function analyzeMarket(data) {
  const results = [];

  for (const item of data) {
    const candles = item.candles;
    if (!candles || candles.length < 20) continue;

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const risk = ((last.close - prev.low) / last.close) * 100;

    if (risk <= 3 && last.close > prev.close) {
      results.push({
        ticker: item.ticker,
        buyLevel: last.close,
        stopLevel: prev.low,
        riskPercent: Number(risk.toFixed(2)),
        score: Math.round(100 - risk * 10)
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

module.exports = { analyzeMarket };
