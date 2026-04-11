/**
 * QCStats OCR Engine
 * 
 * Client-side orchestrator that sends screenshots to
 * the Gemini Vision API endpoint for structured extraction.
 * 
 * No local OCR, no preprocessing, no bounding boxes needed!
 */

import { WEAPON_NAMES } from "./regions";

// =====================================================
// QUAKE-THEMED LOADING MESSAGES
// =====================================================

const LOADING_MESSAGES_PL = [
  "🚀 Analizuję rakietę... O kurwa, jakie airy!",
  "⚡ Czekaj, liczę te headsoty z rejla...",
  "💀 O mój boże! To tak się da strzelać z rejla?!",
  "🔫 Nie no, chyba troszeczkę przegięłeś z tym machinegunem...",
  "💊 Co tyle megasów zabrałeś? Zostawiłeś coś dla przeciwnika?",
  "🎯 Sprawdzam celność... Mam nadzieję, że to nie 12% z LG",
  "🏃 Gemini skanuje twojego screena szybciej niż strafe jump",
  "💥 Ej, ten damage to chyba z czołgu, nie z nailguna",
  "🤯 Kurde, te staty wyglądają lepiej niż u Raphy",
  "😱 Serio? 80% z rejla? Pokaż demo albo kłamiesz!",
  "🎮 Ile razy respawnowałeś się na mega? Bo wygląda na dużo...",
  "⚡ One more frag... jeszcze jeden frag... ok przepraszam, analizuję",
  "🔥 Te staty są tak gorące, że mój serwer się przegrzewa",
  "💣 Trybolt? Serio ktoś jeszcze tym strzela?",
  "🏟️ Gemini wchodzi na arenę i sprawdza twój screenshot...",
  "⚔️ Hmm, ten gauntlet kill to musiał boleć",
  "🎯 Celność poniżej 20%? Może spróbuj myszki zamiast pada?",
  "💀 Analizuję twój scoreboard... współczuję przeciwnikowi",
  "😤 Za dużo shotguna? Spokojnie, nie oceniam... no dobra, trochę",
  "🚀 Rakiety latają, ja analizuję... deal with it",
  "🧠 AI myśli nad twoimi statami... i jest pod wrażeniem",
  "⚡ Quad Damage aktywowany! Przetwarzanie x4 szybciej!",
  "💊 Lecimy po mega i po twoje staty jednocześnie!",
  "🔫 LG tracking na 45%? Ty to chyba z wallhackiem grasz!",
  "😎 Pro player detected... albo i nie, zaraz sprawdzę",
  "💥 Eksploduję ten screenshot na czynniki pierwsze...",
  "🎯 Mhm... te weapon stats mówią więcej niż tysiąc słów",
  "⚡ Ctrl+F \"skill\" w twoich statach... znalazłem!",
  "💀 Fragging in progress... cierpliwości, mordeczko",
  "🏃 Szybciej niż bunny hop na Blood Covenant!",
];

const LOADING_MESSAGES_EN = [
  "🚀 Holy shit, those rocket directs are insane!",
  "⚡ Wait, let me count those rail headshots...",
  "💀 Dude... that LG tracking is absolutely filthy!",
  "🔫 Damn, you went full aimbot with that railgun!",
  "💊 You stole EVERY mega? Leave some for the enemy!",
  "🎯 Checking accuracy... please don't be 12% LG",
  "🏃 Gemini scanning faster than a strafe jump",
  "💥 That damage number looks like a phone number",
  "🤯 Stats better than Rapha? Lemme verify that...",
  "😱 80% rail?! Show demo or it didn't happen!",
  "🎮 How many times did you time mega? Looks like... all of them",
  "⚡ One more frag... one more frag... ok sorry, analyzing",
  "🔥 These stats are so hot my GPU is sweating",
  "💣 Tribolt? Someone actually uses that thing?",
  "🏟️ Entering the Arena to inspect your scoreboard...",
  "⚔️ That gauntlet kill must have been humiliating",
  "🎯 Sub-20% accuracy? Ever tried using a mouse?",
  "💀 Analyzing scoreboard... RIP to your opponent",
  "😤 Too much shotgun? I'm not judging... ok maybe a little",
  "🚀 Rockets flying, stats loading... deal with it",
  "🧠 AI is thinking about your stats... and it's impressed",
  "⚡ Quad Damage activated! Processing at 4x speed!",
  "💊 Grabbing mega and your stats at the same time!",
  "🔫 45% LG tracking? You sure you're not cheating?!",
  "😎 Pro player detected... or maybe not, let me check",
  "💥 Deconstructing this screenshot atom by atom...",
  "🎯 These weapon stats tell a story... of pure destruction",
  "⚡ Searching for 'skill' in your stats... found it!",
  "💀 Fragging in progress... patience, champion",
  "🏃 Faster than a bunny hop across Blood Covenant!",
];

