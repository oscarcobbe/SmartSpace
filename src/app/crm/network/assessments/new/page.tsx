import { requireSession } from "@/lib/crm/session";
import { PageHeader, Note } from "../../../ui";
import { BackTo } from "../parts";
import BookForm from "./form";

export const dynamic = "force-dynamic";

export default function NewAssessment() {
  const session = requireSession();
  return (
    <>
      <BackTo href="/crm/network/assessments">All assessments</BackTo>
      <PageHeader title="Book an assessment" sub="The customer, the visit and the collection. Everything else is filled in on the day, in the order of the capture sheet." />
      {session.site !== "smart-space"
        ? <Note tone="warn">The network service is Smart Space&apos;s. Switch to Smart Space at the top of the menu.</Note>
        : <BookForm />}
    </>
  );
}
