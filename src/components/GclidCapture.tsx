"use client";
import { useEffect } from "react";
import { captureGclid } from "@/lib/gclid";

export default function GclidCapture() {
  useEffect(() => {
    captureGclid();
  }, []);
  return null;
}
