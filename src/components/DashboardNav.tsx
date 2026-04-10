"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";
import styles from "./DashboardNav.module.css";

interface Props {
  user: User;
}

export default function DashboardNav({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

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
          <a href="/dashboard" className={styles.link}>
            📊 {t("nav.dashboard")}
          </a>
          <a href="/dashboard/upload" className={styles.link}>
            📸 {t("nav.upload")}
          </a>
          <a href="/dashboard/history" className={styles.link}>
            📋 {t("nav.history")}
          </a>
          <a href="/dashboard/compare" className={styles.link}>
            ⚔️ {t("nav.compare")}
          </a>
          <a href="/dashboard/friends" className={styles.link}>
            👥 {t("friends.title")}
          </a>
          <a href="/dashboard/wall" className={styles.link}>
            🏟️ Wall
          </a>
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
              <button
                onClick={() => setLocale(locale === "en" ? "pl" : "en")}
                className={styles.dropdownItem}
                type="button"
              >
                🌐 {locale === "en" ? "Polski" : "English"}
              </button>
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
          <a href="/dashboard/wall" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>🏟️ Wall</a>
          <a href="/dashboard/settings" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>⚙️ {t("nav.settings")}</a>
          <button onClick={() => { setLocale(locale === "en" ? "pl" : "en"); setMobileOpen(false); }} className={styles.mobileLink} type="button">🌐 {locale === "en" ? "Polski" : "English"}</button>
          <button onClick={handleLogout} className={styles.mobileLink} type="button">🚪 {t("nav.logout")}</button>
        </div>
      )}
    </nav>
  );
}
