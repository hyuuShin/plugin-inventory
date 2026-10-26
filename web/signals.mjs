const DAY = 86400000;
export function deriveToolSignals(tool, now) {
  const age = (date) => (date ? Date.parse(now) - Date.parse(date) : null);
  const releaseAge = age(tool.release.value?.publishedAt),
    commitAge = age(tool.activity.value?.lastCommitDate);
  return {
    recentRelease:
      releaseAge !== null && releaseAge >= 0 && releaseAge <= 7 * DAY,
    attention:
      tool.metadata.value?.archived === true ||
      tool.metadata.errorCode === "http_404" ||
      tool.activity.value?.pathExists === false,
    noRecentChange: commitAge !== null && commitAge >= 90 * DAY,
    stale: [tool.metadata, tool.release, tool.activity].some(
      (f) =>
        f.status === "error" || !f.succeededAt || age(f.succeededAt) >= 2 * DAY,
    ),
  };
}
