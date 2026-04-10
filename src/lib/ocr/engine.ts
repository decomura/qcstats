/**
 * QCStats OCR Engine
 * 
 * Client-side OCR using Tesseract.js.
 * Processes QC ranking screenshots by:
 * 1. Loading image onto canvas
 * 2. Detecting aspect ratio
 * 3. Extracting regions with pre-processing
 * 4. Running Tesseract OCR on each region
 * 5. Parsing and validating results
 */

import { createWorker, type Worker } from "tesseract.js";
import {
  ALL_REGIONS,
  WEAPON_NAMES,
  scaleBox,
  type OCRRegion,
  type BoundingBox,
} from "./regions";

// =====================================================
// TYPES
// =====================================================

export interface WeaponStat {
  weaponIndex: number;
  weaponName: string;
  hitsShots: string;
  accuracyPct: number;
  damage: number;
  kills: number;
}

export interface PlayerStats {
  nick: string;
  score: number;
  side: 1 | 2;
  totalDamage: number;
  accuracyPct: number;
  hitsShots: string;
  healing: number;
  megaHealthPickups: number;
  heavyArmorPickups: number;
  lightArmorPickups: number;
  ping: number;
  xp: string;
  weapons: WeaponStat[];
  isWinner: boolean;
}

export interface OCRResult {
  player1: PlayerStats;
  player2: PlayerStats;
  mapName?: string;
  matchType: "duel";
  /** Raw OCR values for debugging/correction */
  rawValues: Record<string, string>;
  /** Confidence score 0-100 */
  confidence: number;
  /** Validation warnings */
  warnings: string[];
}

export interface OCRProgress {
  stage: "loading" | "preprocessing" | "ocr" | "parsing" | "done";
  progress: number; // 0-100
  message: string;
}

// =====================================================
// IMAGE PRE-PROCESSING
// =====================================================

/**
 * Pre-process an image region for better OCR accuracy
 * - Convert to grayscale
 * - Increase contrast
 * - Apply threshold binarization
 */
function preprocessRegion(
  canvas: HTMLCanvasElement,
  box: BoundingBox,
  regionType: "text" | "number" | "fraction" | "percentage" = "number"
): HTMLCanvasElement {
  const regionCanvas = document.createElement("canvas");
  // Text regions (nicks) get 4x upscale, numbers get 3x
  const scale = regionType === "text" ? 4 : 3;
  regionCanvas.width = box.width * scale;
  regionCanvas.height = box.height * scale;

  const ctx = regionCanvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the cropped region scaled up
  ctx.drawImage(
    canvas,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    regionCanvas.width,
    regionCanvas.height
  );

  const imageData = ctx.getImageData(0, 0, regionCanvas.width, regionCanvas.height);
  const data = imageData.data;

  if (regionType === "text") {
    // TEXT MODE (nicks): Softer preprocessing
    // QC nicks use stylized colored fonts (orange/yellow) on dark background
    // Extract luminance of the BRIGHTEST channel (preserves colored text better)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Use max channel to preserve colored text (orange = high R+G, low B)
      const maxChannel = Math.max(r, g, b);

      // Gentle contrast boost
      const contrast = 1.8;
      const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
      let enhanced = factor * (maxChannel - 128) + 128;
      enhanced = Math.max(0, Math.min(255, enhanced));

      // Softer threshold for text - preserve more detail
      const threshold = 100;
      const binarized = enhanced > threshold ? 255 : 0;

      data[i] = binarized;
      data[i + 1] = binarized;
      data[i + 2] = binarized;
    }
  } else {
    // NUMBER MODE: Standard aggressive binarization
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;

      const contrast = 2.2;
      const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
      let enhanced = factor * (gray - 128) + 128;
      enhanced = Math.max(0, Math.min(255, enhanced));

      const threshold = 80;
      const binarized = enhanced > threshold ? 255 : 0;

      data[i] = binarized;
      data[i + 1] = binarized;
      data[i + 2] = binarized;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return regionCanvas;
}

/**
 * Load image file into canvas
 */
export function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Detect if image is a valid QC ranking screenshot
 */
export function detectScreenType(
  canvas: HTMLCanvasElement
): "ranking" | "unknown" {
  const ratio = canvas.width / canvas.height;
  // 16:9 = 1.777, 21:9 = 2.333
  if (ratio < 1.5 || ratio > 2.5) {
    return "unknown";
  }
  return "ranking";
}

// =====================================================
// OCR ENGINE
// =====================================================

let workerInstance: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerInstance) {
    workerInstance = await createWorker("eng", 1, {
      // Use CDN for worker files
    });
  }
  return workerInstance;
}

/**
 * Extract text from a single region
 */
async function extractRegionText(
  worker: Worker,
  canvas: HTMLCanvasElement,
  region: OCRRegion
): Promise<string> {
  const scaledBox = scaleBox(region.box, canvas.width, canvas.height);
  const processedCanvas = preprocessRegion(canvas, scaledBox, region.type);

  // Configure Tesseract params for this region
  await worker.setParameters({
    tessedit_char_whitelist: region.whitelist || "",
    tessedit_pageseg_mode: "7" as never, // PSM.SINGLE_LINE
  });

  const {
    data: { text },
  } = await worker.recognize(processedCanvas);

  return text.trim();
}

/**
 * Parse raw OCR text based on region type
 */
function parseValue(
  raw: string,
  type: OCRRegion["type"]
): string | number {
  const cleaned = raw.replace(/\s+/g, "").replace(/[^\d/%]/g, "");

  switch (type) {
    case "number":
      return parseInt(cleaned, 10) || 0;
    case "percentage":
      return parseInt(cleaned.replace("%", ""), 10) || 0;
    case "fraction":
      // Format: "305/798"
      return cleaned;
    case "text":
      return raw.trim();
    default:
      return raw.trim();
  }
}

