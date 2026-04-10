/**
 * QCStats OCR Region Map
 * 
 * Defines bounding boxes for data extraction from QC ranking screenshots.
 * All coordinates are normalized to a 1024x576 reference frame (16:9 aspect ratio).
 * The actual screenshot is resized to this reference before extraction.
 * 
 * RECALIBRATED 2026-04-10 from debug overlay on real QC 1920x1080 screenshots.
 * The QC "ŁĄCZNY WYNIK" (total score) screen layout:
 * - Top bar: player portraits, tabs (KOSZARY, RAPORT Z WALKI, RANKING, STATYSTYKI)
 * - Score badges: center ~490,243
 * - Player nicks: left ~393, right ~618, y~247
 * - Summary row (PRZEDMIOTY): y~275
 * - Weapon rows: start y~305, 21px spacing
 * - Item pickups: left panel x~52, right panel x~945
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRRegion {
  name: string;
  box: BoundingBox;
  type: "text" | "number" | "fraction" | "percentage";
  /** Tesseract whitelist for this region */
  whitelist?: string;
  /** Which player this region belongs to (1=left, 2=right) */
  player?: 1 | 2;
  /** Weapon index (0-10) if this is a weapon stat */
  weaponIndex?: number;
}

// Reference resolution: 1024x576 (16:9 scaled down)
export const REFERENCE_WIDTH = 1024;
export const REFERENCE_HEIGHT = 576;

// =====================================================
// PLAYER NICKS & SCORE
// =====================================================
// Measured from debug overlay on 1024x576 reference:
// Nick "Dziador": x≈393, y≈247, width≈65
// Nick "LuqAtMe": x≈618, y≈247, width≈70  
// Score "12": x≈485, y≈240, width≈22
// Score "13": x≈515, y≈240, width≈22

