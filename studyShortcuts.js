export function shortcutIndex(key, options) {
  const upper = key.toUpperCase();
  const index = /^[1-9]$/.test(upper) ? Number(upper)-1 : /^[A-I]$/.test(upper) ? upper.charCodeAt(0)-65 : null;
  if (index !== null) return index < options.length ? index : null;
  if (options.length === 2 && /^O(?:[（(]|$)/i.test(options[0]) && /^X(?:[（(]|$)/i.test(options[1])) {
    if (upper === 'O') return 0;
    if (upper === 'X') return 1;
  }
  return null;
}
