/**
 * Local PostgreSQL without Docker or a system install.
 *
 *   npm run db:local    start the database (runs in the background; you can close the terminal)
 *   npm run db:stop     stop it
 *   npm run db:status   is it running?
 *
 * Uses the PostgreSQL binaries shipped by the `embedded-postgres` npm package and
 * drives them with PostgreSQL's own tools (initdb, pg_ctl), so any failure is
 * reported with the server log instead of hanging. Data lives in ./.pgdata
 * (git-ignored). User, password, port and database name come from DATABASE_URL in .env.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const command = process.argv[2] ?? "start";
const dataDir = path.resolve(process.env.PGDATA_DIR ?? ".pgdata");
const logFile = path.join(dataDir, "server.log");

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync(".env")) {
    const line = readFileSync(".env", "utf8").split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "postgresql://bizsphere:bizsphere@localhost:5432/bizsphere?schema=public";
}

const url = new URL(databaseUrl());
if (!["localhost", "127.0.0.1"].includes(url.hostname)) fail(`DATABASE_URL points at ${url.hostname}, not localhost. db:local only runs a local database.`);
const user = decodeURIComponent(url.username || "bizsphere");
const password = decodeURIComponent(url.password || "bizsphere");
const port = url.port || "5432";
const dbName = url.pathname.replace(/^\//, "") || "bizsphere";

// PostgreSQL binaries for this computer, e.g. @embedded-postgres/windows-x64
const platform = { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform];
let bin;
try {
  bin = await import(`@embedded-postgres/${platform}-${process.arch}`);
} catch {
  fail(`No PostgreSQL binaries for ${process.platform}-${process.arch}. Run "npm install" first, or use Docker / your own PostgreSQL.`);
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function run(file, args, { quiet = false } = {}) {
  try {
    return { ok: true, out: execFileSync(file, args, { encoding: "utf8", stdio: quiet ? "pipe" : ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`, code: e.status };
  }
}

const isRunning = () => run(bin.pg_ctl, ["status", "-D", dataDir], { quiet: true }).ok;

/**
 * pg_ctl says this server is down, but leftovers from a crash or a killed terminal
 * can still hold its shared memory and block a new start ("pre-existing shared
 * memory block"). Stops only processes of this project's postgres binary that are
 * either a server for THIS data folder, or worker processes whose server has died.
 * Healthy servers for other data folders are never touched.
 */
function killOrphans() {
  if (process.platform === "win32") {
    const exe = bin.postgres.replace(/'/g, "''");
    const dir = dataDir.replace(/'/g, "''");
    const ps = [
      `$exe = (Resolve-Path '${exe}').Path; $dir = '${dir}'.ToLower().Replace('\\','/')`,
      `$all = Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | Where-Object { $_.ExecutablePath -and (Resolve-Path $_.ExecutablePath).Path -eq $exe }`,
      `$ids = $all.ProcessId`,
      `$all | Where-Object { $cmd = "$($_.CommandLine)".ToLower().Replace('\\','/'); $cmd.Contains($dir) -or ($cmd.Contains('--forkchild') -and -not ($ids -contains $_.ParentProcessId)) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }`,
    ].join("; ");
    const res = run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { quiet: true });
    const ids = res.out.trim().split(/\s+/).filter(Boolean);
    if (ids.length) console.log(`Stopped ${ids.length} leftover PostgreSQL process(es) from an earlier run.`);
  } else {
    run("pkill", ["-f", bin.postgres], { quiet: true });
  }
  rmSync(path.join(dataDir, "postmaster.pid"), { force: true });
}

function logTail(lines = 20) {
  if (!existsSync(logFile)) return "(no server log yet)";
  return readFileSync(logFile, "utf8").trim().split(/\r?\n/).slice(-lines).join("\n");
}

async function ensureDatabase() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ host: "localhost", port: Number(port), user, password, database: "postgres" });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Created database "${dbName}".`);
  }
  await client.end();
}

async function start() {
  const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (firstRun) {
    console.log("First run: creating the database files in .pgdata ...");
    const pwFile = path.join(os.tmpdir(), `bsu-pw-${process.pid}`);
    writeFileSync(pwFile, password);
    const init = run(bin.initdb, ["-D", dataDir, "-U", user, `--pwfile=${pwFile}`, "-A", "scram-sha-256", "-E", "UTF8", "--locale=C"]);
    rmSync(pwFile, { force: true });
    if (!init.ok) fail(`Could not create the database files:\n${init.out}`);
  }

  if (isRunning()) {
    console.log(`PostgreSQL is already running on localhost:${port}.`);
  } else {
    killOrphans();
    console.log(`Starting PostgreSQL on localhost:${port} ...`);
    // No pipes here: the server inherits pg_ctl's output handles, so capturing them
    // would make Node wait for the server to exit. Errors are read from the log instead.
    const res = spawnSync(bin.pg_ctl, ["start", "-D", dataDir, "-l", logFile, "-o", `-p ${port}`, "-w", "-t", "60"], { stdio: "ignore", windowsHide: true });
    if (res.status !== 0) {
      const log = logTail();
      const hint = /already in use|could not bind/i.test(log)
        ? `Port ${port} is used by another program. Stop it, or change the port in DATABASE_URL in .env (e.g. localhost:5433).`
        : "See the server log above.";
      fail(`PostgreSQL did not start.\n\n--- ${logFile} ---\n${log}\n---\n${hint}`);
    }
  }

  try {
    await ensureDatabase();
  } catch (e) {
    fail(`PostgreSQL is running but the connection failed: ${e.message}\nIf you changed the user or password in DATABASE_URL after the first run, delete .pgdata and run this again.`);
  }

  console.log(`\n✔ PostgreSQL is running on localhost:${port}, database "${dbName}".`);
  console.log(firstRun ? "  Next: npm run db:setup   then   npm run dev" : "  Next: npm run dev");
  console.log("  It keeps running in the background. Stop it with: npm run db:stop\n");
}

function stop() {
  if (!isRunning()) return console.log("PostgreSQL is not running.");
  const res = run(bin.pg_ctl, ["stop", "-D", dataDir, "-m", "fast", "-w"]);
  if (!res.ok) fail(`Could not stop PostgreSQL:\n${res.out}`);
  console.log("✔ PostgreSQL stopped.");
}

function status() {
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) return console.log("No local database yet. Run: npm run db:local");
  console.log(isRunning() ? `✔ PostgreSQL is running on localhost:${port}.` : "PostgreSQL is not running. Start it with: npm run db:local");
}

if (command === "start") await start();
else if (command === "stop") stop();
else if (command === "status") status();
else fail(`Unknown command "${command}". Use start, stop or status.`);
