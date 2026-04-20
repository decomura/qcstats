"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  loadImageToCanvas,
  processScreenshot,
  terminateOCR,
  getRandomLoadingMessage,
  type OCRResult,
  type OCRProgress,
} from "@/lib/ocr/engine";
import { drawDebugOverlay } from "@/lib/ocr/debug";
import { saveMatch, createMatchGroup, validateGameNickname, getUserGameNickname, type SaveMatchResult, type NickAnalysisResult, type NicknameValidationResult } from "@/lib/services/matches";
import { createClient } from "@/lib/supabase/client";
import styles from "./upload.module.css";

type Stage = "idle" | "preview" | "processing" | "results" | "saving" | "saved" | "error" | "bulk-processing" | "bulk-results";

interface BulkItem {
  file: File;
  imageUrl: string;
  status: "pending" | "processing" | "done" | "error";
  result?: OCRResult;
  error?: string;
}

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
  const [lastNickAnalysis, setLastNickAnalysis] = useState<SaveMatchResult["nickAnalysis"] | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [variant, setVariant] = useState<"total_score" | "ranking">("total_score");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [description, setDescription] = useState("");
  const [publishToWall, setPublishToWall] = useState(true);
  const [funnyMessage, setFunnyMessage] = useState("");
  const funnyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Game nickname validation state
  const [gameNickname, setGameNicknameState] = useState<string | null>(null);
  const [nicknameValidation, setNicknameValidation] = useState<NicknameValidationResult | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(true);
  // Invite opponent modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteOpponentNick, setInviteOpponentNick] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  // Bulk upload state
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkPublishAsGroup, setBulkPublishAsGroup] = useState(true);
  const [bulkPublishToWall, setBulkPublishToWall] = useState(true);
  const [bulkDescription, setBulkDescription] = useState("");

  // Daily usage tracking
  const [dailyUsage, setDailyUsage] = useState<{ used: number; limit: number } | null>(null);

  // Check game nickname and daily usage on mount
  useEffect(() => {
    const checkNickname = async () => {
      setNicknameChecking(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const nick = await getUserGameNickname(user.id);
        setGameNicknameState(nick);

        // Fetch daily usage
        const today = new Date().toISOString().slice(0, 10);
        const { count } = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("uploaded_by", user.id)
          .gte("created_at", today + "T00:00:00Z");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const limit = profile?.role === "admin" ? 100 : 30;
        setDailyUsage({ used: count ?? 0, limit });
      }
      setNicknameChecking(false);
    };
    checkNickname();
  }, []);

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
      setError("Akceptowane są tylko pliki graficzne");
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
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (files.length > 1) {
        startBulkMode(files.slice(0, 100));
      } else if (files[0]) {
        handleFile(files[0]);
      }
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
      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
      if (files.length > 1) {
        startBulkMode(files.slice(0, 100));
      } else if (files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  // === BULK MODE ===
  const startBulkMode = useCallback((files: File[]) => {
    const items: BulkItem[] = files.map(f => ({
      file: f,
      imageUrl: URL.createObjectURL(f),
      status: "pending" as const,
    }));
    setBulkItems(items);
    setStage("bulk-processing");
    processBulk(items);
  }, []);

  const processBulk = useCallback(async (items: BulkItem[]) => {
    const locale = (typeof window !== "undefined" && localStorage.getItem("qcstats_locale") === "en") ? "en" : "pl";
    setFunnyMessage(getRandomLoadingMessage(locale as "pl" | "en"));
    funnyIntervalRef.current = setInterval(() => {
      setFunnyMessage(getRandomLoadingMessage(locale as "pl" | "en"));
    }, 3000);

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "processing" };
      setBulkItems([...updated]);

      let success = false;
      let retries = 0;
      
      while (!success && retries < 3) {
        try {
          const canvas = await loadImageToCanvas(updated[i].file);
          const ocrResult = await processScreenshot(canvas, undefined, "total_score", updated[i].file);
          updated[i] = { ...updated[i], status: "done", result: ocrResult };
          success = true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "OCR failed";
          if (errorMessage.includes("limit API") || errorMessage.includes("kolejk") || errorMessage.includes("429")) {
            retries++;
            if (retries >= 3) {
              updated[i] = { ...updated[i], status: "error", error: "Przekroczono limit API (brak prób)." };
              break;
            }
            updated[i] = { ...updated[i], status: "processing", error: `Kolejkowanie (60s)... Próba ${retries + 1}/3` };
            setBulkItems([...updated]);
            await new Promise(resolve => setTimeout(resolve, 60000));
          } else {
            updated[i] = { ...updated[i], status: "error", error: errorMessage };
            break;
          }
        }
      }
      setBulkItems([...updated]);
    }

    if (funnyIntervalRef.current) {
      clearInterval(funnyIntervalRef.current);
      funnyIntervalRef.current = null;
    }

    setStage("bulk-results");
  }, []);

  const handleBulkSave = useCallback(async () => {
    setIsSaving(true);
    setStage("saving");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Musisz być zalogowany.");
        setStage("error");
        return;
      }

      const successItems = bulkItems.filter(item => item.status === "done" && item.result);
      if (successItems.length === 0) {
        setError("Żaden screenshot nie został przetworzony pomyślnie.");
        setStage("error");
        return;
      }

      let groupId: string | undefined;
      if (bulkPublishAsGroup && bulkPublishToWall && successItems.length > 1) {
        const gId = await createMatchGroup(user.id, undefined, bulkDescription);
        if (gId) groupId = gId;
      }

      let savedCount = 0;
      for (const item of successItems) {
        if (!item.result) continue;
        const result = await saveMatch(
          item.result,
          item.file,
          user.id,
          undefined,
          bulkPublishAsGroup ? "" : bulkDescription,
          bulkPublishToWall,
          groupId
        );
        if (result.success) savedCount++;
      }

      setSavedMatchId(null);
      setStage("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk save failed");
      setStage("error");
    } finally {
      setIsSaving(false);
    }
  }, [bulkItems, bulkPublishAsGroup, bulkPublishToWall, bulkDescription]);

  const startOCR = useCallback(async () => {
    if (!imageFile) return;
    setStage("processing");

    // Start rotating funny messages
    const locale = (typeof window !== "undefined" && localStorage.getItem("qcstats_locale") === "en") ? "en" : "pl";
    setFunnyMessage(getRandomLoadingMessage(locale as "pl" | "en"));
    funnyIntervalRef.current = setInterval(() => {
      setFunnyMessage(getRandomLoadingMessage(locale as "pl" | "en"));
    }, 3000);

    try {
      const canvas = await loadImageToCanvas(imageFile);
      canvasRef.current = canvas;
      const ocrResult = await processScreenshot(canvas, setProgress, variant, imageFile);
      setResult(ocrResult);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR processing failed");
      setStage("error");
    } finally {
      // Stop rotating messages
      if (funnyIntervalRef.current) {
        clearInterval(funnyIntervalRef.current);
        funnyIntervalRef.current = null;
      }
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
        setError("Musisz być zalogowany, żeby zapisać mecz.");
        setStage("error");
        return;
      }

      // Validate game nickname against OCR results
      const validation = await validateGameNickname(
        user.id,
        result.player1.nick,
        result.player2.nick
      );
      setNicknameValidation(validation);

      if (!validation.valid) {
        if (validation.error === "NICKNAME_NOT_SET") {
          setError("Musisz ustawić ksywkę w grze w Ustawieniach zanim będziesz mógł zapisywać mecze.");
        } else {
          setError(`Twoja ksywka \"${gameNickname}\" nie została znaleziona na screenie. Na screenie widoczni są: \"${result.player1.nick}\" i \"${result.player2.nick}\". Możesz zapisywać tylko własne mecze.`);
        }
        setStage("error");
        return;
      }

      const saveResult = await saveMatch(result, imageFile, user.id, undefined, description, publishToWall);

      if (saveResult.isCrossVerified) {
        setSavedMatchId(saveResult.matchId || null);
        setStage("saved");
        return;
      }

      if (saveResult.isDuplicate) {
        setError("Ten mecz już istnieje w bazie danych. Wykryto duplikat!");
        setStage("error");
        return;
      }

      if (!saveResult.success) {
        setError(saveResult.error || "Nie udało się zapisać meczu.");
        setStage("error");
        return;
      }

      setSavedMatchId(saveResult.matchId || null);
      setLastNickAnalysis(saveResult.nickAnalysis || null);

      // Fetch invite code for "invite" button
      if (saveResult.nickAnalysis) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("invite_code")
          .eq("id", user.id)
          .single();
        setInviteCode(profile?.invite_code || null);
      }

      setStage("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nie powiódł się");
      setStage("error");
    } finally {
      setIsSaving(false);
    }
  }, [result, imageFile, publishToWall, description, gameNickname]);

  // Send email invite to opponent
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
    setInviteSending(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deduplication: reuse existing active token for same email
      const emailNorm = inviteEmail.trim().toLowerCase();
      const { data: existingToken } = await supabase
        .from("invite_tokens")
        .select("token")
        .eq("inviter_id", user.id)
        .eq("email", emailNorm)
        .is("used_by", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .single();

      let token: string;
      if (existingToken) {
        token = existingToken.token;
      } else {
        token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        await supabase.from("invite_tokens").insert({
          inviter_id: user.id,
          token,
          email: emailNorm,
        });
      }

      // Open mailto with invite
      const inviteUrl = `${window.location.origin}/login?invite=${token}`;
      const subject = encodeURIComponent("Dołącz do QCStats! 🎮");
      const body = encodeURIComponent(
        `Hej ${inviteOpponentNick}!\n\nZapraszam Cię do QCStats - platformy do śledzenia statystyk z Quake Champions.\n\nTwój osobisty link zaproszenia:\n${inviteUrl}\n\nDo zobaczenia na arenie! ⚡`
      );
      window.open(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`);

      setInviteSent(true);
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSent(false);
        setInviteEmail("");
      }, 3000);
    } catch (err) {
      console.error("Invite send error:", err);
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, inviteOpponentNick]);

  return (
    <div className={styles.uploadPage}>
      <h1>
        📸 <span>Upload</span> Screenshot
      </h1>
      <p className={styles.subtitle}>
        Wrzuć screenshot z meczu QC — OCR wyciągnie Twoje statystyki
      </p>

      {/* ─── Game Nickname Guard ─── */}
      {!nicknameChecking && !gameNickname && stage === "idle" && (
        <div className={styles.nicknameGuard}>
          <span style={{ fontSize: "2.5rem" }}>⚠️</span>
          <h3>Ustaw ksywkę w grze</h3>
          <p>
            Zanim będziesz mógł uploadować screenshoty, musisz ustawić swoją <strong>ksywkę z Quake Champions</strong> w ustawieniach.
            System weryfikuje, czy Twoja ksywka znajduje się na screenie — to zabezpieczenie przed fake’ami.
          </p>
          <a href="/dashboard/settings" className={styles.btnSave} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", marginTop: "1rem" }}>
            ⚙️ Przejdź do Ustawień
          </a>
        </div>
      )}

      {/* ─── Nickname Badge ─── */}
      {gameNickname && stage === "idle" && (
        <div className={styles.nicknameBadge}>
          🎮 Twoja ksywka: <strong>{gameNickname}</strong>
          <span className={styles.nicknameBadgeHint}>— ta ksywka musi być widoczna na screenie</span>
          {dailyUsage && (
            <span className={styles.dailyCounter} style={{
              marginLeft: "auto",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              background: dailyUsage.used >= dailyUsage.limit 
                ? "rgba(255,60,60,0.2)" 
                : dailyUsage.used >= dailyUsage.limit * 0.8 
                  ? "rgba(255,180,0,0.2)" 
                  : "rgba(0,255,128,0.15)",
              color: dailyUsage.used >= dailyUsage.limit 
                ? "#ff6b6b" 
                : dailyUsage.used >= dailyUsage.limit * 0.8 
                  ? "#ffc107" 
                  : "#4caf50",
              border: `1px solid ${dailyUsage.used >= dailyUsage.limit ? "rgba(255,60,60,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}>
              📊 {dailyUsage.used}/{dailyUsage.limit} dziś
            </span>
          )}
        </div>
      )}

      {/* ─── Drop Zone ─── */}
      {stage === "idle" && gameNickname && (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className={styles.dropZoneIcon}>🎯</span>
          <h3 className={styles.dropZoneTitle}>Upuść screenshot tutaj</h3>

          <div className={styles.dropZoneMethods}>
            <div className={styles.method}>
              <kbd>Ctrl</kbd>+<kbd>V</kbd> Wklej
            </div>
            <div className={styles.method}>🖱️ Przeciągnij</div>
            <div className={styles.method}>📁 Wybierz plik</div>
          </div>

          <p className={styles.dropZoneHint}>
            Obsługiwane formaty: PNG, JPG • Tab rankingowy z QC (16:9)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.fileInput}
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ─── Image Preview ─── */}
      {stage === "preview" && imageUrl && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>📋 Podgląd screenshota</h2>
            <div className={styles.previewActions}>
              <button className={styles.btnCancel} onClick={reset}>
                ✕ Anuluj
              </button>
              <button className={styles.btnSave} onClick={startOCR}>
                ⚡ ROZPOZNAJ
              </button>
            </div>
          </div>
          <div className={styles.imagePreview}>
            <img src={imageUrl} alt="Screenshot preview" />
          </div>
        </div>
      )}

      {/* ─── Processing ─── */}
      {stage === "processing" && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress?.progress || 10}%` }}
            />
          </div>
          <p className={styles.funnyMessage} key={funnyMessage}>{funnyMessage}</p>
        </div>
      )}

      {/* ─── Results ─── */}
      {stage === "results" && result && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>📊 Wyodrębnione dane</h2>
            <div className={styles.previewActions}>
              <button className={styles.btnCancel} onClick={reset}>
                ↩ Nowy upload
              </button>
              <button
                className={styles.btnSave}
                onClick={handleSave}
                disabled={result.confidence < 30}
              >
                💾 ZAPISZ MECZ
              </button>
            </div>
          </div>

          {/* Description for Wall */}
          <div style={{ margin: "0.75rem 0", padding: "0 0.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "var(--font-display)" }}>
              💬 Komentarz do walla (opcjonalnie)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="np. Co za mecz! Railgun na 60%!"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Publish to Wall checkbox */}
          <div style={{ margin: "0.5rem 0 0.75rem", padding: "0 0.5rem" }}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={publishToWall}
                onChange={(e) => setPublishToWall(e.target.checked)}
                className={styles.checkbox}
              />
              <span>📢 Publikuj na ścianie społeczności</span>
            </label>
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
              Pewność: {result.confidence}%
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

      {/* ─── Bulk Processing ─── */}
      {stage === "bulk-processing" && (
        <div className={styles.previewSection}>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            📦 Bulk Upload — {bulkItems.filter(i => i.status === "done").length}/{bulkItems.length}
          </h2>
          <p className={styles.funnyMessage} key={funnyMessage}>{funnyMessage}</p>
          <div className={styles.bulkList}>
            {bulkItems.map((item, i) => (
              <div key={i} className={`${styles.bulkItem} ${styles[`bulk-${item.status}`]}`}>
                <img src={item.imageUrl} alt="" className={styles.bulkThumb} />
                <div className={styles.bulkItemInfo}>
                  <span className={styles.bulkItemName}>{item.file.name}</span>
                  <span className={styles.bulkItemStatus}>
                    {item.status === "pending" && "⏳ Oczekuje..."}
                    {item.status === "processing" && (item.error ? `🔄 ${item.error}` : "🔄 Przetwarzanie...")}
                    {item.status === "done" && `✅ ${item.result?.player1.nick} vs ${item.result?.player2.nick}`}
                    {item.status === "error" && `❌ ${item.error}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bulk Results ─── */}
      {stage === "bulk-results" && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>📦 Bulk Upload — Wyniki</h2>
            <div className={styles.previewActions}>
              <button className={styles.btnCancel} onClick={reset}>
                ↩ Anuluj
              </button>
              <button
                className={styles.btnSave}
                onClick={handleBulkSave}
                disabled={isSaving || bulkItems.filter(i => i.status === "done").length === 0}
              >
                💾 ZAPISZ {bulkItems.filter(i => i.status === "done").length} MECZÓW
              </button>
            </div>
          </div>

          {/* Bulk options */}
          <div style={{ margin: "0.75rem 0", padding: "0 0.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={bulkPublishToWall}
                onChange={(e) => setBulkPublishToWall(e.target.checked)}
                className={styles.checkbox}
              />
              <span>📢 Publikuj na ścianie społeczności</span>
            </label>
            {bulkPublishToWall && (
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={bulkPublishAsGroup}
                  onChange={(e) => setBulkPublishAsGroup(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>📦 Jako jeden post (grupowy)</span>
              </label>
            )}
            <input
              type="text"
              value={bulkDescription}
              onChange={(e) => setBulkDescription(e.target.value)}
              maxLength={300}
              placeholder="Opis sesji (opcjonalnie)"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Match results list */}
          <div className={styles.bulkList}>
            {bulkItems.map((item, i) => (
              <div key={i} className={`${styles.bulkItem} ${styles[`bulk-${item.status}`]}`}>
                <img src={item.imageUrl} alt="" className={styles.bulkThumb} />
                <div className={styles.bulkItemInfo}>
                  {item.status === "done" && item.result ? (
                    <>
                      <span className={styles.bulkItemName}>
                        {item.result.player1.nick} <strong>{item.result.player1.score}:{item.result.player2.score}</strong> {item.result.player2.nick}
                      </span>
                      <span className={styles.bulkItemStatus}>
                        🎯 Confidence: {item.result.confidence}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={styles.bulkItemName}>{item.file.name}</span>
                      <span className={styles.bulkItemStatus}>❌ {item.error || "Niepowodzenie"}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Saved ─── */}
      {stage === "saved" && (
        <div className={styles.resultsPanel} style={{ marginTop: "2rem", padding: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "3rem" }}>🎉</span>
            <h2 style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)", marginTop: "1rem" }}>
              MECZ ZAPISANY!
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0" }}>
              Twój duel został zapisany w bazie danych.
            </p>

            {/* Nickname validation info */}
            {nicknameValidation && !nicknameValidation.exact && nicknameValidation.valid && (
              <div className={styles.fuzzyMatchWarning}>
                ⚠️ Twoja ksywka została dopasowana z drobną różnicą (odległość: {nicknameValidation.distance}). Jeśli to błąd OCR, możesz to zignorować.
              </div>
            )}
          </div>

          {/* Nick Analysis Panel */}
          {lastNickAnalysis && (
            <div className={styles.nickAnalysis}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                🔍 Rozpoznawanie graczy
              </h3>
              {[lastNickAnalysis.player1, lastNickAnalysis.player2].map((p, i) => (
                <div key={i} className={`${styles.nickRow} ${p.found ? styles.nickFound : styles.nickNotFound}`}>
                  <span className={styles.nickName}>{p.nick}</span>
                  {p.found ? (
                    <span className={styles.nickStatus}>
                      ✅ Rozpoznany jako <strong>{p.username}</strong>
                      {lastNickAnalysis.autoFriendCreated && i === 1 && " • Auto-friend! 🤝"}
                      {lastNickAnalysis.notificationSent && i === 1 && " • Powiadomienie wysłane 🔔"}
                    </span>
                  ) : (
                    <span className={styles.nickStatus}>
                      ❌ Nie znaleziony w systemie
                      <button
                        className={styles.inviteBtn}
                        onClick={() => {
                          setInviteOpponentNick(p.nick);
                          setShowInviteModal(true);
                        }}
                      >
                        📨 Zaproś {p.nick}
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.previewActions} style={{ justifyContent: "center", marginTop: "1.5rem" }}>
            <button className={styles.btnCancel} onClick={reset}>📸 Kolejny upload</button>
            <a href="/wall" className={styles.btnCancel} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              🏟️ Wall
            </a>
            <a href="/dashboard" className={styles.btnSave} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              📊 Dashboard
            </a>
          </div>
        </div>
      )}

      {/* ─── Invite Modal ─── */}
      {showInviteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              📨 Zaproś “{inviteOpponentNick}” do QCStats
            </h3>
            <p className={styles.modalDesc}>
              Podaj email przeciwnika. Zaproszenie zostanie wysłane na ten adres.
              Nie można udostępnić linku zaproszenia publicznie.
            </p>
            <div className={styles.modalInputGroup}>
              <label>Email przeciwnika:</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="gracz@gmail.com"
                className={styles.modalInput}
                autoFocus
              />
            </div>
            {inviteSent ? (
              <div className={styles.inviteSentMsg}>
                ✅ Zaproszenie wysłane! Klient pocztowy powinien się otworzyć.
              </div>
            ) : (
              <div className={styles.modalActions}>
                <button
                  className={styles.btnCancel}
                  onClick={() => setShowInviteModal(false)}
                >
                  Anuluj
                </button>
                <button
                  className={styles.btnSave}
                  onClick={handleSendInvite}
                  disabled={inviteSending || !inviteEmail.includes("@")}
                >
                  {inviteSending ? "Wysyłanie..." : "📨 Wyślij zaproszenie"}
                </button>
              </div>
            )}
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
  const weaponIcon = (name: string) => {
    const map: Record<string, string> = {
      "Gauntlet": "/img/gauntlet.png",
      "Machine Gun": "/img/machine_gun.png",
      "Super Machine Gun": "/img/super_machine_gun.png",
      "Shotgun": "/img/shotgun.png",
      "Super Shotgun": "/img/super_shotgun.png",
      "Nail Gun": "/img/nailgun.png",
      "Super Nailgun": "/img/super_nailgun.png",
      "Rocket Launcher": "/img/rocket_launcher.png",
      "Lightning Gun": "/img/lightinggun.png",
      "Railgun": "/img/railgun.png",
      "Tribolt": "/img/tribolt.png",
    };
    return map[name] || `/img/${name.toLowerCase().replace(/ /g, "_")}.png`;
  };

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
        <span className={styles.statLabel}>⚔️ Damage</span>
        <input
          className={styles.statValueEditable}
          defaultValue={player.totalDamage}
          type="number"
        />
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>🎯 Accuracy</span>
        <span className={styles.statValue}>{player.accuracyPct}%</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statLabel}>💥 Hits/Shots</span>
        <span className={styles.statValue}>{player.hitsShots || "—"}</span>
      </div>

      {/* Pickups with icons */}
      <div className={styles.pickupStats}>
        <span className={styles.statLabel}>🩺 Healing</span>
        <span className={styles.statValue}>{player.healing}</span>
      </div>
      <div className={styles.pickupStats}>
        <span className={styles.pickupStatLabel}>
          <img src="/img/mega_health.png" alt="MH" className={styles.pickupStatIcon} />
          Mega HP
        </span>
        <span className={styles.statValue}>{player.megaHealthPickups}</span>
      </div>
      <div className={styles.pickupStats}>
        <span className={styles.pickupStatLabel}>
          <img src="/img/heavy_armor.png" alt="HA" className={styles.pickupStatIcon} />
          Heavy Armor
        </span>
        <span className={styles.statValue}>{player.heavyArmorPickups}</span>
      </div>
      <div className={styles.pickupStats}>
        <span className={styles.pickupStatLabel}>
          <img src="/img/light_armor.png" alt="LA" className={styles.pickupStatIcon} />
          Light Armor
        </span>
        <span className={styles.statValue}>{player.lightArmorPickups}</span>
      </div>

      {/* Weapons with icons */}
      <div className={styles.weaponsSection}>
        <h4>Arsenal</h4>
        <div className={styles.weaponRow}>
          <span className={styles.weaponHeader} style={{ minWidth: "120px" }}>Weapon</span>
          <span className={styles.weaponHeader}>H/S</span>
          <span className={styles.weaponHeader}>Acc%</span>
          <span className={styles.weaponHeader}>Dmg</span>
          <span className={styles.weaponHeader}>K</span>
        </div>
        {player.weapons.map((w) => (
          <div key={w.weaponIndex} className={styles.weaponRow}>
            <span className={styles.weaponName} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img
                src={weaponIcon(w.weaponName)}
                alt={w.weaponName}
                style={{ width: "20px", height: "20px", objectFit: "contain", filter: "drop-shadow(0 0 2px rgba(255,107,0,0.3))" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {w.weaponName}
            </span>
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
