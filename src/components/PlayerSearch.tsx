"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./PlayerSearch.module.css";

interface PlayerResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function PlayerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(6);
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  return (
    <div className={styles.searchWrapper} ref={wrapperRef}>
      <div className={styles.searchInput}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Szukaj gracza..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className={styles.input}
          aria-label="Szukaj gracza"
        />
        {query && (
          <button
            className={styles.clearBtn}
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            type="button"
            aria-label="Wyczyść"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.loadingItem}>Szukam...</div>
          ) : results.length === 0 ? (
            <div className={styles.emptyItem}>Nie znaleziono graczy</div>
          ) : (
            results.map((player) => (
              <a
                key={player.id}
                href={`/player/${encodeURIComponent(player.username || player.display_name || "")}`}
                className={styles.resultItem}
                onClick={() => setIsOpen(false)}
              >
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt="" className={styles.avatar} />
                ) : (
                  <span className={styles.avatarPlaceholder}>
                    {(player.username || player.display_name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>
                    {player.display_name || player.username || "Unknown"}
                  </span>
                  {player.display_name && player.username && player.display_name !== player.username && (
                    <span className={styles.playerUsername}>@{player.username}</span>
                  )}
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
