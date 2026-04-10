/**
 * QCStats OCR Region Map
 * 
 * Defines bounding boxes for data extraction from QC ranking screenshots.
 * All coordinates are normalized to a 1024x576 reference frame (16:9 aspect ratio).
 * The actual screenshot is resized to this reference before extraction.
 * 
 * RECALIBRATED v3 2026-04-10 from user's actual debug overlay screenshot.
 * QC "ŁĄCZNY WYNIK" / "RANKING" tab layout at 1024x576:
 *
 * Y REFERENCE MAP (1024x576):
 * ≈155: Tab bar (KOSZARY | RAPORT Z WALKI | RANKING | STATYSTYKI)
 * ≈175: Player nicks area (Dziador ... LuqAtMe)
 * ≈172: Score area (12 13)
 * ≈197: Summary header (PD | PING | WYNIK | ULECZ.PZ | ...)
 * ≈210: Summary data (PRZEDMIOTY 4236 0 N/O 1650 364/1022 35% 4889 12)
 * ≈235: Weapon row 0 (Gauntlet)
 * ≈256: Weapon row 1 (Machine Gun)  
 * ≈277: etc. (21px spacing)
 *
 * X REFERENCE MAP (1024x576):
 * P1 nick: 248-330
 * P1 score: 410-430
 * P2 score: 440-460
 * P2 nick: 530-640
 * Summary P1 columns: 85→450
 * Summary P2 columns: 465→920
 * Items P1: left panel ~60
 * Items P2: right panel ~950
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
// From debug overlay on actual QC screenshot (1024x576):
// Nick "Dziador" visible at: x≈248, y≈175, width≈80
// Nick "LuqAtMe" visible at: x≈530, y≈175, width≈85
// Score "12": x≈410, y≈167, width≈25, height≈25
// Score "13": x≈440, y≈167, width≈25, height≈25

const playerRegions: OCRRegion[] = [
  // Player 1 (left side)
  {
    name: "player1_nick",
    box: { x: 245, y: 170, width: 90, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 1,
  },
  {
    name: "player1_score",
    box: { x: 405, y: 163, width: 30, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 1,
  },
  // Player 2 (right side)
  {
    name: "player2_nick",
    box: { x: 525, y: 170, width: 100, height: 22 },
    type: "text",
    whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-.",
    player: 2,
  },
  {
    name: "player2_score",
    box: { x: 445, y: 163, width: 30, height: 28 },
    type: "number",
    whitelist: "0123456789",
    player: 2,
  },
];

// =====================================================
// SUMMARY ROW (per player)
// =====================================================
// The "PRZEDMIOTY 4236 0 N/O 1650 364/1022 35% 4889 12" line
// Summary data row is at y≈210 in 1024px reference
// Column headers at y≈197 (PD, PING, WYNIK, ULECZ.PZ, TRAFIENIA, CELN.%, OBR., WYNIK)
//
// P1 columns (left→right, approx X in 1024px):
// PRZEDMIOTY ≈85 | PD ≈145 | PING ≈180 | WYNIK ≈205 | ULECZ.PZ ≈235 | 
// TRAFIENIA ≈275 | CELN.% ≈340 | OBR. ≈375 | WYNIK ≈415
//
// P2 columns (left→right, approx X in 1024px):
// (center divider) | WYNIK ≈465 | OBR. ≈490 | CELN.% ≈530 |
// TRAFIENIA ≈570 | ULECZ.PZ ≈640 | WYNIK ≈680 | PING ≈720 | PD ≈760

const SUMMARY_Y = 207;

const summaryRegionsP1: OCRRegion[] = [
  { name: "p1_pd",         box: { x: 135, y: SUMMARY_Y, width: 40, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_ping",       box: { x: 175, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_xp",         box: { x: 198, y: SUMMARY_Y, width: 30, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 1 },
  { name: "p1_healing",    box: { x: 228, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_hits_shots", box: { x: 268, y: SUMMARY_Y, width: 65, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 1 },
  { name: "p1_accuracy",   box: { x: 335, y: SUMMARY_Y, width: 32, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 1 },
  { name: "p1_damage",     box: { x: 368, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_kills",      box: { x: 415, y: SUMMARY_Y, width: 25, height: 17 }, type: "number", whitelist: "0123456789", player: 1 },
];

const summaryRegionsP2: OCRRegion[] = [
  { name: "p2_kills",      box: { x: 465, y: SUMMARY_Y, width: 25, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_damage",     box: { x: 488, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_accuracy",   box: { x: 528, y: SUMMARY_Y, width: 32, height: 17 }, type: "percentage", whitelist: "0123456789%", player: 2 },
  { name: "p2_hits_shots", box: { x: 560, y: SUMMARY_Y, width: 65, height: 17 }, type: "fraction", whitelist: "0123456789/", player: 2 },
  { name: "p2_healing",    box: { x: 628, y: SUMMARY_Y, width: 42, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_xp",         box: { x: 672, y: SUMMARY_Y, width: 30, height: 17 }, type: "text", whitelist: "0123456789N/OD", player: 2 },
  { name: "p2_ping",       box: { x: 712, y: SUMMARY_Y, width: 22, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_pd",         box: { x: 738, y: SUMMARY_Y, width: 45, height: 17 }, type: "number", whitelist: "0123456789", player: 2 },
];

// =====================================================
// WEAPON STATS ROWS (11 weapons per player)
// =====================================================
// Weapon rows start at y≈235, spacing≈21px
// P1 columns (1024px): hits/shots ≈275, accuracy ≈335, damage ≈370, kills ≈415
// P2 columns (1024px): kills ≈465, damage ≈490, accuracy ≈530, hits/shots ≈568

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

const WEAPON_ROW_START_Y = 235;
const WEAPON_ROW_HEIGHT = 21;

function generateWeaponRegions(): OCRRegion[] {
  const regions: OCRRegion[] = [];

  for (let i = 0; i < 11; i++) {
    const y = WEAPON_ROW_START_Y + i * WEAPON_ROW_HEIGHT;

    // Player 1 weapon stats (left side)
    regions.push(
      {
        name: `p1_w${i}_hits_shots`,
        box: { x: 268, y, width: 60, height: 17 },
        type: "fraction",
        whitelist: "0123456789/",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_accuracy`,
        box: { x: 335, y, width: 32, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_damage`,
        box: { x: 370, y, width: 40, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 1,
        weaponIndex: i,
      },
      {
        name: `p1_w${i}_kills`,
        box: { x: 415, y, width: 25, height: 17 },
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
        box: { x: 465, y, width: 25, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_damage`,
        box: { x: 490, y, width: 40, height: 17 },
        type: "number",
        whitelist: "0123456789",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_accuracy`,
        box: { x: 530, y, width: 32, height: 17 },
        type: "percentage",
        whitelist: "0123456789%",
        player: 2,
        weaponIndex: i,
      },
      {
        name: `p2_w${i}_hits_shots`,
        box: { x: 565, y, width: 60, height: 17 },
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
// From debug overlay:
// Left panel (P1): x≈60, MegaHP y≈260, HeavyArmor y≈310, LightArmor y≈365
// Right panel (P2): x≈950, same Y positions

const itemRegions: OCRRegion[] = [
  // Player 1 items (left panel)
  { name: "p1_mega_health", box: { x: 55, y: 258, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_heavy_armor", box: { x: 55, y: 310, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  { name: "p1_light_armor", box: { x: 55, y: 363, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 1 },
  // Player 2 items (right panel)
  { name: "p2_mega_health", box: { x: 940, y: 258, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_heavy_armor", box: { x: 940, y: 310, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
  { name: "p2_light_armor", box: { x: 940, y: 363, width: 28, height: 22 }, type: "number", whitelist: "0123456789", player: 2 },
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
