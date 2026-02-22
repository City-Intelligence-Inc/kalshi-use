"use client";

import { useState, useEffect } from "react";
import { Box, ChevronUp, CloudOff, RefreshCw } from "lucide-react";
import { getModels, getEndpoint } from "@/lib/api";
import { ModelInfo } from "@/lib/types";
import styles from "./ModelPicker.module.css";

interface Props {
  selectedModel: string;
  onSelect: (modelName: string) => void;
}

export default function ModelPicker({ selectedModel, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = models.find((m) => m.name === selectedModel);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModels();
      setModels(data);
    } catch (e: unknown) {
      const ep = getEndpoint();
      const msg = e instanceof Error ? e.message : "Failed to load models";
      setError(`${ep}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <>
      <button
        className={styles.badge}
        onClick={() => { loadModels(); setVisible(true); }}
      >
        <Box size={14} color="#A78BFA" />
        <span className={styles.badgeText}>
          {selected?.display_name ?? selectedModel}
        </span>
        <ChevronUp size={12} color="#94A3B8" />
      </button>

      {visible && (
        <div className="modal-backdrop" onClick={() => setVisible(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 className={styles.title}>Select Model</h3>

            {loading ? (
              <div className={styles.center}>
                <div className="spinner" />
              </div>
            ) : error ? (
              <div className={styles.errorBox}>
                <CloudOff size={32} color="#64748B" />
                <p className={styles.errorText}>Can&apos;t reach server</p>
                <p className={styles.errorDetail}>{error}</p>
                <button className={styles.retryButton} onClick={loadModels}>
                  <RefreshCw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            ) : models.length === 0 ? (
              <div className={styles.errorBox}>
                <p className={styles.errorText}>No models available</p>
                <button className={styles.retryButton} onClick={loadModels}>
                  <RefreshCw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {models.map((item) => (
                  <button
                    key={item.name}
                    className={`${styles.modelRow} ${item.name === selectedModel ? styles.modelRowActive : ""}`}
                    onClick={() => { onSelect(item.name); setVisible(false); }}
                  >
                    <div className={styles.modelInfo}>
                      <span className={styles.modelName}>{item.display_name}</span>
                      <span className={styles.modelDesc}>{item.description}</span>
                    </div>
                    <span
                      className={styles.statusDot}
                      style={{
                        backgroundColor: item.status === "available" ? "#22C55E" : "#EF4444",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
