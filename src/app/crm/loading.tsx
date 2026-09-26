import { PageHeader } from "./ui";
import { PanelSkeleton } from "./overview-panels";
import { SITE_LABEL } from "@/lib/crm/session";
import { greeting, sessionSite, slowNote, todayLine } from "./loading-copy";

/* The same header the page will render, so nothing moves when it arrives. */
export default function Loading() {
  const site = sessionSite();
  const slow = slowNote(site, "orders");
  return (
    <div role="status" aria-busy="true" aria-label="Loading the overview">
      <PageHeader title={greeting()} sub={todayLine(SITE_LABEL[site])} />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <PanelSkeleton title="Diary" rows={4} slow={slow} />
        <PanelSkeleton title="Latest in" rows={4} slow={slow} />
        <PanelSkeleton title="Money" rows={2} />
        <PanelSkeleton title="Advertising" rows={2} />
      </div>
    </div>
  );
}
