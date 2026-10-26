import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite } from "../scripts/build.mjs";
test("build uses project-relative assets and includes only public files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "inventory-build-"));
  try {
    await buildSite({ rootDir: process.cwd(), outDir: dir });
    const html = await readFile(join(dir, "index.html"), "utf8");
    assert.match(html, /\.\/styles.css/);
    assert.equal(
      JSON.parse(await readFile(join(dir, "config.json"))).basePath,
      "/plugin-inventory/",
    );
    assert.equal((await readdir(dir)).includes("tests"), false);
    assert.equal((await readdir(dir)).includes(".superpowers"), false);
    assert.deepEqual(
      JSON.parse(await readFile(join(dir, "data/current.json"))),
      JSON.parse(await readFile("data/current.json")),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
