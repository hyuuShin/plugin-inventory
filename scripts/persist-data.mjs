import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readStoredData, writeStoredData } from "../collector/run.mjs";
export async function persistCollected({
  directory,
  collected,
  expectedHead,
  remoteHead,
  commit,
}) {
  if (expectedHead !== remoteHead)
    throw Error("main에 새 커밋이 있습니다. 최신 실행에서 다시 동기화합니다.");
  const data = await readStoredData(collected);
  await writeStoredData({ directory, data });
  return commit();
}
export async function recordDeployment({ directory, now, success }) {
  if (!success) return;
  const data = await readStoredData(directory);
  data.current.run.lastPublishedAt = now;
  await writeStoredData({ directory, data });
}
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
async function main() {
  const expected = process.env.EXPECTED_HEAD;
  if (!/^[a-f0-9]{40}$/.test(expected ?? ""))
    throw Error("검증한 소스 커밋이 필요합니다");
  git("fetch", "origin", "main");
  const remote = git("rev-parse", "origin/main");
  if (remote !== expected)
    throw Error("main에 새 커밋이 있습니다. 최신 실행에서 다시 동기화합니다.");
  const commit = () => {
    git("config", "user.name", "github-actions[bot]");
    git(
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    );
    git("add", "data");
    let dirty = false;
    try {
      git("diff", "--cached", "--quiet");
    } catch (e) {
      if (e.status === 1) dirty = true;
      else throw e;
    }
    if (dirty) {
      git(
        "commit",
        "-m",
        process.argv.includes("--record")
          ? "chore: record successful Pages deployment"
          : "chore: refresh public GitHub observations",
      );
      git("push", "origin", "HEAD:main");
    }
    return git("rev-parse", "HEAD");
  };
  let sha;
  if (process.argv.includes("--record")) {
    await recordDeployment({
      directory: resolve("data"),
      now: new Date().toISOString(),
      success: true,
    });
    sha = commit();
  } else
    sha = await persistCollected({
      directory: resolve("data"),
      collected: resolve(".collected"),
      expectedHead: expected,
      remoteHead: remote,
      commit,
    });
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, "sha=" + sha + "\n");
  console.log("검증한 공개 자료를 저장했습니다: " + sha.slice(0, 7));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
