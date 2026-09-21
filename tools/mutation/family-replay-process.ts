import { spawn } from "node:child_process";
import { open, mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

function present(file: string): boolean {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export interface RecordedProcessOptions {
  repo: string;
  cwd: string;
  executable: string;
  args: string[];
  label: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  // A replay may hold the existing FIFO serial lock for the whole queue.
  // Only its exact token AND current process PID authorize individual commands.
  fifoLockToken?: string;
}

// Derived from the frozen family-process.ts, retaining its execution/cleanup mechanism.
// Only adds exact token + PID ownership of the queue's existing shared FIFO serial lock.
// The original file is also bound by historical FIFO runtime hashes and stays byte-identical.
export async function recordedProcess(o: RecordedProcessOptions) {
  const relative = path.relative(o.repo, o.cwd);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error("PROCESS_WORKSPACE_ESCAPE");
  if (!/^[a-z0-9-]+$/.test(o.label)) throw new Error("INVALID_PROCESS_LABEL");
  const control = path.join(o.repo, ".rtl-agent");
  await mkdir(control, { recursive: true });
  const pause = path.join(control, "family-preparation.pause.json");
  const fifo = path.join(control, "fifo-target-campaigns", "active.lock");
  const lock = path.join(control, "family-process-active.json");
  const serialConflict = () => {
    if (o.fifoLockToken === undefined) return present(fifo);
    if (!present(fifo)) return true;
    const owner = JSON.parse(readFileSync(fifo, "utf8"));
    return owner.token !== o.fifoLockToken || owner.pid !== process.pid;
  };
  if (present(pause) || serialConflict()) throw new Error("FAMILY_PREPARATION_NOT_IDLE");
  const startedAt = new Date().toISOString(),
    start = Date.now();
  const ownership = {
    token: randomUUID(),
    ownerPid: process.pid,
    startedAt,
    workspace: relative.split(path.sep).join("/"),
    label: o.label,
  };
  await writeFile(lock, JSON.stringify(ownership) + "\n", { flag: "wx" });
  // A killed parent leaves this marker. Future jobs fail until identity/exit is inspected.
  const out = await open(path.join(o.cwd, `${o.label}.stdout.log`), "wx");
  const err = await open(path.join(o.cwd, `${o.label}.stderr.log`), "wx");
  let safeToRelease = false;
  try {
    const child = spawn(o.executable, o.args, {
      cwd: o.cwd,
      env: o.env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", out.fd, err.fd],
    });
    let spawnError: string | null = null;
    const closed = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>(
      (resolve) => {
        child.once("error", (error: NodeJS.ErrnoException) => {
          spawnError = error.code ?? "SPAWN_ERROR";
        });
        child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
      },
    );
    await writeFile(
      path.join(o.cwd, `${o.label}.started.json`),
      JSON.stringify(
        {
          ...ownership,
          childPid: child.pid ?? null,
          timeoutMs: o.timeoutMs,
          executable: path.basename(o.executable),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    await writeFile(lock, JSON.stringify({ ...ownership, childPid: child.pid ?? null }) + "\n");
    let cancel: (reason: string) => void = () => undefined;
    const interrupted = new Promise<string>((resolve) => {
      cancel = resolve;
    });
    const timeout = setTimeout(() => cancel("TIMEOUT"), o.timeoutMs);
    const sigint = () => cancel("INTERRUPTED_SIGINT");
    const sigterm = () => cancel("INTERRUPTED_SIGTERM");
    process.once("SIGINT", sigint);
    process.once("SIGTERM", sigterm);
    const monitor = setInterval(() => {
      try {
        if (serialConflict() || present(pause)) cancel("CONCURRENT_RTL_OR_PAUSE");
      } catch {
        cancel("IDLE_MONITOR_FAILED");
      }
    }, 500);
    const first = await Promise.race([closed, interrupted]);
    clearTimeout(timeout);
    clearInterval(monitor);
    process.removeListener("SIGINT", sigint);
    process.removeListener("SIGTERM", sigterm);
    let error: string | null = spawnError;
    let outcome: { exitCode: number | null; signal: NodeJS.Signals | null } | undefined;
    let cleanupConfirmed = true;
    let termination: unknown = null;
    if (typeof first === "string") {
      error = first;
      cleanupConfirmed = false;
      // Persist the boundary failure before trying to terminate the owned tree.
      try {
        await writeFile(
          pause,
          JSON.stringify({ ...ownership, reason: first, childPid: child.pid }) + "\n",
          { flag: "wx" },
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
      if (child.pid !== undefined) {
        if (process.platform === "win32") {
          termination = await new Promise<{ code: number | null; confirmed: boolean }>(
            (resolve) => {
              const killer = spawn(
                path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"),
                ["/PID", String(child.pid), "/T", "/F"],
                { shell: false, windowsHide: true, stdio: "ignore" },
              );
              const timer = setTimeout(() => {
                killer.kill();
                resolve({ code: null, confirmed: false });
              }, 3000);
              killer.once("error", () => {
                clearTimeout(timer);
                resolve({ code: null, confirmed: false });
              });
              killer.once("close", (code) => {
                clearTimeout(timer);
                resolve({ code, confirmed: code === 0 });
              });
            },
          );
          cleanupConfirmed = (termination as { confirmed: boolean }).confirmed;
        } else {
          try {
            process.kill(-child.pid, "SIGKILL");
            cleanupConfirmed = true;
          } catch (e) {
            cleanupConfirmed = (e as NodeJS.ErrnoException).code === "ESRCH";
          }
          termination = { confirmed: cleanupConfirmed, method: "owned-process-group" };
        }
      }
      let closeTimer: NodeJS.Timeout | undefined;
      outcome = await Promise.race([
        closed,
        new Promise<undefined>((resolve) => {
          closeTimer = setTimeout(() => resolve(undefined), 3000);
        }),
      ]);
      if (closeTimer) clearTimeout(closeTimer);
      cleanupConfirmed &&= outcome !== undefined;
      if (!cleanupConfirmed) child.unref();
    } else {
      outcome = first;
    }
    const result = {
      executable: path.basename(o.executable),
      argv: o.args.map((a) =>
        path.isAbsolute(a) ? path.relative(o.cwd, a).split(path.sep).join("/") : a,
      ),
      startedAt,
      childPid: child.pid ?? null,
      exitCode: outcome?.exitCode ?? null,
      signal: outcome?.signal ?? null,
      error,
      cleanupConfirmed,
      termination,
      durationMs: Date.now() - start,
      stdout: await readFile(path.join(o.cwd, `${o.label}.stdout.log`), "utf8"),
      stderr: await readFile(path.join(o.cwd, `${o.label}.stderr.log`), "utf8"),
    };
    await writeFile(path.join(o.cwd, `${o.label}.json`), JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    safeToRelease = cleanupConfirmed;
    if (error || result.signal || !cleanupConfirmed)
      throw new Error(
        `PROCESS_BOUNDARY_FAILURE:${o.label}:${error ?? result.signal ?? "CLEANUP_UNCONFIRMED"}`,
      );
    return result;
  } finally {
    await out.close();
    await err.close();
    if (safeToRelease) {
      const recorded = JSON.parse(await readFile(lock, "utf8"));
      if (recorded.token === ownership.token) await unlink(lock);
    }
  }
}
