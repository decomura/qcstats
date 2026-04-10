"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import RegionCanvas, { type RegionDef, type RegionCanvasHandle } from "./RegionCanvas";
import RegionList from "./RegionList";
import { ALL_REGIONS, type BoundingBox } from "@/lib/ocr/regions";
import { testSingleRegion } from "@/lib/ocr/engine";
import styles from "./calibrate.module.css";

// Color mapping for region groups
function getRegionColor(name: string): string {
  if (name.includes("nick")) return "rgba(0, 255, 100, 0.3)";
  if (name.includes("score")) return "rgba(255, 255, 0, 0.3)";
  if (name.startsWith("p1_w")) return "rgba(255, 140, 0, 0.25)";
  if (name.startsWith("p2_w")) return "rgba(255, 80, 0, 0.25)";
  if (name.startsWith("p1_mega") || name.startsWith("p1_heavy") || name.startsWith("p1_light"))
    return "rgba(200, 0, 255, 0.35)";
  if (name.startsWith("p2_mega") || name.startsWith("p2_heavy") || name.startsWith("p2_light"))
    return "rgba(200, 0, 255, 0.35)";
  if (name.startsWith("p1_")) return "rgba(0, 150, 255, 0.3)";
  if (name.startsWith("p2_")) return "rgba(0, 200, 255, 0.3)";
  return "rgba(255, 255, 255, 0.2)";
}

function getRegionGroup(name: string): string {
  if (name.includes("nick") || name.includes("score")) return "nicks";
  if (name.startsWith("p1_w")) return "weapons_p1";
  if (name.startsWith("p2_w")) return "weapons_p2";
  if (
    name.startsWith("p1_mega") ||
    name.startsWith("p1_heavy") ||
    name.startsWith("p1_light") ||
    name.startsWith("p2_mega") ||
    name.startsWith("p2_heavy") ||
    name.startsWith("p2_light")
  )
    return "items";
  if (name.startsWith("p1_")) return "summary_p1";
  if (name.startsWith("p2_")) return "summary_p2";
  return "other";
}

// Get the region type from ALL_REGIONS
function getRegionType(name: string): "text" | "number" | "fraction" | "percentage" {
  const r = ALL_REGIONS.find((reg) => reg.name === name);
  return r?.type || "number";
}
function getRegionWhitelist(name: string): string | undefined {
  const r = ALL_REGIONS.find((reg) => reg.name === name);
  return r?.whitelist;
}

// Convert ALL_REGIONS to editable RegionDef array
function buildRegionDefs(): RegionDef[] {
  return ALL_REGIONS.map((r) => ({
    name: r.name,
    box: { ...r.box },
    color: getRegionColor(r.name),
    group: getRegionGroup(r.name),
  }));
}

// ─── Storage keys ───
const CALIBRATION_KEY = "qcstats_ocr_calibration";
const SCREENSHOTS_KEY = "qcstats_ocr_screenshots";

