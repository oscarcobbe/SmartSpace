import { LoadingPage } from "../ui";
import { sessionSite, slowNote } from "../loading-copy";

export default function Loading() {
  const site = sessionSite();
  return <LoadingPage title={site === "smartcareliving" ? "Enquiries" : "Orders"} slow={slowNote(site, "orders")} />;
}
