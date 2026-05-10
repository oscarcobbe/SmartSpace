import { redirect } from "next/navigation";

/**
 * /admin redirects to /admin/leads — the dashboard is the default
 * landing page. The persistent sidebar in src/app/admin/layout.tsx
 * makes every other tool one click away from there.
 *
 * If we ever want a true "admin home" overview page, replace this
 * redirect with a real component. For now the leads dashboard IS the
 * overview Nigel wants to see first every time.
 */
export default function AdminIndex() {
  redirect("/admin/leads");
}