export function getRandomLoadingMessage(locale: "pl" | "en" = "pl"): string {
  const messages = locale === "pl" ? LOADING_MESSAGES_PL : LOADING_MESSAGES_EN;
  return messages[Math.floor(Math.random() * messages.length)];
}

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
// IMAGE UTILITIES
// =====================================================

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
 * Convert a File to a base64 data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// =====================================================
// GEMINI OCR ENGINE
// =====================================================

/**
 * Main OCR processing function — sends screenshot to Gemini API
 */
export async function processScreenshot(
  _canvas: HTMLCanvasElement,
  onProgress?: (progress: OCRProgress) => void,
  _variant: "total_score" | "ranking" = "total_score",
  imageFile?: File
): Promise<OCRResult> {
  const report = (stage: OCRProgress["stage"], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  report("loading", 5, "Przygotowywanie screenshota...");

  // Get base64 from canvas if no file provided
  let dataUrl: string;
  if (imageFile) {
    dataUrl = await fileToDataUrl(imageFile);
  } else {
    dataUrl = _canvas.toDataURL("image/png");
  }

  report("ocr", 20, "Wysyłanie do Gemini Vision AI...");

  // Call our API route
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

    if (response.status === 429) {
      throw new Error(
        "Osiągnięto limit API. Spróbuj ponownie za minutę lub dodaj screenshot do kolejki."
      );
    }

    throw new Error(errorData.error || `OCR failed (${response.status})`);
  }

  report("ocr", 70, "Gemini analizuje screenshot...");

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Gemini nie zwróciło danych");
  }

  report("parsing", 85, "Parsowanie wyników...");

  const data = result.data;
  const warnings: string[] = [];

  // Build player stats from Gemini response
  const buildPlayer = (
    raw: Record<string, unknown>,
    side: 1 | 2
  ): PlayerStats => {
    const weapons: WeaponStat[] = WEAPON_NAMES.map((name, i) => {
      const rawWeapon = (raw.weapons as Array<Record<string, unknown>>)?.[i] || {};
      return {
        weaponIndex: i,
        weaponName: name,
        hitsShots: String(rawWeapon.hitsShots || "0/0"),
        accuracyPct: Number(rawWeapon.accuracyPct) || 0,
        damage: Number(rawWeapon.damage) || 0,
        kills: Number(rawWeapon.kills) || 0,
      };
    });

    return {
      nick: String(raw.nick || ""),
      score: Number(raw.score) || 0,
      side,
      totalDamage: Number(raw.totalDamage) || 0,
      accuracyPct: Number(raw.accuracyPct) || 0,
      hitsShots: String(raw.hitsShots || ""),
      healing: Number(raw.healing) || 0,
      megaHealthPickups: Number(raw.megaHealthPickups) || 0,
      heavyArmorPickups: Number(raw.heavyArmorPickups) || 0,
      lightArmorPickups: Number(raw.lightArmorPickups) || 0,
      ping: Number(raw.ping) || 0,
      xp: String(raw.xp || ""),
      weapons,
      isWinner: false, // set below
    };
  };

  const player1 = buildPlayer(data.player1 || {}, 1);
  const player2 = buildPlayer(data.player2 || {}, 2);

  player1.isWinner = player1.score > player2.score;
  player2.isWinner = player2.score > player1.score;

  // Build raw values for debugging
  const rawValues: Record<string, string> = {
    player1_nick: player1.nick,
    player1_score: String(player1.score),
    player2_nick: player2.nick,
    player2_score: String(player2.score),
    p1_damage: String(player1.totalDamage),
    p1_accuracy: String(player1.accuracyPct),
    p1_hits_shots: player1.hitsShots,
    p2_damage: String(player2.totalDamage),
    p2_accuracy: String(player2.accuracyPct),
    p2_hits_shots: player2.hitsShots,
  };

  // Validation
  const confidence = calculateConfidence(player1, player2, warnings);

  report("done", 100, "OCR zakończony! ✨");

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

  return Math.max(0, Math.min(100, score));
}

/**
 * Clean up – no-op for Gemini (no local resources)
 */
export async function terminateOCR(): Promise<void> {
  // Nothing to clean up with Gemini API
}

/**
 * Test OCR on the full screenshot — used by the calibrator
 * With Gemini, we don't need individual region testing anymore
 */
export async function testFullScreenshot(
  imageFile: File
): Promise<OCRResult> {
  const canvas = await loadImageToCanvas(imageFile);
  return processScreenshot(canvas, undefined, "total_score", imageFile);
}

/**
 * @deprecated - With Gemini Vision, individual region testing is not needed.
 * Kept for backward compatibility with the calibrator UI.
 */
export async function testSingleRegion(
  _imageElement: HTMLImageElement,
  _box: { x: number; y: number; width: number; height: number },
  _regionType: string = "number",
  _whitelist?: string
): Promise<{ text: string; previewUrl: string }> {
  return {
    text: "[Gemini Vision — testuj cały screenshot zamiast regionu]",
    previewUrl: "",
  };
}
