import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { TextDecoder } from "node:util";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const IMAGE_OR_BINARY_EXTENSION = /\.(?:png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|exe|dll|bin|wasm|woff2?|ttf|otf)$/i;

function listFiles(dir = ".") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (path === ".git") return [];
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

test("reachable branch history contains no image or binary asset paths", () => {
  const objects = execFileSync("git", ["rev-list", "--objects", "HEAD"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  const binaryLikePaths = objects
    .map((line) => line.split(" ").slice(1).join(" "))
    .filter((path) => IMAGE_OR_BINARY_EXTENSION.test(path));

  assert.deepEqual(binaryLikePaths, []);
});

test("worktree files are utf8 text without nul bytes", () => {
  const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
  const binaryFiles = [];
  const invalidUtf8Files = [];
  for (const file of listFiles()) {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) binaryFiles.push(file);
    try {
      utf8Decoder.decode(bytes);
    } catch {
      invalidUtf8Files.push(file);
    }
  }

  assert.deepEqual(binaryFiles, []);
  assert.deepEqual(invalidUtf8Files, []);
});

function listTrackedFiles() {
  return execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
}

test("tracked files are explicitly classified as text by git attributes", () => {
  const trackedFiles = listTrackedFiles();
  const attrOutput = execFileSync("git", ["check-attr", "text", "--", ...trackedFiles], { encoding: "utf8" });
  const nonTextFiles = attrOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.endsWith(": text: set"))
    .map((line) => line.split(": text: ")[0]);

  assert.deepEqual(nonTextFiles, []);
});

test("tracked files use regular non-executable file modes", () => {
  const modeOutput = execFileSync("git", ["ls-tree", "-r", "HEAD"], { encoding: "utf8" });
  const executableFiles = modeOutput
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((line) => line.startsWith("100755 "))
    .map((line) => line.split("\t")[1]);

  assert.deepEqual(executableFiles, []);
});

test("branch update patch is text-only and applies cleanly to the base commit", () => {
  const baseCommit = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], { encoding: "utf8" }).trim();
  const patch = execFileSync("git", ["diff", "--binary", baseCommit, "HEAD"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const numstat = execFileSync("git", ["diff", "--numstat", baseCommit, "HEAD"], { encoding: "utf8" });

  assert.doesNotMatch(patch, /^GIT binary patch$/m);
  assert.doesNotMatch(patch, /^Binary files /m);
  assert.equal(numstat.split("\n").some((line) => line.startsWith("-\t-\t")), false);

  const tempRoot = mkdtempSync(join(tmpdir(), "branch-update-"));
  const worktreePath = join(tempRoot, "base");
  const patchPath = join(tempRoot, "update.patch");
  writeFileSync(patchPath, patch);

  try {
    execFileSync("git", ["worktree", "add", "--detach", worktreePath, baseCommit], { stdio: "pipe" });
    execFileSync("git", ["-C", worktreePath, "apply", "--check", patchPath], { stdio: "pipe" });
    execFileSync("git", ["-C", worktreePath, "apply", patchPath], { stdio: "pipe" });
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", worktreePath], { stdio: "pipe" });
    } catch {}
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
