function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function averageVolume(candles, period) {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  const sum = slice.reduce((acc, c) => acc + (c.volume || 0), 0);
  return sum / period;
}

function rsi(candles, period = 14) {
  if (candles.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function stochasticK(candles, period = 14) {
  if (candles.length < period) return null;

  const slice = candles.slice(-period);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  const lastClose = candles[candles.length - 1].close;

  if (highestHigh === lowestLow) return 50;

  return ((lastClose - lowestLow) / (highestHigh - lowestLow)) * 100;
}

function williamsR(candles, period = 14) {
  if (candles.length < period) return null;

  const slice = candles.slice(-period);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  const lastClose = candles[candles.length - 1].close;

  if (highestHigh === lowestLow) return -50;

  return ((highestHigh - lastClose) / (highestHigh - lowestLow)) * -100;
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function isBullish(candle) {
  return candle.close > candle.open;
}

function isBearish(candle) {
  return candle.close < candle.open;
}

function bodySize(candle) {
  return Math.abs(candle.close - candle.open);
}

function candleRange(candle) {
  return candle.high - candle.low;
}

function lowerWick(candle) {
  return Math.min(candle.open, candle.close) - candle.low;
}

function upperWick(candle) {
  return candle.high - Math.max(candle.open, candle.close);
}

function isHammer(candle) {
  const body = bodySize(candle);
  const lower = lowerWick(candle);
  const upper = upperWick(candle);
  const range = candleRange(candle);

  if (range === 0) return false;

  return lower >= body * 2 && upper <= body * 0.7;
}

function isBullishEngulfing(prev, curr) {
  return (
    isBearish(prev) &&
    isBullish(curr) &&
    curr.open <= prev.close &&
    curr.close >= prev.open
  );
}

function isMorningStar(c1, c2, c3) {
  const c1Bearish = isBearish(c1);
  const c3Bullish = isBullish(c3);

  const c1Body = bodySize(c1);
  const c2Body = bodySize(c2);
  const c3Body = bodySize(c3);

  const weakMiddle = c2Body < c1Body * 0.6;
  const strongRecovery = c3.close > (c1.open + c1.close) / 2;

  return c1Bearish && weakMiddle && c3Bullish && strongRecovery && c3Body >= c2Body;
}

function breakoutConfirmation(candles, lookback = 3) {
  if (candles.length < lookback + 1) return false;

  const last = candles[candles.length - 1];
  const prevSlice = candles.slice(-(lookback + 1), -1);
  const highestPrevHigh = Math.max(...prevSlice.map(c => c.high));
  const avgPrevClose =
    prevSlice.reduce((sum, c) => sum + c.close, 0) / prevSlice.length;

  return last.close > highestPrevHigh || last.close > avgPrevClose;
}

function getRecentSwingLow(candles, lookback = 5) {
  if (candles.length < lookback) return null;
  const slice = candles.slice(-lookback);
  return Math.min(...slice.map(c => c.low));
}

function computeTrendScore(candles) {
  const closes = candles.map(c => c.close);
  const lastClose = closes[closes.length - 1];

  let score = 0;

  if (candles.length >= 200) {
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);

    if (lastClose > sma200 * 0.85) score += 8;
    if (sma20 > sma50 * 0.95) score += 6;
  } else if (candles.length >= 50) {
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);

    if (sma20 !== null && sma50 !== null && sma20 > sma50 * 0.95) score += 8;
    if (lastClose > sma50 * 0.9) score += 6;
  }

  if (closes.length >= 11) {
    const close10Ago = closes[closes.length - 11];
    const drop10 = percentChange(lastClose, close10Ago);
    if (drop10 !== null && drop10 > -15) score += 6;
  }

  return Math.min(score, 20);
}

function computeOversoldScore(candles) {
  const currentRsi = rsi(candles, 14);
  const prevRsi = rsi(candles.slice(0, -1), 14);
  const stoch = stochasticK(candles, 14);
  const willr = williamsR(candles, 14);

  let score = 0;
  let oversoldCount = 0;

  if (currentRsi !== null && currentRsi < 30) {
    score += 10;
    oversoldCount++;
  } else if (currentRsi !== null && currentRsi < 35) {
    score += 6;
    oversoldCount++;
  }

  if (stoch !== null && stoch < 20) {
    score += 5;
    oversoldCount++;
  } else if (stoch !== null && stoch < 25) {
    score += 3;
    oversoldCount++;
  }

  if (willr !== null && willr < -80) {
    score += 5;
    oversoldCount++;
  }

  if (currentRsi !== null && prevRsi !== null && currentRsi > prevRsi) {
    score += 2;
  }

  return {
    score: Math.min(score, 20),
    oversoldCount,
    currentRsi,
    stoch,
    willr
  };
}

function computePatternScore(candles) {
  if (candles.length < 3) {
    return {
      score: 0,
      pattern: null,
      confirmed: false
    };
  }

  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];

  let score = 0;
  let pattern = null;

  if (isMorningStar(c1, c2, c3)) {
    score = 20;
    pattern = "morning_star";
  } else if (isBullishEngulfing(c2, c3)) {
    score = 15;
    pattern = "bullish_engulfing";
  } else if (isHammer(c3)) {
    score = 10;
    pattern = "hammer";
  }

  const confirmed = breakoutConfirmation(candles, 3);
  if (pattern && confirmed) score += 5;

  return {
    score: Math.min(score, 25),
    pattern,
    confirmed
  };
}

