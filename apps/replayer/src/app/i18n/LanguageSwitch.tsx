"use client";

import { useI18n } from "./LocaleContext";
import styles from "./LanguageSwitch.module.css";

/**
 * 轻量语言切换按钮，供落地页（首页 / guide / experience）右上角固定使用。
 * 点击在中 / 英间切换，显示切换后的目标语言。
 */
export default function LanguageSwitch({
  className,
  inline = false,
}: {
  className?: string;
  /** inline=true 时不固定定位，随父容器排布（用于页面头部） */
  inline?: boolean;
}) {
  const { locale, toggleLocale, t } = useI18n();
  return (
    <button
      type="button"
      className={`${styles.switch} ${inline ? styles.inline : ""} ${className ?? ""}`}
      onClick={toggleLocale}
      title={t("floatMenu.language")}
      aria-label={t("floatMenu.language")}
    >
      <span className={styles.icon} aria-hidden>
        🌐
      </span>
      <span>{locale === "zh" ? "English" : "中文"}</span>
    </button>
  );
}
