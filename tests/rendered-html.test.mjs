import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the course loading state and metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI T&amp;L Essentials: Level 1 \(AI-Aware\)<\/title>/i);
  assert.match(html, /A practical AI-aware learning package for Ngee Ann Polytechnic academic staff\./);
  assert.match(html, /Loading course content…/);
  assert.match(html, /class="loading-shell"/);
});

test("keeps the course source and Part 5 content intact", async () => {
  const [course, page] = await Promise.all([
    readFile(new URL("public/course.md", templateRoot), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/course\.md"\)/);
  assert.match(page, /TandlUsesExplorer/);
  assert.match(page, /ToolGuidance/);
  assert.match(course, /## How AI and Data Can Help/);
  assert.match(course, /### Using Learning Data Responsibly/);
  assert.match(course, /### Design More Targeted Learning Support/);
  assert.match(course, /Before using a tool or learning data, consider four questions:/);
  assert.doesNotMatch(course, /Tool selection should therefore consider:/);
  assert.doesNotMatch(course, /^(<<<<<<<|=======|>>>>>>>)$/m);
});
