export function mergeUserDirectory<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const users = new Map(current.map(user => [user.id, user]));
  for (const user of incoming) users.set(user.id, user);
  return Array.from(users.values());
}

export function boundedDistinctIDs(values: unknown[], limit = 100): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = String(value || '').trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
      if (result.length === limit) break;
    }
  }
  return result;
}
