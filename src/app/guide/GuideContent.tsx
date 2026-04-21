"use client";

import { useState, useEffect } from "react";
import { type Locale, ALL_LOCALES, LOCALE_LABELS } from "@/lib/i18n/translations";
import { guideTranslations, type GuideTranslationKey } from "@/lib/i18n/guideTranslations";
import styles from "./guide.module.css";

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("qcstats_locale") as Locale;
    if (saved && ALL_LOCALES.includes(saved)) return saved;
    const lang = navigator.language.slice(0, 2);
    if (lang === "pl") return "pl";
    if (lang === "fr") return "fr";
    if (lang === "es") return "es";
    if (lang === "de") return "de";
  }
  return "en";
}

export default function GuideContent() {
  const [locale, setLocale] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(getInitialLocale());
    setMounted(true);
  }, []);

  const gt = (key: GuideTranslationKey): string => {
    return guideTranslations[locale]?.[key] || guideTranslations["en"][key] || key;
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("qcstats_locale", newLocale);
  };

  if (!mounted) return null;

  return (
    <div className={styles.guidePage}>
      {/* Header */}
      <header className={styles.header}>
        <a href="/" className={styles.backLink}>{gt("guide.backHome")}</a>
        <h1 className={styles.title}>
          📖 <span className={styles.titleAccent}>{gt("guide.title")}</span>
        </h1>
        <p className={styles.subtitle}>{gt("guide.subtitle")}</p>

        <div className={styles.langSelector}>
          {ALL_LOCALES.map((loc) => (
            <button
              key={loc}
              className={`${styles.langBtn} ${locale === loc ? styles.langBtnActive : ""}`}
              onClick={() => handleLocaleChange(loc)}
              type="button"
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      </header>

      {/* Section 1 - What is QCStats */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>01</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s1.title")}</h2>
        <p className={styles.sectionDesc}>{gt("guide.s1.desc")}</p>
        <ul className={styles.featureList}>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>📸</span>{gt("guide.s1.feat1")}</li>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>📊</span>{gt("guide.s1.feat2")}</li>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>⚔️</span>{gt("guide.s1.feat3")}</li>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>🏟️</span>{gt("guide.s1.feat4")}</li>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>👥</span>{gt("guide.s1.feat5")}</li>
          <li className={styles.featureItem}><span className={styles.featureEmoji}>🔍</span>{gt("guide.s1.feat6")}</li>
        </ul>
      </section>

      {/* Section 2 - Getting Started */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>02</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s2.title")}</h2>
        <div className={styles.stepsGrid}>
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className={styles.stepCard}>
              <div className={styles.stepNum}>0{n}</div>
              <h3 className={styles.stepTitle}>{gt(`guide.s2.step${n}.title` as GuideTranslationKey)}</h3>
              <p className={styles.stepDesc}>{gt(`guide.s2.step${n}.desc` as GuideTranslationKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 - Dashboard */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>03</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s3.title")}</h2>
        <p className={styles.sectionDesc}>{gt("guide.s3.desc")}</p>
      </section>

      {/* Section 4 - Weapons */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>04</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s4.title")}</h2>
        <p className={styles.sectionDesc}>{gt("guide.s4.desc")}</p>
      </section>

      {/* Section 5 - Friends */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>05</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s5.title")}</h2>
        <p className={styles.sectionDesc}>{gt("guide.s5.desc")}</p>
      </section>

      {/* Section 6 - Community Wall */}
      <section className={styles.section}>
        <div className={styles.sectionNumber}>06</div>
        <h2 className={styles.sectionTitle}>{gt("guide.s6.title")}</h2>
        <p className={styles.sectionDesc}>{gt("guide.s6.desc")}</p>
      </section>

      {/* Section 7 - Security */}
      <section className={styles.section} style={{ borderColor: "rgba(0,204,102,0.15)" }}>
        <div className={styles.sectionNumber}>07</div>
        <h2 className={styles.sectionTitle} style={{ color: "var(--accent-green)" }}>{gt("guide.s7.title")}</h2>
        <ul className={styles.securityList}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <li key={n} className={styles.securityItem}>
              <span className={styles.checkIcon}>✅</span>
              {gt(`guide.s7.security${n}` as GuideTranslationKey)}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className={styles.cta}>
        <div className={styles.ctaActions}>
          <a href="/login" className="btn btn-primary btn-lg">⚡ Join the Arena</a>
          <a href="/wall" className="btn btn-secondary btn-lg">🏟️ Community Wall</a>
        </div>
      </div>
    </div>
  );
}
