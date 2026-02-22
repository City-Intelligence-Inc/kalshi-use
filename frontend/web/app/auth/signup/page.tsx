"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { signup, validatePassword, validateEmail } from "@/lib/auth";
import styles from "./page.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordErrors = validatePassword(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (passwordErrors.length > 0) {
      setError(`Password missing: ${passwordErrors.join(", ")}`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      signup(email, password);
      router.push("/auth/verify-email");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="heading">Create account</h1>

      {error && <div className={styles.error}>{error}</div>}

      <input
        className="input"
        type="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <PasswordInput
        value={password}
        onChange={setPassword}
        placeholder="Password"
      />
      {password.length > 0 && passwordErrors.length > 0 && (
        <ul className={styles.requirements}>
          {passwordErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <PasswordInput
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirm password"
      />

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span>I agree to the Terms of Service and Privacy Policy</span>
      </label>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Sign Up"}
      </button>

      <p className={styles.footer}>
        Already have an account?{" "}
        <Link href="/auth/login" className={styles.link}>
          Log In
        </Link>
      </p>
    </form>
  );
}
