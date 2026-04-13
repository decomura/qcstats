/**
 * QCStats Match Service
 * 
 * Handles saving OCR results to Supabase:
 * - Upload screenshot to Storage
 * - Create match record
 * - Create match_players records
 * - Create weapon_stats records
 * - Duplicate detection
 * - Game nickname validation (anti-troll)
 */

import { createClient } from "@/lib/supabase/client";
import type { OCRResult, PlayerStats, WeaponStat } from "@/lib/ocr/engine";

/**
 * Levenshtein distance for fuzzy nickname matching.
 * Allows for minor OCR errors (1-2 character differences).
 */
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= an; i++) matrix[i] = [i];
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

/**
 * Check if two nicknames match (case-insensitive, fuzzy with Levenshtein ≤ 2)
 */
export function nicknamesMatch(nick1: string, nick2: string): { match: boolean; exact: boolean; distance: number } {
  const a = nick1.trim().toLowerCase();
  const b = nick2.trim().toLowerCase();
  const distance = levenshtein(a, b);
  return {
    match: distance <= 2,
    exact: distance === 0,
    distance,
  };
}

export interface NickAnalysisResult {
  nick: string;
  found: boolean;
  profileId?: string;
  username?: string;
  gameNickname?: string;
}

export interface NicknameValidationResult {
  valid: boolean;
  matchedNick?: string; // which nick on the screenshot matched
  exact: boolean;
  distance: number;
  error?: string;
}

export interface SaveMatchResult {
  success: boolean;
  matchId?: string;
  error?: string;
  isDuplicate?: boolean;
  nickAnalysis?: {
    player1: NickAnalysisResult;
    player2: NickAnalysisResult;
    autoFriendCreated?: boolean;
    notificationSent?: boolean;
  };
}

/**
 * Upload screenshot to Supabase Storage
 */
async function uploadScreenshot(
  file: File,
  userId: string
): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("screenshots")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Screenshot upload failed:", error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Check if a similar match already exists (duplicate detection)
 * Matches on: both player nicks + scores within same day
 */
