import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const html = readFileSync("index.html", "utf8");
const mainSource = readFileSync("src/main.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function getReferencedAssets(pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

test("index.html references existing browser assets", () => {
  const assets = [
    ...getReferencedAssets(/<link[^>]+href="([^"]+)"/g),
    ...getReferencedAssets(/<script[^>]+src="([^"]+)"/g),
  ];

  assert.deepEqual(assets.sort(), ["src/main.js", "styles/main.css"]);
  for (const assetPath of assets) {
    assert.ok(existsSync(assetPath), `${assetPath} should exist`);
  }
});

test("main UI selectors are backed by elements in index.html", () => {
  const selectors = [...mainSource.matchAll(/document\.querySelector\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
  const uniqueSelectors = [...new Set(selectors)].sort();

  assert.ok(uniqueSelectors.length > 20, "sanity check that UI selectors were detected");
  for (const id of uniqueSelectors) {
    assert.match(html, new RegExp(`id="${id}"`), `#${id} should exist in index.html`);
  }
});

test("browser entry module imports an existing core module", () => {
  const importTargets = [...mainSource.matchAll(/from "(\.\.?\/[^"]+)"/g)].map((match) => match[1]);

  assert.ok(importTargets.includes("./game-core.js"));
  for (const target of importTargets) {
    const resolvedPath = join(dirname("src/main.js"), target);
    assert.ok(existsSync(resolvedPath), `${target} should resolve from src/main.js`);
  }
});

test("npm scripts keep syntax checks and the node test suite wired together", () => {
  assert.equal(packageJson.scripts.test, "node --test");
  assert.match(packageJson.scripts.check, /node --check src\/game-core\.js/);
  assert.match(packageJson.scripts.check, /node --check src\/main\.js/);
  assert.match(packageJson.scripts.check, /node --test/);
});

test("modal actions close before running the selected action", () => {
  assert.match(mainSource, /if \(choice\.closeOnAction !== false\) closeModal\(\);/);
});

test("map cells keep a fixed size independent of tile contents", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(css, /--tile-size:/);
  assert.match(css, /grid-template-columns: repeat\(10, var\(--tile-size\)\)/);
  assert.match(css, /height: var\(--tile-size\)/);
  assert.match(css, /width: var\(--tile-size\)/);
});

test("battle modal includes animated combat presentation styles", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /battle-summary/);
  assert.match(css, /@keyframes heroLunge/);
  assert.match(css, /@keyframes enemyCounter/);
});

test("latest-first log rendering is capped instead of internally scrolled", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /const VISIBLE_LOG_COUNT = 9;/);
  assert.match(mainSource, /slice\(0, VISIBLE_LOG_COUNT\)/);
  assert.doesNotMatch(mainSource, /ui\.log\.scrollTop/);
  assert.match(css, /\.log-list \{[^}]*overflow: hidden;/);
});

test("desktop layout avoids internal scroll containers", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.doesNotMatch(css, /overflow: auto/);
  assert.match(css, /\.panel \{[^}]*overflow: hidden;/);
  assert.match(css, /body \{[^}]*overflow: hidden;/);
});

test("exploration controls use compact two-row cards that fit the hub", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /class=\"area-title\"/);
  assert.match(mainSource, /class=\"area-meta\"/);
  assert.match(mainSource, /class=\"area-summary\"/);
  assert.doesNotMatch(mainSource, /<small>危険度/);
  assert.match(css, /\.stacked-actions \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.base-actions \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.area-button \{[^}]*min-height: 2\.35rem;/);
});

test("replaceable visual assets are centralized and referenced by the UI", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.ok(existsSync("assets/README.md"));
  assert.ok(existsSync("assets/ui/key-art.svg"));
  for (const id of ["hero", "minato", "akari", "shun"]) {
    assert.ok(existsSync(`assets/characters/${id}.svg`));
    assert.match(mainSource, new RegExp(`assets/characters/${id}\\.svg`));
  }
  assert.match(css, /url\("\.\.\/assets\/ui\/key-art\.svg"\)/);
});

test("debug mode exposes chapter-complete and ending shortcuts only behind a query flag", () => {
  assert.match(html, /id="debug-panel"/);
  assert.match(mainSource, /new URLSearchParams\(window\.location\.search\)\.has\("debug"\)/);
  assert.match(mainSource, /function debugCompleteChapterOne\(\)/);
  assert.match(mainSource, /function debugWin\(\)/);
});

test("hub keeps exploration actions before optional details", () => {
  const css = readFileSync("styles/main.css", "utf8");
  const areaIndex = html.indexOf('id="area-actions"');
  const partyIndex = html.indexOf('id="party-list"');
  const objectiveIndex = html.indexOf('id="objective-list"');

  assert.ok(areaIndex > 0);
  assert.ok(partyIndex > areaIndex, "party details should not push exploration below the fold");
  assert.ok(objectiveIndex > areaIndex, "objective details should not push exploration below the fold");
  assert.match(html, /<details class="info-drawer">\s*<summary>仲間・状態を見る<\/summary>/);
  assert.match(html, /<details class="info-drawer">\s*<summary>目標の詳細を見る<\/summary>/);
  assert.match(css, /\.info-drawer summary/);
});

test("base map panel hides duplicate controls while at the hub", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /mapPanel: document\.querySelector\("\.map-panel"\)/);
  assert.match(mainSource, /ui\.mapPanel\.classList\.add\("base-mode"\)/);
  assert.match(mainSource, /ui\.mapPanel\.classList\.remove\("base-mode"\)/);
  assert.match(css, /\.map-panel\.base-mode \.map-controls/);
  assert.match(css, /\.map-panel\.base-mode #return-button \{ display: none;/);
});

test("hub renders exploration destinations as a clickable surrounding map", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /function renderBaseMap\(\)/);
  assert.match(mainSource, /className = `base-map-node/);
  assert.match(mainSource, /url\(assets\/areas\/\$\{areaId\}\.svg\)/);
  assert.match(mainSource, /button\.addEventListener\("click", \(\) => enterArea\(areaId\)\)/);
  assert.match(css, /\.base-map \{/);
  assert.match(css, /grid-template-areas: "\. school \." "park base market" "\. hospital \."/);
  assert.match(css, /\.base-map-node \{/);
});
