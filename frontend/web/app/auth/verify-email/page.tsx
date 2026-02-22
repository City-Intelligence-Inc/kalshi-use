"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { verifyEmail } from "@/lib/auth";
import styles from "./page.module.css";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = verifyEmail(code);
      if (success) {
        router.push("/auth/kyc");
      } else {
        setError("Invalid verification code.");
      }
    } catch {
      setError("Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="heading">Verify your email</h1>
      <p className={styles.description}>
        We sent a 6-digit code to your email. Enter it below to continue.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <input
        className={`input ${styles.codeInput}`}
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
      />

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Verifying..." : "Verify"}
      </button>

      <button type="button" className={styles.resend}>
        Resend code
      </button>
    </form>
  );
}
