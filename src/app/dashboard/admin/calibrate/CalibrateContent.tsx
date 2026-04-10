"use client";

import { useState, useCallback, useRef } from "react";
import RegionCanvas, { type RegionDef } from "./RegionCanvas";
import RegionList from "./RegionList";
import { ALL_REGIONS, type BoundingBox } from "@/lib/ocr/regions";
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

// Convert ALL_REGIONS to editable RegionDef array
function buildRegionDefs(): RegionDef[] {
  return ALL_REGIONS.map((r) => ({
    name: r.name,
    box: { ...r.box },
    color: getRegionColor(r.name),
    group: getRegionGroup(r.name),
  }));
}

// Local storage key for saved calibrations
const STORAGE_KEY = "qcstats_ocr_calibration";

function loadSavedRegions(variant: string): RegionDef[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
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
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const boxes: Record<string, BoundingBox> = {};
    for (const r of regions) {
      boxes[r.name] = r.box;
    }
    existing[variant] = boxes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
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
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
  }, [imageUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

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

        <button className={styles.toolbarBtn} onClick={handleReset}>
          🔄 Reset
        </button>
        <button className={styles.toolbarBtn} onClick={handleExport}>
          📥 Export JSON
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
            </div>
          ) : (
            <div className={styles.canvasWrapper}>
              <RegionCanvas
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
                  ? `Selected: ${selectedRegion} (${regions.find((r) => r.name === selectedRegion)?.box.x}, ${regions.find((r) => r.name === selectedRegion)?.box.y})`
                  : "Kliknij region żeby go wybrać i przesuń"}
              </span>
              <span>Ref: 1024×576</span>
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
