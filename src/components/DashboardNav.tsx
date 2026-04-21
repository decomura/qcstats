"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useI18n, ALL_LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import PlayerSearch from "./PlayerSearch";
import styles from "./DashboardNav.module.css";

interface Props {
  user: User;
}

export default function DashboardNav({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string; is_read: boolean; created_at: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { locale, setLocale, t } = useI18n();

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, message, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };
    fetchNotifs();
  }, [user.id, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Player";

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        {/* Logo */}
        <a href="/" className={styles.logo}>
          <span className={styles.logoQc}>QC</span>
          <span className={styles.logoStats}>STATS</span>
        </a>

        {/* Nav Links */}
        <div className={styles.links}>
          <a href="/dashboard" className={`${styles.link} ${pathname === "/dashboard" ? styles.active : ""}`}>
            📊 {t("nav.dashboard")}
          </a>
          <a href="/dashboard/upload" className={`${styles.link} ${pathname === "/dashboard/upload" ? styles.active : ""}`}>
            📸 {t("nav.upload")}
          </a>
          <a href="/wall" className={`${styles.link} ${pathname === "/wall" ? styles.active : ""}`}>
            🏟️ Wall
          </a>

          {/* More dropdown */}
          <div className={styles.moreMenu}>
            <button
              className={`${styles.link} ${['/dashboard/history','/dashboard/compare','/dashboard/friends'].includes(pathname) ? styles.active : ''}`}
              onClick={() => { setMoreOpen(!moreOpen); setMenuOpen(false); setBellOpen(false); }}
              type="button"
            >
              ⚙️ {t("nav.more")} ▾
            </button>
            {moreOpen && (
              <div className={styles.dropdown} style={{ left: 0, right: 'auto', minWidth: '180px' }}>
                <a href="/dashboard/history" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                  📋 {t("nav.history")}
                </a>
                <a href="/dashboard/compare" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                  ⚔️ {t("nav.compare")}
                </a>
                <a href="/dashboard/friends" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                  👥 {t("friends.title")}
                </a>
                <a href="/guide" className={styles.dropdownItem} onClick={() => setMoreOpen(false)}>
                  📖 {t("nav.guide")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Player Search */}
        <PlayerSearch />

        {/* Notification Bell */}
        <div className={styles.userMenu}>
          <button
            className={styles.bellBtn}
            onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false); }}
            type="button"
            aria-label="Powiadomienia"
          >
            🔔
            {unreadCount > 0 && (
              <span className={styles.bellBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {bellOpen && (
            <div className={styles.dropdown} style={{ right: 0, minWidth: "280px" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>Powiadomienia</span>
                {unreadCount > 0 && (
                  <button
                    className={styles.dropdownItem}
                    style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                    onClick={async () => {
                      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                      setUnreadCount(0);
                    }}
                    type="button"
                  >
                    ✓ Przeczytaj wszystkie
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Brak powiadomień 📭
                </div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={styles.dropdownItem} style={{ opacity: n.is_read ? 0.6 : 1, flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                    <span style={{ fontWeight: n.is_read ? 400 : 600, fontSize: "0.8rem" }}>{n.message}</span>
                  </div>
                ))
              )}
              <a href="/dashboard/friends?tab=notifications" className={styles.dropdownItem} style={{ borderTop: "1px solid var(--border-subtle)", justifyContent: "center", fontSize: "0.8rem" }}>
                Zobacz wszystkie →
              </a>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className={styles.userMenu}>
          <button
            className={styles.userBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
          >
            <span className={styles.avatar}>
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className={styles.userName}>{displayName}</span>
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className={styles.dropdownItem}
                  type="button"
                >
                  🌐 {LOCALE_LABELS[locale]} ▾
                </button>
                {langOpen && (
                  <div className={styles.dropdown} style={{ position: 'absolute', top: '100%', left: 0, right: 0, minWidth: '140px', zIndex: 100 }}>
                    {ALL_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => { setLocale(loc); setLangOpen(false); }}
                        className={styles.dropdownItem}
                        type="button"
                        style={{ fontWeight: locale === loc ? 700 : 400, color: locale === loc ? 'var(--accent-orange)' : undefined }}
                      >
                        {LOCALE_LABELS[loc]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <a href="/dashboard/settings" className={styles.dropdownItem}>
                ⚙️ {t("nav.settings")}
              </a>
              <button
                onClick={handleLogout}
                className={styles.dropdownItem}
                type="button"
              >
                🚪 {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
        {/* Mobile Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className={styles.mobileDrawer}>
          <a href="/dashboard" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>📊 {t("nav.dashboard")}</a>
          <a href="/dashboard/upload" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>📸 {t("nav.upload")}</a>
          <a href="/dashboard/history" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>📋 {t("nav.history")}</a>
          <a href="/dashboard/compare" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>⚔️ {t("nav.compare")}</a>
          <a href="/dashboard/friends" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>👥 {t("friends.title")}</a>
          <a href="/wall" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>🏟️ Wall</a>
          <a href="/guide" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>📖 {t("nav.guide")}</a>
          <a href="/dashboard/settings" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>⚙️ {t("nav.settings")}</a>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 16px' }}>
            {ALL_LOCALES.map((loc) => (
              <button key={loc} onClick={() => { setLocale(loc); setMobileOpen(false); }} className={styles.mobileLink} type="button" style={{ padding: '4px 10px', fontSize: '0.8rem', fontWeight: locale === loc ? 700 : 400, color: locale === loc ? 'var(--accent-orange)' : undefined }}>
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
          <button onClick={handleLogout} className={styles.mobileLink} type="button">🚪 {t("nav.logout")}</button>
        </div>
      )}
    </nav>
  );
}
