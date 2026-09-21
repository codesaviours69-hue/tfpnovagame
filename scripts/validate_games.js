import fs from 'fs';
import path from 'path';

// Read src/data/games.ts
const gamesFileContent = fs.readFileSync('src/data/games.ts', 'utf8');

// Read GameDetailView.tsx
const detailViewContent = fs.readFileSync('src/components/GameDetailView.tsx', 'utf8');

// List posters in public/posters/
const posterFiles = new Set(fs.readdirSync('public/posters'));

console.log(`Found ${posterFiles.size} poster files in public/posters/\n`);

// Extract GAME_POSTERS
const postersMatch = gamesFileContent.match(/export const GAME_POSTERS: Record<string, string> = {([\s\S]*?)};/);
const postersMap = {};
if (postersMatch) {
  const lines = postersMatch[1].split('\n');
  for (const l of lines) {
    const m = l.match(/'([^']+)':\s*'([^']+)'/);
    if (m) {
      postersMap[m[1]] = m[2];
    }
  }
}

// Extract GAMES_RAW
const idRegex = /id:\s*'([^']+)'/g;
const titleRegex = /title:\s*'([^']+)'/g;
const slugRegex = /slug:\s*'([^']+)'/g;

const ids = [...gamesFileContent.matchAll(idRegex)].map(m => m[1]);
const titles = [...gamesFileContent.matchAll(titleRegex)].map(m => m[1]);
const slugs = [...gamesFileContent.matchAll(slugRegex)].map(m => m[1]);

console.log(`Total Games Count: ${ids.length}`);

// Check unique IDs
const idCounts = {};
for (const id of ids) {
  idCounts[id] = (idCounts[id] || 0) + 1;
}
const dupIds = Object.entries(idCounts).filter(([_, c]) => c > 1);
if (dupIds.length > 0) {
  console.error('[ERROR] Duplicate IDs found:', dupIds);
} else {
  console.log('✓ All Game IDs are unique');
}

// Check unique Titles
const titleCounts = {};
for (const t of titles) {
  titleCounts[t] = (titleCounts[t] || 0) + 1;
}
const dupTitles = Object.entries(titleCounts).filter(([_, c]) => c > 1);
if (dupTitles.length > 0) {
  console.error('[ERROR] Duplicate Titles found:', dupTitles);
} else {
  console.log('✓ All Game Titles are unique');
}

// Check unique Slugs
const slugCounts = {};
for (const s of slugs) {
  slugCounts[s] = (slugCounts[s] || 0) + 1;
}
const dupSlugs = Object.entries(slugCounts).filter(([_, c]) => c > 1);
if (dupSlugs.length > 0) {
  console.error('[ERROR] Duplicate Slugs found:', dupSlugs);
} else {
  console.log('✓ All Game Slugs are unique');
}

// Check posters exist
let missingPosters = 0;
for (const [gid, pPath] of Object.entries(postersMap)) {
  const fname = path.basename(pPath);
  if (!posterFiles.has(fname)) {
    console.error(`[ERROR] Poster missing for game "${gid}": ${fname} (path: ${pPath})`);
    missingPosters++;
  }
}
if (missingPosters === 0) {
  console.log('✓ All poster files mapped in GAME_POSTERS exist on disk');
}

// Check every game has a poster mapping
let unmappedPosters = 0;
for (const id of ids) {
  if (!postersMap[id]) {
    console.error(`[ERROR] Game ID "${id}" has no entry in GAME_POSTERS`);
    unmappedPosters++;
  }
}
if (unmappedPosters === 0) {
  console.log('✓ All games have poster mapping in GAME_POSTERS');
}

// Check GameDetailView switch cases
let missingCases = 0;
for (const id of ids) {
  const casePattern = new RegExp(`case\\s+'${id}':`);
  if (!casePattern.test(detailViewContent)) {
    console.error(`[ERROR] Game ID "${id}" is MISSING from GameDetailView switch cases!`);
    missingCases++;
  }
}
if (missingCases === 0) {
  console.log('✓ All games have corresponding switch case in GameDetailView.tsx');
}