function loadSavedRegions(variant: string): RegionDef[] | null {
  try {
    const saved = localStorage.getItem(CALIBRATION_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (data[variant]) {
      const savedBoxes = data[variant] as Record<string, BoundingBox>;
      const defs = buildRegionDefs();
      for (const def of defs) {
        if (savedBoxes[def.name]) {
          def.box = savedBoxes[def.name];
        }
      }
      return defs;
    }
  } catch { /* ignore */ }
  return null;
}

function saveRegions(variant: string, regions: RegionDef[]) {
  try {
    const existing = JSON.parse(localStorage.getItem(CALIBRATION_KEY) || "{}");
    const boxes: Record<string, BoundingBox> = {};
    for (const r of regions) {
      boxes[r.name] = r.box;
    }
    existing[variant] = boxes;
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

// ─── Screenshot persistence ───
function saveScreenshot(variant: string, dataUrl: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(SCREENSHOTS_KEY) || "{}");
    existing[variant] = dataUrl;
    localStorage.setItem(SCREENSHOTS_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

function loadScreenshot(variant: string): string | null {
  try {
    const saved = localStorage.getItem(SCREENSHOTS_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    return data[variant] || null;
  } catch { return null; }
}

function removeScreenshot(variant: string) {
  try {
    const existing = JSON.parse(localStorage.getItem(SCREENSHOTS_KEY) || "{}");
    delete existing[variant];
    localStorage.setItem(SCREENSHOTS_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// OCR test result type
interface TestResult {
  name: string;
  text: string;
  previewUrl: string;
}

export default function CalibrateContent() {
  const [variant, setVariant] = useState("total_score");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [regions, setRegions] = useState<RegionDef[]>(() => {
    return loadSavedRegions("total_score") || buildRegionDefs();
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testAllResults, setTestAllResults] = useState<TestResult[] | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<RegionCanvasHandle>(null);

  // Load saved screenshot on mount and variant change
  useEffect(() => {
    const savedScreenshot = loadScreenshot(variant);
    if (savedScreenshot) {
      setImageUrl(savedScreenshot);
    } else {
      setImageUrl(null);
    }
  }, [variant]);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      saveScreenshot(variant, dataUrl);
      showToast("success", `📸 Screenshot zapisany dla "${variant}"`);
    } catch {
      showToast("error", "Nie udało się załadować obrazu");
    }
  }, [variant, showToast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveScreenshot = useCallback(() => {
    removeScreenshot(variant);
    setImageUrl(null);
    setImageSize(null);
    showToast("success", "🗑️ Screenshot usunięty");
  }, [variant, showToast]);

  const handleUpdateRegion = useCallback((name: string, box: BoundingBox) => {
    setRegions((prev) =>
      prev.map((r) => (r.name === name ? { ...r, box } : r))
    );
  }, []);

  const handleSave = useCallback(() => {
    saveRegions(variant, regions);
    showToast("success", `✅ Profil "${variant}" zapisany!`);
  }, [variant, regions, showToast]);

  const handleReset = useCallback(() => {
    const fresh = buildRegionDefs();
    setRegions(fresh);
    showToast("success", "🔄 Przywrócono domyślne pozycje");
  }, [showToast]);

  const handleExport = useCallback(() => {
    const boxes: Record<string, BoundingBox> = {};
    for (const r of regions) {
      boxes[r.name] = r.box;
    }
    const json = JSON.stringify(boxes, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast("success", "📋 JSON skopiowany do schowka!");
    });
  }, [regions, showToast]);

  const handleVariantChange = useCallback((newVariant: string) => {
    setVariant(newVariant);
    const saved = loadSavedRegions(newVariant);
    setRegions(saved || buildRegionDefs());
  }, []);

  const handleImageLoad = useCallback((w: number, h: number) => {
    setImageSize({ w, h });
  }, []);

  // ─── Test OCR for selected region ───
  const handleTestRegion = useCallback(async () => {
    if (!selectedRegion || !imageUrl) return;
    const imgEl = canvasRef.current?.getImageElement();
    if (!imgEl) {
      showToast("error", "Obraz nie załadowany");
      return;
    }
    const region = regions.find((r) => r.name === selectedRegion);
    if (!region) return;

    setIsTesting(true);
    try {
      const result = await testSingleRegion(
        imgEl,
        region.box,
        getRegionType(region.name),
        getRegionWhitelist(region.name)
      );
      setTestResult({
        name: region.name,
        text: result.text,
        previewUrl: result.previewUrl,
      });
    } catch (err) {
      showToast("error", `OCR error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIsTesting(false);
    }
  }, [selectedRegion, imageUrl, regions, showToast]);

  // ─── Test ALL regions ───
  const handleTestAll = useCallback(async () => {
    if (!imageUrl) return;
    const imgEl = canvasRef.current?.getImageElement();
    if (!imgEl) return;

    setIsTestingAll(true);
    setTestAllResults([]);
    const results: TestResult[] = [];

    // Only test summary + items + nicks (skip weapons for speed)
    const importantRegions = regions.filter(
      (r) => !r.name.includes("_w") || r.name.includes("_w0_") // only first weapon for reference
    );

    for (const region of importantRegions) {
      try {
        const result = await testSingleRegion(
          imgEl,
          region.box,
          getRegionType(region.name),
          getRegionWhitelist(region.name)
        );
        results.push({
          name: region.name,
          text: result.text,
          previewUrl: result.previewUrl,
        });
        setTestAllResults([...results]);
      } catch {
        results.push({ name: region.name, text: "ERROR", previewUrl: "" });
        setTestAllResults([...results]);
      }
    }

    setIsTestingAll(false);
    showToast("success", `🔬 Przetestowano ${results.length} regionów`);
  }, [imageUrl, regions, showToast]);

  return (
    <div className={styles.calibratePage}>
      <h1>
        🎯 <span>OCR</span> Region Calibrator
      </h1>
      <p className={styles.subtitle}>
        Wrzuć screenshot QC i przesuń kwadraciki na właściwe pozycje
      </p>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <span className={styles.toolbarLabel}>Wariant</span>
          <select
            className={styles.toolbarSelect}
            value={variant}
            onChange={(e) => handleVariantChange(e.target.value)}
          >
            <option value="total_score">ŁĄCZNY WYNIK</option>
            <option value="ranking">RANKING</option>
          </select>
        </div>

        {imageSize && (
          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarLabel}>Rozdzielczość</span>
            <span className={styles.toolbarSelect} style={{ cursor: "default" }}>
              {imageSize.w}×{imageSize.h}
            </span>
          </div>
        )}

        <div className={styles.spacer} />

        {imageUrl && (
          <>
            <button
              className={styles.toolbarBtnTest}
              onClick={handleTestRegion}
              disabled={!selectedRegion || isTesting}
            >
              {isTesting ? "⏳..." : "🔬 Test OCR"}
            </button>
            <button
              className={styles.toolbarBtnTest}
              onClick={handleTestAll}
              disabled={isTestingAll}
            >
              {isTestingAll ? "⏳ Testowanie..." : "🔬 Test ALL"}
            </button>
          </>
        )}

        {imageUrl && (
          <button className={styles.toolbarBtn} onClick={handleRemoveScreenshot}>
            🗑️ Usuń
          </button>
        )}
        <button className={styles.toolbarBtn} onClick={() => fileRef.current?.click()}>
          📸 {imageUrl ? "Zmień" : "Wrzuć"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <button className={styles.toolbarBtn} onClick={handleReset}>
          🔄 Reset
        </button>
        <button className={styles.toolbarBtn} onClick={handleExport}>
          📥 JSON
        </button>
        <button className={styles.toolbarBtnPrimary} onClick={handleSave}>
          💾 SAVE
        </button>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          {!imageUrl ? (
            <div
              className={styles.dropOverlay}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className={styles.dropIcon}>📸</span>
              <span className={styles.dropText}>Wrzuć Screenshot QC</span>
              <span className={styles.dropHint}>
                Drag & Drop lub kliknij • 16:9 format
              </span>
              <span className={styles.dropHint}>
                Screenshot będzie zapamiętany dla wariantu: <strong>{variant === "total_score" ? "ŁĄCZNY WYNIK" : "RANKING"}</strong>
              </span>
            </div>
          ) : (
            <div className={styles.canvasWrapper}>
              <RegionCanvas
                ref={canvasRef}
                imageUrl={imageUrl}
                regions={regions}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                onUpdateRegion={handleUpdateRegion}
                onImageLoad={handleImageLoad}
              />
            </div>
          )}
          {imageUrl && (
            <div className={styles.canvasInfo}>
              <span>
                {selectedRegion
                  ? `Selected: ${selectedRegion} (${regions.find((r) => r.name === selectedRegion)?.box.x}, ${regions.find((r) => r.name === selectedRegion)?.box.y} ${regions.find((r) => r.name === selectedRegion)?.box.width}×${regions.find((r) => r.name === selectedRegion)?.box.height})`
                  : "Kliknij region żeby go wybrać i przesuń"}
              </span>
              <span>Ref: 1024×576 | {variant === "total_score" ? "ŁĄCZNY WYNIK" : "RANKING"}</span>
            </div>
          )}

          {/* ─── Single Test Result ─── */}
          {testResult && (
            <div className={styles.testResultPanel}>
              <div className={styles.testResultHeader}>
                <strong>🔬 OCR Test: {testResult.name}</strong>
                <button onClick={() => setTestResult(null)}>✕</button>
              </div>
              <div className={styles.testResultBody}>
                <div className={styles.testResultPreview}>
                  <span className={styles.testLabel}>Obraz po preprocessingu:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={testResult.previewUrl} alt="preprocessed" />
                </div>
                <div className={styles.testResultText}>
                  <span className={styles.testLabel}>Odczytany tekst:</span>
                  <span className={styles.testValue}>{testResult.text || "(pusty)"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── Test All Results ─── */}
          {testAllResults && testAllResults.length > 0 && (
            <div className={styles.testAllPanel}>
              <div className={styles.testResultHeader}>
                <strong>🔬 Wyniki OCR ({testAllResults.length} regionów)</strong>
                <button onClick={() => setTestAllResults(null)}>✕</button>
              </div>
              <div className={styles.testAllGrid}>
                {testAllResults.map((r) => (
                  <div
                    key={r.name}
                    className={styles.testAllItem}
                    onClick={() => {
                      setSelectedRegion(r.name);
                      setTestResult(r);
                    }}
                  >
                    <span className={styles.testAllName}>{r.name}</span>
                    <span className={styles.testAllValue}>
                      {r.text || "–"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Region List */}
        <RegionList
          regions={regions}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={
            toast.type === "success" ? styles.toastSuccess : styles.toastError
          }
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
