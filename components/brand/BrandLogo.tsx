import Image from "next/image";
import styles from "./brand.module.css";

/** The approved 1A identity. The surrounding link owns navigation. */
export function BrandLogo() {
  return <span className={styles.logo}>
    <Image src="/brand/handsin-mark.png" alt="" width={44} height={44} className={styles.mark} unoptimized />
    <strong className={styles.name}>HandsIn</strong>
  </span>;
}

export function BrandEmblem() {
  return <Image src="/brand/handsin-mark.png" alt="Three people embracing a heart — everyone connected" width={320} height={320} className={styles.emblem} unoptimized />;
}
