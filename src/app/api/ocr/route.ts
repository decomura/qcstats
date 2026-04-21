/**
 * OCR API Route — Gemini Vision
 * 
 * Sends a screenshot to Gemini API for structured extraction
 * of Quake Champions match statistics.
 * 
 * POST /api/ocr
 * Body: { image: "data:image/png;base64,..." }
 * Returns: OCRResult JSON
 */

import { NextRequest, NextResponse } from "next/server";

// Allow extra time for Gemini API processing
export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an OCR system specialized in reading Quake Champions (QC) post-match statistics screenshots.

FIRST, determine the game mode shown in the screenshot. Quake Champions has these modes:
- DUEL: 1v1, shows exactly 2 players with detailed weapon stats, pickup stats, and individual scores
- TDM (Team Deathmatch): 4v4, shows team rosters with multiple players per side
- DM (Deathmatch/FFA): 4-8 players listed in a scoreboard
- CTF: teams with flag capture stats
- Sacrifice: teams with obelisk stats
- Instagib: special mode with one-hit kills
- Unholy Trinity: limited weapon pool

Key indicators of DUEL mode:
- Exactly 2 player stat columns (left vs right)
- Detailed per-weapon breakdown (Gauntlet through Tribolt)
- Pickup stats (Mega Health, Heavy Armor, Light Armor)
- Individual healing, damage, accuracy

If the screenshot is NOT from a DUEL match, return ONLY this JSON:
{ "gameMode": "<detected mode>", "isDuel": false, "reason": "<why it's not duel>" }

If the screenshot IS from a DUEL match, return a JSON object with this structure:

{
  "gameMode": "duel",
  "isDuel": true,
  "mapName": "string (map name visible in the screenshot header/footer area. Known QC duel maps: Blood Covenant, Ruins of Sarnath, Awoken, Vale of Pnath, Corrupted Keep, Deep Embrace, Exile, Molten Falls. If not visible, use empty string)",
  "player1": {
    "nick": "string (left player's nickname, exact as shown)",
    "score": 0,
    "totalDamage": 0,
    "accuracyPct": 0,
    "hitsShots": "123/456",
    "healing": 0,
    "megaHealthPickups": 0,
    "heavyArmorPickups": 0,
    "lightArmorPickups": 0,
    "ping": 0,
    "xp": "string or N/D",
    "weapons": [
      {
        "weaponName": "Gauntlet",
        "hitsShots": "0/0",
        "accuracyPct": 0,
        "damage": 0,
        "kills": 0
      }
    ]
  },
  "player2": {
    "nick": "string (right player's nickname, exact as shown)",
    "score": 0,
    "totalDamage": 0,
    "accuracyPct": 0,
    "hitsShots": "123/456",
    "healing": 0,
    "megaHealthPickups": 0,
    "heavyArmorPickups": 0,
    "lightArmorPickups": 0,
    "ping": 0,
    "xp": "string or N/D",
    "weapons": [
      {
        "weaponName": "Gauntlet",
        "hitsShots": "0/0",
        "accuracyPct": 0,
        "damage": 0,
        "kills": 0
      }
    ]
  }
}

