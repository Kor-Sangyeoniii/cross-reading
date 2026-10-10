import styles from './LoadingMark.module.css'

/** The existing app icon's two rings gently separate and meet, then settle. */
export function LoadingMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="96" fill="#334e68" />
      <circle className={styles.left} cx="210" cy="256" r="110" fill="none" stroke="#fff" strokeWidth="28" />
      <circle className={styles.right} cx="302" cy="256" r="110" fill="none" stroke="#fff" strokeWidth="28" />
    </svg>
  )
}