const playerRegions: OCRRegion[] = [
  // Player 1 (left side)
  {
    name: "player1_nick",
    box: { x: 385, y: 242, width: 80, height: 20 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 1,
  },
  {
    name: "player1_score",
    box: { x: 480, y: 237, width: 28, height: 25 },
    type: "number",
    whitelist: "0123456789",
    player: 1,
  },
  // Player 2 (right side)
  {
    name: "player2_nick",
    box: { x: 610, y: 242, width: 85, height: 20 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 2,
  },
  {
    name: "player2_score",
    box: { x: 514, y: 237, width: 28, height: 25 },
    type: "number",
    whitelist: "0123456789",
    player: 2,
  },
];

// =====================================================
// SUMMARY ROW (per player) – the "PRZEDMIOTY 4236 0 N/O 1650 364/1022 35% 4889 12" line
// =====================================================
// Measured from debug overlay: summary row sits at y≈275
// Columns layout (1024px reference):
// P1 left→right: PRZEDMIOTY(~232) PD(~286) PING(~310) WYNIK(~340) ULECZ.PZ(~365)
//   TRAFIENIA(~395) CELN.%(~440) OBR.(~470) WYNIK(~500)
// P2 left→right: WYNIK(~530) OBR.(~555) P2 mirrors from center

const SUMMARY_Y = 273;

const summaryRegionsP1: OCRRegion[] = [
  { name: "p1_pd",         box: { x: 276, y: SUMMARY_Y, width: 45, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_ping",       box: { x: 310, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_xp",         box: { x: 332, y: SUMMARY_Y, width: 30, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 1 },
  { name: "p1_healing",    box: { x: 360, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_hits_shots", box: { x: 395, y: SUMMARY_Y, width: 65, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 1 },
  { name: "p1_accuracy",   box: { x: 442, y: SUMMARY_Y, width: 32, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 1 },
  { name: "p1_damage",     box: { x: 462, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_kills",      box: { x: 500, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
];

const summaryRegionsP2: OCRRegion[] = [
  { name: "p2_kills",      box: { x: 525, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_damage",     box: { x: 545, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_accuracy",   box: { x: 585, y: SUMMARY_Y, width: 32, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 2 },
  { name: "p2_hits_shots", box: { x: 615, y: SUMMARY_Y, width: 65, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 2 },
  { name: "p2_healing",    box: { x: 675, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_xp",         box: { x: 712, y: SUMMARY_Y, width: 30, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 2 },
  { name: "p2_ping",       box: { x: 740, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_pd",         box: { x: 760, y: SUMMARY_Y, width: 45, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// WEAPON STATS ROWS (11 weapons per player)
// =====================================================
// Measured from debug overlay: weapon rows start at y≈302, spacing≈21px
// P1 columns (1024px): hits/shots ~295, accuracy ~370, damage ~410, kills ~458
// P2 columns (1024px): kills ~530, damage ~565, accuracy ~615, hits/shots ~660

const WEAPON_NAMES = [
  "Gauntlet",
  "Machine Gun",
  "Super Machine Gun",
  "Shotgun",
  "Super Shotgun",
  "Nail Gun",
  "Super Nailgun",
  "Rocket Launcher",
  "Lightning Gun",
  "Railgun",
  "Tribolt",
] as const;

const WEAPON_ROW_START_Y = 302;
const WEAPON_ROW_HEIGHT = 21;

function generateWeaponRegions(): OCRRegion[] {
  const regions: OCRRegion[] = [];

  for (let i = 0; i < 11; i++) {
    const y = WEAPON_ROW_START_Y + i * WEAPON_ROW_HEIGHT;

    // Player 1 weapon stats (left side)
    // Columns: TRAFIENIA(hits/shots) | CELŃ.%(acc) | OBR.(dmg) | WYNIK(kills)
    regions.push(
      {
        name: `p1_w${i}_hits_shots`,
        box: { x: 295, y, width: 65, height: 17 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_accuracy`,
        box: { x: 370, y, width: 35, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_damage`,
        box: { x: 410, y, width: 42, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_kills`,
        box: { x: 458, y, width: 22, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      }
    );

    // Player 2 weapon stats (right side)
    // Columns: WYNIK(kills) | OBR.(dmg) | CELŃ.% | TRAFIENIA
    regions.push(
      {
        name: `p2_w${i}_kills`,
        box: { x: 530, y, width: 22, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_damage`,
        box: { x: 555, y, width: 42, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_accuracy`,
        box: { x: 605, y, width: 35, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_hits_shots`,
        box: { x: 650, y, width: 65, height: 17 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 2,
        weaponIndex: i,
      }
    );
  }

  return regions;
}

// =====================================================
// ITEM PICKUPS (left/right side panels)
// =====================================================
// Measured from debug overlay:
// Left panel (P1): x~52, MegaHP y~330, HeavyArmor y~375, LightArmor y~416
// Right panel (P2): x~945

const itemRegions: OCRRegion[] = [
  // Player 1 items (left panel - green shields)
  { name: "p1_mega_health", box: { x: 52, y: 328, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_heavy_armor", box: { x: 52, y: 373, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_light_armor", box: { x: 52, y: 416, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  // Player 2 items (right panel - green shields)
  { name: "p2_mega_health", box: { x: 945, y: 328, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_heavy_armor", box: { x: 945, y: 373, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_light_armor", box: { x: 945, y: 416, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// EXPORT ALL REGIONS
// =====================================================

export const ALL_REGIONS: OCRRegion[] = [
  ...playerRegions,
  ...summaryRegionsP1,
  ...summaryRegionsP2,
  ...generateWeaponRegions(),
  ...itemRegions,
];

export { WEAPON_NAMES };

/**
 * Scale a bounding box from reference resolution to actual image size
 */
export function scaleBox(
  box: BoundingBox,
  imageWidth: number,
  imageHeight: number
): BoundingBox {
  const scaleX = imageWidth / REFERENCE_WIDTH;
  const scaleY = imageHeight / REFERENCE_HEIGHT;

  return {
    x: Math.round(box.x * scaleX),
    y: Math.round(box.y * scaleY),
    width: Math.round(box.width * scaleX),
    height: Math.round(box.height * scaleY),
  };
}
