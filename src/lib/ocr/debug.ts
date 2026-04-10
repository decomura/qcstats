/**
 * OCR Debug Tool
 * 
 * Run this in browser console on the upload page to visualize 
 * where OCR bounding boxes land on the uploaded screenshot.
 * 
 * Usage: Add ?debug=true to the upload page URL
 */

import { ALL_REGIONS, scaleBox, REFERENCE_WIDTH, REFERENCE_HEIGHT } from "./regions";
import type { BoundingBox } from "./regions";

/**
 * Draw debug overlay showing all OCR regions on the image canvas
 */
export function drawDebugOverlay(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement
): void {
  const ctx = targetCanvas.getContext("2d")!;
  
  // Scale canvas to reference resolution for drawing
  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;
  
  // Draw original image
  ctx.drawImage(sourceCanvas, 0, 0);
  
  // Draw each region
  for (const region of ALL_REGIONS) {
    const box = scaleBox(region.box, sourceCanvas.width, sourceCanvas.height);
    
    // Color coding by type
    let color: string;
    if (region.name.includes("nick")) {
      color = "rgba(0, 255, 0, 0.5)";      // Green for nicks
    } else if (region.name.includes("score")) {
      color = "rgba(255, 255, 0, 0.5)";     // Yellow for scores
    } else if (region.name.includes("damage") || region.name.includes("accuracy") || region.name.includes("hits")) {
      color = "rgba(0, 150, 255, 0.5)";     // Blue for summary stats
    } else if (region.name.includes("_w")) {
      color = "rgba(255, 100, 0, 0.25)";    // Orange for weapons
    } else {
      color = "rgba(255, 0, 255, 0.4)";     // Purple for items
    }
    
    // Draw filled rectangle
    ctx.fillStyle = color;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    
    // Draw border
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, "0.9)");
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Label (only for non-weapon regions to avoid clutter)
    if (!region.name.includes("_w")) {
      ctx.fillStyle = "white";
      ctx.font = `${Math.max(10, Math.round(sourceCanvas.height / 60))}px monospace`;
      ctx.fillText(
        region.name.replace("player", "P").replace("_nick", "_N").replace("_score", "_S"),
        box.x + 2,
        box.y - 2
      );
    }
  }
  
  // Draw reference grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 0.5;
  const gridStep = 50;
  
  const scaleX = sourceCanvas.width / REFERENCE_WIDTH;
  const scaleY = sourceCanvas.height / REFERENCE_HEIGHT;
  
  for (let x = 0; x < REFERENCE_WIDTH; x += gridStep) {
    const sx = Math.round(x * scaleX);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, sourceCanvas.height);
    ctx.stroke();
    
    // Grid labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "9px monospace";
    ctx.fillText(String(x), sx + 2, 12);
  }
  
  for (let y = 0; y < REFERENCE_HEIGHT; y += gridStep) {
    const sy = Math.round(y * scaleY);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(sourceCanvas.width, sy);
    ctx.stroke();
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "9px monospace";
    ctx.fillText(String(y), 2, sy + 12);
  }
}

/**
 * Get a cropped region as a data URL for inspection
 */
export function getRegionPreview(
  canvas: HTMLCanvasElement,
  box: BoundingBox,
  imageWidth: number,
  imageHeight: number
): string {
  const scaled = scaleBox(box, imageWidth, imageHeight);
  const preview = document.createElement("canvas");
  preview.width = scaled.width * 3;
  preview.height = scaled.height * 3;
  const ctx = preview.getContext("2d")!;
  ctx.drawImage(
    canvas,
    scaled.x, scaled.y, scaled.width, scaled.height,
    0, 0, preview.width, preview.height
  );
  return preview.toDataURL();
}