function computeRiskData(candles) {
  if (candles.length < 3) {
    return {
      buyLevel: null,
      stopLevel: null,
      riskPercent: null,
      riskScore: 0
    };
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const buyLevel = Number(last.close.toFixed(2));
  const stopCandidate1 = getRecentSwingLow(candles, 5);
  const stopCandidate2 = prev.low;
  const stopLevel = Number(Math.min(stopCandidate1, stopCandidate2).toFixed(2));

  if (!buyLevel || !stopLevel || buyLevel <= stopLevel) {
    return {
      buyLevel,
      stopLevel,
      riskPercent: null,
      riskScore: 0
    };
  }

  const riskPercent = ((buyLevel - stopLevel) / buyLevel) * 100;

  let riskScore = 0;
  if (riskPercent < 1.5) riskScore = 25;
  else if (riskPercent < 2) riskScore = 20;
  else if (riskPercent < 2.5) riskScore = 12;
  else if (riskPercent <= 3) riskScore = 5;
  else riskScore = 0;

  return {
    buyLevel,
    stopLevel,
    riskPercent: Number(riskPercent.toFixed(2)),
    riskScore
  };
}

function computeVolumeScore(candles) {
  if (candles.length < 11) return 0;

  const last = candles[candles.length - 1];
  const avgVol10 = averageVolume(candles.slice(0, -1), 10);

  if (!avgVol10) return 0;

  return last.volume > avgVol10 ? 10 : 0;
}

function analyzeTicker(ticker, candles) {
  if (!Array.isArray(candles) || candles.length < 20) {
    return null;
  }

  const trendScore = computeTrendScore(candles);

  const oversold = computeOversoldScore(candles);
  const oversoldScore = oversold.score;

  const pattern = computePatternScore(candles);
  const patternScore = pattern.score;

  const riskData = computeRiskData(candles);
  const volumeScore = computeVolumeScore(candles);

  const totalScore =
    trendScore +
    oversoldScore +
    patternScore +
    riskData.riskScore +
    volumeScore;

  const qualifiesOversold = oversold.oversoldCount >= 2;
  const validRisk =
    riskData.riskPercent !== null &&
    riskData.riskPercent <= 3 &&
    riskData.buyLevel > riskData.stopLevel;

  const result = {
    ticker,
    buyLevel: riskData.buyLevel,
    stopLevel: riskData.stopLevel,
    riskPercent: riskData.riskPercent,
    score: totalScore,
    trendScore,
    oversoldScore,
    patternScore,
    riskScore: riskData.riskScore,
    volumeScore,
    pattern: pattern.pattern,
    confirmed: pattern.confirmed,
    rsi: oversold.currentRsi !== null ? Number(oversold.currentRsi.toFixed(2)) : null,
    stochastic: oversold.stoch !== null ? Number(oversold.stoch.toFixed(2)) : null,
    williamsR: oversold.willr !== null ? Number(oversold.willr.toFixed(2)) : null,
    type: null
  };

  if (!qualifiesOversold || !validRisk) {
    return null;
  }

  if (totalScore >= 60 && pattern.confirmed) {
    result.type = "guncel_sinyal";
    return result;
  }

  if (totalScore >= 50) {
    result.type = "erken_alim_sinyali";
    return result;
  }

  return null;
}

function analyzeMarket(allData) {
  const signals = [];
  const earlySignals = [];

  for (const item of allData) {
    const result = analyzeTicker(item.ticker, item.candles);
    if (!result) continue;

    if (result.type === "guncel_sinyal") {
      signals.push(result);
    } else if (result.type === "erken_alim_sinyali") {
      earlySignals.push(result);
    }
  }

  signals.sort((a, b) => b.score - a.score || a.riskPercent - b.riskPercent);
  earlySignals.sort((a, b) => b.score - a.score || a.riskPercent - b.riskPercent);

  return {
    signals,
    earlySignals
  };
}

module.exports = {
  analyzeMarket,
  analyzeTicker
};
s
