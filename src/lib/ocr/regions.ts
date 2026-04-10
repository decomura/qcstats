/**
 * QCStats OCR Region Map
 * 
 * V4 – Hybrid calibration:
 * - Y positions: reverted to v1-like (proven partial success for scores/weapons)
 * - X positions: fixed based on 1920x1080→1024x576 conversion
 * - Items: kept from v3 (heavy_armor=14 was correct)
 * 
 * Reference: 1024x576 (16:9)
 * 
 * QC RANKING screen at 1920x1080 (measured from user screenshots):
 * Nick "Dziador": x≈510, y≈382 → ref: x≈272, y≈204
 * Nick "LuqAtMe": x≈1080, y≈382 → ref: x≈576, y≈204
 * Score "12": x≈870, y≈370 → ref: x≈464, y≈197
 * Score "13": x≈930, y≈370 → ref: x≈496, y≈197
 * Summary row: y≈435 → ref: y≈232
 * Weapon row 0: y≈475 → ref: y≈253
 * Weapon spacing: ~40px → ref: ~21px
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
// v1 had y=195 for nicks → read "16503b" (something at least)
// v3 had y=170 → read empty (too high)
// v1 had x=230 for P1 → too far left (hitting avatar area)
// Fixed: x=272 based on 1920px measurement

const playerRegions: OCRRegion[] = [
  {
    name: "player1_nick",
    box: { x: 260, y: 198, width: 95, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 1,
  },
  {
    name: "player1_score",
    box: { x: 455, y: 190, width: 30, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 1,
  },
  {
    name: "player2_nick",
    box: { x: 565, y: 198, width: 110, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 2,
  },
  {
    name: "player2_score",
    box: { x: 493, y: 190, width: 32, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 2,
  },
];

// =====================================================
// SUMMARY ROW
// =====================================================
// Data row at y≈232 in reference
// P1 columns (1920→1024): PD≈90, PING≈118, WYNIK≈135, ULECZ≈158,
//   TRAF≈185, CELN%≈232, OBR.≈258, WYNIK≈290
// P2 columns: K≈540, DMG≈560, ACC≈598, TRAF≈625, HEAL≈678, XP≈700, PING≈728, PD≈750

const SUMMARY_Y = 230;

const summaryRegionsP1: OCRRegion[] = [
  { name: "p1_pd",         box: { x: 85,  y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_ping",       box: { x: 115, y: SUMMARY_Y, width: 20, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_xp",         box: { x: 132, y: SUMMARY_Y, width: 32, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 1 },
  { name: "p1_healing",    box: { x: 155, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_hits_shots", box: { x: 182, y: SUMMARY_Y, width: 60, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 1 },
  { name: "p1_accuracy",   box: { x: 228, y: SUMMARY_Y, width: 30, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 1 },
  { name: "p1_damage",     box: { x: 255, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_kills",      box: { x: 288, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
];

const summaryRegionsP2: OCRRegion[] = [
  { name: "p2_kills",      box: { x: 538, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_damage",     box: { x: 556, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_accuracy",   box: { x: 595, y: SUMMARY_Y, width: 30, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 2 },
  { name: "p2_hits_shots", box: { x: 622, y: SUMMARY_Y, width: 60, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 2 },
  { name: "p2_healing",    box: { x: 676, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_xp",         box: { x: 698, y: SUMMARY_Y, width: 30, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 2 },
  { name: "p2_ping",       box: { x: 726, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_pd",         box: { x: 748, y: SUMMARY_Y, width: 45, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// WEAPON STATS ROWS (11 weapons per player)
// =====================================================
// Weapon rows start at y≈253, spacing≈21px (same columns as summary)

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

const WEAPON_ROW_START_Y = 253;
const WEAPON_ROW_HEIGHT = 21;

function generateWeaponRegions(): OCRRegion[] {
  const regions: OCRRegion[] = [];

  for (let i = 0; i < 11; i++) {
    const y = WEAPON_ROW_START_Y + i * WEAPON_ROW_HEIGHT;

    // P1 weapon stats (same X as summary columns)
    regions.push(
      {
        name: `p1_w${i}_hits_shots`,
        box: { x: 182, y, width: 58, height: 17 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_accuracy`,
        box: { x: 228, y, width: 30, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_damage`,
        box: { x: 258, y, width: 40, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_kills`,
        box: { x: 290, y, width: 22, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      }
    );

    // P2 weapon stats (same X as P2 summary columns)
    regions.push(
      {
        name: `p2_w${i}_kills`,
        box: { x: 538, y, width: 22, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_damage`,
        box: { x: 558, y, width: 40, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_accuracy`,
        box: { x: 598, y, width: 30, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_hits_shots`,
        box: { x: 625, y, width: 58, height: 17 },
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
// From v3: heavy_armor P1 at y=310 → read 14 ✅ (CORRECT!)
// Keep v3 item positions

const itemRegions: OCRRegion[] = [
  { name: "p1_mega_health", box: { x: 55, y: 265, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_heavy_armor", box: { x: 55, y: 318, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_light_armor", box: { x: 55, y: 370, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p2_mega_health", box: { x: 940, y: 265, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_heavy_armor", box: { x: 940, y: 318, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_light_armor", box: { x: 940, y: 370, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// EXPORT
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
