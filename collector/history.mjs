const DAY = 86400000;
const key = (o) =>
  o.repositoryId + ":" + o.scopePath + ":" + o.observedAt.slice(0, 10);
export function mergeObservations(previous, incoming, { now, days = 90 }) {
  const result = new Map(previous.map((o) => [key(o), structuredClone(o)]));
  for (const next of incoming) {
    const old = result.get(key(next));
    if (old && !Object.values(next.valid).some(Boolean)) continue;
    const merged = old
      ? { ...old, observedAt: next.observedAt, valid: { ...old.valid } }
      : structuredClone(next);
    for (const [name, valueKey] of [
      ["stars", "stars"],
      ["release", "releaseId"],
      ["activity", "commitSha"],
    ]) {
      if (next.valid[name]) {
        merged[valueKey] = next[valueKey];
        merged.valid[name] = true;
        merged[name + "ObservedAt"] = next.observedAt;
      } else if (old?.valid[name])
        merged[name + "ObservedAt"] =
          old[name + "ObservedAt"] ?? old.observedAt;
    }
    result.set(key(next), merged);
  }
  const cutoff = Date.parse(now) - days * DAY;
  return [...result.values()]
    .filter((o) => Date.parse(o.observedAt) >= cutoff)
    .sort(
      (a, b) =>
        a.observedAt.localeCompare(b.observedAt) ||
        a.repositoryId - b.repositoryId ||
        a.scopePath.localeCompare(b.scopePath),
    );
}
export function findWeeklyBaseline(observations, { repositoryId, now }) {
  const rows = observations
    .filter(
      (o) =>
        o.repositoryId === repositoryId &&
        o.scopePath === "" &&
        o.valid.stars &&
        Number.isInteger(o.stars) &&
        o.stars >= 0,
    )
    .map((o) => ({ ...o, observedAt: o.starsObservedAt ?? o.observedAt }))
    .filter((o) => Date.parse(o.observedAt) <= Date.parse(now))
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const current = rows[0];
  if (!current || Date.parse(now) - Date.parse(current.observedAt) > 2 * DAY)
    return null;
  const at = Date.parse(current.observedAt);
  const eligible = rows.filter(
    (o) =>
      at - Date.parse(o.observedAt) >= 6 * DAY &&
      at - Date.parse(o.observedAt) <= 8 * DAY,
  );
  eligible.sort(
    (a, b) =>
      Math.abs(at - Date.parse(a.observedAt) - 7 * DAY) -
      Math.abs(at - Date.parse(b.observedAt) - 7 * DAY),
  );
  return eligible[0] ? { baseline: eligible[0], current } : null;
}
export function retainWeeks(weeks, { count = 52 } = {}) {
  return [...new Map(weeks.map((w) => [w.weekId, w])).values()]
    .sort((a, b) => b.weekId.localeCompare(a.weekId))
    .slice(0, count);
}
