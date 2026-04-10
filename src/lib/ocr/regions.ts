/**
 * QCStats OCR Region Map
 * 
 * Defines bounding boxes for data extraction from QC ranking screenshots.
 * All coordinates are normalized to a 1024x576 reference frame (16:9 aspect ratio).
 * The actual screenshot is resized to this reference before extraction.
 * 
 * Two screen types are supported:
 * 1. POST-MATCH ("ŁĄCZNY WYNIK" / "TOTAL SCORE") 
 * 2. IN-MATCH ("POJEDYNEK NA CZAS" / "DUEL")
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

const playerRegions: OCRRegion[] = [
  // Player 1 (left side)
  {
    name: "player1_nick",
    box: { x: 220, y: 125, width: 130, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 1,
  },
  {
    name: "player1_score",
    box: { x: 490, y: 120, width: 35, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 1,
  },
  // Player 2 (right side)
  {
    name: "player2_nick",
    box: { x: 610, y: 125, width: 130, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 2,
  },
  {
    name: "player2_score",
    box: { x: 535, y: 120, width: 35, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 2,
  },
];

// =====================================================
// SUMMARY ROW (per player)
// =====================================================

const summaryRegionsP1: OCRRegion[] = [
  { name: "p1_items", box: { x: 25, y: 155, width: 50, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_pd", box: { x: 75, y: 155, width: 40, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_ping", box: { x: 120, y: 155, width: 35, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_xp", box: { x: 155, y: 155, width: 40, height: 18 }, type: "text", whitelist: "0123456789N/D", player: 1 },
  { name: "p1_healing", box: { x: 200, y: 155, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_hits_shots", box: { x: 250, y: 155, width: 65, height: 18 }, type: "fraction", whitelist: "0123456789/", player: 1 },
  { name: "p1_accuracy", box: { x: 325, y: 155, width: 35, height: 18 }, type: "percentage", whitelist: "0123456789%", player: 1 },
  { name: "p1_damage", box: { x: 365, y: 155, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_kills", box: { x: 420, y: 155, width: 30, height: 18 }, type: "number", whitelist: "0123456789", player: 1 },
];

const summaryRegionsP2: OCRRegion[] = [
  { name: "p2_kills", box: { x: 540, y: 155, width: 30, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_damage", box: { x: 570, y: 155, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_accuracy", box: { x: 620, y: 155, width: 35, height: 18 }, type: "percentage", whitelist: "0123456789%", player: 2 },
  { name: "p2_hits_shots", box: { x: 660, y: 155, width: 65, height: 18 }, type: "fraction", whitelist: "0123456789/", player: 2 },
  { name: "p2_healing", box: { x: 730, y: 155, width: 45, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_xp", box: { x: 780, y: 155, width: 40, height: 18 }, type: "text", whitelist: "0123456789N/D", player: 2 },
  { name: "p2_ping", box: { x: 830, y: 155, width: 35, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_pd", box: { x: 870, y: 155, width: 40, height: 18 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// WEAPON STATS ROWS (11 weapons per player)
// =====================================================

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

const WEAPON_ROW_START_Y = 180;
const WEAPON_ROW_HEIGHT = 22;

function generateWeaponRegions(): OCRRegion[] {
  const regions: OCRRegion[] = [];

  for (let i = 0; i < 11; i++) {
    const y = WEAPON_ROW_START_Y + i * WEAPON_ROW_HEIGHT;

    // Player 1 weapon stats (left side)
    regions.push(
      {
        name: `p1_w${i}_hits_shots`,
        box: { x: 250, y, width: 65, height: 18 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_accuracy`,
        box: { x: 325, y, width: 35, height: 18 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_damage`,
        box: { x: 365, y, width: 45, height: 18 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_kills`,
        box: { x: 420, y, width: 30, height: 18 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      }
    );

    // Player 2 weapon stats (right side)
    regions.push(
      {
        name: `p2_w${i}_kills`,
        box: { x: 540, y, width: 30, height: 18 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_damage`,
        box: { x: 570, y, width: 45, height: 18 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_accuracy`,
        box: { x: 620, y, width: 35, height: 18 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_hits_shots`,
        box: { x: 660, y, width: 65, height: 18 },
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

const itemRegions: OCRRegion[] = [
  // Player 1 items (left panel)
  { name: "p1_mega_health", box: { x: 50, y: 210, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_heavy_armor", box: { x: 50, y: 265, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_light_armor", box: { x: 50, y: 320, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 1 },
  // Player 2 items (right panel)
  { name: "p2_mega_health", box: { x: 950, y: 210, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_heavy_armor", box: { x: 950, y: 265, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_light_armor", box: { x: 950, y: 320, width: 25, height: 20 }, type: "number", whitelist: "0123456789", player: 2 },
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
