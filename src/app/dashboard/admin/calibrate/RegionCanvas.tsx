"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { BoundingBox } from "@/lib/ocr/regions";

export interface RegionDef {
  name: string;
  box: BoundingBox;
  color: string;
  group: string;
}

interface Props {
  imageUrl: string | null;
  regions: RegionDef[];
  selectedRegion: string | null;
  onSelectRegion: (name: string | null) => void;
  onUpdateRegion: (name: string, box: BoundingBox) => void;
  onImageLoad?: (width: number, height: number) => void;
}

type DragMode = "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se" | null;

const HANDLE_SIZE = 6;

export default function RegionCanvas({
  imageUrl,
  regions,
  selectedRegion,
  onSelectRegion,
  onUpdateRegion,
  onImageLoad,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1024, h: 576 });
  const [dragState, setDragState] = useState<{
    mode: DragMode;
    region: string;
    startX: number;
    startY: number;
    origBox: BoundingBox;
  } | null>(null);

  // Scale factor from reference (1024x576) to canvas display size
  const scaleRef = useRef({ x: 1, y: 1 });

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Canvas will be displayed at container width, maintain aspect ratio
      const aspect = img.naturalWidth / img.naturalHeight;
      const displayW = Math.min(1100, window.innerWidth - 380);
      const displayH = displayW / aspect;
      setCanvasSize({ w: displayW, h: displayH });
      scaleRef.current = {
        x: displayW / 1024,  // reference is 1024x576
        y: displayH / 576,
      };
      onImageLoad?.(img.naturalWidth, img.naturalHeight);
    };
    img.src = imageUrl;
  }, [imageUrl, onImageLoad]);

  // Draw everything
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d")!;
    const { x: sx, y: sy } = scaleRef.current;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw regions
    for (const region of regions) {
      const isSelected = region.name === selectedRegion;
      const box = region.box;

      // Scale to canvas pixels
      const rx = box.x * sx;
      const ry = box.y * sy;
      const rw = box.width * sx;
      const rh = box.height * sy;

      // Fill
      ctx.fillStyle = isSelected
        ? region.color.replace("0.3)", "0.45)")
        : region.color;
      ctx.fillRect(rx, ry, rw, rh);

      // Border
      ctx.strokeStyle = isSelected
        ? region.color.replace("0.3)", "1)")
        : region.color.replace("0.3)", "0.7)");
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(rx, ry, rw, rh);

      // Label (only for selected or non-weapon regions)
      if (isSelected || !region.name.includes("_w")) {
        ctx.fillStyle = "white";
        ctx.font = `${isSelected ? "bold " : ""}${Math.max(9, Math.round(10 * sx))}px monospace`;
        const label = region.name
          .replace("player", "P")
          .replace("_nick", "_N")
          .replace("_score", "_S")
          .replace("_hits_shots", "_H/S")
          .replace("_accuracy", "_A%")
          .replace("_damage", "_D")
          .replace("_kills", "_K");
        ctx.fillText(label, rx + 2, ry - 3);
      }

      // Resize handles for selected region
      if (isSelected) {
        const handles = [
          { x: rx, y: ry },                      // NW
          { x: rx + rw, y: ry },                  // NE
          { x: rx, y: ry + rh },                  // SW
          { x: rx + rw, y: ry + rh },              // SE
        ];
        ctx.fillStyle = "white";
        for (const h of handles) {
          ctx.fillRect(
            h.x - HANDLE_SIZE / 2,
            h.y - HANDLE_SIZE / 2,
            HANDLE_SIZE,
            HANDLE_SIZE
          );
          ctx.strokeStyle = region.color.replace("0.3)", "1)");
          ctx.lineWidth = 1;
          ctx.strokeRect(
            h.x - HANDLE_SIZE / 2,
            h.y - HANDLE_SIZE / 2,
            HANDLE_SIZE,
            HANDLE_SIZE
          );
        }
      }
    }
  }, [regions, selectedRegion]);

  useEffect(() => {
    draw();
  }, [draw, canvasSize]);

  // Hit test: which region/handle is at (px, py) in canvas coords
  const hitTest = useCallback(
    (px: number, py: number): { region: string; mode: DragMode } | null => {
      const { x: sx, y: sy } = scaleRef.current;

      // Check selected region handles first
      if (selectedRegion) {
        const r = regions.find((r) => r.name === selectedRegion);
        if (r) {
          const rx = r.box.x * sx, ry = r.box.y * sy;
          const rw = r.box.width * sx, rh = r.box.height * sy;
          const handles: { x: number; y: number; mode: DragMode }[] = [
            { x: rx, y: ry, mode: "resize-nw" },
            { x: rx + rw, y: ry, mode: "resize-ne" },
            { x: rx, y: ry + rh, mode: "resize-sw" },
            { x: rx + rw, y: ry + rh, mode: "resize-se" },
          ];
          for (const h of handles) {
            if (Math.abs(px - h.x) < HANDLE_SIZE * 2 && Math.abs(py - h.y) < HANDLE_SIZE * 2) {
              return { region: selectedRegion, mode: h.mode };
            }
          }
        }
      }

      // Check all regions for click (reverse order so top-drawn = first hit)
      for (let i = regions.length - 1; i >= 0; i--) {
        const r = regions[i];
        const rx = r.box.x * sx, ry = r.box.y * sy;
        const rw = r.box.width * sx, rh = r.box.height * sy;
        if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
          return { region: r.name, mode: "move" };
        }
      }
      return null;
    },
    [regions, selectedRegion]
  );

  const getCanvasPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const hit = hitTest(pos.x, pos.y);

      if (hit) {
        onSelectRegion(hit.region);
        const r = regions.find((r) => r.name === hit.region);
        if (r && hit.mode) {
          setDragState({
            mode: hit.mode,
            region: hit.region,
            startX: pos.x,
            startY: pos.y,
            origBox: { ...r.box },
          });
        }
      } else {
        onSelectRegion(null);
      }
    },
    [hitTest, getCanvasPos, onSelectRegion, regions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) {
        // Update cursor
        const pos = getCanvasPos(e);
        const hit = hitTest(pos.x, pos.y);
        const canvas = canvasRef.current;
        if (canvas) {
          if (hit?.mode?.startsWith("resize")) {
            canvas.style.cursor = hit.mode.includes("nw") || hit.mode.includes("se")
              ? "nwse-resize" : "nesw-resize";
          } else if (hit) {
            canvas.style.cursor = "move";
          } else {
            canvas.style.cursor = "crosshair";
          }
        }
        return;
      }

      const pos = getCanvasPos(e);
      const { x: sx, y: sy } = scaleRef.current;
      const dx = (pos.x - dragState.startX) / sx;
      const dy = (pos.y - dragState.startY) / sy;
      const orig = dragState.origBox;

      let newBox: BoundingBox;

      switch (dragState.mode) {
        case "move":
          newBox = {
            x: Math.round(orig.x + dx),
            y: Math.round(orig.y + dy),
            width: orig.width,
            height: orig.height,
          };
          break;
        case "resize-se":
          newBox = {
            x: orig.x,
            y: orig.y,
            width: Math.max(10, Math.round(orig.width + dx)),
            height: Math.max(8, Math.round(orig.height + dy)),
          };
          break;
        case "resize-nw":
          newBox = {
            x: Math.round(orig.x + dx),
            y: Math.round(orig.y + dy),
            width: Math.max(10, Math.round(orig.width - dx)),
            height: Math.max(8, Math.round(orig.height - dy)),
          };
          break;
        case "resize-ne":
          newBox = {
            x: orig.x,
            y: Math.round(orig.y + dy),
            width: Math.max(10, Math.round(orig.width + dx)),
            height: Math.max(8, Math.round(orig.height - dy)),
          };
          break;
        case "resize-sw":
          newBox = {
            x: Math.round(orig.x + dx),
            y: orig.y,
            width: Math.max(10, Math.round(orig.width - dx)),
            height: Math.max(8, Math.round(orig.height + dy)),
          };
          break;
        default:
          return;
      }

      // Clamp to canvas bounds
      newBox.x = Math.max(0, Math.min(1024 - newBox.width, newBox.x));
      newBox.y = Math.max(0, Math.min(576 - newBox.height, newBox.y));

      onUpdateRegion(dragState.region, newBox);
    },
    [dragState, getCanvasPos, hitTest, onUpdateRegion]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  );
}
