import { findWeeklyBaseline } from "./history.mjs";
const DAY = 86400000;
const compare = (a, b) =>
  (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0) ||
  b.stars - a.stars ||
  a.fullName.localeCompare(b.fullName);
export function candidateFromRepo(repo, now, previous) {
  return {
    repositoryId: repo.id,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? "",
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
    archived: repo.archived === true,
    fork: repo.fork === true,
    discoveredAt: previous?.discoveredAt ?? now,
    lastSuccessfulAt: now,
  };
}
export function refreshCandidatePool({
  previous,
  searchResults,
  trackedRepositoryIds,
  config,
  now,
  reportDue = false,
}) {
  const tracked = new Set(trackedRepositoryIds),
    prior = new Map(previous.map((c) => [c.repositoryId, c]));
  const map = new Map();
  for (const c of [...previous, ...searchResults]) {
    if (tracked.has(c.repositoryId) || c.archived || c.fork) {
      map.delete(c.repositoryId);
      continue;
    }
    map.set(c.repositoryId, {
      ...c,
      discoveredAt:
        prior.get(c.repositoryId)?.discoveredAt ?? c.discoveredAt ?? now,
    });
  }
  const all = [...map.values()];
  // Protect the previous pool while the report still needs its observations.
  if (!reportDue)
    all.sort(
      (a, b) =>
        Number(prior.has(b.repositoryId)) - Number(prior.has(a.repositoryId)) ||
        compare(a, b),
    );
  else all.sort((a, b) => b.stars - a.stars || compare(a, b));
  return all.slice(0, config.limits.candidates);
}
export function weekIdFor(now) {
  const d = new Date(Date.parse(now) + 9 * 3600000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function buildWeeklyReport({
  candidates,
  observations,
  now,
  coverage = {},
}) {
  const growth = [],
    newcomers = [];
  for (const c of candidates) {
    if (
      c.archived ||
      c.fork ||
      !c.lastSuccessfulAt ||
      Date.parse(now) - Date.parse(c.lastSuccessfulAt) > 2 * DAY
    )
      continue;
    const comparison = findWeeklyBaseline(observations, {
      repositoryId: c.repositoryId,
      now,
    });
    if (comparison) {
      const { baseline, current } = comparison,
        delta = current.stars - baseline.stars;
      if (delta > 0)
        growth.push({
          ...c,
          stars: current.stars,
          baselineStars: baseline.stars,
          baselineAt: baseline.observedAt,
          observedAt: current.observedAt,
          delta,
        });
    } else if (Date.parse(now) - Date.parse(c.discoveredAt) <= 8 * DAY)
      newcomers.push({ ...c, delta: null });
  }
  growth.sort((a, b) => b.delta - a.delta || compare(a, b));
  newcomers.sort((a, b) => b.stars - a.stars || compare(a, b));
  return {
    weekId: weekIdFor(now),
    publishedAt: now,
    status:
      coverage.searchComplete === false || coverage.failed > 0
        ? "partial"
        : "ok",
    growth: growth.slice(0, 5),
    newcomers: newcomers.slice(0, 5),
    coverage: { ...coverage, poolSize: candidates.length },
  };
}
