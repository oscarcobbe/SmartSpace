"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Site } from "@/lib/crm/db";

/**
 * Outreach appears for SmartCare Living only. It is the one section that sends
 * email to people who have not asked for it, and Smart Space does no outreach,
 * so putting the tab on both sites would invite it to be used where it should
 * not be.
 */
const SECTIONS: { href: string; label: string; sites?: Site[] }[] = [
  { href: "/crm/orders", label: "Orders" },
  { href: "/crm/contacts", label: "Contacts" },
  { href: "/crm/tasks", label: "Next steps" },
  { href: "/crm/finance", label: "Finance" },
  { href: "/crm/marketing", label: "Marketing" },
  { href: "/crm/outreach", label: "Outreach", sites: ["smartcareliving"] },
];

export default function CrmNav({ site, horizontal = false }: { site: Site; horizontal?: boolean }) {
  const path = usePathname();
  const items = SECTIONS.filter((s) => !s.sites || s.sites.includes(site));

  return (
    <nav
      aria-label="CRM sections"
      className={horizontal ? "flex gap-1 overflow-x-auto py-2" : "flex flex-col gap-0.5 px-3 py-4"}
    >
      {items.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
