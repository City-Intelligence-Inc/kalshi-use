"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { logout, getStoredUser } from "@/lib/auth";
import { User } from "@/lib/types";
import styles from "./page.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
      logout();
      router.replace("/");
    }
  }

  return (
    <AppShell>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user?.email ?? "\u2014"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Name</span>
            <span className={styles.value}>{user?.name ?? "\u2014"}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>KYC</span>
            <span
              className={`${styles.value} ${user?.kyc_complete ? styles.green : styles.yellow}`}
            >
              {user?.kyc_complete ? "Verified" : "Pending"}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Security</h2>
        <div className={styles.rows}>
          <button className={styles.menuItem}>
            <span>Two-Factor Authentication</span>
            <span className={styles.chevron}>&rsaquo;</span>
          </button>
          <button className={styles.menuItem}>
            <span>Change Password</span>
            <span className={styles.chevron}>&rsaquo;</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.label}>Version</span>
            <span className={styles.value}>1.0.0</span>
          </div>
        </div>
      </section>

      <button className="btn btn-danger" onClick={handleLogout}>
        Log Out
      </button>
    </AppShell>
  );
}
