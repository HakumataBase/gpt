import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";


const html = readFileSync("index.html", "utf8");
const mainSource = readFileSync("src/main.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

function getReferencedAssets(pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function listAssetFiles(dir = "assets") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? listAssetFiles(path) : [path];
  });
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


test("every static HTML button is wired to a click handler", () => {
  const buttonIds = [...html.matchAll(/<button[^>]+id="([A-Za-z0-9_-]+)"/g)].map((match) => match[1]);
  assert.ok(buttonIds.length >= 9, "sanity check that static controls were detected");

  for (const id of buttonIds) {
    const directListener = new RegExp(`document\\.querySelector\\("#${id}"\\)\\.addEventListener\\("click"`);
    const uiBinding = new RegExp(`([A-Za-z0-9_]+): document\\.querySelector\\("#${id}"\\)`).exec(mainSource);
    const uiListener = uiBinding ? new RegExp(`ui\\.${uiBinding[1]}\\.addEventListener\\("click"`) : null;

    assert.ok(
      directListener.test(mainSource) || uiListener?.test(mainSource),
      `#${id} should have a click listener in src/main.js`,
    );
  }
});

test("dynamic UI buttons are wired when rendered", () => {
  assert.match(mainSource, /tile\.addEventListener\("click", \(\) => entity\.type === "area" \? enterArea\(entity\.areaId\) : switchFloor\(entity\.targetFloor\)\)/);
  assert.match(mainSource, /tile\.addEventListener\("keydown", \(event\) =>/);
  assert.match(mainSource, /button\.addEventListener\("click", \(\) => \{\s*if \(choice\.closeOnAction !== false\) closeModal\(\);\s*choice\.action\(\);\s*\}\)/s);
});

test("modal actions close before running the selected action", () => {
  assert.match(mainSource, /if \(choice\.closeOnAction !== false\) closeModal\(\);/);
});

test("map cells keep a fixed size independent of tile contents", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(css, /--tile-size:/);
  assert.match(css, /grid-template-columns: repeat\(var\(--map-columns, 14\), var\(--tile-size\)\)/);
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

test("base command controls stay compact without duplicate destination buttons", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.equal(html.includes('id="area-actions"'), false);
  assert.doesNotMatch(mainSource, /function renderAreaButtons/);
  assert.match(mainSource, /entity\.type === "area"/);
  assert.match(css, /\.base-actions \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.tile\.area/);
});

test("visual presentation stays text-only for branch updates", () => {
  const css = readFileSync("styles/main.css", "utf8");
  const assetFiles = listAssetFiles();

  assert.ok(existsSync("assets/README.md"));
  assert.equal(existsSync("src/asset-data.js"), false);
  assert.equal(existsSync("tools/export-png-assets.js"), false);
  assert.equal(packageJson.scripts["export-assets"], undefined);
  assert.equal(assetFiles.some((file) => file.endsWith(".png") || file.endsWith(".svg")), false);
  assert.match(mainSource, /CHARACTER_BADGES/);
  assert.match(css, /\.character-hero/);
  assert.match(css, /\.area-theme-school/);
  assert.doesNotMatch(mainSource, /data:image|asset-data|IMAGE_ASSETS|ASSET_PATHS/);
  assert.doesNotMatch(css, /url\(/);
});


test("UI uses a dual-screen pocket-console presentation", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(html, /data-screen="Top Screen"/);
  assert.match(html, /data-screen="Command Screen"/);
  assert.match(html, /data-screen="Message Log"/);
  assert.match(css, /grid-template-areas:\s*"top top"\s*"commands log"/);
  assert.match(css, /\.shell::before/);
  assert.match(css, /\.hero-card::after/);
  assert.match(css, /A:決定\s+B:戻る\s+十字:移動/);
  assert.match(css, /repeating-linear-gradient\(0deg/);
});


test("map controls sit beside the top screen map with a transient top-right message", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(html, /<div class="top-screen-body">[\s\S]*id="map-grid"[\s\S]*<div class="movement-cluster">[\s\S]*class="map-controls"/);
  assert.match(html, /id="live-message" class="live-message" aria-live="polite"/);
  assert.match(mainSource, /liveMessage: document\.querySelector\("#live-message"\)/);
  assert.match(mainSource, /function showLiveMessage\(message\)/);
  assert.match(css, /\.top-screen-body \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(8rem, 10rem\)/);
  assert.match(css, /\.live-message \{[^}]*position: absolute;[^}]*right: 0\.75rem;[^}]*top: 2\.2rem;/);
  assert.match(css, /@keyframes messagePop/);
});

test("desktop panels use height-aware sizing so top and command screens stay visible", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(css, /--tile-size: clamp\(1\.45rem, 2dvh \+ 0\.35rem, 1\.95rem\)/);
  assert.match(css, /grid-template-rows: minmax\(0, 1\.02fr\) minmax\(0, \.98fr\)/);
  assert.match(css, /\.base-actions button \{[^}]*font-size: clamp\(0\.68rem, 1\.45dvh, 0\.78rem\)/);
  assert.match(css, /#area-description \{[^}]*font-size: clamp\(0\.68rem, 1\.5dvh, 0\.82rem\)/);
  assert.match(css, /\.area-notes li \{[^}]*font-size: clamp\(0\.56rem, 1\.25dvh, 0\.66rem\)/);
  assert.match(css, /@media \(min-width: 1051px\) and \(max-height: 700px\)/);
  assert.match(css, /\.hero-card::before, \.hero-card::after, \.eyebrow, \.lead \{ display: none; \}/);
});


