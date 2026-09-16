import { PageHeader } from "./ui";
import { PanelSkeleton } from "./overview-panels";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading the overview">
      <PageHeader title="Overview" />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton title="Needs you" rows={4} />
        <PanelSkeleton title="Latest in" rows={4} />
        <PanelSkeleton title="Money" rows={2} />
        <PanelSkeleton title="Advertising" rows={2} />
      </div>
    </div>
  );
}
