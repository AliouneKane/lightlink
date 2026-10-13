// Local, static Expo preview used by the browser checks. No production hosting.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const port = Number(process.env.PORT ?? 8082);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
await stat(path.join(root, "index.html"));
http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        if (!(await stat(file)).isFile()) file = path.join(root, "index.html");
      } catch {
        file = path.join(root, "index.html");
      }
      const content = await readFile(file);
      response.writeHead(200, {
        "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(content);
    } catch {
      response.writeHead(500).end("Preview unavailable");
    }
  })
  .listen(port, "127.0.0.1", () =>
    process.stdout.write(`LightLink preview: http://127.0.0.1:${port}\n`),
  );
