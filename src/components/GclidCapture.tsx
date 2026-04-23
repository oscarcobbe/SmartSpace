"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/**
 * Fires on every page load and captures marketing attribution
 * (gclid, UTM params, landing page, referrer) into localStorage.
 * Named GclidCapture for historical reasons — it actually captures
 * the full attribution snapshot now.
 */
export default function GclidCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
