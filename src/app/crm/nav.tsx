"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Activity, BarChart3, CalendarDays, CheckSquare, Euro, Home, Receipt, Send, Users } from "lucide-react";
import type { Site } from "@/lib/crm/db";

/**
 * Two groups, because the two halves of this job are different jobs. Today is
 * what Nigel does before nine; Performance is what he looks at on a Sunday.
 *
 * Outreach appears for SmartCare Living only. It is the one section that sends
 * email to people who have not asked for it, and Smart Space does no outreach,
 * so putting the tab on both sites would invite it to be used where it should
 * not be.
 */
/* SmartCare Living takes enquiries, not orders: nothing is paid for on the way
   in, so "Orders" was the wrong word for the section on that site. */
const LABEL_BY_SITE: Record<string, Partial<Record<Site, string>>> = {
  "/crm/orders": { smartcareliving: "Enquiries" },
};

const GROUPS: { heading: string; items: { href: string; label: string; icon: typeof Users; sites?: Site[] }[] }[] = [
  {
    heading: "Today",
    items: [
      { href: "/crm", label: "Overview", icon: Home },
      { href: "/crm/week", label: "This week", icon: CalendarDays },
      { href: "/crm/orders", label: "Orders", icon: Receipt },
      { href: "/crm/contacts", label: "Customers", icon: Users },
      { href: "/crm/tasks", label: "Next steps", icon: CheckSquare },
    ],
  },
  {
    heading: "Performance",
    items: [
      { href: "/crm/insights", label: "Visitors", icon: Activity },
      { href: "/crm/finance", label: "Finance", icon: Euro },
      { href: "/crm/marketing", label: "Marketing", icon: BarChart3 },
      { href: "/crm/outreach", label: "Outreach", icon: Send, sites: ["smartcareliving"] },
    ],
  },
];

const isActive = (path: string | null, href: string) =>
  /* "/crm" is a real page now, not a prefix, so the exact test has to come
     first or Overview would light up on every section beneath it. */
  href === "/crm" ? path === "/crm" : path === href || Boolean(path?.startsWith(`${href}/`));

export default function CrmNav({ site, horizontal = false }: { site: Site; horizontal?: boolean }) {
  const path = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  /* On a phone the sections scroll sideways, and Marketing sat off the right
     edge with nothing to say it was there. Bringing the current one into view
     on load makes the strip's scrollability visible the moment it matters. */
  useEffect(() => {
    if (horizontal) activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [horizontal, path]);

  const visible = GROUPS.map((g) => ({
    ...g,
    items: g.items
      .filter((i) => !i.sites || i.sites.includes(site))
      .map((i) => ({ ...i, label: LABEL_BY_SITE[i.href]?.[site] ?? i.label })),
  }));

  if (horizontal) {
    return (
      <nav aria-label="CRM sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 py-2">
        {visible.flatMap((g) => g.items).map((item) => {
          const active = isActive(path, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="CRM sections" className="flex flex-col gap-5 px-3 py-4">
      {visible.map((group) => (
        <div key={group.heading}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {group.heading}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(path, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-[38px] items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
