import fs from 'fs';
import path from 'path';

function rgbaToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = parseInt(x, 10).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

const dir = path.resolve('public/posters');
const files = fs.readdirSync(dir);

let fixedCount = 0;

for (const f of files) {
  if (!f.endsWith('.svg')) continue;
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Replace fill="rgba(r, g, b, a)" with fill="#hex" fill-opacity="a"
  const fillRegex = /fill="rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)"/g;
  if (fillRegex.test(content)) {
    changed = true;
    content = content.replace(fillRegex, (match, r, g, b, a) => {
      return `fill="${rgbaToHex(r, g, b)}" fill-opacity="${a}"`;
    });
  }

  // Replace stroke="rgba(r, g, b, a)" with stroke="#hex" stroke-opacity="a"
  const strokeRegex = /stroke="rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)"/g;
  if (strokeRegex.test(content)) {
    changed = true;
    content = content.replace(strokeRegex, (match, r, g, b, a) => {
      return `stroke="${rgbaToHex(r, g, b)}" stroke-opacity="${a}"`;
    });
  }

  // Replace stop-color="rgba(r, g, b, a)" with stop-color="#hex" stop-opacity="a"
  const stopRegex = /stop-color="rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)"/g;
  if (stopRegex.test(content)) {
    changed = true;
    content = content.replace(stopRegex, (match, r, g, b, a) => {
      return `stop-color="${rgbaToHex(r, g, b)}" stop-opacity="${a}"`;
    });
  }

  if (changed) {
    fs.writeFileSync(p, content);
    console.log(`[FIXED] ${f}`);
    fixedCount++;
  }
}

console.log(`\nSuccessfully fixed ${fixedCount} SVG files.`);
