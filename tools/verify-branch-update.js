import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BINARY_PATH_PATTERN = /\.(?:png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|exe|dll|bin|wasm|woff2?|ttf|otf)$/i;
const HEAD_COMMIT = "HEAD";
const BASE_COMMIT = git(["rev-list", "--max-parents=0", HEAD_COMMIT]).trim();

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, ...options });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listReachableBinaryPaths() {
  return git(["rev-list", "--objects", HEAD_COMMIT])
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" ").slice(1).join(" "))
    .filter((path) => BINARY_PATH_PATTERN.test(path));
}


function listExecutableFiles() {
  return git(["ls-tree", "-r", HEAD_COMMIT])
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((line) => line.startsWith("100755 "))
    .map((line) => line.split("\t")[1]);
}

function assertTextOnlyPatch(patch, numstat) {
  assert(!/^GIT binary patch$/m.test(patch), "branch update patch contains a GIT binary patch block");
  assert(!/^Binary files /m.test(patch), "branch update patch contains a binary file marker");
  assert(!numstat.split("\n").some((line) => line.startsWith("-\t-\t")), "branch update numstat contains binary entries");
}

function verifyPatchApplies(patch) {
  const tempRoot = mkdtempSync(join(tmpdir(), "branch-update-"));
  const worktreePath = join(tempRoot, "base");
  const patchPath = join(tempRoot, "update.patch");
  writeFileSync(patchPath, patch);

  try {
    git(["worktree", "add", "--detach", worktreePath, BASE_COMMIT], { stdio: "pipe" });
    git(["-C", worktreePath, "-c", "apply.whitespace=error", "apply", "--check", patchPath], { stdio: "pipe" });
    git(["-C", worktreePath, "-c", "apply.whitespace=error", "apply", patchPath], { stdio: "pipe" });
  } finally {
    try {
      git(["worktree", "remove", "--force", worktreePath], { stdio: "pipe" });
    } catch {
      // The temp directory cleanup below handles partially-created worktrees.
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const reachableBinaryPaths = listReachableBinaryPaths();
assert(reachableBinaryPaths.length === 0, `reachable binary/image paths found:\n${reachableBinaryPaths.join("\n")}`);

const executableFiles = listExecutableFiles();
assert(executableFiles.length === 0, `executable file modes found:\n${executableFiles.join("\n")}`);

const patch = git(["diff", "--binary", BASE_COMMIT, HEAD_COMMIT]);
const numstat = git(["diff", "--numstat", BASE_COMMIT, HEAD_COMMIT]);
assertTextOnlyPatch(patch, numstat);
verifyPatchApplies(patch);

console.log(`Branch update verification passed: text-only patch applies cleanly to ${BASE_COMMIT}.`);
