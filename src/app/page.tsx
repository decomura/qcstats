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
            Narzędzie społeczności Quake Champions
          </div>

          <h1 className={styles.heroTitle}>
            <span className={`${styles.qc} glitch`} data-text="QC">
              QC
            </span>
            <span className={styles.stats}>STATS</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Wrzuć screenshot po meczu.{" "}
            <em>My wyciągniemy dane.</em>{" "}
            Śledź celność, dominuj rywali i rządź na arenie.
          </p>

          <div className={styles.heroActions}>
            <a href="/login" className="btn btn-primary btn-lg" id="cta-get-started">
              ⚡ Dołącz do areny
            </a>
            <a href="/wall" className="btn btn-secondary btn-lg" id="cta-community-wall">
              🏟️ Community Wall
            </a>
            <a href="#jak-to-dziala" className="btn btn-secondary btn-lg" id="cta-how-works">
              Jak to działa?
            </a>
          </div>

          <div className={styles.statsStrip}>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>11</div>
              <div className={styles.statsStripLabel}>Śledzonych broni</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>40+</div>
              <div className={styles.statsStripLabel}>Statystyk na mecz</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>AI</div>
              <div className={styles.statsStripLabel}>Gemini Vision AI</div>
            </div>
            <div className={styles.statsStripItem}>
              <div className={styles.statsStripValue}>🔒</div>
              <div className={styles.statsStripLabel}>Tylko z zaproszeniem</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Funkcje</div>
          <h2 className={styles.sectionTitle}>Stworzone dla Fraggerów</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🤖</span>
            <h3 className={styles.featureTitle}>AI rozpoznawanie screenshotów</h3>
            <p className={styles.featureDesc}>
              Wklej screenshot z Ctrl+V lub przeciągnij. Gemini Vision AI
              odczytuje wszystkie staty, bronie, celność i damage automatycznie.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>📊</span>
            <h3 className={styles.featureTitle}>Analityka</h3>
            <p className={styles.featureDesc}>
              Śledź celność LG, precyzję Railguna, DPM, K/D i kontrolę
              itemów na przestrzeni czasu ze szczegółowymi wykresami.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>⚔️</span>
            <h3 className={styles.featureTitle}>Porównania 1 na 1</h3>
            <p className={styles.featureDesc}>
              Porównaj się z każdym rywalem. Historia meczów, win rate
              i statystyki broni w bezpośredniej konfrontacji.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🔒</span>
            <h3 className={styles.featureTitle}>Zamknięta Społeczność</h3>
            <p className={styles.featureDesc}>
              Rejestracja tylko na zaproszenie. Żadnych fake kont,
              żadnych trolli. Weryfikacja nicku ze screena zapewnia autentyczność.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🌳</span>
            <h3 className={styles.featureTitle}>Drzewko Zaproszeń</h3>
            <p className={styles.featureDesc}>
              Każdy gracz widzi kto kogo zaprosił. Przejrzysta społeczność
              oparta na rekomendacjach — widzisz jak ktoś się tutaj znalazł.
            </p>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>🎮</span>
            <h3 className={styles.featureTitle}>Tylko Duel 1v1</h3>
            <p className={styles.featureDesc}>
              Skupieni na trybie duel. AI automatycznie rozpoznaje i odrzuca
              screeny z TDM, FFA czy Instagib. Czyste statystyki 1v1.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className={styles.howItWorks} id="jak-to-dziala">
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Jak to działa</div>
          <h2 className={styles.sectionTitle}>Od zaproszenia do analizy</h2>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.stepTitle}>Otrzymaj zaproszenie</h3>
            <p className={styles.stepDesc}>
              QCStats działa na zaproszeniach. Poproś kogoś ze społeczności
              o link&nbsp;— otrzymasz go mailem. Kliknij i zarejestruj się.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.stepTitle}>Ustaw ksywkę</h3>
            <p className={styles.stepDesc}>
              W ustawieniach wpisz swoją ksywkę z Quake Champions — dokładnie
              taką jak w grze. System ją weryfikuje na każdym screenie.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.stepTitle}>Wrzuć screenshot</h3>
            <p className={styles.stepDesc}>
              Ctrl+V lub drag&amp;drop screena z wynikami duelu. Gemini AI
              odczytuje staty, sprawdza Twoją ksywkę i tryb gry automatycznie.
            </p>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>04</div>
            <h3 className={styles.stepTitle}>Analizuj i zapraszaj</h3>
            <p className={styles.stepDesc}>
              Śledź swój progres, porównuj się z rywalami. Zaproś przeciwnika
              do QCStats — razem budujecie zweryfikowaną społeczność.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST SYSTEM ═══════════ */}
      <section className={styles.trustSection}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Bezpieczeństwo</div>
          <h2 className={styles.sectionTitle}>Zweryfikowana Społeczność</h2>
        </div>

        <div className={styles.trustGrid}>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>📨</div>
            <h3>Tylko z zaproszeniem</h3>
            <p>Każdy gracz musi być zaproszony przez kogoś kto już jest w społeczności. Żadnych anonimowych rejestracji.</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>🎯</div>
            <h3>Weryfikacja Ksywki</h3>
            <p>Twoja ksywka musi odpowiadać tej na screenie. AI z tolerancją na błędy OCR sprawdza to automatycznie.</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>🌳</div>
            <h3>Drzewko Zaproszeń</h3>
            <p>Publiczne drzewko pokazuje kto kogo zaprosił. Widzisz skąd każdy gracz przyszedł — pełna transparentność.</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>🤖</div>
            <h3>Detekcja Trybu</h3>
            <p>AI rozpoznaje tryb gry na screenie. Tylko screeny z dueli 1v1 są akceptowane — TDM, FFA i inne są odrzucane.</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>⏳</div>
            <h3>Cooldown Ksywki</h3>
            <p>Zmiana ksywki raz na 30 dni. Zapobiega podszywaniu się pod innych graczy i manipulacji statystykami.</p>
          </div>
          <div className={styles.trustCard}>
            <div className={styles.trustIcon}>👥</div>
            <h3>Ograniczone Zaproszenia</h3>
            <p>Każdy gracz ma limit zaproszeń. Zachęca do zapraszania tylko zaufanych graczy — nie trolli.</p>
          </div>
        </div>
      </section>

      {/* ═══════════ WEAPONS ═══════════ */}
      <section className={styles.weaponsSection}>
        <div className={styles.featuresHeader}>
          <div className={styles.sectionLabel}>// Arsenal</div>
          <h2 className={styles.sectionTitle}>Pełna statystyka broni</h2>
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
          QCStats – Stworzone z <span className={styles.heart}>♥</span> przez
          społeczność Quake&apos;a // Nie jest powiązane z Bethesda ani id Software
        </p>
      </footer>
    </div>
  );
}