async function checkDuplicate(
  p1Nick: string,
  p2Nick: string,
  p1Score: number,
  p2Score: number
): Promise<boolean> {
  const supabase = createClient();

  // Look for match with same players and scores in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("matches")
    .select(`
      id,
      player1_score,
      player2_score,
      match_players!inner(player_nick)
    `)
    .gte("created_at", oneDayAgo)
    .eq("player1_score", p1Score)
    .eq("player2_score", p2Score);

  if (!data || data.length === 0) return false;

  // Check if player nicks match
  for (const match of data) {
    const nicks = (match.match_players as { player_nick: string }[]).map(
      (mp) => mp.player_nick.toLowerCase()
    );
    if (
      nicks.includes(p1Nick.toLowerCase()) &&
      nicks.includes(p2Nick.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Link a player nick to a profile_id — search by game_nickname first, then username
 */
async function findProfileByNick(nick: string): Promise<{ id: string; username: string; gameNickname: string | null } | null> {
  const supabase = createClient();

  // First try game_nickname (primary match for anti-troll)
  const { data: byGameNick } = await supabase
    .from("profiles")
    .select("id, username, game_nickname")
    .ilike("game_nickname", nick)
    .single();

  if (byGameNick) return { id: byGameNick.id, username: byGameNick.username, gameNickname: byGameNick.game_nickname };

  // Fallback: try username (backwards compatibility)
  const { data: byUsername } = await supabase
    .from("profiles")
    .select("id, username, game_nickname")
    .ilike("username", nick)
    .single();

  return byUsername ? { id: byUsername.id, username: byUsername.username, gameNickname: byUsername.game_nickname } : null;
}

/**
 * Validate that the uploader's game_nickname appears on the screenshot.
 * Returns validation result with fuzzy matching.
 */
export async function validateGameNickname(
  userId: string,
  ocrNick1: string,
  ocrNick2: string
): Promise<NicknameValidationResult> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("game_nickname")
    .eq("id", userId)
    .single();

  if (!profile?.game_nickname) {
    return {
      valid: false,
      exact: false,
      distance: 999,
      error: "NICKNAME_NOT_SET",
    };
  }

  const gameNick = profile.game_nickname;

  // Check both players on screenshot
  const match1 = nicknamesMatch(gameNick, ocrNick1);
  const match2 = nicknamesMatch(gameNick, ocrNick2);

  if (match1.match) {
    return { valid: true, matchedNick: ocrNick1, exact: match1.exact, distance: match1.distance };
  }
  if (match2.match) {
    return { valid: true, matchedNick: ocrNick2, exact: match2.exact, distance: match2.distance };
  }

  return {
    valid: false,
    exact: false,
    distance: Math.min(match1.distance, match2.distance),
    error: "NICKNAME_NOT_FOUND",
  };
}

/**
 * Get the current user's game nickname
 */
export async function getUserGameNickname(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("game_nickname")
    .eq("id", userId)
    .single();
  return data?.game_nickname || null;
}

/**
 * Save match data from OCR results to Supabase
 */
export async function saveMatch(
  ocrResult: OCRResult,
  screenshotFile: File | null,
  userId: string,
  editedData?: {
    player1Nick?: string;
    player2Nick?: string;
    player1Score?: number;
    player2Score?: number;
  },
  description?: string,
  publishToWall: boolean = true,
  matchGroupId?: string
): Promise<SaveMatchResult> {
  const supabase = createClient();

  const p1Nick = editedData?.player1Nick || ocrResult.player1.nick;
  const p2Nick = editedData?.player2Nick || ocrResult.player2.nick;
  const p1Score = editedData?.player1Score ?? ocrResult.player1.score;
  const p2Score = editedData?.player2Score ?? ocrResult.player2.score;

  // 1. Check for duplicates
  const isDuplicate = await checkDuplicate(p1Nick, p2Nick, p1Score, p2Score);
  if (isDuplicate) {
    return {
      success: false,
      isDuplicate: true,
      error: "This match appears to already exist in the database.",
    };
  }

  // 2. Upload screenshot
  let screenshotUrl: string | null = null;
  if (screenshotFile) {
    screenshotUrl = await uploadScreenshot(screenshotFile, userId);
  }

  // 3. Create match record
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .insert({
      map_name: ocrResult.mapName || null,
      match_type: "duel",
      player1_score: p1Score,
      player2_score: p2Score,
      uploaded_by: userId,
      screenshot_url: screenshotUrl,
      match_date: new Date().toISOString(),
      description: description?.trim() || "",
      is_public: publishToWall,
      match_group_id: matchGroupId || null,
    })
    .select("id")
    .single();

  if (matchError || !matchData) {
    return {
      success: false,
      error: `Failed to create match: ${matchError?.message}`,
    };
  }

  const matchId = matchData.id;

  // 4. Find profile IDs for player nicks
  const p1Profile = await findProfileByNick(p1Nick);
  const p2Profile = await findProfileByNick(p2Nick);
  const p1ProfileId = p1Profile?.id || null;
  const p2ProfileId = p2Profile?.id || null;

  // 5. Create match_players records
  const playersToInsert = [
    buildMatchPlayer(ocrResult.player1, matchId, 1, p1Nick, p1Score, p1ProfileId, p2Score),
    buildMatchPlayer(ocrResult.player2, matchId, 2, p2Nick, p2Score, p2ProfileId, p1Score),
  ];

  const { data: playersData, error: playersError } = await supabase
    .from("match_players")
    .insert(playersToInsert)
    .select("id, side");

  if (playersError || !playersData) {
    return {
      success: false,
      error: `Failed to create match players: ${playersError?.message}`,
    };
  }

  // 6. Create weapon_stats records
  for (const playerRow of playersData) {
    const playerStats =
      playerRow.side === 1 ? ocrResult.player1 : ocrResult.player2;

    const weaponRows = playerStats.weapons
      .filter((w) => w.damage > 0 || w.kills > 0 || w.hitsShots)
      .map((w) => buildWeaponStat(w, playerRow.id));

    if (weaponRows.length > 0) {
      const { error: weaponError } = await supabase
        .from("weapon_stats")
        .insert(weaponRows);

      if (weaponError) {
        console.error("Weapon stats insert error:", weaponError);
        // Non-fatal – match still saved
      }
    }
  }

  // 7. Auto-friendship & notifications
  let autoFriendCreated = false;
  let notificationSent = false;

  // Determine who is the uploader and who is the opponent
  const uploaderProfileId = userId;
  const opponentProfileId = p1ProfileId === userId ? p2ProfileId : p1ProfileId;
  const opponentNick = p1ProfileId === userId ? p2Nick : p1Nick;
  const uploaderNick = p1ProfileId === userId ? p1Nick : p2Nick;

  if (opponentProfileId && opponentProfileId !== uploaderProfileId) {
    // Auto-friend: check if friendship already exists
    const { data: existingFriend } = await supabase
      .from("friends")
      .select("id")
      .or(
        `and(requester_id.eq.${uploaderProfileId},addressee_id.eq.${opponentProfileId}),and(requester_id.eq.${opponentProfileId},addressee_id.eq.${uploaderProfileId})`
      )
      .maybeSingle();

    if (!existingFriend) {
      const { error: friendError } = await supabase.from("friends").insert({
        requester_id: uploaderProfileId,
        addressee_id: opponentProfileId,
        status: "accepted",
      });
      autoFriendCreated = !friendError;
    }

    // Notification to opponent about new match
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: opponentProfileId,
      type: "new_match",
      title: "🎮 Nowy mecz!",
      body: `${uploaderNick} wrzucił mecz: ${p1Nick} ${p1Score}:${p2Score} ${p2Nick}`,
      data: { match_id: matchId },
    });
    notificationSent = !notifError;
  }

  // 8. Build nick analysis
  const nickAnalysis = {
    player1: {
      nick: p1Nick,
      found: !!p1ProfileId,
      profileId: p1ProfileId || undefined,
      username: p1Profile?.username || undefined,
    },
    player2: {
      nick: p2Nick,
      found: !!p2ProfileId,
      profileId: p2ProfileId || undefined,
      username: p2Profile?.username || undefined,
    },
    autoFriendCreated,
    notificationSent,
  };

  return {
    success: true,
    matchId,
    nickAnalysis,
  };
}

function buildMatchPlayer(
  player: PlayerStats,
  matchId: string,
  side: 1 | 2,
  nick: string,
  score: number,
  profileId: string | null,
  opponentScore?: number
) {
  return {
    match_id: matchId,
    profile_id: profileId,
    player_nick: nick,
    side,
    score,
    ping: player.ping,
    xp: 0,
    total_damage: player.totalDamage,
    accuracy_pct: player.accuracyPct,
    hits_shots: player.hitsShots || null,
    healing: player.healing,
    mega_health_pickups: player.megaHealthPickups,
    heavy_armor_pickups: player.heavyArmorPickups,
    light_armor_pickups: player.lightArmorPickups,
    champion: null,
    is_winner: opponentScore !== undefined ? score > opponentScore : player.isWinner,
  };
}

function buildWeaponStat(weapon: WeaponStat, matchPlayerId: string) {
  return {
    match_player_id: matchPlayerId,
    weapon_index: weapon.weaponIndex,
    weapon_name: weapon.weaponName,
    hits_shots: weapon.hitsShots || null,
    accuracy_pct: weapon.accuracyPct,
    damage: weapon.damage,
    kills: weapon.kills,
  };
}

/**
 * Create a match group for bulk uploads
 */
export async function createMatchGroup(
  userId: string,
  title?: string,
  description?: string
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_groups")
    .insert({
      user_id: userId,
      title: title || null,
      description: description?.trim() || "",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create match group:", error);
    return null;
  }

  return data.id;
}

/**
 * Fetch recent matches for a user
 */
export async function getRecentMatches(userId: string, limit = 10) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_players")
    .select(`
      id,
      player_nick,
      side,
      score,
      total_damage,
      accuracy_pct,
      is_winner,
      match:matches!inner(
        id,
        map_name,
        player1_score,
        player2_score,
        screenshot_url,
        match_date,
        created_at
      )
    `)
    .eq("profile_id", userId)
    .order("created_at", { foreignTable: "matches", ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch matches:", error);
    return [];
  }

  return data || [];
}

/**
 * Get aggregated stats for a user
 */
export async function getUserStats(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("match_players")
    .select(`
      score,
      total_damage,
      accuracy_pct,
      is_winner,
      healing,
      mega_health_pickups,
      heavy_armor_pickups,
      weapon_stats(weapon_name, accuracy_pct, damage, kills)
    `)
    .eq("profile_id", userId);

  if (error || !data || data.length === 0) {
    return null;
  }

  const totalMatches = data.length;
  const wins = data.filter((m) => m.is_winner).length;
  const totalDamage = data.reduce((sum, m) => sum + (m.total_damage || 0), 0);
  const avgAccuracy =
    data.reduce((sum, m) => sum + (m.accuracy_pct || 0), 0) / totalMatches;

  // Weapon-specific stats
  const allWeapons = data.flatMap(
    (m) => (m.weapon_stats as { weapon_name: string; accuracy_pct: number; damage: number; kills: number }[]) || []
  );

  // LG accuracy
  const lgStats = allWeapons.filter((w) => w.weapon_name === "Lightning Gun");
  const avgLgAccuracy =
    lgStats.length > 0
      ? lgStats.reduce((sum, w) => sum + w.accuracy_pct, 0) / lgStats.length
      : 0;

  // Rail accuracy
  const railStats = allWeapons.filter((w) => w.weapon_name === "Railgun");
  const avgRailAccuracy =
    railStats.length > 0
      ? railStats.reduce((sum, w) => sum + w.accuracy_pct, 0) / railStats.length
      : 0;

  return {
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
    totalDamage,
    avgDamage: Math.round(totalDamage / totalMatches),
    avgAccuracy: Math.round(avgAccuracy),
    avgLgAccuracy: Math.round(avgLgAccuracy),
    avgRailAccuracy: Math.round(avgRailAccuracy),
  };
}
