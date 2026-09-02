export function catalogSearch(value: string, maximumCharacters = 100) {
  const limit = Math.max(1, Math.trunc(maximumCharacters));
  return Array.from(value.trim()).slice(0, limit).join('');
}
