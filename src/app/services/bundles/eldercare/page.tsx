import { permanentRedirect } from "next/navigation";

// The standalone eldercare overview page was removed (Oscar's review, June 2026):
// the flow now goes straight from the bundle card to the configurator. This
// 308 redirect keeps any old or indexed /services/bundles/eldercare links alive.
export default function EldercareBundleRedirect() {
  permanentRedirect("/services/eldercare-security-bundle");
}
