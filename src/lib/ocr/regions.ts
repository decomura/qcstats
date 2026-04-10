/**
 * QCStats OCR Region Map
 * 
 * Defines bounding boxes for data extraction from QC ranking screenshots.
 * All coordinates are normalized to a 1024x576 reference frame (16:9 aspect ratio).
 * The actual screenshot is resized to this reference before extraction.
 * 
 * Calibrated from real QC 1920x1080 screenshots (scaled to 1024x576).
 * The QC ranking screen layout (tab "RANKING"):
 * - Top bar: player portraits, score badges, tabs
 * - Player nicks: left ~230-300, right ~610-740, y~200
 * - Score: center area ~455-540, y~190
 * - Summary row (PRZEDMIOTY/ITEMS row): y~230
 * - Weapon rows: start y~260, each row 22px tall
 * - Item pickups: left panel ~55, right panel ~940
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
// Calibrated from 1920x1080 screenshot:
// Nick "Dziador" is at ~440-570,380 in 1920px → ~235-305,203 in 1024px
// Nick "LuqAtMe" is at ~1140-1300,380 in 1920px → ~608-695,203 in 1024px
// Score "12" at ~868-890,365 in 1920px → ~464-476,195 in 1024px
// Score "13" at ~968-990,365 in 1920px → ~517-530,195 in 1024px

const playerRegions: OCRRegion[] = [
  // Player 1 (left side)
  {
    name: "player1_nick",
    box: { x: 230, y: 195, width: 85, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 1,
  },
  {
    name: "player1_score",
    box: { x: 456, y: 188, width: 32, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 1,
  },
  // Player 2 (right side)
  {
    name: "player2_nick",
    box: { x: 600, y: 195, width: 110, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 2,
  },
  {
    name: "player2_score",
    box: { x: 520, y: 188, width: 32, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 2,
  },
];

// =====================================================
// SUMMARY ROW (per player) – the "PRZEDMIOTY 4236 0 N/O 1650 364/1022 35% 4889 12" line
// =====================================================
// In 1920px: this row is at y~416 → in 1024px: y~222
// Columns left→right for P1: PRZEDMIOTY(~35), PD(~125), PING(~165), WYNIK(~195), ULECZ.PZ(~230),
//   TRAFIENIA(~290), CELN.%(~370), OBR.(~410), WYNIK(~450)
// P2 mirrors from center

const SUMMARY_Y = 222;

const summaryRegionsP1: OCRRegion[] = [
  { name: "p1_items", box: { x: 25, y: SUMMARY_Y, width: 60, height: 18 }, type: "text", whitelist: "PRZEDMIOTY0123456789 ", player: 1 },
  { name: "p1_pd", box: { x: 100, y: SUMMARY_Y, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_ping", box: { x: 148, y: SUMMARY_Y, width: 22, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_xp", box: { x: 170, y: SUMMARY_Y, width: 35, height: 18 }, type: "text", whitelist: "0123456789N/OD", player: 1 },
  { name: "p1_healing", box: { x: 210, y: SUMMARY_Y, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_hits_shots", box: { x: 255, y: SUMMARY_Y, width: 70, height: 18 }, type: "fraction", whitelist: "0123456789/", player: 1 },
  { name: "p1_accuracy", box: { x: 330, y: SUMMARY_Y, width: 35, height: 18 }, type: "percentage", whitelist: "0123456789%", player: 1 },
  { name: "p1_damage", box: { x: 370, y: SUMMARY_Y, width: 50, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_kills", box: { x: 428, y: SUMMARY_Y, width: 25, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
];

const summaryRegionsP2: OCRRegion[] = [
  { name: "p2_kills", box: { x: 530, y: SUMMARY_Y, width: 25, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_damage", box: { x: 555, y: SUMMARY_Y, width: 50, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_accuracy", box: { x: 610, y: SUMMARY_Y, width: 35, height: 18 }, type: "percentage", whitelist: "0123456789%", player: 2 },
  { name: "p2_hits_shots", box: { x: 648, y: SUMMARY_Y, width: 70, height: 18 }, type: "fraction", whitelist: "0123456789/", player: 2 },
  { name: "p2_healing", box: { x: 720, y: SUMMARY_Y, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_xp", box: { x: 770, y: SUMMARY_Y, width: 35, height: 18 }, type: "text", whitelist: "0123456789N/OD", player: 2 },
  { name: "p2_ping", box: { x: 810, y: SUMMARY_Y, width: 35, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_pd", box: { x: 855, y: SUMMARY_Y, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// WEAPON STATS ROWS (11 weapons per player)
// =====================================================
// Weapon rows in 1920px start at y~470 with ~40px spacing → in 1024px: start y~251, spacing ~21px
// Each row columns (1024px reference):
// P1: hits/shots ~250, accuracy ~330, damage ~365, kills ~425  (OBR. column)
// [weapon icon in center ~470]
// P2: kills ~530, damage ~555, celność ~610, hits/shots ~648

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

const WEAPON_ROW_START_Y = 250;
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
        box: { x: 250, y, width: 70, height: 17 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_accuracy`,
        box: { x: 328, y, width: 38, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_damage`,
        box: { x: 368, y, width: 45, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_kills`,
        box: { x: 425, y, width: 25, height: 17 },
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
        box: { x: 530, y, width: 25, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_damage`,
        box: { x: 555, y, width: 45, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_accuracy`,
        box: { x: 605, y, width: 38, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_hits_shots`,
        box: { x: 648, y, width: 70, height: 17 },
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
// In 1920px: left shields at x~120, values below each shield
// MegaHP at y~398, HeavyArmor at y~515, LightArmor at y~633 → in 1024: y~213, 275, 338
// Right panel mirrors at x~940

const itemRegions: OCRRegion[] = [
  // Player 1 items (left panel - green shields)
  { name: "p1_mega_health", box: { x: 52, y: 275, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_heavy_armor", box: { x: 52, y: 340, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_light_armor", box: { x: 52, y: 405, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  // Player 2 items (right panel - green shields)
  { name: "p2_mega_health", box: { x: 945, y: 275, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_heavy_armor", box: { x: 945, y: 340, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_light_armor", box: { x: 945, y: 405, width: 25, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
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