/**
 * Main OCR processing function
 */
export async function processScreenshot(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const report = (stage: OCRProgress["stage"], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  report("loading", 0, "Initializing OCR engine...");
  const worker = await getWorker();

  report("preprocessing", 5, "Detecting screen layout...");
  const screenType = detectScreenType(canvas);
  if (screenType === "unknown") {
    throw new Error(
      "Unrecognized screenshot format. Please upload a 16:9 QC ranking screen."
    );
  }

  // Process all regions
  const rawValues: Record<string, string> = {};
  const totalRegions = ALL_REGIONS.length;
  const warnings: string[] = [];

  report("ocr", 10, `Processing ${totalRegions} regions...`);

  for (let i = 0; i < totalRegions; i++) {
    const region = ALL_REGIONS[i];
    try {
      const text = await extractRegionText(worker, canvas, region);
      rawValues[region.name] = text;
    } catch {
      rawValues[region.name] = "";
      warnings.push(`Failed to read region: ${region.name}`);
    }

    const progress = 10 + Math.round((i / totalRegions) * 80);
    report("ocr", progress, `Processing: ${region.name} (${i + 1}/${totalRegions})`);
  }

  // Parse results
  report("parsing", 90, "Parsing extracted data...");

  const getVal = (name: string): string => rawValues[name] || "";
  const getNum = (name: string): number => parseInt(getVal(name).replace(/\D/g, ""), 10) || 0;

  // Build weapon stats
  const buildWeapons = (prefix: "p1" | "p2"): WeaponStat[] => {
    return WEAPON_NAMES.map((name, i) => ({
      weaponIndex: i,
      weaponName: name,
      hitsShots: getVal(`${prefix}_w${i}_hits_shots`),
      accuracyPct: getNum(`${prefix}_w${i}_accuracy`),
      damage: getNum(`${prefix}_w${i}_damage`),
      kills: getNum(`${prefix}_w${i}_kills`),
    }));
  };

  const p1Score = getNum("player1_score");
  const p2Score = getNum("player2_score");

  const player1: PlayerStats = {
    nick: getVal("player1_nick"),
    score: p1Score,
    side: 1,
    totalDamage: getNum("p1_damage"),
    accuracyPct: getNum("p1_accuracy"),
    hitsShots: getVal("p1_hits_shots"),
    healing: getNum("p1_healing"),
    megaHealthPickups: getNum("p1_mega_health"),
    heavyArmorPickups: getNum("p1_heavy_armor"),
    lightArmorPickups: getNum("p1_light_armor"),
    ping: getNum("p1_ping"),
    xp: getVal("p1_xp"),
    weapons: buildWeapons("p1"),
    isWinner: p1Score > p2Score,
  };

  const player2: PlayerStats = {
    nick: getVal("player2_nick"),
    score: p2Score,
    side: 2,
    totalDamage: getNum("p2_damage"),
    accuracyPct: getNum("p2_accuracy"),
    hitsShots: getVal("p2_hits_shots"),
    healing: getNum("p2_healing"),
    megaHealthPickups: getNum("p2_mega_health"),
    heavyArmorPickups: getNum("p2_heavy_armor"),
    lightArmorPickups: getNum("p2_light_armor"),
    ping: getNum("p2_ping"),
    xp: getVal("p2_xp"),
    weapons: buildWeapons("p2"),
    isWinner: p2Score > p1Score,
  };

  // Validation
  const confidence = calculateConfidence(player1, player2, warnings);

  report("done", 100, "OCR complete!");

  return {
    player1,
    player2,
    matchType: "duel",
    rawValues,
    confidence,
    warnings,
  };
}

/**
 * Calculate confidence score based on validation checks
 */
function calculateConfidence(
  p1: PlayerStats,
  p2: PlayerStats,
  warnings: string[]
): number {
  let score = 100;

  // Check if nicks were detected
  if (!p1.nick || p1.nick.length < 2) {
    score -= 15;
    warnings.push("Player 1 nick not clearly detected");
  }
  if (!p2.nick || p2.nick.length < 2) {
    score -= 15;
    warnings.push("Player 2 nick not clearly detected");
  }

  // Check if scores are reasonable
  if (p1.score === 0 && p2.score === 0) {
    score -= 20;
    warnings.push("Both scores are 0");
  }

  // Check weapon kills vs total score
  const p1WeaponKills = p1.weapons.reduce((sum, w) => sum + w.kills, 0);
  const p2WeaponKills = p2.weapons.reduce((sum, w) => sum + w.kills, 0);

  if (p1.score > 0 && Math.abs(p1WeaponKills - p1.score) > 2) {
    score -= 10;
    warnings.push(
      `P1: weapon kills (${p1WeaponKills}) ≠ score (${p1.score})`
    );
  }

  if (p2.score > 0 && Math.abs(p2WeaponKills - p2.score) > 2) {
    score -= 10;
    warnings.push(
      `P2: weapon kills (${p2WeaponKills}) ≠ score (${p2.score})`
    );
  }

  // Accuracy sanity check
  if (p1.accuracyPct > 100 || p2.accuracyPct > 100) {
    score -= 10;
    warnings.push("Accuracy > 100% detected");
  }

  // Penalize for region failures
  score -= warnings.filter((w) => w.startsWith("Failed to read")).length * 2;

  return Math.max(0, Math.min(100, score));
}

/**
 * Clean up OCR worker
 */
export async function terminateOCR(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
