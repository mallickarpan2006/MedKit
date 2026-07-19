import { useState, useEffect } from 'react';

let cached = null;

export function useXlmUsd() {
  const [price, setPrice] = useState(cached || 0.15);

  useEffect(() => {
    if (cached) { setPrice(cached); return; }
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd')
      .then(r => r.json())
      .then(d => {
        const p = d && d.stellar && d.stellar.usd;
        if (p) { cached = p; setPrice(p); }
      })
      .catch(() => {});
  }, []);

  return price;
}
