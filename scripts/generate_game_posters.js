import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/posters');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Helper to create stunning SVG posters
const posters = {
  'neon-runner': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050512"/>
      <stop offset="50%" stop-color="#0c0728"/>
      <stop offset="100%" stop-color="#19043b"/>
    </linearGradient>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#7000ff"/>
    </linearGradient>
    <linearGradient id="laserRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff0055"/>
      <stop offset="100%" stop-color="#ff5500"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="800" height="450" fill="url(#bg)"/>
  
  <!-- Cyber City Skyline -->
  <path d="M 0,320 L 50,320 L 50,220 L 90,220 L 90,260 L 140,260 L 140,180 L 180,180 L 180,320 L 250,320 L 250,200 L 300,200 L 300,320 L 400,320 L 400,160 L 460,160 L 460,320 L 550,320 L 550,210 L 620,210 L 620,320 L 700,320 L 700,170 L 760,170 L 760,320 L 800,320 L 800,450 L 0,450 Z" fill="#090a21" opacity="0.8"/>
  <line x1="0" y1="320" x2="800" y2="320" stroke="#ff007f" stroke-width="3" opacity="0.6" filter="url(#glow)"/>

  <!-- Perspective Grid Floor -->
  <g opacity="0.5" stroke="#00f0ff" stroke-width="1.5">
    <line x1="0" y1="350" x2="800" y2="350"/>
    <line x1="0" y1="380" x2="800" y2="380"/>
    <line x1="0" y1="415" x2="800" y2="415"/>
    <line x1="400" y1="320" x2="0" y2="450"/>
    <line x1="400" y1="320" x2="200" y2="450"/>
    <line x1="400" y1="320" x2="400" y2="450"/>
    <line x1="400" y1="320" x2="600" y2="450"/>
    <line x1="400" y1="320" x2="800" y2="450"/>
  </g>

  <!-- Speed Lines -->
  <line x1="100" y1="280" x2="260" y2="280" stroke="#00f0ff" stroke-width="3" opacity="0.7"/>
  <line x1="50" y1="300" x2="220" y2="300" stroke="#ff00aa" stroke-width="2" opacity="0.8"/>

  <!-- Running Cyber Character (Jumping) -->
  <g transform="translate(280, 190)" filter="url(#glow)">
    <!-- Motion Trail -->
    <ellipse cx="-40" cy="40" rx="35" ry="12" fill="#00f0ff" opacity="0.3"/>
    <ellipse cx="-20" cy="30" rx="40" ry="15" fill="#d946ef" opacity="0.5"/>
    <!-- Character Silhouette & Neon Suit -->
    <circle cx="25" cy="5" r="14" fill="#00f0ff"/>
    <path d="M 15,20 L 35,20 L 45,50 L 30,75 L 10,60 Z" fill="#7000ff"/>
    <path d="M 45,30 L 70,20 L 80,35" stroke="#00f0ff" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M 20,30 L 0,45 L -10,65" stroke="#ff00aa" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M 30,75 L 55,100 L 75,95" stroke="#00f0ff" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M 10,60 L -15,80 L -30,70" stroke="#ff007f" stroke-width="7" stroke-linecap="round" fill="none"/>
  </g>

  <!-- Laser Hurdle -->
  <g transform="translate(540, 270)" filter="url(#glow)">
    <rect x="0" y="0" width="16" height="50" fill="#334155" rx="4"/>
    <rect x="80" y="0" width="16" height="50" fill="#334155" rx="4"/>
    <line x1="8" y1="15" x2="88" y2="15" stroke="url(#laserRed)" stroke-width="8" stroke-linecap="round"/>
    <line x1="8" y1="35" x2="88" y2="35" stroke="url(#laserRed)" stroke-width="8" stroke-linecap="round"/>
  </g>

  <!-- Glowing Energy Cores -->
  <circle cx="460" cy="220" r="14" fill="#facc15" filter="url(#glow)"/>
  <circle cx="500" cy="180" r="14" fill="#facc15" filter="url(#glow)"/>
  <circle cx="700" cy="240" r="18" fill="#00f0ff" filter="url(#glow)"/>

  <!-- Top In-Game HUD -->
  <rect x="30" y="25" width="220" height="38" rx="10" fill="#020617" opacity="0.85" stroke="#1e293b"/>
  <text x="45" y="49" fill="#94a3b8" font-family="sans-serif" font-weight="900" font-size="12">SCORE: <tspan fill="#00f0ff">48,290</tspan> • <tspan fill="#f43f5e">5X</tspan></text>

  <!-- Game Title Badge -->
  <g transform="translate(400, 75)" text-anchor="middle">
    <text x="0" y="0" fill="#00f0ff" font-family="system-ui, sans-serif" font-weight="900" font-size="44" letter-spacing="2" filter="url(#glow)">NEON CYBER DASH</text>
    <text x="0" y="24" fill="#f472b6" font-family="sans-serif" font-weight="800" font-size="14" letter-spacing="4">HIGH-SPEED CYBERPUNK RUNNER</text>
  </g>
</svg>`,

  'galaxy-strike': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <radialGradient id="nebula" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(#nebula)"/>
  
  <!-- Stars -->
  <g fill="#fff" opacity="0.8">
    <circle cx="80" cy="60" r="1.5"/><circle cx="200" cy="140" r="2"/><circle cx="650" cy="80" r="1.5"/><circle cx="720" cy="220" r="2"/><circle cx="340" cy="90" r="1"/><circle cx="500" cy="170" r="2"/>
  </g>

  <!-- Alien Warship Boss (Top) -->
  <g transform="translate(400, 110)" filter="url(#glow)">
    <path d="M -120,-40 L 0,-60 L 120,-40 L 140,10 L 80,45 L 0,60 L -80,45 L -140,10 Z" fill="#4c0519" stroke="#f43f5e" stroke-width="3"/>
    <circle cx="0" cy="0" r="22" fill="#e11d48"/>
    <circle cx="-60" cy="10" r="12" fill="#fb7185"/>
    <circle cx="60" cy="10" r="12" fill="#fb7185"/>
    <!-- Laser pulses from boss -->
    <line x1="-60" y1="30" x2="-60" y2="90" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="30" x2="60" y2="90" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- Player Starfighter (Bottom Center) -->
  <g transform="translate(400, 360)" filter="url(#glow)">
    <!-- Plasma Lasers Fired Upward -->
    <line x1="-24" y1="-30" x2="-24" y2="-180" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    <line x1="0" y1="-45" x2="0" y2="-210" stroke="#67e8f9" stroke-width="7" stroke-linecap="round"/>
    <line x1="24" y1="-30" x2="24" y2="-180" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Thruster Flame -->
    <polygon points="-12,30 0,65 12,30" fill="#f59e0b"/>
    <!-- Ship Hull -->
    <polygon points="0,-40 -40,25 -20,30 0,20 20,30 40,25" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
    <polygon points="0,-30 -15,10 15,10" fill="#e0f2fe"/>
  </g>

  <!-- Title Badge -->
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">GALAXY STRIKE: NOVA DEFENSE</text>
  </g>
</svg>`,

  'brick-breaker-neon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bbBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(#bbBg)"/>
  
  <!-- Neon Bricks Grid -->
  <g transform="translate(140, 80)" filter="url(#glow)">
    <!-- Row 1 Pink -->
    <rect x="0" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <rect x="90" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <rect x="180" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <rect x="270" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <rect x="360" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <rect x="450" y="0" width="75" height="24" rx="5" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
    <!-- Row 2 Cyan -->
    <rect x="0" y="34" width="75" height="24" rx="5" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
    <rect x="90" y="34" width="75" height="24" rx="5" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
    <rect x="270" y="34" width="75" height="24" rx="5" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
    <rect x="450" y="34" width="75" height="24" rx="5" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
    <!-- Row 3 Amber -->
    <rect x="0" y="68" width="75" height="24" rx="5" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
    <rect x="180" y="68" width="75" height="24" rx="5" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
    <rect x="360" y="68" width="75" height="24" rx="5" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
    <rect x="450" y="68" width="75" height="24" rx="5" fill="#f59e0b" stroke="#fef08a" stroke-width="2"/>
  </g>

  <!-- Exploding Brick Shards -->
  <g transform="translate(340, 110)" filter="url(#glow)">
    <polygon points="0,0 15,8 10,22" fill="#ec4899"/>
    <polygon points="25,-5 40,10 20,20" fill="#f43f5e"/>
    <circle cx="10" cy="5" r="4" fill="#fff"/>
  </g>

  <!-- Bouncing Neon Laser Ball with trail -->
  <g filter="url(#glow)">
    <line x1="380" y1="360" x2="340" y2="130" stroke="#f97316" stroke-width="5" stroke-dasharray="8,6" opacity="0.6"/>
    <circle cx="340" cy="130" r="14" fill="#fbbf24"/>
    <circle cx="340" cy="130" r="8" fill="#ffffff"/>
  </g>

  <!-- Player Energy Paddle -->
  <g transform="translate(320, 390)" filter="url(#glow)">
    <rect x="0" y="0" width="160" height="20" rx="10" fill="#06b6d4" stroke="#e0f2fe" stroke-width="3"/>
    <circle cx="15" cy="10" r="5" fill="#f43f5e"/>
    <circle cx="145" cy="10" r="5" fill="#f43f5e"/>
  </g>

  <!-- Title Badge -->
  <g transform="translate(400, 45)" text-anchor="middle">
    <text x="0" y="0" fill="#f97316" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">BRICK BREAKER: NEON INFERNO</text>
  </g>
</svg>`,

  'hexa-blast-puzzle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="gridBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="50%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="450" fill="url(#gridBg)"/>
  
  <!-- 2048 Neon Number Board -->
  <g transform="translate(240, 90)">
    <rect x="0" y="0" width="320" height="320" rx="20" fill="#0f172a" stroke="#10b981" stroke-width="4" opacity="0.9" filter="url(#glow)"/>
    <!-- Tiles Grid -->
    <g transform="translate(15, 15)">
      <!-- Row 1 -->
      <rect x="0" y="0" width="65" height="65" rx="10" fill="#059669"/><text x="32" y="42" fill="#fff" font-family="sans-serif" font-weight="900" font-size="24" text-anchor="middle">2</text>
      <rect x="75" y="0" width="65" height="65" rx="10" fill="#0d9488"/><text x="107" y="42" fill="#fff" font-family="sans-serif" font-weight="900" font-size="24" text-anchor="middle">4</text>
      <rect x="150" y="0" width="65" height="65" rx="10" fill="#0284c7"/><text x="182" y="42" fill="#fff" font-family="sans-serif" font-weight="900" font-size="24" text-anchor="middle">8</text>
      <rect x="225" y="0" width="65" height="65" rx="10" fill="#2563eb"/><text x="257" y="42" fill="#fff" font-family="sans-serif" font-weight="900" font-size="22" text-anchor="middle">16</text>
      <!-- Row 2 -->
      <rect x="0" y="75" width="65" height="65" rx="10" fill="#7c3aed"/><text x="32" y="117" fill="#fff" font-family="sans-serif" font-weight="900" font-size="22" text-anchor="middle">32</text>
      <rect x="75" y="75" width="65" height="65" rx="10" fill="#c026d3"/><text x="107" y="117" fill="#fff" font-family="sans-serif" font-weight="900" font-size="22" text-anchor="middle">64</text>
      <rect x="150" y="75" width="65" height="65" rx="10" fill="#e11d48"/><text x="182" y="117" fill="#fff" font-family="sans-serif" font-weight="900" font-size="20" text-anchor="middle">128</text>
      <rect x="225" y="75" width="65" height="65" rx="10" fill="#ea580c"/><text x="257" y="117" fill="#fff" font-family="sans-serif" font-weight="900" font-size="20" text-anchor="middle">256</text>
      <!-- Row 3 -->
      <rect x="0" y="150" width="65" height="65" rx="10" fill="#d97706"/><text x="32" y="192" fill="#fff" font-family="sans-serif" font-weight="900" font-size="20" text-anchor="middle">512</text>
      <rect x="75" y="150" width="65" height="65" rx="10" fill="#ca8a04"/><text x="107" y="192" fill="#fff" font-family="sans-serif" font-weight="900" font-size="18" text-anchor="middle">1024</text>
      <!-- Master 2048 Diamond Tile -->
      <rect x="150" y="150" width="140" height="140" rx="16" fill="#fbbf24" stroke="#fef08a" stroke-width="4" filter="url(#glow)"/>
      <text x="220" y="235" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="34" text-anchor="middle">2048</text>
    </g>
  </g>

  <!-- Title Badge -->
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#34d399" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">HEXA BLAST 2048 MASTER</text>
  </g>
</svg>`,

  'astro-vanguard': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#030712"/>
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
  </defs>
  <!-- Asteroids -->
  <polygon points="150,120 180,90 220,110 240,150 200,190 140,170" fill="none" stroke="#38bdf8" stroke-width="3" filter="url(#glow)"/>
  <polygon points="620,160 670,120 720,150 710,210 650,230 600,190" fill="none" stroke="#38bdf8" stroke-width="3" filter="url(#glow)"/>
  <polygon points="450,260 480,240 510,270 490,300 440,290" fill="none" stroke="#38bdf8" stroke-width="2"/>
  
  <!-- Ship -->
  <g transform="translate(340, 220) rotate(-45)" filter="url(#glow)">
    <polygon points="0,-40 -25,30 0,15 25,30" fill="none" stroke="#22d3ee" stroke-width="4"/>
    <line x1="0" y1="15" x2="0" y2="45" stroke="#f59e0b" stroke-width="5"/>
    <line x1="0" y1="-40" x2="0" y2="-160" stroke="#e0f2fe" stroke-width="4" stroke-dasharray="10,8"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#00f0ff" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">ASTRO VANGUARD: VOID HUNTER</text>
  </g>
</svg>`,

  'cyber-hoops': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0f172a"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Hoop -->
  <g transform="translate(560, 160)" filter="url(#glow)">
    <rect x="0" y="-80" width="15" height="160" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
    <line x1="15" y1="20" x2="80" y2="20" stroke="#f97316" stroke-width="6"/>
    <!-- Net -->
    <polygon points="20,20 75,20 65,90 30,90" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,4"/>
  </g>
  <!-- Trajectory Arc -->
  <path d="M 180,340 Q 360,60 600,175" fill="none" stroke="#fbbf24" stroke-width="4" stroke-dasharray="10,8" filter="url(#glow)"/>
  <!-- Basketball -->
  <circle cx="180" cy="340" r="32" fill="#ea580c" stroke="#fed7aa" stroke-width="3" filter="url(#glow)"/>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#fb923c" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">CYBER HOOPS: STREET DUNKER</text>
  </g>
</svg>`,

  'neon-penalty': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#022c22"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Goal Post -->
  <g transform="translate(180, 80)" filter="url(#glow)">
    <rect x="0" y="0" width="440" height="240" fill="none" stroke="#34d399" stroke-width="8" rx="8"/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="#f43f5e" stroke-width="5"/>
    <text x="50" y="56" fill="#fff" font-family="sans-serif" font-weight="900" font-size="16" text-anchor="middle">+500</text>
    <circle cx="390" cy="50" r="28" fill="none" stroke="#f43f5e" stroke-width="5"/>
    <text x="390" y="56" fill="#fff" font-family="sans-serif" font-weight="900" font-size="16" text-anchor="middle">+500</text>
  </g>
  <!-- Soccer Ball & Curve Line -->
  <path d="M 400,410 Q 300,280 230,130" fill="none" stroke="#38bdf8" stroke-width="5" stroke-dasharray="10,6" filter="url(#glow)"/>
  <circle cx="400" cy="400" r="26" fill="#f8fafc" stroke="#0f172a" stroke-width="3" filter="url(#glow)"/>
  <g transform="translate(400, 45)" text-anchor="middle">
    <text x="0" y="0" fill="#34d399" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">NEON STRIKER: PENALTY HERO</text>
  </g>
</svg>`,

  'cyber-archery': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0f172a"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Archero Hero & Glowing Bow -->
  <g transform="translate(260, 240)" filter="url(#glow)">
    <circle cx="0" cy="0" r="28" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
    <path d="M 20,-30 Q 50,0 20,30" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    <line x1="10" y1="0" x2="160" y2="0" stroke="#facc15" stroke-width="6" stroke-linecap="round"/>
    <line x1="10" y1="0" x2="150" y2="-45" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
    <line x1="10" y1="0" x2="150" y2="45" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  </g>
  <!-- Monster Dungeon Boss -->
  <g transform="translate(620, 240)" filter="url(#glow)">
    <polygon points="-40,-40 40,-40 60,20 0,60 -60,20" fill="#be123c" stroke="#f43f5e" stroke-width="4"/>
    <circle cx="-15" cy="-10" r="8" fill="#facc15"/>
    <circle cx="15" cy="-10" r="8" fill="#facc15"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER ARCHERO: ROGUE HERO</text>
  </g>
</svg>`,

  'knife-hit-neon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#070b19"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Spinning Log -->
  <g transform="translate(400, 160)" filter="url(#glow)">
    <circle cx="0" cy="0" r="90" fill="#1e293b" stroke="#00f0ff" stroke-width="5"/>
    <circle cx="0" cy="0" r="50" fill="#0f172a" stroke="#7000ff" stroke-width="3"/>
    <!-- Stuck Knives -->
    <rect x="-6" y="-140" width="12" height="50" rx="3" fill="#38bdf8"/>
    <rect x="90" y="-20" width="50" height="12" rx="3" fill="#f43f5e" transform="rotate(45 90 -20)"/>
    <rect x="-140" y="-10" width="50" height="12" rx="3" fill="#a855f7" transform="rotate(-30 -140 -10)"/>
  </g>
  <!-- Flying Knife from Bottom -->
  <g transform="translate(400, 360)" filter="url(#glow)">
    <polygon points="0,-40 -12,20 12,20" fill="#00f0ff" stroke="#e0f2fe" stroke-width="3"/>
    <rect x="-4" y="20" width="8" height="25" fill="#334155"/>
  </g>
  <g transform="translate(400, 45)" text-anchor="middle">
    <text x="0" y="0" fill="#00f0ff" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">KNIFE HIT: NEON BLADES</text>
  </g>
</svg>`,

  'color-hole-3d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#070b16"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Black Hole Void -->
  <g transform="translate(400, 240)" filter="url(#glow)">
    <ellipse cx="0" cy="0" rx="130" ry="60" fill="#000000" stroke="#00f0ff" stroke-width="6"/>
    <!-- Falling Colorful Cubes into Hole -->
    <polygon points="-40,-10 -20,-30 0,-10 -20,10" fill="#f43f5e"/>
    <polygon points="30,-15 50,-35 70,-15 50,5" fill="#facc15"/>
    <polygon points="-10,5 10,-15 30,5 10,25" fill="#3b82f6"/>
  </g>
  <!-- Stage Blocks around -->
  <g transform="translate(200, 150)" filter="url(#glow)"><rect x="0" y="0" width="35" height="35" rx="6" fill="#10b981"/></g>
  <g transform="translate(580, 170)" filter="url(#glow)"><rect x="0" y="0" width="35" height="35" rx="6" fill="#a855f7"/></g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">COLOR HOLE 3D: BLACK VOID</text>
  </g>
</svg>`,

  'neon-tower-stacker-3d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#050512"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Isometric Stacking Slabs -->
  <g transform="translate(400, 290)" filter="url(#glow)">
    <!-- Base Slab -->
    <polygon points="0,50 160,0 0,-50 -160,0" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
    <!-- Slab 2 -->
    <polygon points="0,20 150,-25 0,-70 -150,-25" fill="#7c3aed" stroke="#c084fc" stroke-width="2"/>
    <!-- Slab 3 -->
    <polygon points="0,-10 140,-50 0,-90 -140,-50" fill="#db2777" stroke="#f472b6" stroke-width="2"/>
    <!-- Top Moving Slab -->
    <polygon points="30,-40 160,-80 30,-120 -100,-80" fill="#f59e0b" stroke="#fde047" stroke-width="3"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">TOWER STACKER 3D: SKY CITY</text>
  </g>
</svg>`,

  'cyber-merge-2048': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#020617"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <g transform="translate(400, 230)" filter="url(#glow)">
    <polygon points="0,-80 70,-40 70,40 0,80 -70,40 -70,-40" fill="#1e1b4b" stroke="#818cf8" stroke-width="4"/>
    <text x="0" y="16" fill="#a5b4fc" font-family="sans-serif" font-weight="900" font-size="42" text-anchor="middle">2048</text>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#818cf8" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">CYBER MERGE 2048: FUSION</text>
  </g>
</svg>`,

  'cyber-hopper-3d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#090d16"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Road lanes -->
  <polygon points="0,320 800,240 800,320 0,400" fill="#1e293b"/>
  <!-- Voxel Hopper Character -->
  <g transform="translate(360, 270)" filter="url(#glow)">
    <rect x="0" y="0" width="40" height="40" rx="8" fill="#facc15" stroke="#fef08a" stroke-width="3"/>
    <circle cx="12" cy="14" r="5" fill="#0f172a"/><circle cx="28" cy="14" r="5" fill="#0f172a"/>
  </g>
  <!-- Passing Cyber Car -->
  <g transform="translate(540, 260)" filter="url(#glow)">
    <rect x="0" y="0" width="100" height="35" rx="8" fill="#06b6d4" stroke="#a5f3fc" stroke-width="2"/>
    <rect x="80" y="5" width="15" height="10" fill="#f43f5e"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#facc15" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">CYBER HOPPER 3D: NEON CROSSER</text>
  </g>
</svg>`,

  'cyber-slither-arena': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#030712"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Cyber Snake Body (Cyan) -->
  <g filter="url(#glow)">
    <circle cx="200" cy="300" r="22" fill="#06b6d4"/>
    <circle cx="230" cy="270" r="22" fill="#06b6d4"/>
    <circle cx="270" cy="250" r="22" fill="#0891b2"/>
    <circle cx="315" cy="245" r="22" fill="#0891b2"/>
    <circle cx="360" cy="260" r="22" fill="#0e7490"/>
    <circle cx="400" cy="290" r="22" fill="#0e7490"/>
    <circle cx="445" cy="300" r="24" fill="#22d3ee" stroke="#fff" stroke-width="3"/>
    <!-- Eyes -->
    <circle cx="450" cy="292" r="5" fill="#0f172a"/><circle cx="450" cy="308" r="5" fill="#0f172a"/>
  </g>
  <!-- Food Energy Pellets -->
  <circle cx="530" cy="240" r="10" fill="#f43f5e" filter="url(#glow)"/>
  <circle cx="580" cy="280" r="10" fill="#facc15" filter="url(#glow)"/>
  <circle cx="490" cy="360" r="10" fill="#a855f7" filter="url(#glow)"/>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#22d3ee" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER SLITHER ARENA: NEON WORMS</text>
  </g>
</svg>`,

  'cyber-blade-hit': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0b0f19"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Spinning Disc Target -->
  <circle cx="400" cy="180" r="85" fill="#1e293b" stroke="#3b82f6" stroke-width="5" filter="url(#glow)"/>
  <circle cx="400" cy="180" r="35" fill="#0f172a" stroke="#60a5fa" stroke-width="3"/>
  <!-- Flying Shuriken Blade -->
  <g transform="translate(400, 340)" filter="url(#glow)">
    <polygon points="0,-35 12,-12 35,0 12,12 0,35 -12,12 -35,0 -12,-12" fill="#00f0ff" stroke="#e0f2fe" stroke-width="2"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">CYBER BLADE HIT: SHURIKEN MASTER</text>
  </g>
</svg>`,

  'cyber-katana-slicer': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#090514"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Sliced Watermelon Halves -->
  <g transform="translate(340, 200)" filter="url(#glow)">
    <path d="M 0,-40 A 50 50 0 0 0 0 40 Z" fill="#e11d48" stroke="#22c55e" stroke-width="6"/>
  </g>
  <g transform="translate(460, 240)" filter="url(#glow)">
    <path d="M 0,-40 A 50 50 0 0 1 0 40 Z" fill="#e11d48" stroke="#22c55e" stroke-width="6"/>
  </g>
  <!-- Katana Blade Slash Trail -->
  <path d="M 160,340 Q 400,180 640,120" stroke="#00f0ff" stroke-width="8" stroke-linecap="round" fill="none" filter="url(#glow)"/>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#f43f5e" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER KATANA SLICER: 3D NINJA</text>
  </g>
</svg>`,

  'cyber-stack-3d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#070a1e"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <g transform="translate(400, 280)" filter="url(#glow)">
    <polygon points="0,40 140,0 0,-40 -140,0" fill="#3b82f6" stroke="#93c5fd" stroke-width="2"/>
    <polygon points="0,10 130,-30 0,-70 -130,-30" fill="#8b5cf6" stroke="#c4b5fd" stroke-width="2"/>
    <polygon points="0,-20 120,-60 0,-100 -120,-60" fill="#ec4899" stroke="#fbcfe8" stroke-width="2"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#a78bfa" font-family="system-ui, sans-serif" font-weight="900" font-size="38" letter-spacing="2" filter="url(#glow)">CYBER STACK 3D: NEON BUILDER</text>
  </g>
</svg>`,

  'cyber-bubble-shooter': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0a0a1a"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Ceiling Bubble Cluster -->
  <g transform="translate(260, 90)" filter="url(#glow)">
    <circle cx="0" cy="0" r="18" fill="#06b6d4"/>
    <circle cx="40" cy="0" r="18" fill="#06b6d4"/>
    <circle cx="80" cy="0" r="18" fill="#ec4899"/>
    <circle cx="120" cy="0" r="18" fill="#ec4899"/>
    <circle cx="160" cy="0" r="18" fill="#facc15"/>
    <circle cx="200" cy="0" r="18" fill="#facc15"/>
    <circle cx="240" cy="0" r="18" fill="#06b6d4"/>
    <circle cx="280" cy="0" r="18" fill="#06b6d4"/>
    <!-- Row 2 -->
    <circle cx="20" cy="32" r="18" fill="#ec4899"/>
    <circle cx="60" cy="32" r="18" fill="#06b6d4"/>
    <circle cx="100" cy="32" r="18" fill="#06b6d4"/>
    <circle cx="140" cy="32" r="18" fill="#facc15"/>
    <circle cx="180" cy="32" r="18" fill="#a855f7"/>
    <circle cx="220" cy="32" r="18" fill="#06b6d4"/>
    <circle cx="260" cy="32" r="18" fill="#06b6d4"/>
  </g>
  <!-- Aiming Line & Cannon -->
  <line x1="400" y1="380" x2="360" y2="150" stroke="#00f0ff" stroke-width="4" stroke-dasharray="8,6" filter="url(#glow)"/>
  <g transform="translate(400, 380)" filter="url(#glow)">
    <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
    <circle cx="0" cy="0" r="16" fill="#06b6d4"/>
  </g>
  <g transform="translate(400, 45)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER BUBBLE SHOOTER: PLASMA POP</text>
  </g>
</svg>`,

  'cyber-jump-doodler': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#080e1a"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Floating Platforms -->
  <g filter="url(#glow)">
    <rect x="220" y="340" width="100" height="18" rx="8" fill="#22c55e"/>
    <rect x="440" y="270" width="100" height="18" rx="8" fill="#22c55e"/>
    <rect x="300" y="180" width="100" height="18" rx="8" fill="#38bdf8"/>
  </g>
  <!-- Jumper Character with Spring Boots -->
  <g transform="translate(350, 120)" filter="url(#glow)">
    <circle cx="0" cy="0" r="24" fill="#a855f7" stroke="#e9d5ff" stroke-width="3"/>
    <circle cx="-7" cy="-5" r="4" fill="#fff"/><circle cx="7" cy="-5" r="4" fill="#fff"/>
    <!-- Springs -->
    <path d="M -10,24 Q -5,35 -10,42 Q -5,48 -10,54" stroke="#facc15" stroke-width="4" fill="none"/>
    <path d="M 10,24 Q 15,35 10,42 Q 15,48 10,54" stroke="#facc15" stroke-width="4" fill="none"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#c084fc" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER DOODLE JUMP: QUANTUM ALTITUDE</text>
  </g>
</svg>`,

  'cyber-jetpack-dash': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0d0714"/>
  <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
  <!-- Jetpack Hero -->
  <g transform="translate(320, 220)" filter="url(#glow)">
    <!-- Plasma Exhaust Fire -->
    <polygon points="-30,10 -80,25 -30,20" fill="#f59e0b"/>
    <polygon points="-30,10 -100,15 -30,20" fill="#ef4444"/>
    <!-- Jetpack -->
    <rect x="-35" y="-15" width="20" height="35" rx="6" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
    <!-- Hero Body -->
    <circle cx="0" cy="-15" r="14" fill="#38bdf8"/>
    <path d="M -15,0 L 15,0 L 25,25 L -5,25 Z" fill="#0284c7"/>
  </g>
  <!-- Electric Hazard Zapper -->
  <g transform="translate(560, 160)" filter="url(#glow)">
    <circle cx="0" cy="0" r="15" fill="#f43f5e"/>
    <circle cx="0" cy="120" r="15" fill="#f43f5e"/>
    <line x1="0" y1="15" x2="0" y2="105" stroke="#f43f5e" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g transform="translate(400, 50)" text-anchor="middle">
    <text x="0" y="0" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="900" font-size="36" letter-spacing="2" filter="url(#glow)">CYBER JETPACK: NEON OVERDRIVE</text>
  </g>
</svg>`
};

for (const [id, svg] of Object.entries(posters)) {
  const filePath = path.join(outDir, `${id}.svg`);
  fs.writeFileSync(filePath, svg.trim());
  console.log(`Generated poster for: ${id} -> ${filePath}`);
}
