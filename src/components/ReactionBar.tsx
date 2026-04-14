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

    setUserReactions(prev => {
      const next = new Set(prev);
      if (wasActive) next.delete(type);
      else next.add(type);
      return next;
    });

    setReactions(prev => ({
      ...prev,
      [type]: wasActive
        ? Math.max(0, (prev[type] || 0) - 1)
        : (prev[type] || 0) + 1,
    }));

    if (!wasActive) {
      setAnimating(type);
      setTimeout(() => setAnimating(null), 600);
    }

    // API call
    try {
      const result = await toggleReaction(matchId, type);
      if (!result) {
        // Revert on error using functional updates
        setUserReactions(prev => {
          const reverted = new Set(prev);
          if (wasActive) reverted.add(type);
          else reverted.delete(type);
          return reverted;
        });
        setReactions(prev => ({
          ...prev,
          [type]: wasActive
            ? (prev[type] || 0) + 1
            : Math.max(0, (prev[type] || 0) - 1),
        }));
      }
    } catch {
      // Revert on exception
      setUserReactions(prev => {
        const reverted = new Set(prev);
        if (wasActive) reverted.add(type);
        else reverted.delete(type);
        return reverted;
      });
      setReactions(prev => ({
        ...prev,
        [type]: wasActive
          ? (prev[type] || 0) + 1
          : Math.max(0, (prev[type] || 0) - 1),
      }));
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
            <span className={`${styles.reactionCount} ${count === 0 ? styles.countZero : ""}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
