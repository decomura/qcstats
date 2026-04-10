import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CalibrateContent from "./CalibrateContent";

export const metadata: Metadata = {
  title: "OCR Calibrator | Admin | QCStats",
  description: "Admin panel for calibrating OCR bounding boxes.",
};

// Admin email whitelist – only these users can access the calibration panel
const ADMIN_EMAILS = [
  "dziadekarmadek@gmail.com",
  // Add more admin emails here
];

export default async function CalibratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be logged in
  if (!user) redirect("/login");

  // Must be an admin
  const userEmail = user.email?.toLowerCase() || "";
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return (
      <div style={{ padding: "3rem", color: "#ff6b6b", fontFamily: "monospace", textAlign: "center" }}>
        <h1>🔒 Access Denied</h1>
        <p>This page is restricted to admins only.</p>
        <p style={{ color: "#888", marginTop: "1rem" }}>
          Your email: <strong style={{ color: "#ff9500" }}>{userEmail || "unknown"}</strong>
        </p>
        <p style={{ color: "#555", fontSize: "0.8rem" }}>
          Contact admin to get access.
        </p>
      </div>
    );
  }

  return <CalibrateContent />;
}
