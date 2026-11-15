'use client';
import CareToday from './CareToday';
import { useDemoWorkspace } from './DemoWorkspace';
import styles from './care.module.css';
export default function CareDemo() {
  const { workspace } = useDemoWorkspace();
  return workspace ? <CareToday /> : <main className={styles.shell}><p>Loading your care day...</p></main>;
}
