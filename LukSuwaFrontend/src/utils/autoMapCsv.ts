type Mapping = {
  name?: string;
  qty?: string;
  sku?: string;
  unit_price?: string;
  expiry_date?: string;
  batch_no?: string;
  brand?: string;
  strength?: string;
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\(.*?\)/g, "")       // remove (..)
    .replace(/[^a-z0-9]+/g, " ")   // symbols -> space
    .replace(/\s+/g, " ")
    .trim();

// simple levenshtein for fuzzy compare
const levenshtein = (a: string, b: string) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
};

const bestMatch = (headers: string[], candidates: string[]) => {
  // exact contains first
  for (const h of headers) {
    const nh = normalize(h);
    if (candidates.some(c => nh.includes(normalize(c)))) return h;
  }

  // fuzzy match fallback
  let best: { h: string; score: number } | null = null;
  for (const h of headers) {
    const nh = normalize(h);
    for (const c of candidates) {
      const nc = normalize(c);
      const dist = levenshtein(nh, nc);
      const score = 1 - dist / Math.max(nh.length, nc.length, 1); // 0..1
      if (!best || score > best.score) best = { h, score };
    }
  }
  // threshold
  return best && best.score >= 0.72 ? best.h : undefined;
};

export const autoMapCsvHeaders = (headers: string[]): Mapping => {
  const map: Mapping = {};

  map.name = bestMatch(headers, [
    "name", "item name", "product", "product name", "medicine", "drug", "description", "item"
  ]);

  map.qty = bestMatch(headers, [
    "qty", "quantity", "stock", "on hand", "balance", "available", "in stock", "current stock"
  ]);

  map.sku = bestMatch(headers, [
    "sku", "code", "item code", "product code", "barcode", "bar code"
  ]);

  map.unit_price = bestMatch(headers, [
    "unit price", "price", "selling price", "sale price", "mrp", "rate", "unitrate"
  ]);

  map.expiry_date = bestMatch(headers, [
    "expiry", "expire", "expiry date", "exp date", "exp", "date of expiry"
  ]);

  map.batch_no = bestMatch(headers, [
    "batch", "batch no", "batch number", "lot", "lot no"
  ]);

  map.brand = bestMatch(headers, [
    "brand", "manufacturer", "mfg", "company"
  ]);

  map.strength = bestMatch(headers, [
    "strength", "dosage", "dose", "mg", "concentration"
  ]);

  return map;
};
