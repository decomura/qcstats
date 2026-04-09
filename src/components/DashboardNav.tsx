"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import styles from "./DashboardNav.module.css";

interface Props {
  user: User;
}

export default function DashboardNav({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

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
            📊 Dashboard
          </a>
          <a href="/dashboard/history" className={styles.link}>
            📋 History
          </a>
          <a href="/dashboard/compare" className={styles.link}>
            ⚔️ Compare
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
              <a href="/profile" className={styles.dropdownItem}>
                Profile
              </a>
              <a href="/settings" className={styles.dropdownItem}>
                Settings
              </a>
              <button
                onClick={handleLogout}
                className={styles.dropdownItem}
                type="button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
