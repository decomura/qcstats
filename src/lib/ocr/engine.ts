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
  // Step 1: Crop and upscale the region
  const scale = 4;
  const PAD = 16; // padding pixels around the text (helps Tesseract)
  const cropW = box.width * scale;
  const cropH = box.height * scale;

  const regionCanvas = document.createElement("canvas");
  regionCanvas.width = cropW + PAD * 2;
  regionCanvas.height = cropH + PAD * 2;

  const ctx = regionCanvas.getContext("2d")!;

  // Fill with WHITE background (Tesseract prefers black text on white)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, regionCanvas.width, regionCanvas.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the cropped region scaled up, centered with padding
  ctx.drawImage(
    canvas,
    box.x,
    box.y,
    box.width,
    box.height,
    PAD,
    PAD,
    cropW,
    cropH
  );

  // Step 2: Binarize using max(R,G,B) → INVERT to black text on white bg
  const imageData = ctx.getImageData(0, 0, regionCanvas.width, regionCanvas.height);
  const data = imageData.data;

  const threshold = regionType === "text" ? 120 : 130;
  const contrast = regionType === "text" ? 1.5 : 1.6;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];

    // Max channel: preserves ANY brightly-colored text on dark background
    const maxChannel = Math.max(r, g, b);

    // Contrast enhancement
    const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
    let enhanced = factor * (maxChannel - 128) + 128;
    enhanced = Math.max(0, Math.min(255, enhanced));

    // INVERTED binarization: text → BLACK (0), background → WHITE (255)
    // Tesseract works best with dark text on light background
    const binarized = enhanced > threshold ? 0 : 255;

    data[i] = binarized;
    data[i + 1] = binarized;
    data[i + 2] = binarized;
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

// =====================================================
// SCREEN TYPE DETECTION
// =====================================================

/**
 * Detect screen type from aspect ratio
 */
function detectScreenType(
  canvas: HTMLCanvasElement
): "ranking_16_9" | "unknown" {
  const aspect = canvas.width / canvas.height;

  // 16:9 = 1.7778
  if (Math.abs(aspect - 16 / 9) < 0.05) {
    return "ranking_16_9";
  }

  return "unknown";
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

  // PSM 7 = single text line (preserves case for nicks)
  // PSM 8 = single word (better for numbers/short text)
  const psmMode = region.type === "text" ? "7" : "8";
  await worker.setParameters({
    tessedit_char_whitelist: region.whitelist || "",
    tessedit_pageseg_mode: psmMode as never,
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
  onProgress?: (progress: OCRProgress) => void,
  variant: "total_score" | "ranking" = "total_score"
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

  // Load calibration profile from localStorage (if available)
  let activeRegions = ALL_REGIONS;
  try {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("qcstats_ocr_calibration")
      : null;
    if (saved) {
      const data = JSON.parse(saved);
      // Use the specific variant's calibration
      const profile = data[variant] || data["total_score"] || data["ranking"];
      if (profile) {
        activeRegions = ALL_REGIONS.map((r) => ({
          ...r,
          box: profile[r.name] || r.box,
        }));
        report("preprocessing", 7, `Using calibration: ${variant} ✓`);
      }
    }
  } catch { /* fallback to defaults */ }

  // Process all regions
  const rawValues: Record<string, string> = {};
  const totalRegions = activeRegions.length;
  const warnings: string[] = [];

  report("ocr", 10, `Processing ${totalRegions} regions...`);

  for (let i = 0; i < totalRegions; i++) {
    const region = activeRegions[i];
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

/**
 * Test OCR on a single region – used by the calibrator for real-time feedback.
 * Returns the raw text and a data URL of the preprocessed image.
 */
export async function testSingleRegion(
  imageElement: HTMLImageElement,
  box: BoundingBox,
  regionType: "text" | "number" | "fraction" | "percentage" = "number",
  whitelist?: string
): Promise<{ text: string; previewUrl: string }> {
  // Draw image to canvas
  const canvas = document.createElement("canvas");
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement, 0, 0);

  // Scale box from reference to actual resolution
  const scaledBox = scaleBox(box, canvas.width, canvas.height);

  // Preprocess
  const processed = preprocessRegion(canvas, scaledBox, regionType);

  // Get preview data URL
  const previewUrl = processed.toDataURL("image/png");

  // Run OCR
  const worker = await getWorker();
  const psmMode = regionType === "text" ? "7" : "8";
  await worker.setParameters({
    tessedit_char_whitelist: whitelist || "",
    tessedit_pageseg_mode: psmMode as never,
  });
  const { data: { text } } = await worker.recognize(processed);

  return { text: text.trim(), previewUrl };
}
