import { LoadingPage } from "../ui";
import { sessionSite, slowNote } from "../loading-copy";

export default function Loading() {
  return <LoadingPage title="Customers" slow={slowNote(sessionSite(), "orders")} />;
}
