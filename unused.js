const fs = require("fs/promises");
const path = require("path");

const SRC_DIR = path.resolve("src");

const CODE_EXT = new Set([".js", ".ts", ".jsx", ".tsx"]);
const ALL_EXT = [".js", ".ts", ".jsx", ".tsx", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".json"];

const used = new Set();
const allFiles = new Set();

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === "node_modules" || entry.name === ".git") return;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        return;
      }

      const ext = path.extname(entry.name);

      if (!ALL_EXT.includes(ext)) return;

      const rel = path.relative(SRC_DIR, fullPath).replace(/\\/g, "/");
      allFiles.add(rel);

      // Only scan code files
      if (!CODE_EXT.has(ext)) return;

      const content = await fs.readFile(fullPath, "utf8");

      scanImports(content, fullPath);
    })
  );
}

function resolveImport(baseFile, importPath) {
  const baseDir = path.dirname(baseFile);
  let resolved = path.resolve(baseDir, importPath);

  // Direct file
  if (path.extname(resolved)) {
    if (ALL_EXT.includes(path.extname(resolved))) return resolved;
  }

  // Try with extensions
  for (const ext of ALL_EXT) {
    const file = resolved + ext;
    if (require("fs").existsSync(file)) return file;
  }

  // Try index files
  for (const ext of ALL_EXT) {
    const indexFile = path.join(resolved, "index" + ext);
    if (require("fs").existsSync(indexFile)) return indexFile;
  }

  return null;
}

function scanImports(content, filePath) {
  const regex =
    /(?:import\s.*?from\s+|require\s*\()\s*['"]([^'"]+)['"]/g;

  let match;

  while ((match = regex.exec(content))) {
    const imp = match[1];

    if (!imp.startsWith(".")) continue;

    const resolved = resolveImport(filePath, imp);

    if (!resolved) continue;

    const rel = path.relative(SRC_DIR, resolved).replace(/\\/g, "/");
    used.add(rel);
  }
}

async function main() {
  await walk(SRC_DIR);

  const unused = [...allFiles].filter((f) => !used.has(f));

  console.log("\nUnused files:\n");
  console.log(unused.join("\n"));
}

main();