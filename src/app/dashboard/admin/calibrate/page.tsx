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
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  return <CalibrateContent />;
}
