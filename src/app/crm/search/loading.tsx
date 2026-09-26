import { LoadingPage } from "../ui";
import { sessionSite, slowNote } from "../loading-copy";

export default function Loading() {
  return <LoadingPage title="Search" rows={5} slow={slowNote(sessionSite(), "orders")} />;
}
