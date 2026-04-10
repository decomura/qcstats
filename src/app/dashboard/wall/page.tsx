"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWallPosts, type WallPost } from "@/lib/services/wall";
import { createClient } from "@/lib/supabase/client";
import ReactionBar from "@/components/ReactionBar";
import CommentSection from "@/components/CommentSection";
import styles from "./wall.module.css";

export default function WallPage() {
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Load initial posts
  useEffect(() => {
    loadPosts(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const loadPosts = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    const result = await fetchWallPosts(pageNum, 20, currentUserId || undefined);

    if (pageNum === 1) {
      setPosts(result.posts);
    } else {
      setPosts((prev) => [...prev, ...result.posts]);
    }

    setHasMore(result.hasMore);
    setPage(pageNum);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [currentUserId]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadPosts(page + 1);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "teraz";
    if (mins < 60) return `${mins} min temu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h temu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d temu`;
    return new Date(dateStr).toLocaleDateString("pl-PL");
  };

  if (isLoading) {
    return (
      <div className={styles.wallPage}>
        <div className={styles.loader}>
          <div className={styles.loaderSpinner} />
          <span>Ładowanie walla...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wallPage}>
      <div className={styles.wallHeader}>
        <h1>
          🏟️ <span>Community</span> Wall
        </h1>
        <p className={styles.subtitle}>
          Najnowsze pojedynki społeczności Quake Champions
        </p>
      </div>

      <div className={styles.feed}>
        {posts.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <h3>Brak postów</h3>
            <p>Wrzuć pierwszy screenshot i bądź pionierem!</p>
          </div>
        )}

        {posts.map((post) => {
          const p1 = post.players.find((p) => p.side === 1);
          const p2 = post.players.find((p) => p.side === 2);

          return (
            <article key={post.id} className={styles.postCard}>
              {/* Post Header */}
              <div className={styles.postHeader}>
                <div className={styles.postAuthor}>
                  {post.uploader_avatar && (
                    <img
                      src={post.uploader_avatar}
                      alt=""
                      className={styles.authorAvatar}
                    />
                  )}
                  <span className={styles.authorName}>
                    {post.uploader_username || "Anonim"}
                  </span>
                </div>
                <span className={styles.postTime}>{timeAgo(post.created_at)}</span>
              </div>

              {/* Description (if any) */}
              {post.description && (
                <p className={styles.postDescription}>{post.description}</p>
              )}

              {/* Score Display */}
              <div className={styles.scoreDisplay}>
                <div className={`${styles.playerSide} ${p1?.is_winner ? styles.winner : ""}`}>
                  <span className={styles.playerNick}>{p1?.player_nick || "?"}</span>
                  <div className={styles.playerMiniStats}>
                    <span>DMG {p1?.total_damage || 0}</span>
                    <span>ACC {p1?.accuracy_pct || 0}%</span>
                  </div>
                </div>
                <div className={styles.scoreBadge}>
                  <span className={`${styles.scoreNum} ${p1?.is_winner ? styles.scoreWinner : ""}`}>
                    {post.player1_score}
                  </span>
                  <span className={styles.scoreSep}>:</span>
                  <span className={`${styles.scoreNum} ${p2?.is_winner ? styles.scoreWinner : ""}`}>
                    {post.player2_score}
                  </span>
                </div>
                <div className={`${styles.playerSide} ${styles.playerRight} ${p2?.is_winner ? styles.winner : ""}`}>
                  <span className={styles.playerNick}>{p2?.player_nick || "?"}</span>
                  <div className={styles.playerMiniStats}>
                    <span>DMG {p2?.total_damage || 0}</span>
                    <span>ACC {p2?.accuracy_pct || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Screenshot Thumbnail */}
              {post.screenshot_url && (
                <a
                  href={post.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.screenshotLink}
                >
                  <img
                    src={post.screenshot_url}
                    alt="Match screenshot"
                    className={styles.screenshotImg}
                    loading="lazy"
                  />
                  <span className={styles.screenshotOverlay}>🔍 Pełny screenshot</span>
                </a>
              )}

              {/* Reactions */}
              <ReactionBar
                matchId={post.id}
                reactions={post.reactions}
                userReactions={post.userReactions}
                isLoggedIn={!!currentUserId}
              />

              {/* Comments */}
              <CommentSection
                matchId={post.id}
                comments={post.comments}
                currentUserId={currentUserId}
              />
            </article>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          className={styles.loadMoreBtn}
          onClick={loadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <span className={styles.loaderSpinnerSmall} />
              Ładowanie...
            </>
          ) : (
            "⬇️ Załaduj starsze"
          )}
        </button>
      )}
    </div>
  );
}
