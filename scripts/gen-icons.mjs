// PWAアイコンのプレースホルダーを生成するワンショットスクリプト。
// 実運用前に public/icons/* を正式なブランドアイコンへ差し替えること（SETUP.md参照）。
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function svg(size, { maskableSafeZone = false } = {}) {
  const bg = "#0b0c0e";
  const accent = "#4c7093";
  const pad = maskableSafeZone ? size * 0.2 : size * 0.12;
  const r = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="${size * 0.06}" stroke-linecap="round" stroke-dasharray="${r * 4.6} ${r * 6.28}" transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${size * 0.07}" fill="${accent}"/>
  </svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const t of targets) {
  const buf = Buffer.from(svg(t.size, { maskableSafeZone: t.maskable }));
  await sharp(buf).png().toFile(path.join(outDir, t.file));
  console.log("wrote", t.file);
}
