"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { OAI_PIXEL_ID, oaiPageViewed, startChatGptPixel } from "@/lib/chatgpt-pixel";

/**
 * OpenAI's ChatGPT ads pixel, started once and told about every page.
 *
 * page_viewed on the first page and on every client-side route change, which
 * a <head> snippet would miss: Next.js changes page without loading a new
 * document. Everything else, the wait for Accept included, is in
 * src/lib/chatgpt-pixel.ts. Renders nothing, and does nothing at all while
 * NEXT_PUBLIC_OAI_PIXEL_ID is unset.
 */
export default function ChatGptPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!OAI_PIXEL_ID || !pathname) return;
    startChatGptPixel();
    oaiPageViewed(pathname);
  }, [pathname]);

  return null;
}
