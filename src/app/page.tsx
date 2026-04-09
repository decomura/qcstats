import styles from "./page.module.css";

const WEAPONS = [
  { name: "Gauntlet", color: "#9933ff" },
  { name: "Machine Gun", color: "#cccc00" },
  { name: "Super Machine Gun", color: "#ddaa00" },
  { name: "Shotgun", color: "#ff8800" },
  { name: "Super Shotgun", color: "#ffaa33" },
  { name: "Nail Gun", color: "#8833ff" },
  { name: "Super Nailgun", color: "#5566cc" },
  { name: "Rocket Launcher", color: "#cc0000" },
  { name: "Lightning Gun", color: "#3399ff" },
  { name: "Railgun", color: "#00cc66" },
  { name: "Tribolt", color: "#ff5533" },
];

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* ═══════════ HERO ═══════════ */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.dot} />
            Quake Champions Community Tool
          </div>

          <h1 className={styles.heroTitle}>
            <span className={`${styles.qc} glitch`} data-text="QC">
              QC
            </span>
            <span className={styles.stats}>STATS</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Upload your post-match screenshot. <em>We extract the data.</em>{" "}
            Track your accuracy, dominate your rivals, and own the arena.
          </p>

          <div className={styles.heroActions}>
            <button className="btn btn-primary btn-lg" id="cta-get-started">
              ⚡ Get Started
            </button>
            <button className="btn btn-secondary btn-lg" id="cta-how-works">
              How It Works
            </button>
          </div>

          <div className={styles.statsStrip}>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>11</div>
              <div className={styles.statsStripLabel}>Weapons Tracked</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>40+</div>
              <div className={styles.statsStripLabel}>Stats Per Match</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>OCR</div>
              <div className={styles.statsStripLabel}>Auto-Detection</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>$0</div>
              <div className={styles.statsStripLabel}>Forever Free</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Features</div>
          <h2 className={styles.sectionTitle}>Built for Fraggers</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📸</span>
            <h3 className={styles.featureTitle}>Screenshot OCR</h3>
            <p className={styles.featureDesc}>
              Paste your post-match screenshot with Ctrl+V. Our engine detects
              all weapon stats, accuracy, damage, and frags automatically.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📊</span>
            <h3 className={styles.featureTitle}>Deep Analytics</h3>
            <p className={styles.featureDesc}>
              Track LG accuracy, Railgun precision, DPM, K/D ratio, and item
              control percentage over time with detailed charts.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>⚔️</span>
            <h3 className={styles.featureTitle}>Head-to-Head</h3>
            <p className={styles.featureDesc}>
              Compare your stats against any rival. See match history,
              win rates, and weapon performance in direct confrontation.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>👥</span>
            <h3 className={styles.featureTitle}>Friends &amp; Rivals</h3>
            <p className={styles.featureDesc}>
              Add friends, get notified about their matches, and build your
              competitive network within the community.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🏆</span>
            <h3 className={styles.featureTitle}>Rankings</h3>
            <p className={styles.featureDesc}>
              Opt-in global rankings. See where you stand in accuracy,
              damage output, and win rate among all registered players.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🔒</span>
            <h3 className={styles.featureTitle}>Privacy First</h3>
            <p className={styles.featureDesc}>
              Your stats, your rules. Choose to be public or keep your profile
              private. Full control over your data with CSV/JSON export.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className={styles.howItWorks}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Process</div>
          <h2 className={styles.sectionTitle}>How It Works</h2>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.stepTitle}>Play a Duel</h3>
            <p className={styles.stepDesc}>
              Finish your duel match in Quake Champions. Take a screenshot of
              the RANKING results screen.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.stepTitle}>Paste Screenshot</h3>
            <p className={styles.stepDesc}>
              Hit Ctrl+V on QCStats or drag & drop your screenshot.
              Our OCR engine reads the data in seconds.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.stepTitle}>Review & Save</h3>
            <p className={styles.stepDesc}>
              Preview detected stats, correct if needed, and confirm.
              Match is saved to your profile and your opponent&apos;s.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>04</div>
            <h3 className={styles.stepTitle}>Analyze & Improve</h3>
            <p className={styles.stepDesc}>
              Track your progress over time. See trends, compare against
              rivals, and dominate the arena.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ WEAPONS ═══════════ */}
      <section className={styles.weaponsSection}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Arsenal</div>
          <h2 className={styles.sectionTitle}>Every Weapon Tracked</h2>
        </div>

        <div className={styles.weaponsList}>
          {WEAPONS.map((weapon) => (
            <div key={weapon.name} className={styles.weaponPill}>
              <span
                className={styles.weaponDot}
                style={{ backgroundColor: weapon.color }}
              />
              {weapon.name}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          QCStats – Built with <span className={styles.heart}>♥</span> by the
          Quake community // Not affiliated with Bethesda or id Software
        </p>
      </footer>
    </div>
  );
}
