"use client";

import { useState } from "react";
import { connectPlatform } from "@/lib/api";
import styles from "./ConnectKalshiModal.module.css";

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  accountType: "personal" | "agent";
  onConnected: () => void;
}

export default function ConnectKalshiModal({
  visible,
  onClose,
  userId,
  accountType,
  onConnected,
}: Props) {
  const [apiKeyId, setApiKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const handleConnect = async () => {
    if (!apiKeyId.trim() || !privateKey.trim()) {
      setError("Please enter both API Key ID and Private Key.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await connectPlatform(userId, apiKeyId.trim(), privateKey.trim(), "kalshi", accountType);
      setApiKeyId("");
      setPrivateKey("");
      onConnected();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not validate credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className={styles.title}>
          Connect Kalshi ({accountType === "agent" ? "AI Agent" : "Personal"})
        </h3>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.label}>API Key ID</label>
        <input
          className={styles.input}
          value={apiKeyId}
          onChange={(e) => setApiKeyId(e.target.value)}
          placeholder="e.g. abc123-def456"
          autoCapitalize="off"
          autoCorrect="off"
        />

        <label className={styles.label}>RSA Private Key (PEM)</label>
        <textarea
          className={`${styles.input} ${styles.multiline}`}
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="-----BEGIN RSA PRIVATE KEY-----"
        />

        <p className={styles.hint}>
          Generate your API key at kalshi.com/account/profile
        </p>

        <button
          className={styles.button}
          onClick={handleConnect}
          disabled={loading}
          style={loading ? { opacity: 0.6 } : undefined}
        >
          {loading ? <span className="spinner spinner-sm" /> : "Connect"}
        </button>

        <button className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
