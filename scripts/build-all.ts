import path from "node:path";

const extensions = ["yt-like-memo"];

for (const ext of extensions) {
  const srcDir = path.join("packages", ext, "src");
  const outDir = path.join("packages", ext, "dist");

  const entrypoints = ["content.ts", "background.ts", "popup.ts"]
    .map((f) => path.join(srcDir, f));

  const result = await Bun.build({
    entrypoints,
    outdir: outDir,
    target: "browser",
    format: "iife",
  });

  if (!result.success) {
    console.error(`Build failed for ${ext}:`, result.logs);
    process.exit(1);
  }

  console.log(`Built ${ext}: ${result.outputs.length} files`);
}
