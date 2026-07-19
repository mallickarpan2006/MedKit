export function formatXlm(stroops) {
  return (Number(stroops || 0) / 1e7).toFixed(2);
}

export function shortAddress(address = '') {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}
