"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  loadImageToCanvas,
  processScreenshot,
  terminateOCR,
  type OCRResult,
  type OCRProgress,
} from "@/lib/ocr/engine";
import { drawDebugOverlay } from "@/lib/ocr/debug";
import { saveMatch } from "@/lib/services/matches";
import { createClient } from "@/lib/supabase/client";
import styles from "./upload.module.css";

type Stage = "idle" | "preview" | "processing" | "results" | "saving" | "saved" | "error";

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminateOCR();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // Handle Ctrl+V paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  });

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted");
      setStage("error");
      return;
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setStage("preview");
    setError(null);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const startOCR = useCallback(async () => {
    if (!imageFile) return;
    setStage("processing");

    try {
      const canvas = await loadImageToCanvas(imageFile);
      canvasRef.current = canvas;
      const ocrResult = await processScreenshot(canvas, setProgress);
      setResult(ocrResult);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR processing failed");
      setStage("error");
    }
  }, [imageFile]);

  const reset = useCallback(() => {
    setStage("idle");
    setImageFile(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setProgress(null);
    setResult(null);
    setError(null);
  }, [imageUrl]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setIsSaving(true);
    setStage("saving");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to save matches.");
        setStage("error");
        return;
      }

      const saveResult = await saveMatch(result, imageFile, user.id);

      if (saveResult.isDuplicate) {
        setError("This match already exists in the database. Duplicate detected!");
        setStage("error");
        return;
      }

      if (!saveResult.success) {
        setError(saveResult.error || "Failed to save match.");
        setStage("error");
        return;
      }

      setSavedMatchId(saveResult.matchId || null);
      setStage("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setStage("error");
    } finally {
      setIsSaving(false);
    }
  }, [result, imageFile]);

  return (
    <div className={styles.uploadPage}>
      <h1>
        📸 <span>Upload</span> Screenshot
      </h1>
      <p className={styles.subtitle}>
        Drop your QC ranking screenshot and let the OCR engine extract your
        stats
      </p>

      {/* ─── Drop Zone ─── */}
      {stage === "idle" && (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className={styles.dropZoneIcon}>🎯</span>
          <h3 className={styles.dropZoneTitle}>Drop Screenshot Here</h3>

          <div className={styles.dropZoneMethods}>
            <div className={styles.method}>
              <kbd>Ctrl</kbd>+<kbd>V</kbd> Paste
            </div>
            <div className={styles.method}>🖱️ Drag &amp; Drop</div>
            <div className={styles.method}>📁 Choose File</div>
          </div>

          <p className={styles.dropZoneHint}>
            Supports PNG, JPG • QC Ranking tab (16:9)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ─── Image Preview ─── */}
      {stage === "preview" && imageUrl && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>📋 Screenshot Preview</h2>
            <div className={styles.previewActions}>
              <button className={styles.btnCancel} onClick={reset}>
                ✕ Cancel
              </button>
              <button className={styles.btnSave} onClick={startOCR}>
                ⚡ PROCESS OCR
              </button>
            </div>
          </div>
          <div className={styles.imagePreview}>
            <img src={imageUrl} alt="Screenshot preview" />
          </div>
        </div>
      )}

      {/* ─── Processing ─── */}
      {stage === "processing" && progress && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className={styles.progressText}>{progress.message}</p>
        </div>
      )}

      {/* ─── Results ─── */}
      {stage === "results" && result && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>📊 Extracted Data</h2>
            <div className={styles.previewActions}>
              <button className={styles.btnCancel} onClick={reset}>
                ↩ New Upload
              </button>
              <button
                className={styles.btnSave}
                onClick={handleSave}
                disabled={result.confidence < 30}
              >
                💾 SAVE MATCH
              </button>
            </div>
          </div>

          {/* Image preview with optional debug overlay */}
          {imageUrl && (
            <div className={styles.imagePreview} style={{ position: "relative" }}>
              <img src={imageUrl} alt="Processed screenshot" style={{ display: showDebug ? "none" : "block" }} />
              <canvas
                ref={debugCanvasRef}
                style={{ display: showDebug ? "block" : "none", width: "100%", height: "auto" }}
              />
              <button
                className={styles.debugBtn}
                onClick={() => {
                  const next = !showDebug;
                  setShowDebug(next);
                  if (next && canvasRef.current && debugCanvasRef.current) {
                    drawDebugOverlay(canvasRef.current, debugCanvasRef.current);
                  }
                }}
              >
                {showDebug ? "🖼️ Image" : "🔍 Debug Overlay"}
              </button>
            </div>
          )}

          <div className={styles.resultsPanel}>
            {/* Confidence Badge */}
            <div
              className={`${styles.confidenceBadge} ${
                result.confidence >= 75
                  ? styles.confidenceHigh
                  : result.confidence >= 50
                    ? styles.confidenceMedium
                    : styles.confidenceLow
              }`}
            >
              {result.confidence >= 75
                ? "🎯"
                : result.confidence >= 50
                  ? "⚠️"
                  : "❌"}{" "}
              Confidence: {result.confidence}%
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className={styles.warnings}>
                {result.warnings.map((w, i) => (
                  <div key={i} className={styles.warning}>
                    ⚠️ {w}
                  </div>
                ))}
              </div>
            )}

            {/* Match Card */}
            <div className={styles.matchCard}>
              <PlayerCard player={result.player1} />
              <div className={styles.scoreDisplay}>
                <div className={styles.scoreVs}>
                  <span
                    className={`${styles.score} ${result.player1.isWinner ? styles.scoreWinner : styles.scoreLoser}`}
                  >
                    {result.player1.score}
                  </span>
                  <span className={styles.scoreSeparator}>:</span>
                  <span
                    className={`${styles.score} ${result.player2.isWinner ? styles.scoreWinner : styles.scoreLoser}`}
                  >
                    {result.player2.score}
                  </span>
                </div>
              </div>
              <PlayerCard player={result.player2} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Saved ─── */}
      {stage === "saved" && (
        <div className={styles.resultsPanel} style={{ marginTop: "2rem", textAlign: "center", padding: "3rem" }}>
          <span style={{ fontSize: "3rem" }}>🎉</span>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)", marginTop: "1rem" }}>
            MATCH SAVED!
          </h2>
          <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>
            Your duel has been recorded in the database.
          </p>
          <div className={styles.previewActions} style={{ justifyContent: "center" }}>
            <button className={styles.btnCancel} onClick={reset}>📸 Upload Another</button>
            <a href="/dashboard" className={styles.btnSave} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              📊 Dashboard
            </a>
          </div>
        </div>
      )}

      {/* ─── Saving ─── */}
      {stage === "saving" && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "60%" }} />
          </div>
          <p className={styles.progressText}>💾 Saving match to database...</p>
        </div>
      )}

      {/* ─── Error ─── */}
      {stage === "error" && (
        <div className={styles.errorBox}>
          <h3>⚠️ {error?.includes("Duplicate") ? "Duplicate Match" : "Error"}</h3>
          <p>{error}</p>
          <button className={styles.btnRetry} onClick={reset}>
            ↩ Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Player Card Sub-Component
// =====================================================

function PlayerCard({
  player,
}: {
  player: OCRResult["player1"];
}) {
  return (
    <div className={styles.playerCard}>
      <div className={styles.playerHeader}>
        <input
          className={styles.playerNickEditable}
          defaultValue={player.nick}
          placeholder="Player nick"
        />
      </div>

      <div className={styles.statRow}>
        <span className={styles.statLabel}>Damage</span>
        <input
          className={styles.statValueEditable}
          defaultValue={player.totalDamage}
          type="number"
        />
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Accuracy</span>
        <span className={styles.statValue}>{player.accuracyPct}%</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Hits/Shots</span>
        <span className={styles.statValue}>{player.hitsShots || "—"}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Healing</span>
        <span className={styles.statValue}>{player.healing}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Mega HP</span>
        <span className={styles.statValue}>{player.megaHealthPickups}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Heavy Armor</span>
        <span className={styles.statValue}>{player.heavyArmorPickups}</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>Light Armor</span>
        <span className={styles.statValue}>{player.lightArmorPickups}</span>
      </div>

      {/* Weapons */}
      <div className={styles.weaponsSection}>
        <h4>Arsenal</h4>
        <div className={styles.weaponRow}>
          <span className={styles.weaponHeader}>Weapon</span>
          <span className={styles.weaponHeader}>H/S</span>
          <span className={styles.weaponHeader}>Acc%</span>
          <span className={styles.weaponHeader}>Dmg</span>
          <span className={styles.weaponHeader}>K</span>
        </div>
        {player.weapons.map((w) => (
          <div key={w.weaponIndex} className={styles.weaponRow}>
            <span className={styles.weaponName}>{w.weaponName}</span>
            <span className={styles.weaponStat}>{w.hitsShots || "—"}</span>
            <span className={styles.weaponStat}>
              {w.accuracyPct > 0 ? `${w.accuracyPct}%` : "—"}
            </span>
            <span className={styles.weaponStat}>{w.damage || "—"}</span>
            <span className={styles.weaponStat}>{w.kills || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
