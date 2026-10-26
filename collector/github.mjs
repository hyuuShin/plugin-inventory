export class GitHubError extends Error {
  constructor(status, code) {
    super("GitHub 조회 실패: " + code + (status ? " (" + status + ")" : ""));
    this.status = status;
    this.code = code;
  }
}
export function createGitHubClient({
  token = "",
  fetchImpl = fetch,
  limits = {},
  clock = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const options = {
      requests: 800,
      concurrency: 3,
      timeoutMs: 20000,
      retries: 2,
      ...limits,
    },
    budget = { used: 0, max: options.requests };
  const cache = new Map(),
    waiters = [];
  let active = 0;
  const acquire = async () => {
    if (active >= options.concurrency)
      await new Promise((r) => waiters.push(r));
    else active++;
  };
  const release = () => {
    if (waiters.length) waiters.shift()();
    else active--;
  };
  async function request(url, redirects = 0) {
    if (url.origin !== "https://api.github.com")
      throw new GitHubError(0, "unsafe_redirect");
    if (redirects > 3) throw new GitHubError(0, "redirect_limit");
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      await acquire();
      let response;
      try {
        if (budget.used >= options.requests) throw new GitHubError(0, "budget");
        budget.used++;
        response = await fetchImpl(url.href, {
          headers: {
            accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2026-03-10",
            ...(token ? { authorization: "Bearer " + token } : {}),
          },
          redirect: "manual",
          signal: AbortSignal.timeout(options.timeoutMs),
        });
      } catch (error) {
        if (error instanceof GitHubError || attempt === options.retries)
          throw error instanceof GitHubError
            ? error
            : new GitHubError(0, "network");
      } finally {
        release();
      }
      if (!response) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new GitHubError(response.status, "redirect");
        return request(new URL(location, url), redirects + 1);
      }
      const rateLimited =
        response.status === 429 ||
        (response.status === 403 &&
          (response.headers.get("x-ratelimit-remaining") === "0" ||
            response.headers.has("retry-after")));
      if (
        (rateLimited || response.status >= 500) &&
        attempt < options.retries
      ) {
        const retry = Number(response.headers.get("retry-after")),
          reset =
            Number(response.headers.get("x-ratelimit-reset")) * 1000 - clock();
        await sleep(
          Math.min(
            120000,
            Math.max(
              1000,
              Number.isFinite(retry) && retry > 0
                ? retry * 1000
                : reset > 0
                  ? reset
                  : 1000 * (attempt + 1),
            ),
          ),
        );
        continue;
      }
      let failureCode = rateLimited ? "rate_limit" : "http_" + response.status;
      if (response.status === 409) {
        try {
          const body = await response.json();
          if (/git repository is empty/i.test(body.message ?? ""))
            failureCode = "empty_repository";
        } catch {}
      }
      if (!response.ok) throw new GitHubError(response.status, failureCode);
      let data;
      try {
        data = await response.json();
      } catch {
        throw new GitHubError(response.status, "invalid_json");
      }
      return {
        data,
        status: response.status,
        next: /rel="next"/.test(response.headers.get("link") ?? ""),
      };
    }
    throw new GitHubError(0, "network");
  }
  function get(path, { query = {} } = {}) {
    if (
      typeof path !== "string" ||
      !/^\/(?:repos|repositories|search)\//.test(path) ||
      path.includes("..") ||
      path.includes("?") ||
      path.includes("#") ||
      path.includes("\\")
    )
      return Promise.reject(new GitHubError(0, "unsafe_path"));
    const url = new URL(path, "https://api.github.com");
    for (const [key, value] of Object.entries(query))
      if (value != null) url.searchParams.set(key, String(value));
    const key = url.href;
    if (!cache.has(key))
      cache.set(
        key,
        request(url).catch((e) => {
          cache.delete(key);
          throw e;
        }),
      );
    return cache.get(key);
  }
  async function paginate(path, { query = {}, maxPages = 5 } = {}) {
    const items = [];
    let complete = true;
    for (let page = 1; page <= maxPages; page++) {
      let result;
      try {
        result = await get(path, { query: { ...query, per_page: 100, page } });
      } catch (e) {
        if (items.length) return { items, complete: false };
        throw e;
      }
      const rows = Array.isArray(result.data) ? result.data : result.data.items;
      if (!Array.isArray(rows)) throw new GitHubError(200, "invalid_shape");
      items.push(...rows);
      if (result.data.incomplete_results) complete = false;
      if (!result.next) return { items, complete };
      if (page === maxPages) complete = false;
    }
    return { items, complete };
  }
  return { get, paginate, budget };
}
