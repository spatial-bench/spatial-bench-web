import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const docs = (await readdir("docs")).filter((name) => name.endsWith(".md"));
const routes = ["", "explore", ...docs.map((name) => name.slice(0, -3))];
const documents = new Map();
for (const route of routes) {
  const html = await readFile(`dist/${route ? `${route}/` : ""}index.html`, "utf8");
  const dom = new JSDOM(html, { url: `https://spatial-bench.org/${route}` });
  const doc = dom.window.document;
  documents.set(`/${route}`, doc);
  assert.equal(doc.querySelectorAll("h1").length, 1, `${route}: one page heading`);
  assert(
    doc.querySelector('meta[name="description"]')?.content,
    `${route}: description`,
  );
  assert(doc.querySelector('a[href="#main"]'), `${route}: skip link`);
  assert(
    doc.querySelector("details.site-menu > summary"),
    `${route}: native keyboard menu`,
  );
  assert.equal(doc.querySelectorAll('nav[aria-label="Main navigation"] a').length, 7);
  if (route !== "explore") {
    assert(!doc.querySelector("astro-island"), `${route}: must not hydrate React`);
    assert(
      !doc.querySelector("script[src], link[rel=modulepreload]"),
      `${route}: no runtime bundle`,
    );
    assert(!/sqlite|\.wasm|react-dom/.test(html), `${route}: no data/runtime imports`);
  } else {
    assert(
      doc.querySelector('astro-island[client="only"]'),
      "explorer stays client only",
    );
  }
}
for (const [route, doc] of documents) {
  for (const link of doc.querySelectorAll('a[href^="/"], a[href^="#"]')) {
    const url = new URL(link.getAttribute("href"), `https://spatial-bench.org${route}`);
    const target = documents.get(url.pathname.replace(/\/$/, "") || "/");
    assert(target, `broken local link: ${route} -> ${url.pathname}`);
    if (url.hash)
      assert(
        target.getElementById(decodeURIComponent(url.hash.slice(1))),
        `missing anchor: ${url.href}`,
      );
  }
}
const home = documents.get("/");
assert.equal(home.querySelectorAll("[data-featured]").length, 2);
assert.equal(home.querySelectorAll("[data-featured]:not([hidden])").length, 1);
assert(home.querySelector(".chart-svg svg"), "actual pre-rendered chart");
for (const svg of home.querySelectorAll(".chart-svg > svg")) {
  assert.equal(
    svg.getAttribute("viewBox"),
    `0 0 ${svg.getAttribute("width")} ${svg.getAttribute("height")}`,
    "landing chart must scale its coordinates on narrow screens",
  );
}
assert(
  home.querySelector(".data-table tbody tr a"),
  "source records for plotted values",
);
console.log(
  `Verified ${routes.length} static routes, navigation, anchors and runtime isolation.`,
);
