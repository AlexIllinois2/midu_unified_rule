// midu_rule_updater.ts — 启动入口：本地服务（静态页面 + adb 推送 + 应用规则）
// 运行：bun midu_rule_updater.ts  或  npm start (tsx midu_rule_updater.ts)
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { applyPlan, SRC } from "./src/organizer";
import { appendPlanAdditions } from "./src/planStore";

const run = promisify(execFile);
const HERE = dirnameOf(import.meta.url); // 项目根目录
const PUBLIC = join(HERE, "src", "web");
const PORT = Number(process.env.PORT || 8899);

const APP_PACKAGE = "org.nobody.multitts";
const REMOTE_PATH =
  "/sdcard/Android/data/org.nobody.multitts/files/voice/bytedance/midu/zh-cn/frontend/g2p/mnc/unified_rule.txt";

function dirnameOf(url: string): string {
  return new URL(".", url).pathname.replace(/\/$/, "");
}

// ---------- adb ----------

export interface Device {
  serial: string;
  state: string;
}

/** 列出 adb 设备（仅 serial + 状态）。adb 不可用时抛错。 */
export async function listDevices(): Promise<Device[]> {
  const { stdout } = await run("adb", ["devices"]);
  return stdout
    .split("\n")
    .slice(1)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("*"))
    .map(l => {
      const [serial, state] = l.split(/\s+/);
      return { serial, state: state || "unknown" };
    })
    .filter(d => d.serial);
}

/** 推送 conf/unified_rule.txt 到设备并强制停止 app（用户手动重新打开即重启）。 */
export async function pushToDevice(serial: string): Promise<void> {
  await run("adb", ["-s", serial, "push", SRC, REMOTE_PATH]);
  await run("adb", ["-s", serial, "shell", "am", "force-stop", APP_PACKAGE]);
}

// ---------- http 工具 ----------

function json(res: ServerResponse, code: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function serveStatic(res: ServerResponse, urlPath: string): Promise<void> {
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  const file = normalize(join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

// ---------- 路由 ----------

// ---------- 页面保活：所有页面关闭后自动停止服务 ----------
// 页面每 2 秒发一次 /api/alive 心跳；首次心跳后启动看门狗，
// 超过阈值没有任何心跳（页面全部关闭/失联）即自动退出。
// 阈值默认 70s：Chrome 等浏览器会把后台标签的定时器节流到约 1 次/分钟，
// 阈值必须大于该间隔，否则后台标签会被误判为已关闭。
const ALIVE_TIMEOUT = Number(process.env.ALIVE_TIMEOUT || 70000);
let lastAlive = 0;
let watchdog: ReturnType<typeof setInterval> | null = null;

function ensureWatchdog(): void {
  if (watchdog) return;
  watchdog = setInterval(() => {
    if (Date.now() - lastAlive > ALIVE_TIMEOUT) {
      console.log("页面已关闭，自动停止服务。");
      process.exit(0);
    }
  }, 1000);
}

async function handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (pathname === "/api/alive" && req.method === "POST") {
    lastAlive = Date.now();
    ensureWatchdog();
    json(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/devices" && req.method === "GET") {
    try {
      json(res, 200, { devices: await listDevices() });
    } catch (e: any) {
      json(res, 500, { error: "adb 不可用: " + (e?.message || e) });
    }
    return true;
  }

  if (pathname === "/api/push" && req.method === "POST") {
    try {
      const { serials } = await readJsonBody(req);
      if (!Array.isArray(serials) || serials.length === 0) {
        json(res, 400, { error: "未选择设备" });
        return true;
      }
      const results: Array<{ serial: string; ok: boolean; error?: string }> = [];
      for (const serial of serials) {
        try {
          await pushToDevice(String(serial));
          results.push({ serial, ok: true });
        } catch (e: any) {
          results.push({ serial, ok: false, error: String(e?.message || e) });
        }
      }
      json(res, 200, { results });
    } catch (e: any) {
      json(res, 500, { error: String(e?.message || e) });
    }
    return true;
  }

  if (pathname === "/api/apply" && req.method === "POST") {
    try {
      const { rules } = await readJsonBody(req);
      // 规则可为空：空时只执行整理（organizer），便于「应用/推送」无条件走完整流程
      const valid = Array.isArray(rules)
        ? rules.map(r => String(r).replace(/\s+$/, "")).filter(r => r.trim() !== "")
        : [];
      const { added, duplicates } = appendPlanAdditions(valid);
      const stats = applyPlan();
      json(res, 200, { added: added.length, duplicates, stats });
    } catch (e: any) {
      json(res, 500, { error: String(e?.message || e) });
    }
    return true;
  }

  return false;
}

const server = createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (await handleApi(req, res, pathname)) return;
  await serveStatic(res, pathname);
});

/** 用系统默认浏览器打开页面（linux: xdg-open / macOS: open / windows: start） */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "win32" ? `start "" "${url}"` :
    process.platform === "darwin" ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {}); // 打开失败（如无图形环境）不影响服务
}

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`unified_rule 工具页已启动: ${url}`);
  if (process.env.NO_OPEN !== "1") openBrowser(url);
});
