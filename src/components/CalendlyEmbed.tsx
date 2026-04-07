"use client";

import { InlineWidget, useCalendlyEventListener } from "react-calendly";

interface CalendlyEmbedProps {
  compact?: boolean;
  onEventScheduled?: (eventUri: string) => void;
}

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/your-username/installation";

export default function CalendlyEmbed({ compact, onEventScheduled }: CalendlyEmbedProps) {
  useCalendlyEventListener({
    onEventScheduled: (e) => {
      onEventScheduled?.(e.data.payload.event.uri);
    },
  });

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <InlineWidget
        url={CALENDLY_URL}
        styles={{ height: compact ? "580px" : "660px" }}
        pageSettings={{
          hideLandingPageDetails: compact,
          hideEventTypeDetails: compact,
          backgroundColor: "ffffff",
          primaryColor: "E85C2B",
          textColor: "1a1a1a",
        }}
      />
    </div>
  );
}