IMPORTANT RULES:
- Player 1 is the LEFT player, Player 2 is the RIGHT player
- The weapons order from top to bottom is: Gauntlet, Machine Gun, Super Machine Gun, Shotgun, Super Shotgun, Nail Gun, Super Nailgun, Rocket Launcher, Lightning Gun, Railgun, Tribolt
- If a weapon row shows "0" or dashes or is empty, set all its stats to 0
- Nicknames must be EXACT (preserve uppercase/lowercase, numbers, special chars)
- hitsShots format is "hits/shots" (e.g., "305/798")
- If a value is not visible or unclear, use 0 for numbers and "" for strings
- Percentages should be numbers only (no % sign), e.g., 38 not "38%"
- If the image is NOT a Quake Champions screenshot at all, return: { "gameMode": "unknown", "isDuel": false, "reason": "Not a Quake Champions screenshot" }
- Return ONLY the JSON, nothing else`;

// ═══════════ Rate Limiting (in-memory) ═══════════
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || [])
    .filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured. Please add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    // Auth check — only authenticated users can use OCR
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check (10 req/min/user)
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Zbyt wiele żądań. Odczekaj chwilę (max 10/min).", remaining: 0 },
        { status: 429 }
      );
    }

    // Daily upload limit check
    const today = new Date().toISOString().slice(0, 10);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const DAILY_LIMIT = profile?.role === "admin" ? 100 : 30;
    
    const { count } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("uploaded_by", user.id)
      .gte("created_at", today + "T00:00:00Z");
    
    const usedToday = count ?? 0;
    if (usedToday >= DAILY_LIMIT) {
      return NextResponse.json(
        { 
          error: `Osiągnięto dzienny limit ${DAILY_LIMIT} screenshotów. Spróbuj jutro.`,
          remaining: 0,
          limit: DAILY_LIMIT,
          used: usedToday
        },
        { status: 429 }
      );
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate image is a string and not excessively large
    if (typeof image !== 'string') {
      return NextResponse.json(
        { error: "Invalid image format." },
        { status: 400 }
      );
    }

    // Check base64 size (~10MB limit → base64 is ~1.37x bigger)
    const MAX_BASE64_SIZE = 14_000_000; // ~10MB in base64
    if (image.length > MAX_BASE64_SIZE) {
      return NextResponse.json(
        { error: "Obraz jest zbyt duży. Maksymalny rozmiar to 10MB." },
        { status: 413 }
      );
    }

    // Extract base64 and mime type
    const match = image.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Nieprawidłowy format. Dozwolone: PNG, JPEG, WebP." },
        { status: 400 }
      );
    }

    const [, mimeType, , base64Data] = match;

    // Call Gemini API with retry for rate limits
    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual extraction
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    let geminiResponse: Response | null = null;
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      geminiResponse = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      // Retry on both 429 (rate limit) and 502 (transient server error)
      if ((geminiResponse.status === 429 || geminiResponse.status === 502) && attempt < MAX_RETRIES) {
        // Wait with exponential backoff: 3s, 6s, 12s, 24s, 48s
        const waitMs = Math.pow(2, attempt) * 3000;
        console.log(`[OCR API] ${geminiResponse.status} error, retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      break;
    }

    if (!geminiResponse || !geminiResponse.ok) {
      const errorData = await geminiResponse?.json().catch(() => ({}));
      const status = geminiResponse?.status || 500;

      if (status === 429) {
        return NextResponse.json(
          { error: "Osiągnięto limit API. System automatycznie ponowi próbę.", retryAfter: 30 },
          { 
            status: 429,
            headers: { "Retry-After": "30" },
          }
        );
      }

      if (status === 502) {
        return NextResponse.json(
          { error: "Serwer API tymczasowo niedostępny. System automatycznie ponowi próbę.", retryAfter: 30 },
          {
            status: 502,
            headers: { "Retry-After": "30" },
          }
        );
      }

      console.error(`[OCR API] Gemini error (${status}):`, errorData);
      return NextResponse.json(
        { error: `Wystąpił błąd przetwarzania obrazu. Spróbuj ponownie.` },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON from Gemini's response
    // Strip markdown code blocks if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Attempt to recover truncated JSON by closing open brackets
      console.warn("[OCR API] JSON parse failed, attempting recovery...");
      let recovered = jsonStr;
      // Count unclosed brackets
      const openBraces = (recovered.match(/{/g) || []).length;
      const closeBraces = (recovered.match(/}/g) || []).length;
      const openBrackets = (recovered.match(/\[/g) || []).length;
      const closeBrackets = (recovered.match(/\]/g) || []).length;

      // Remove trailing comma or incomplete value
      recovered = recovered.replace(/,\s*$/, "");
      recovered = recovered.replace(/,\s*"[^"]*"\s*:\s*$/, "");
      recovered = recovered.replace(/:\s*"[^"]*$/, ': ""');

      // Close brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) recovered += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) recovered += "}";

      try {
        parsed = JSON.parse(recovered);
        console.log("[OCR API] JSON recovery successful");
      } catch (e2) {
        throw new Error(`JSON parse failed even after recovery: ${(e2 as Error).message}`);
      }
    }

    // Check if Gemini detected a non-duel game mode
    if (parsed.isDuel === false) {
      const detectedMode = parsed.gameMode || "unknown";
      const reason = parsed.reason || "";
      return NextResponse.json({
        success: false,
        error: `Ten screenshot nie jest z trybu DUEL (wykryto: ${detectedMode}). ${reason}. QCStats obsługuje wyłącznie tryb Duel 1v1.`,
        detectedMode,
      }, { status: 422 });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[OCR API] Error:", message);
    return NextResponse.json(
      { error: `OCR processing failed: ${message}` },
      { status: 500 }
    );
  }
}
