import { execSync } from "child_process";
import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// 1. Build the Vite frontend → public/
console.log("Building frontend...");
execSync("BASE_PATH=/ pnpm --filter @workspace/dev-account-manager run build", {
  stdio: "inherit",
  cwd: ROOT,
});

// 2. Set up .vercel/output structure (Build Output API v3)
const outputDir = join(ROOT, ".vercel", "output");
const staticDir = join(outputDir, "static");
const funcDir = join(outputDir, "functions", "api", "index.func");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });

// 3. Copy built static files
console.log("Copying static files...");
cpSync(join(ROOT, "public"), staticDir, { recursive: true });

// 4. Bundle the API serverless function with esbuild
console.log("Bundling API function...");
const esbuild = join(
  ROOT,
  "artifacts",
  "api-server",
  "node_modules",
  ".bin",
  "esbuild",
);
execSync(
  `"${esbuild}" api/index.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --target=node20 \
    --outfile="${join(funcDir, "index.mjs")}"`,
  { stdio: "inherit", cwd: ROOT },
);

// 5. Function config
writeFileSync(
  join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    },
    null,
    2,
  ),
);

// 6. Vercel output config with routes
writeFileSync(
  join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api/index" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("Vercel build complete!");
