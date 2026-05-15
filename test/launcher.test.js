import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const playBat = readFileSync("play.bat", "utf8");
const playBatRaw = readFileSync("play.bat");
const playCmdRaw = readFileSync("play.cmd");
const openBrowserBat = readFileSync("open-browser.bat", "utf8");
const windowsLauncher = readFileSync("tools/windows-launcher.ps1", "utf8");
const windowsLauncherRaw = readFileSync("tools/windows-launcher.ps1");
const batchAsciiPattern = /^[\x09\x0a\x0d\x20-\x7e]*$/;
const readme = readFileSync("README.md", "utf8");

test("Windows launcher bat delegates to the bundled PowerShell server", () => {
  assert.match(playBat, /"%PS_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\\windows-launcher\.ps1" -Port %PORT%/);
  assert.match(playBat, /if not defined PORT set "PORT=8000"/);
  assert.match(playBat, /set "URL=http:\/\/127\.0\.0\.1:%PORT%\/"/);
  assert.doesNotMatch(playBat, /python -m http\.server/);
  assert.match(playBat, /pause/);
  assert.ok(existsSync("tools/windows-launcher.ps1"));
  assert.ok(existsSync("play.cmd"));
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


test("Windows launchers stay text-only without binary BOMs", () => {
  assert.match(playBat, batchAsciiPattern);
  assert.match(readFileSync("play.cmd", "utf8"), batchAsciiPattern);
  assert.notDeepEqual([...playBatRaw.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.notDeepEqual([...playCmdRaw.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.notDeepEqual([...windowsLauncherRaw.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(playBatRaw.includes(0), false);
  assert.equal(playCmdRaw.includes(0), false);
  assert.equal(windowsLauncherRaw.includes(0), false);
});

test("Windows batch launchers use CRLF and avoid mojibake-prone Japanese commands", () => {
  assert.equal(playBatRaw.includes(Buffer.from("\r\n")), true);
  assert.equal(playCmdRaw.includes(Buffer.from("\r\n")), true);
  assert.doesNotMatch(playBat, /[\u0080-\uffff]/);
  assert.doesNotMatch(readFileSync("play.cmd", "utf8"), /[\u0080-\uffff]/);
});

test("PowerShell launcher avoids the previously broken interpolated error string", () => {
  assert.doesNotMatch(windowsLauncher, /\$message = "Server Error:/);
  assert.match(windowsLauncher, /\$errorMessage = 'Server Error: ' \+ \$_\.Exception\.Message/);
});