test("hub hides final vacant lot until parts are complete and supports return spawn points", () => {
  assert.match(mainSource, /entity\.requiresParts && state\.parts < entity\.requiresParts/);
  assert.match(mainSource, /state\.entities = hubState\.entities\.filter\(\(entity\) => !entity\.requiresParts \|\| state\.parts >= entity\.requiresParts\)/);
  assert.match(mainSource, /AREA_RETURN_POINTS/);
  assert.match(mainSource, /state\.hubReturnPoint = \{ \.\.\.returnPoint \}/);
});

test("decor obstacles, stairs, and step time pressure are wired in the browser layer", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /const BLOCKING_DECOR = new Set\(\["b", "c", "k", "l", "m", "p", "s", "w"\]\)/);
  assert.match(mainSource, /BLOCKING_DECOR\.has\(decor\)/);
  assert.match(mainSource, /function switchFloor\(targetFloor\)/);
  assert.match(mainSource, /const STEPS_PER_TIME_SEGMENT = 14/);
  assert.match(mainSource, /function countExplorationStep\(\)/);
  assert.match(css, /\.tile\.stairs/);
  assert.match(css, /\.tile\.blocked-decor/);
});

test("battle UI uses stance-based choices instead of a single fight command", () => {
  assert.match(mainSource, /function pickEnemyIntent\(enemy\)/);
  assert.match(mainSource, /function resolveBattleMove\(move, preview, intent, entityIndex\)/);
  assert.match(mainSource, /突く: 詠唱や突進を止める/);
  assert.match(mainSource, /守る: 突進を受け流す/);
  assert.match(mainSource, /誘導: 隙を作り旗圧を下げる/);
  assert.doesNotMatch(mainSource, /label: "戦う"/);
});

test("debug mode exposes chapter-complete and ending shortcuts only behind a query flag", () => {
  assert.match(html, /id="debug-panel"/);
  assert.match(mainSource, /new URLSearchParams\(window\.location\.search\)\.has\("debug"\)/);
  assert.match(mainSource, /function debugCompleteChapterOne\(\)/);
  assert.match(mainSource, /function debugWin\(\)/);
});

test("hub keeps optional details below the compact command actions", () => {
  const css = readFileSync("styles/main.css", "utf8");
  const commandIndex = html.indexOf('aria-label="拠点行動"');
  const partyIndex = html.indexOf('id="party-list"');
  const objectiveIndex = html.indexOf('id="objective-list"');

  assert.ok(commandIndex > 0);
  assert.ok(partyIndex > commandIndex, "party details should not push commands below the fold");
  assert.ok(objectiveIndex > commandIndex, "objective details should not push commands below the fold");
  assert.match(html, /<details class="info-drawer">\s*<summary>仲間・状態を見る<\/summary>/);
  assert.match(html, /<details class="info-drawer">\s*<summary>目標の詳細を見る<\/summary>/);
  assert.match(css, /\.info-drawer summary/);
});

test("base map panel hides only the duplicate return control while keeping movement", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /mapPanel: document\.querySelector\("\.map-panel"\)/);
  assert.match(mainSource, /ui\.mapPanel\.classList\.toggle\("base-mode", isBase\)/);
  assert.doesNotMatch(css, /\.map-panel\.base-mode \.map-controls/);
  assert.match(css, /\.map-panel\.base-mode #return-button \{ display: none;/);
});

test("hub renders exploration destinations inside the playable 14x14 map", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /HUB_AREA/);
  assert.match(mainSource, /entity\.type === "area"/);
  assert.match(mainSource, /tile\.addEventListener\("click", \(\) => entity\.type === "area" \? enterArea\(entity\.areaId\) : switchFloor\(entity\.targetFloor\)\)/);
  assert.match(css, /\.area-theme-base/);
  assert.match(css, /\.tile\.area/);
});


test("exploration maps are 5x5 viewports over layered 14x14 maps", () => {
  const css = readFileSync("styles/main.css", "utf8");

  assert.match(mainSource, /const VIEWPORT_SIZE = 5;/);
  assert.match(mainSource, /function getViewportBounds\(\)/);
  assert.match(mainSource, /--map-columns", VIEWPORT_SIZE/);
  assert.match(mainSource, /state\.layers\?\.decor/);
  assert.match(mainSource, /area-theme-\$\{isBase \? "base" : state\.currentAreaId\}/);
  assert.match(mainSource, /tile\.dataset\.terrain/);
  assert.match(mainSource, /tile\.dataset\.decor/);
  assert.match(css, /background-size: cover/);
  assert.match(css, /\.tile-layer/);
  assert.match(css, /\.tile-decor/);
});
