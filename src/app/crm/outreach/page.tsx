import { requireSession } from "@/lib/crm/session";
import { PageHeader, Note } from "../ui";

export const dynamic = "force-dynamic";

/**
 * Deliberately empty until Oscar sits down with it.
 *
 * Outreach sends email to people who did not ask for it. The brief says it gets
 * built under supervision, so the section exists, says so plainly, and has no
 * button that sends anything.
 */
export default function OutreachPage() {
  const { site } = requireSession();
  if (site !== "smartcareliving") {
    return (
      <>
        <PageHeader title="Outreach" />
        <Note>Outreach is only set up for SmartCare Living.</Note>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Outreach" sub="Introducing SmartCare Living to people who work in home care." />
      <Note>
        This section is not switched on yet. It will hold the list of people to contact, the guides being sent and
        what came back, and it goes live only once the sending rules have been agreed. Nothing here sends email today.
      </Note>
    </>
  );
}
