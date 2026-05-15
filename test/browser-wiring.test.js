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

test("latest-first log rendering pins the scroll position to the newest entry", () => {
  assert.match(mainSource, /requestAnimationFrame\(\(\) => \{\n    ui\.log\.scrollTop = 0;/);
});
