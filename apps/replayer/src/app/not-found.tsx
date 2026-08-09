import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata = {
  title: "404 - Page Not Found | Web Tape",
};

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.scanline}></div>
      <main className={styles.main}>
        <div className={styles.errorCode}>
          <span className={styles.glitch} data-text="404">
            404
          </span>
        </div>

        <div className={styles.content}>
          <div className={styles.labelRow}>
            <span className={styles.badge}>信号丢失</span>
          </div>
          <h1 className={styles.title}>回放记录未找到</h1>
          <p className={styles.description}>
            您访问的会话录像不存在或已被移除，请确认链接是否正确。
          </p>
          <p className={styles.hint}>
            有效链接格式：
            <code className={styles.code}>/replayer?sourceId=录像ID</code>
          </p>
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.homeLink}>
            ← 返回首页
          </Link>
        </div>

        <div className={styles.statusLine}>
          <span className={styles.dot}></span>
          <span>路由未解析</span>
          <span className={styles.statusRight}>WEB TAPE</span>
        </div>
      </main>
    </div>
  );
}
