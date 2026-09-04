import { mkdir, rm, writeFile, cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../..");
const dist = resolve(repo, "public/downloads/pdv-agent");
const staging = resolve(root, ".dist/blu-pdv-agent");
const zipPath = resolve(dist, "blu-pdv-agent-0.1.0.zip");

await rm(resolve(root, ".dist"), { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "src"), resolve(staging, "src"), { recursive: true });
await cp(resolve(root, "package.json"), resolve(staging, "package.json"));
await cp(resolve(root, "README.md"), resolve(staging, "README.md"));
await writeFile(
  resolve(staging, "start-macos-linux.sh"),
  "#!/usr/bin/env sh\nnode src/server.js\n",
);
await writeFile(
  resolve(staging, "start-windows.bat"),
  "@echo off\r\nnode src\\server.js\r\npause\r\n",
);

await rm(zipPath, { force: true });
await zipDirectory(staging, zipPath);
console.log(zipPath);

function zipDirectory(source, target) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("zip", ["-r", target, "."], { cwd: source, stdio: ["ignore", "ignore", "pipe"] });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      code === 0 ? resolvePromise() : rejectPromise(new Error(`zip saiu com código ${code}`));
    });
  });
}
