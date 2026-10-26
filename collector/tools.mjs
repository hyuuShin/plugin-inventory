import { field } from "../shared/contracts.mjs";
const DAY = 86400000;
const errorCode = (e) => e.code ?? "http_" + (e.status ?? 0);
function projectMetadata(repo) {
  if (repo.private) throw Error("공개 저장소만 지원합니다");
  return {
    repositoryId: repo.id,
    fullName: repo.full_name,
    description: repo.description ?? "",
    stars: repo.stargazers_count,
    archived: repo.archived === true,
    defaultBranch: repo.default_branch,
    url: repo.html_url,
    pushedAt: repo.pushed_at,
  };
}
export async function collectTool({
  registration,
  previous,
  client,
  now,
  commitPages = 5,
}) {
  const target = registration.target,
    root = "/repos/" + target.owner + "/" + target.repo;
  const sameScope =
    previous?.target?.repositoryId === target.repositoryId &&
    previous?.target?.scopePath === target.scopePath;
  if (!sameScope) previous = null;
  let metadata, release, activity;
  try {
    const result = await client.get(root);
    metadata = field(projectMetadata(result.data), "ok", now);
  } catch (e) {
    metadata = field(null, "error", now, previous?.metadata, errorCode(e));
  }
  try {
    const list = await client.paginate(root + "/releases", { maxPages: 5 });
    const stable = list.items
      .filter((r) => !r.draft && !r.prerelease && r.published_at)
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    const r = stable[0],
      value = r
        ? {
            id: r.id,
            tag: r.tag_name,
            publishedAt: r.published_at,
            url: r.html_url ?? null,
            scope: "repository",
          }
        : null;
    release = field(
      value,
      !list.complete ? "partial" : value ? "ok" : "missing",
      now,
    );
    if (
      !list.complete &&
      previous?.release?.succeededAt &&
      (!value ||
        !previous.release.value ||
        Date.parse(value.publishedAt) <=
          Date.parse(previous.release.value.publishedAt))
    ) {
      release = {
        ...release,
        value: previous.release.value ?? null,
        succeededAt: previous.release.succeededAt,
        errorCode: "incomplete_releases",
      };
    } else if (!list.complete && !value) release.succeededAt = null;
  } catch (e) {
    release = field(null, "error", now, previous?.release, errorCode(e));
  }
  try {
    let pathExists = true;
    if (target.scopePath) {
      try {
        const { data: content } = await client.get(
          root +
            "/contents/" +
            target.scopePath.split("/").map(encodeURIComponent).join("/"),
          { query: { ref: target.defaultBranch } },
        );
        pathExists =
          target.scopeType === "directory"
            ? Array.isArray(content) || content.type === "dir"
            : !Array.isArray(content) && content.type === "file";
      } catch (e) {
        if (e.status === 404) pathExists = false;
        else throw e;
      }
    }
    const query = {
      sha: target.defaultBranch,
      ...(target.scopePath ? { path: target.scopePath } : {}),
    };
    let latest = null,
      commits = [],
      complete = true;
    try {
      latest =
        (
          await client.get(root + "/commits", {
            query: { ...query, per_page: 1 },
          })
        ).data[0] ?? null;
      const list = await client.paginate(root + "/commits", {
        query: {
          ...query,
          since: new Date(Date.parse(now) - 84 * DAY).toISOString(),
        },
        maxPages: commitPages,
      });
      commits = list.items;
      complete = list.complete;
    } catch (e) {
      if (e.code !== "empty_repository") throw e;
    }
    const start = Date.parse(now) - 84 * DAY,
      dates = commits
        .map((c) =>
          Date.parse(c.commit?.committer?.date ?? c.commit?.author?.date),
        )
        .filter(Number.isFinite);
    const oldest = dates.length ? Math.min(...dates) : Date.parse(now);
    const bins = Array.from({ length: 12 }, (_, i) => {
      const from = start + i * 7 * DAY,
        to = from + 7 * DAY;
      return {
        start: new Date(from).toISOString(),
        count:
          !complete && from < oldest
            ? null
            : dates.filter((d) => d >= from && d < to).length,
      };
    });
    activity = field(
      {
        scopeType: target.scopeType,
        scopePath: target.scopePath,
        lastCommitSha: latest?.sha ?? null,
        lastCommitDate:
          latest?.commit?.committer?.date ??
          latest?.commit?.author?.date ??
          null,
        lastCommitUrl: latest?.html_url ?? null,
        pathExists,
        bins,
        complete,
      },
      !pathExists ? "missing" : complete ? "ok" : "partial",
      now,
    );
  } catch (e) {
    activity = field(null, "error", now, previous?.activity, errorCode(e));
  }
  const baselineAvailable = !!previous;
  const changes = {
    baselineAvailable,
    releaseBaselineAvailable: !!previous?.release?.succeededAt,
    commitBaselineAvailable: !!previous?.activity?.succeededAt,
    releaseChanged:
      baselineAvailable &&
      release.status === "ok" &&
      !!previous.release?.succeededAt &&
      release.value?.id !== previous.release?.value?.id,
    commitChanged:
      baselineAvailable &&
      activity.status !== "error" &&
      !!previous.activity?.succeededAt &&
      activity.value?.lastCommitSha !== previous.activity?.value?.lastCommitSha,
  };
  return { id: registration.id, target, metadata, release, activity, changes };
}
export { deriveToolSignals } from "../web/signals.mjs";
