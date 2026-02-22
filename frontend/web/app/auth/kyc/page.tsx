"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitKyc } from "@/lib/auth";
import styles from "./page.module.css";

export default function KycPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName || !dob || !ssnLast4 || !address) {
      setError("All fields are required.");
      return;
    }
    if (!/^\d{4}$/.test(ssnLast4)) {
      setError("Enter the last 4 digits of your SSN.");
      return;
    }

    setLoading(true);
    try {
      const success = submitKyc({ fullName, dob, ssnLast4, address });
      if (success) {
        router.push("/auth/two-factor");
      }
    } catch {
      setError("KYC submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="heading">Identity verification</h1>
      <p className={styles.description}>
        As a CFTC-regulated exchange, Kalshi requires identity verification
        before you can trade event contracts.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <label className="label">Full legal name</label>
      <input
        className="input"
        placeholder="John Doe"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      <label className="label">Date of birth</label>
      <input
        className="input"
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      <label className="label">SSN (last 4 digits)</label>
      <input
        className="input"
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="1234"
        value={ssnLast4}
        onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ""))}
        style={{ marginBottom: 20 }}
      />

      <label className="label">Residential address</label>
      <textarea
        className={`input ${styles.addressInput}`}
        placeholder="123 Main St, City, State ZIP"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
