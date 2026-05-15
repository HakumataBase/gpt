import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const playBat = readFileSync("play.bat", "utf8");
const openBrowserBat = readFileSync("open-browser.bat", "utf8");
const windowsLauncher = readFileSync("tools/windows-launcher.ps1", "utf8");
const readme = readFileSync("README.md", "utf8");

test("Windows launcher bat delegates to the bundled PowerShell server", () => {
  assert.match(playBat, /powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\\windows-launcher\.ps1" -Port %PORT%/);
  assert.match(playBat, /set "URL=http:\/\/127\.0\.0\.1:%PORT%\/"/);
  assert.doesNotMatch(playBat, /python -m http\.server/);
  assert.ok(existsSync("tools/windows-launcher.ps1"));
});

test("PowerShell launcher serves local files with a non-admin TCP server", () => {
  assert.match(windowsLauncher, /New-Object -TypeName System\.Net\.Sockets\.TcpListener -ArgumentList \$loopback, \$Port/);
  assert.doesNotMatch(windowsLauncher, /HttpListener/);
  assert.doesNotMatch(windowsLauncher, /::new/);
  assert.match(windowsLauncher, /New-Object -TypeName System\.IO\.StreamReader -ArgumentList \$stream, \[System\.Text\.Encoding\]::ASCII/);
  assert.match(windowsLauncher, /Start-Process \$Url/);
  assert.match(windowsLauncher, /index\.html/);
  assert.match(windowsLauncher, /text\/javascript; charset=utf-8/);
  assert.match(windowsLauncher, /StartsWith\(\$RootWithSeparator, \[System\.StringComparison\]::OrdinalIgnoreCase\)/);
});

test("open-browser helper uses PowerShell URL opening", () => {
  assert.match(openBrowserBat, /Start-Process '%URL%'/);
});

test("README documents the Windows launcher does not require Python", () => {
  assert.match(readme, /Pythonが無くても、Windows標準のPowerShell/);
});
