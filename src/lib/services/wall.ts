/**
 * QCStats Wall Service
 * 
 * Handles fetching match posts for the community wall,
 * adding comments, and toggling reactions.
 */

import { createClient } from "@/lib/supabase/client";

// =====================================================
// TYPES
// =====================================================

export interface WallPost {
  id: string;
  match_type: string;
  player1_score: number;
  player2_score: number;
  screenshot_url: string | null;
  description: string;
  created_at: string;
  match_date: string;
  uploaded_by: string;
  uploader_username: string | null;
  uploader_avatar: string | null;
  players: {
    player_nick: string;
    side: number;
    total_damage: number;
    accuracy_pct: number;
    kills: number;
    is_winner: boolean;
  }[];
  comments: WallComment[];
  reactions: ReactionCount[];
  userReactions: string[]; // reaction types the current user has toggled
}

export interface WallComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface ReactionCount {
  reaction_type: string;
  count: number;
}

export const REACTION_TYPES = [
  { type: "rocket", label: "Rocket!", icon: "🚀" },
  { type: "nailgun", label: "Nailed it!", icon: "📌" },
  { type: "quad", label: "Quad Damage!", icon: "⚡" },
  { type: "quake", label: "Quake!", icon: "🔴" },
  { type: "lightning", label: "Lightning!", icon: "🌩️" },
  { type: "railgun", label: "Railgun!", icon: "🎯" },
  { type: "frag", label: "Fragged!", icon: "💀" },
  { type: "gg", label: "GG!", icon: "🤝" },
] as const;

// =====================================================
// FETCH WALL POSTS
// =====================================================

export async function fetchWallPosts(
  page: number = 1,
  limit: number = 20,
  currentUserId?: string
): Promise<{ posts: WallPost[]; hasMore: boolean }> {
  const supabase = createClient();
  const offset = (page - 1) * limit;

  // Fetch matches with players
  const { data: matches, error } = await supabase
    .from("matches")
    .select(`
      id,
      match_type,
      player1_score,
      player2_score,
      screenshot_url,
      description,
      created_at,
      match_date,
      uploaded_by,
      profiles:uploaded_by(username, avatar_url),
      match_players(player_nick, side, total_damage, accuracy_pct, kills, is_winner)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error || !matches) {
    console.error("Failed to fetch wall posts:", error);
    return { posts: [], hasMore: false };
  }

  // Fetch comments and reactions for these matches
  const matchIds = matches.map((m) => m.id);

  const [commentsResult, reactionsResult, userReactionsResult] = await Promise.all([
    supabase
      .from("match_comments")
      .select("id, match_id, content, created_at, user_id, profiles:user_id(username, avatar_url)")
      .in("match_id", matchIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("match_reactions")
      .select("match_id, reaction_type")
      .in("match_id", matchIds),
    currentUserId
      ? supabase
          .from("match_reactions")
          .select("match_id, reaction_type")
          .in("match_id", matchIds)
          .eq("user_id", currentUserId)
      : Promise.resolve({ data: [] }),
  ]);

  // Group comments by match_id
  const commentsByMatch: Record<string, WallComment[]> = {};
  for (const c of commentsResult.data || []) {
    const matchId = c.match_id;
    if (!commentsByMatch[matchId]) commentsByMatch[matchId] = [];
    const profile = c.profiles as unknown as { username: string; avatar_url: string } | null;
    commentsByMatch[matchId].push({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user_id: c.user_id,
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
    });
  }

  // Count reactions by match_id and type
  const reactionsByMatch: Record<string, Record<string, number>> = {};
  for (const r of reactionsResult.data || []) {
    if (!reactionsByMatch[r.match_id]) reactionsByMatch[r.match_id] = {};
    reactionsByMatch[r.match_id][r.reaction_type] = (reactionsByMatch[r.match_id][r.reaction_type] || 0) + 1;
  }

  // User's own reactions
  const userReactionsByMatch: Record<string, string[]> = {};
  for (const r of (userReactionsResult as { data: { match_id: string; reaction_type: string }[] | null }).data || []) {
    if (!userReactionsByMatch[r.match_id]) userReactionsByMatch[r.match_id] = [];
    userReactionsByMatch[r.match_id].push(r.reaction_type);
  }

  // Build wall posts
  const posts: WallPost[] = matches.map((m) => {
    const profile = m.profiles as unknown as { username: string; avatar_url: string } | null;
    const reactionCounts = reactionsByMatch[m.id] || {};

    return {
      id: m.id,
      match_type: m.match_type,
      player1_score: m.player1_score,
      player2_score: m.player2_score,
      screenshot_url: m.screenshot_url,
      description: m.description || "",
      created_at: m.created_at,
      match_date: m.match_date,
      uploaded_by: m.uploaded_by,
      uploader_username: profile?.username || null,
      uploader_avatar: profile?.avatar_url || null,
      players: (m.match_players as unknown as WallPost["players"]) || [],
      comments: commentsByMatch[m.id] || [],
      reactions: Object.entries(reactionCounts).map(([type, count]) => ({
        reaction_type: type,
        count,
      })),
      userReactions: userReactionsByMatch[m.id] || [],
    };
  });

  return {
    posts,
    hasMore: matches.length > limit,
  };
}

// =====================================================
// COMMENTS
// =====================================================

export async function addComment(matchId: string, content: string): Promise<WallComment | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("match_comments")
    .insert({
      match_id: matchId,
      user_id: user.id,
      content: content.trim(),
    })
    .select("id, content, created_at, user_id")
    .single();

  if (error || !data) {
    console.error("Failed to add comment:", error);
    return null;
  }

  // Get username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: data.id,
    content: data.content,
    created_at: data.created_at,
    user_id: data.user_id,
    username: profile?.username || null,
    avatar_url: profile?.avatar_url || null,
  };
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("match_comments")
    .delete()
    .eq("id", commentId);

  return !error;
}

// =====================================================
// REACTIONS
// =====================================================

export async function toggleReaction(
  matchId: string,
  reactionType: string
): Promise<{ added: boolean } | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("match_reactions")
    .select("id")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .eq("reaction_type", reactionType)
    .single();

  if (existing) {
    // Remove reaction
    await supabase
      .from("match_reactions")
      .delete()
      .eq("id", existing.id);

    return { added: false };
  } else {
    // Add reaction
    const { error } = await supabase
      .from("match_reactions")
      .insert({
        match_id: matchId,
        user_id: user.id,
        reaction_type: reactionType,
      });

    if (error) {
      console.error("Failed to toggle reaction:", error);
      return null;
    }

    return { added: true };
  }
}
