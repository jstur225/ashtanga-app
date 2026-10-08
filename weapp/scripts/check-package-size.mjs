import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const ignores = Array.isArray(config.packOptions?.ignore) ? config.packOptions.ignore : [];
const toolOnlyFiles = new Set(['project.config.json', 'project.private.config.json']);
const budgetBytes = 1.9 * 1024 * 1024;
const totalBudgetBytes = 19 * 1024 * 1024;
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const subpackageRoots = (appConfig.subPackages || appConfig.subpackages || [])
  .map((item) => normalize(String(item.root || '')).replace(/^\/+|\/+$/g, ''))
  .filter(Boolean);

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isIgnored(relativePath) {
  const normalized = normalize(relativePath);
  if (toolOnlyFiles.has(normalized)) return true;
  return ignores.some((rule) => {
    const value = normalize(String(rule.value || '')).replace(/^\/+|\/+$/g, '');
    if (!value) return false;
    if (rule.type === 'folder') return normalized === value || normalized.startsWith(`${value}/`);
    if (rule.type === 'file') return normalized === value;
    if (rule.type === 'suffix') return normalized.endsWith(value);
    if (rule.type === 'prefix') return normalized.startsWith(value);
    return false;
  });
}

function walk(directory, entries = []) {
  for (const dirent of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, dirent.name);
    const relativePath = path.relative(root, absolutePath);
    if (isIgnored(relativePath)) continue;
    if (dirent.isDirectory()) walk(absolutePath, entries);
    else if (dirent.isFile()) entries.push({ path: normalize(relativePath), bytes: fs.statSync(absolutePath).size });
  }
  return entries;
}

const entries = walk(root).sort((a, b) => b.bytes - a.bytes);
const groups = new Map([['main', []], ...subpackageRoots.map(item => [item, []])]);
for (const entry of entries) {
  const packageRoot = subpackageRoots.find(item => entry.path === item || entry.path.startsWith(`${item}/`));
  groups.get(packageRoot || 'main').push(entry);
}

for (const [packageName, packageEntries] of groups) {
  const packageBytes = packageEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(`WeApp ${packageName === 'main' ? 'main package' : `subpackage ${packageName}`} estimate: ${(packageBytes / 1024 / 1024).toFixed(3)} MiB (${packageEntries.length} files)`);
  for (const entry of packageEntries.slice(0, 5)) {
    console.log(`- ${(entry.bytes / 1024).toFixed(1).padStart(7)} KiB  ${entry.path}`);
  }
  if (packageBytes > budgetBytes) {
    console.error(`${packageName} exceeds the ${String(budgetBytes / 1024 / 1024)} MiB per-package safety budget.`);
    process.exitCode = 1;
  }
}

const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`WeApp total package estimate: ${(totalBytes / 1024 / 1024).toFixed(3)} MiB (${entries.length} files)`);
if (totalBytes > totalBudgetBytes) {
  console.error(`Total package estimate exceeds the ${String(totalBudgetBytes / 1024 / 1024)} MiB safety budget.`);
  process.exitCode = 1;
}
