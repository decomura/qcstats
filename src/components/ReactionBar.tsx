"use client";

import { useState } from "react";
import { REACTION_TYPES, toggleReaction, type ReactionCount } from "@/lib/services/wall";
import styles from "./ReactionBar.module.css";

interface ReactionBarProps {
  matchId: string;
  reactions: ReactionCount[];
  userReactions: string[];
  isLoggedIn: boolean;
}

export default function ReactionBar({
  matchId,
  reactions: initialReactions,
  userReactions: initialUserReactions,
  isLoggedIn,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of initialReactions) {
      map[r.reaction_type] = r.count;
    }
    return map;
  });

  const [userReactions, setUserReactions] = useState<Set<string>>(
    new Set(initialUserReactions)
  );

  const [animating, setAnimating] = useState<string | null>(null);

  const handleReaction = async (type: string) => {
    if (!isLoggedIn) return;

    // Optimistic update
    const wasActive = userReactions.has(type);
    const newUserReactions = new Set(userReactions);
    const newReactions = { ...reactions };

    if (wasActive) {
      newUserReactions.delete(type);
      newReactions[type] = Math.max(0, (newReactions[type] || 0) - 1);
    } else {
      newUserReactions.add(type);
      newReactions[type] = (newReactions[type] || 0) + 1;
      setAnimating(type);
      setTimeout(() => setAnimating(null), 600);
    }

    setUserReactions(newUserReactions);
    setReactions(newReactions);

    // API call
    const result = await toggleReaction(matchId, type);
    if (!result) {
      // Revert on error
      setUserReactions(userReactions);
      setReactions(reactions);
    }
  };

  return (
    <div className={styles.reactionBar}>
      {REACTION_TYPES.map(({ type, label, icon }) => {
        const count = reactions[type] || 0;
        const isActive = userReactions.has(type);

        return (
          <button
            key={type}
            className={`${styles.reactionBtn} ${isActive ? styles.active : ""} ${animating === type ? styles.animating : ""}`}
            onClick={() => handleReaction(type)}
            disabled={!isLoggedIn}
            title={isLoggedIn ? label : "Zaloguj się, żeby reagować"}
            aria-label={label}
          >
            <span className={styles.reactionIcon}>{icon}</span>
            {count > 0 && <span className={styles.reactionCount}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
