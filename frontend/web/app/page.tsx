"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import styles from "./page.module.css";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>K</div>
        <h1 className={styles.title}>Kalshi Use</h1>
        <p className={styles.subtitle}>AI-powered trading on event markets</p>
      </div>

      <div className={styles.buttons}>
        <button
          className="btn btn-primary"
          onClick={() => router.push("/auth/login")}
        >
          Log In
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/auth/signup")}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
