"use client";

import { useState, useCallback, useRef } from "react";
import { ScanLine, ImageIcon, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import PredictResultCard from "@/components/PredictResultCard";
import ModelPicker from "@/components/ModelPicker";
import { submitPrediction, pollPrediction } from "@/lib/api";
import { Prediction } from "@/lib/types";
import styles from "./page.module.css";

type ScreenState = "idle" | "preview" | "analyzing" | "result";

export default function PredictPage() {
  const [state, setState] = useState<ScreenState>("idle");
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCapturedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setState("preview");
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    []
  );

  const runPrediction = async () => {
    if (!capturedFile) return;
    setState("analyzing");
    try {
      const initial = await submitPrediction(
        capturedFile,
        "demo-user-1",
        undefined,
        selectedModel
      );
      const completed = await pollPrediction(initial.prediction_id);
      setPrediction(completed);
      setState("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      alert(msg);
      setState("preview");
    }
  };

  const handleReset = () => {
    setState("idle");
    setCapturedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPrediction(null);
  };

  // Hidden file input shared across states
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className={styles.fileInput}
      onChange={handleFileSelect}
    />
  );

  // ── Result screen ──
  if (state === "result" && prediction) {
    return (
      <AppShell>
        {fileInput}
        <PredictResultCard
          prediction={prediction}
          imageUri={previewUrl ?? undefined}
          onReset={handleReset}
          onPredictionUpdate={setPrediction}
        />
      </AppShell>
    );
  }

  // ── Analyzing screen ──
  if (state === "analyzing") {
    return (
      <AppShell>
        {fileInput}
        <div className={styles.container}>
          {previewUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Analyzing"
              className={styles.analyzingImage}
            />
          )}
          <div className="spinner spinner-lg" />
          <p className={styles.analyzingTitle}>
            Analyzing with {selectedModel}...
          </p>
          <p className={styles.analyzingSubtitle}>
            Matching to Kalshi markets
          </p>
        </div>
      </AppShell>
    );
  }

  // ── Preview screen ──
  if (state === "preview" && previewUrl) {
    return (
      <AppShell>
        {fileInput}
        <div className={styles.container}>
          <div className={styles.previewContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className={styles.previewImage}
            />
            <div className={styles.previewActions}>
              <ModelPicker
                selectedModel={selectedModel}
                onSelect={setSelectedModel}
              />
            </div>
            <div className={styles.previewButtons}>
              <button className={styles.analyzeButton} onClick={runPrediction}>
                <Sparkles size={20} />
                <span>Analyze</span>
              </button>
              <button
                className={styles.retakeButton}
                onClick={() => setState("idle")}
              >
                Pick different image
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Idle screen ──
  return (
    <AppShell>
      {fileInput}
      <div className={styles.container}>
        <div className={styles.heroSection}>
          <div className={styles.iconCircle}>
            <ScanLine size={48} color="#6366F1" />
          </div>
          <h1 className={styles.heroTitle}>Scan a Market</h1>
          <p className={styles.heroSubtitle}>
            Upload a Kalshi screenshot and Gemini will analyze it, match it to a
            real market, and tell you what to trade
          </p>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.primaryButton}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={22} />
            <span>Upload Screenshot</span>
          </button>
        </div>

        <div className={styles.modelRow}>
          <span className={styles.modelLabel}>Model:</span>
          <ModelPicker
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />
        </div>
      </div>
    </AppShell>
  );
}
