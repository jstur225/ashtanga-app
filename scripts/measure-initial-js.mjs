import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { gzipSync } from "node:zlib"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const root = path.resolve(readArg("--root") ?? defaultRoot)
const route = readArg("--route") ?? "/practice"
const port = Number(readArg("--port") ?? "3199")
const wantsJson = process.argv.includes("--json")

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  fail(`Invalid --port value: ${port}`)
}

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  fail("Missing production build. Run `npm run build` first.")
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")
const origin = `http://127.0.0.1:${port}`
const pageUrl = new URL(route, origin)
const serverOutput = []
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
})

server.stdout.on("data", (chunk) => rememberOutput(chunk))
server.stderr.on("data", (chunk) => rememberOutput(chunk))

try {
  const html = await waitForPage(pageUrl)
  const scriptUrls = collectInitialScripts(html, pageUrl)
  const files = await Promise.all(scriptUrls.map(measureScript))
  const result = {
    route: pageUrl.pathname,
    buildId: readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim(),
    measuredAt: new Date().toISOString(),
    definition: "JavaScript files referenced directly by the production route HTML",
    scriptCount: files.length,
    rawBytes: sum(files, "rawBytes"),
    gzipBytes: sum(files, "gzipBytes"),
    files,
  }

  if (wantsJson) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printReport(result)
  }
} finally {
  server.kill()
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function rememberOutput(chunk) {
  serverOutput.push(String(chunk))
  if (serverOutput.length > 20) serverOutput.shift()
}

async function waitForPage(url) {
  const deadline = Date.now() + 30_000
  let lastError

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      fail(`Production server exited early.\n${serverOutput.join("")}`)
    }

    try {
      const response = await fetch(url, { headers: { "cache-control": "no-cache" } })
      if (response.ok) return response.text()
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  fail(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown error"}`)
}

function collectInitialScripts(html, pageUrl) {
  const urls = new Set()
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi

  for (const match of html.matchAll(scriptPattern)) {
    const url = new URL(match[1], pageUrl)
    if (url.origin === pageUrl.origin && url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js")) {
      urls.add(url.href)
    }
  }

  if (urls.size === 0) fail(`No initial Next.js scripts found in ${pageUrl}`)
  return [...urls].sort()
}

async function measureScript(url) {
  const response = await fetch(url, { headers: { "cache-control": "no-cache", "accept-encoding": "identity" } })
  if (!response.ok) fail(`Failed to fetch ${url}: HTTP ${response.status}`)

  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    file: new URL(url).pathname.replace("/_next/", ""),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
  }
}

function sum(files, key) {
  return files.reduce((total, file) => total + file[key], 0)
}

function printReport(result) {
  console.log(`Initial JS baseline: ${result.route}`)
  console.log(`Build: ${result.buildId}`)
  console.log(`Scripts: ${result.scriptCount}`)
  console.log(`Raw: ${formatBytes(result.rawBytes)}`)
  console.log(`Gzip: ${formatBytes(result.gzipBytes)}`)
  console.log("")

  for (const file of [...result.files].sort((a, b) => b.rawBytes - a.rawBytes)) {
    console.log(`${formatBytes(file.rawBytes).padStart(10)} raw  ${formatBytes(file.gzipBytes).padStart(10)} gzip  ${file.file}`)
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
  throw new Error(message)
}
