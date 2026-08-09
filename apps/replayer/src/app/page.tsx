"use client";

import {
  PlayCircleOutlined,
  VideoCameraOutlined,
  ExperimentOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import styles from "./page.module.css";
import { useI18n, LanguageSwitch } from "./i18n";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <LanguageSwitch />
      <main className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <span className={styles.logoMark} aria-hidden>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="30"
                  height="22"
                  rx="3"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <circle cx="12" cy="18" r="3" fill="#0f172a" />
                <circle cx="24" cy="18" r="3" fill="#0f172a" />
                <path
                  d="M3 13 L33 13"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="29" cy="9.5" r="1.2" fill="#ef4444" />
              </svg>
            </span>
            <span className={styles.brand}>Web Tape</span>
          </div>
          <h1 className={styles.title}>{t("home.title")}</h1>
          <p className={styles.subtitle}>{t("home.subtitle")}</p>

          {/* 主 CTA：让用户一眼就能找到入口 */}
          <div className={styles.ctaRow}>
            <a href="/experience" className={styles.ctaPrimary}>
              <PlayCircleOutlined />
              <span>{t("home.ctaExperience")}</span>
            </a>
          </div>

          <div className={styles.featureRow}>
            <span className={styles.featurePill}>{t("home.pillSentinel")}</span>
            <span className={styles.featurePill}>{t("home.pillZeroOp")}</span>
            <span className={styles.featurePill}>{t("home.pillCoverage")}</span>
            <span className={styles.featurePill}>{t("home.pillAnnotate")}</span>
            <span className={styles.featurePill}>{t("home.pillAiSummary")}</span>
            <span className={styles.featurePill}>{t("home.pillShare")}</span>
          </div>
        </div>

        {/* 三步上手 */}
        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#eff6ff", color: "#2563eb" }}
            >
              <ExperimentOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 01</div>
            <div className={styles.stepTitle}>{t("home.step1Title")}</div>
            <div className={styles.stepDesc}>{t("home.step1Desc")}</div>
          </div>
          <div className={styles.stepArrow} aria-hidden>
            →
          </div>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#fef2f2", color: "#dc2626" }}
            >
              <VideoCameraOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 02</div>
            <div className={styles.stepTitle}>{t("home.step2Title")}</div>
            <div className={styles.stepDesc}>{t("home.step2Desc")}</div>
          </div>
          <div className={styles.stepArrow} aria-hidden>
            →
          </div>
          <div className={styles.stepCard}>
            <div
              className={styles.stepIcon}
              style={{ background: "#ecfdf5", color: "#059669" }}
            >
              <ShareAltOutlined />
            </div>
            <div className={styles.stepIndex}>STEP 03</div>
            <div className={styles.stepTitle}>{t("home.step3Title")}</div>
            <div className={styles.stepDesc}>{t("home.step3Desc")}</div>
          </div>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>Web Tape</div>
          <div className={styles.footerStack}>
            <span>rrweb 2.0</span>
            <span>Next.js 16</span>
            <span>TypeScript</span>
            <span>Ant Design 6</span>
            <span>AI Workflow</span>
            <span>MIT</span>
          </div>
          <div className={styles.footerSign}>
            Built by <strong>Chern</strong> · 2026
          </div>
        </footer>
      </main>
    </div>
  );
}
