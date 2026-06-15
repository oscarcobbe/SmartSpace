import { permanentRedirect } from "next/navigation";

// /installation is a legacy path kept only as a redirect to the real page.
// Use permanentRedirect (HTTP 308) rather than redirect (307): the move is
// permanent, so Google should consolidate signals onto the destination and
// drop /installation from the index. A 307 tells Google the original URL may
// return, keeping it lingering in Search Console.
export default function InstallationRedirect() {
  permanentRedirect("/services/installation-only");
}
