import { execSync } from "child_process";
import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

// 1. Build the Vite frontend → public/
console.log("\n--- Building frontend ---");
run("BASE_PATH=/ pnpm --filter @workspace/dev-account-manager run build");

// 2. Set up .vercel/output structure (Build Output API v3)
console.log("\n--- Setting up Vercel output structure ---");
const outputDir = join(ROOT, ".vercel", "output");
const staticDir = join(outputDir, "static");
const funcDir = join(outputDir, "functions", "api", "index.func");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });

// 3. Copy built static files
console.log("Copying static files...");
cpSync(join(ROOT, "public"), staticDir, { recursive: true });

// 4. Bundle the API serverless function with esbuild via pnpm exec
console.log("\n--- Bundling API function ---");
const outfile = join(funcDir, "index.mjs");
run(
  `pnpm --filter @workspace/api-server exec esbuild ../../api/index.ts` +
    ` --bundle --platform=node --format=esm --target=node20` +
    ` --outfile="${outfile}"`,
);

// 5. Function runtime config
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

// 6. Vercel deployment config with routes
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

console.log("\nVercel build complete!");
