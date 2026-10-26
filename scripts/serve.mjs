import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
const config = JSON.parse(await readFile("config/app.json", "utf8")),
  root = resolve(process.env.SITE_DIR ?? "dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/") {
      res.writeHead(302, { location: config.basePath });
      return res.end();
    }
    if (!url.pathname.startsWith(config.basePath)) throw Error();
    const path = resolve(
      root,
      decodeURIComponent(
        url.pathname.slice(config.basePath.length) || "index.html",
      ),
    );
    if (!path.startsWith(root + sep)) throw Error();
    const info = await stat(path);
    if (!info.isFile()) throw Error();
    res.writeHead(200, {
      "content-type": types[extname(path)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () =>
  console.log(
    "http://localhost:" + (process.env.PORT ?? 4173) + config.basePath,
  ),
);
