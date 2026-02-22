"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setup2FA } from "@/lib/auth";
import styles from "./page.module.css";

export default function TwoFactorPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "sms" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    if (!method) return;
    setLoading(true);
    try {
      setup2FA(method);
      router.push("/dashboard");
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="heading">Secure your account</h1>
      <p className={styles.description}>
        Add an extra layer of security with two-factor authentication. You can
        always set this up later in Settings.
      </p>

      <button
        type="button"
        className={`${styles.option} ${method === "totp" ? styles.selected : ""}`}
        onClick={() => setMethod("totp")}
      >
        <div className={styles.optionTitle}>Authenticator App</div>
        <div className={styles.optionDesc}>
          Use Google Authenticator, Authy, or similar
        </div>
      </button>

      <button
        type="button"
        className={`${styles.option} ${method === "sms" ? styles.selected : ""}`}
        onClick={() => setMethod("sms")}
      >
        <div className={styles.optionTitle}>SMS</div>
        <div className={styles.optionDesc}>
          Receive codes via text message
        </div>
      </button>

      <button
        className="btn btn-primary"
        onClick={handleSetup}
        disabled={loading || !method}
        style={{ marginTop: 20 }}
      >
        {loading ? "Setting up..." : "Enable 2FA"}
      </button>

      <button
        className={styles.skip}
        onClick={() => router.push("/dashboard")}
      >
        Skip for now
      </button>
    </div>
  );
}
