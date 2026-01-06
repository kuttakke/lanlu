import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionDir = path.resolve(__dirname, "..");
const sourceLogoPath = path.resolve(extensionDir, "..", "frontend", "public", "logo.svg");
const targetPublicDir = path.resolve(extensionDir, "public");
const targetLogoPath = path.resolve(targetPublicDir, "logo.svg");

const SIZES = [16, 24, 32, 48, 128, 256];

let svg = await readFile(sourceLogoPath, "utf8");
await writeFile(targetLogoPath, svg, "utf8");

// Replace CSS variables with static values for PNG rendering (resvg doesn't support CSS variables)
svg = svg
  .replace(/<style>[\s\S]*?<\/style>/g, "")
  .replace(/class="logo-bg"/g, 'fill="#0f172a"')
  .replace(/class="logo-fg"/g, 'fill="#ffffff"');

for (const size of SIZES) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });

  const pngData = resvg.render().asPng();
  const filePath = path.resolve(targetPublicDir, `extension_${size}.png`);
  await writeFile(filePath, pngData);
}

// Also keep a high-res preview asset (not referenced by manifest, but useful for docs)
{
  const size = 512;
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const pngData = resvg.render().asPng();
  await writeFile(path.resolve(targetPublicDir, "extension.png"), pngData);
}

console.log(`Synced logo from ${sourceLogoPath}`);
