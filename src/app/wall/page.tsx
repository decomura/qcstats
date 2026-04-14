"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWallPosts, type WallPost } from "@/lib/services/wall";
import { createClient } from "@/lib/supabase/client";
import ReactionBar from "@/components/ReactionBar";
import CommentSection from "@/components/CommentSection";
import styles from "./wall.module.css";

export default function PublicWallPage() {
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Get current user (may be null for non-logged-in visitors)
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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

  // Render a single match card
  const renderMatchCard = (post: WallPost, isNested = false) => {
    const p1 = post.players.find((p) => p.side === 1);
    const p2 = post.players.find((p) => p.side === 2);

    const valClass = (a: number, b: number) =>
      a > b ? styles.valHigher : a < b ? styles.valLower : styles.valEqual;

    const wIcon = (name: string) => {
      const map: Record<string, string> = {
        "Gauntlet": "/img/gauntlet.png",
        "Machine Gun": "/img/machine_gun.png",
        "Super Machine Gun": "/img/super_machine_gun.png",
        "Shotgun": "/img/shotgun.png",
        "Super Shotgun": "/img/super_shotgun.png",
        "Nail Gun": "/img/nailgun.png",
        "Super Nailgun": "/img/super_nailgun.png",
        "Rocket Launcher": "/img/rocket_launcher.png",
        "Lightning Gun": "/img/lightinggun.png",
        "Railgun": "/img/railgun.png",
        "Tribolt": "/img/tribolt.png",
      };
      return map[name] || `/img/${name.toLowerCase().replace(/ /g, "_")}.png`;
    };

    const allWeaponNames = new Set<string>();
    p1?.weapon_stats?.forEach(w => { if (w.damage > 0 || w.kills > 0) allWeaponNames.add(w.weapon_name); });
    p2?.weapon_stats?.forEach(w => { if (w.damage > 0 || w.kills > 0) allWeaponNames.add(w.weapon_name); });

    const weaponRows = Array.from(allWeaponNames).map(name => {
      const w1 = p1?.weapon_stats?.find(w => w.weapon_name === name);
      const w2 = p2?.weapon_stats?.find(w => w.weapon_name === name);
      return { name, w1, w2, totalDmg: (w1?.damage || 0) + (w2?.damage || 0) };
    }).sort((a, b) => b.totalDmg - a.totalDmg);

    return (
      <article key={post.id} className={`${styles.postCard} ${isNested ? styles.nestedCard : ""}`}>
        {!isNested && (
          <div className={styles.postHeader}>
            <div className={styles.postAuthor}>
              {post.uploader_avatar && (
                <img src={post.uploader_avatar} alt="" className={styles.authorAvatar} />
              )}
              <span className={styles.authorName}>
                {post.uploader_username || "Anonim"}
              </span>
            </div>
            <span className={styles.postTime}>{timeAgo(post.created_at)}</span>
          </div>
        )}

        {post.description && (
          <p className={styles.postDescription}>{post.description}</p>
        )}

        {/* Score Display with colored DMG/ACC */}
        <div className={styles.scoreDisplay}>
          <div className={`${styles.playerSide} ${p1?.is_winner ? styles.winner : ""}`}>
            <span className={styles.playerNick}>{p1?.player_nick || "?"}</span>
            <div className={styles.playerMiniStats}>
              <span className={valClass(p1?.total_damage || 0, p2?.total_damage || 0)}>
                DMG {p1?.total_damage || 0}
              </span>
              <span className={valClass(p1?.accuracy_pct || 0, p2?.accuracy_pct || 0)}>
                ACC {p1?.accuracy_pct || 0}%
              </span>
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
              <span className={valClass(p2?.total_damage || 0, p1?.total_damage || 0)}>
                DMG {p2?.total_damage || 0}
              </span>
              <span className={valClass(p2?.accuracy_pct || 0, p1?.accuracy_pct || 0)}>
                ACC {p2?.accuracy_pct || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Symmetric pickups */}
        <div className={styles.symSection}>
          <div className={styles.symRow}>
            <span className={`${styles.symVal} ${styles.symLeft} ${valClass(p1?.mega_health_pickups || 0, p2?.mega_health_pickups || 0)}`}>
              {p1?.mega_health_pickups || 0}
            </span>
            <img src="/img/mega_health.png" alt="MH" className={styles.symIcon} title="Mega Health" />
            <span className={`${styles.symVal} ${styles.symRight} ${valClass(p2?.mega_health_pickups || 0, p1?.mega_health_pickups || 0)}`}>
              {p2?.mega_health_pickups || 0}
            </span>
          </div>
          <div className={styles.symRow}>
            <span className={`${styles.symVal} ${styles.symLeft} ${valClass(p1?.heavy_armor_pickups || 0, p2?.heavy_armor_pickups || 0)}`}>
              {p1?.heavy_armor_pickups || 0}
            </span>
            <img src="/img/heavy_armor.png" alt="HA" className={styles.symIcon} title="Heavy Armor" />
            <span className={`${styles.symVal} ${styles.symRight} ${valClass(p2?.heavy_armor_pickups || 0, p1?.heavy_armor_pickups || 0)}`}>
              {p2?.heavy_armor_pickups || 0}
            </span>
          </div>
          <div className={styles.symRow}>
            <span className={`${styles.symVal} ${styles.symLeft} ${valClass(p1?.light_armor_pickups || 0, p2?.light_armor_pickups || 0)}`}>
              {p1?.light_armor_pickups || 0}
            </span>
            <img src="/img/light_armor.png" alt="LA" className={styles.symIcon} title="Light Armor" />
            <span className={`${styles.symVal} ${styles.symRight} ${valClass(p2?.light_armor_pickups || 0, p1?.light_armor_pickups || 0)}`}>
              {p2?.light_armor_pickups || 0}
            </span>
          </div>
          <div className={styles.symRow}>
            <span className={`${styles.symVal} ${styles.symLeft} ${valClass(p1?.healing || 0, p2?.healing || 0)}`}>
              {p1?.healing || 0}
            </span>
            <span className={styles.symLabelIcon}>🩺</span>
            <span className={`${styles.symVal} ${styles.symRight} ${valClass(p2?.healing || 0, p1?.healing || 0)}`}>
              {p2?.healing || 0}
            </span>
          </div>
        </div>

        {/* Symmetric weapons */}
        {weaponRows.length > 0 && (
          <div className={styles.symSection}>
            {weaponRows.map((wr, i) => (
              <div key={i} className={styles.symWeaponRow} title={wr.name}>
                <span className={`${styles.symWVal} ${styles.symLeft}`}>
                  <span className={valClass(wr.w1?.damage || 0, wr.w2?.damage || 0)}>{wr.w1?.damage || 0}</span>
                  <span className={`${styles.symWAcc} ${valClass(wr.w1?.accuracy_pct || 0, wr.w2?.accuracy_pct || 0)}`}>
                    {wr.w1?.accuracy_pct || 0}%
                  </span>
                </span>
                <img src={wIcon(wr.name)} alt={wr.name} className={styles.symIcon}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className={`${styles.symWVal} ${styles.symRight}`}>
                  <span className={`${styles.symWAcc} ${valClass(wr.w2?.accuracy_pct || 0, wr.w1?.accuracy_pct || 0)}`}>
                    {wr.w2?.accuracy_pct || 0}%
                  </span>
                  <span className={valClass(wr.w2?.damage || 0, wr.w1?.damage || 0)}>{wr.w2?.damage || 0}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Screenshot button */}
        {post.screenshot_url && !isNested && (
          <div className={styles.postFooter}>
            <a href={post.screenshot_url} target="_blank" rel="noopener noreferrer" className={styles.screenshotBtn}>
              📸 Pokaż screen
            </a>
          </div>
        )}

        {!isNested && (
          <ReactionBar
            matchId={post.id}
            reactions={post.reactions}
            userReactions={post.userReactions}
            isLoggedIn={!!currentUserId}
          />
        )}

        {!isNested && (
          <CommentSection
            matchId={post.id}
            comments={post.comments}
            currentUserId={currentUserId}
          />
        )}
      </article>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.wallPage}>
        <div className={styles.wallNav}>
          <a href="/" className={styles.navLogo}>
            <span className={styles.qc}>QC</span>STATS
          </a>
          {!currentUserId && (
            <a href="/login" className={styles.loginBtn}>⚡ Zaloguj się</a>
          )}
          {currentUserId && (
            <a href="/dashboard" className={styles.loginBtn}>📊 Dashboard</a>
          )}
        </div>
        <div className={styles.loader}>
          <div className={styles.loaderSpinner} />
          <span>Ładowanie walla...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wallPage}>
      {/* Navigation bar */}
      <div className={styles.wallNav}>
        <a href="/" className={styles.navLogo}>
          <span className={styles.qc}>QC</span>STATS
        </a>
        <div className={styles.navActions}>
          {currentUserId && (
            <a href="/dashboard/upload" className={styles.uploadBtn}>📸 Upload</a>
          )}
          {!currentUserId && (
            <a href="/login" className={styles.loginBtn}>⚡ Zaloguj się</a>
          )}
          {currentUserId && (
            <a href="/dashboard" className={styles.loginBtn}>📊 Dashboard</a>
          )}
        </div>
      </div>

      <div className={styles.wallHeader}>
        <h1>
          🏟️ <span>Community</span> Wall
        </h1>
        <p className={styles.subtitle}>
          Najnowsze pojedynki społeczności Quake Champions
        </p>
        {!currentUserId && (
          <p className={styles.loginHint}>
            💡 <a href="/login">Zaloguj się</a> aby komentować i reagować
          </p>
        )}
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
          // Grouped post (bulk upload)
          if (post.groupedMatches && post.groupedMatches.length > 1) {
            const isExpanded = expandedGroups.has(post.match_group_id || post.id);
            return (
              <div key={post.id} className={styles.groupedPost}>
                <div className={styles.groupHeader}>
                  <div className={styles.postAuthor}>
                    {post.uploader_avatar && (
                      <img src={post.uploader_avatar} alt="" className={styles.authorAvatar} />
                    )}
                    <span className={styles.authorName}>
                      {post.uploader_username || "Anonim"}
                    </span>
                  </div>
                  <div className={styles.groupInfo}>
                    <span className={styles.groupBadge}>
                      📦 {post.groupedMatches.length} meczów
                    </span>
                    <span className={styles.postTime}>{timeAgo(post.created_at)}</span>
                  </div>
                </div>

                {post.description && (
                  <p className={styles.postDescription}>{post.description}</p>
                )}

                {/* Preview first match or all */}
                {!isExpanded ? (
                  <>
                    {renderMatchCard(post.groupedMatches[0], true)}
                    <button
                      className={styles.expandBtn}
                      onClick={() => toggleGroup(post.match_group_id || post.id)}
                    >
                      🔽 Pokaż wszystkie {post.groupedMatches.length} meczów
                    </button>
                  </>
                ) : (
                  <>
                    {post.groupedMatches.map((m) => renderMatchCard(m, true))}
                    <button
                      className={styles.expandBtn}
                      onClick={() => toggleGroup(post.match_group_id || post.id)}
                    >
                      🔼 Zwiń
                    </button>
                  </>
                )}

                {/* Reactions and comments on group level */}
                <ReactionBar
                  matchId={post.id}
                  reactions={post.reactions}
                  userReactions={post.userReactions}
                  isLoggedIn={!!currentUserId}
                />
                <CommentSection
                  matchId={post.id}
                  comments={post.comments}
                  currentUserId={currentUserId}
                />
              </div>
            );
          }

          // Single post  
          return renderMatchCard(post);
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
