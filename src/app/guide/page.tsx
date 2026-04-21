import type { Metadata } from "next";
import GuideContent from "./GuideContent";

export const metadata: Metadata = {
  title: "Guide | QCStats",
  description: "Learn how to use QCStats — step-by-step guide to tracking your Quake Champions stats.",
};

export default function GuidePage() {
  return <GuideContent />;
}
