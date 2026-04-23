"use client";
import { useEffect, useState } from "react";
import { getStoredGclid } from "@/lib/attribution";

const TYPEFORM_BASE = "https://form.typeform.com/to/pQTqGNhh";

interface TypeformButtonProps {
  children: React.ReactNode;
  className?: string;
}

export default function TypeformButton({ children, className }: TypeformButtonProps) {
  const [href, setHref] = useState(TYPEFORM_BASE);

  useEffect(() => {
    const gclid = getStoredGclid();
    setHref(gclid ? `${TYPEFORM_BASE}#gclid=${gclid}` : TYPEFORM_BASE);
  }, []);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
