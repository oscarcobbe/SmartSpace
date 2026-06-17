// Single source of truth for Leinster county data used by:
//   - /areas               (the hub, all 12 counties listed)
//   - /areas/[county]      (dedicated detail pages, DETAIL_COUNTIES below)
//
// Each county has the short paragraph that's been on /areas since launch.
// The four counties listed in DETAIL_COUNTIES additionally have an
// `extended` block, install scenario, FAQ, and the longer copy that
// runs on the dedicated detail page. The hub renders a teaser + link for
// those four (so the same paragraph doesn't appear on two URLs and
// trigger a duplicate-content signal).

export type CountyFaq = { q: string; a: string };

export type County = {
  name: string;
  slug: string;
  towns: string;
  copy: string;
  extended?: {
    /** One-liner used on the hub teaser card. ~140 chars max. */
    teaser: string;
    /** A 2-3 paragraph local-context block rendered on the detail page. */
    localContext: string;
    /** A specific install scenario, credibility builder. */
    scenario: { title: string; body: string };
    /** 3-5 local FAQ entries. Drive long-tail rankings. */
    faqs: CountyFaq[];
  };
};

export const COUNTIES: County[] = [
  {
    name: "Dublin",
    slug: "dublin",
    towns:
      "Dublin city, Dún Laoghaire, Tallaght, Swords, Blanchardstown, Clontarf, Howth, Malahide, Dundrum, Rathmines",
    copy:
      "Dublin is our home turf, it's where Smart Space was founded and where we've completed the vast majority of our 5,000+ installations. Whether you're in a Georgian terrace in Rathmines, a semi-D in Tallaght, or a new-build in Swords, we know Dublin properties inside and out. Our Ring installers work across every postcode from Dublin 1 to Dublin 24, plus Dún Laoghaire–Rathdown, Fingal and South Dublin. Most Dublin appointments are booked within the week. If you need a Ring Video Doorbell, Floodlight Cam, or a full whole-home bundle installed in Dublin, we offer free consultations, honest written quotes, and professional installation, usually in under three hours.",
    extended: {
      teaser:
        "Home turf, every Dublin postcode, every property type, most appointments inside the week.",
      localContext:
        "Dublin is unlike any other county we install in. The mix of period red-brick in Rathmines and Drumcondra, pebbledash semi-Ds across Tallaght and Crumlin, modern new-builds in Swords and Adamstown, and the apartments around Docklands and Smithfield means we see four or five distinct mounting jobs in a typical week. We carry masonry-rated bits for Georgian brick, no-torn-render technique for pebbledash, and a full suite of cable-management kit for apartment blocks where the developer disabled drilling on shared walls. The fact that Dublin Wi-Fi is rarely a problem (most homes are on Virgin Media or eir fibre with strong throughput) means we can usually skip the network-extender step and get the install done inside an hour. We work across every Dublin postcode, D1 through D24, plus the surrounding county boundaries: Dún Laoghaire–Rathdown, Fingal, and South Dublin.",
      scenario: {
        title: "A typical Dublin install",
        body:
          "A homeowner in Castleknock books a Plus Driveway Bundle (doorbell + floodlight cam). We arrive on a Tuesday morning, walk the property, identify the chime transformer in the hall press, and confirm Wi-Fi reaches the front porch and rear driveway. Doorbell goes up first, pre-existing wired chime so no transformer upgrade needed, then the floodlight cam mounts on the gable wall covering the driveway approach. Both come online inside ten minutes once the app is connected. We tune motion zones to ignore the road and the neighbour's bin collection, set up family-share so both spouses get alerts, and walk the homeowner through the app on their phone before we leave. Total time: 1 hour 50 minutes. €599 flat fee, paid on the day.",
      },
      faqs: [
        {
          q: "Do you cover every Dublin postcode?",
          a: "Yes, D1 through D24, plus all of Dún Laoghaire–Rathdown, Fingal, and South Dublin. We treat the M50 as our daily ring road; we'll happily cross it in either direction.",
        },
        {
          q: "Can you fit a Ring doorbell on a period Georgian or Victorian house?",
          a: "Yes. Most Dublin period properties have brick or render façades that take a Ring mount cleanly with the right masonry bit. We don't drill into stone window-jambs or decorative reveals, we'll always find a discreet mount point first.",
        },
        {
          q: "How quickly can you book a Dublin install?",
          a: "Most Dublin appointments are booked inside the week, usually within 3-5 working days of your free consultation. We hold weekend slots for customers who can't take time off work.",
        },
        {
          q: "Do you do apartment installs in the city centre?",
          a: "Yes, but we'll need to check what the management company permits. Many apartment doorbells can be installed inside the apartment door (looking through the spyhole) or on the front-door frame without drilling shared walls.",
        },
      ],
    },
  },
  {
    name: "Wicklow",
    slug: "wicklow",
    towns:
      "Bray, Greystones, Wicklow town, Arklow, Rathdrum, Newtownmountkennedy, Enniskerry, Blessington",
    copy:
      "We cover all of County Wicklow from Bray and Greystones in the north down to Arklow in the south, with regular appointments in Rathdrum, Newtownmountkennedy, Enniskerry and Blessington. Wicklow homes often have longer driveways and more rural Wi-Fi coverage challenges, which is exactly the sort of install we specialise in. Our Ring installers carry network extenders and long-run power cabling as standard, so we can get cameras and doorbells online even when your existing Wi-Fi doesn't reach. Free consultations available throughout the county, we'll survey the property, identify blind spots, and send a written quote the same day.",
    extended: {
      teaser:
        "Long driveways, rural Wi-Fi, the whole Garden of Ireland, we carry extenders and long-run cabling as standard.",
      localContext:
        "Wicklow installs are different from Dublin in three concrete ways. First, the driveways are longer, properties in Rathdrum, Roundwood, or out past Blessington often have a 40-100 metre approach from gate to door, which means a doorbell alone won't catch you. Second, Wi-Fi coverage is patchier, older homes with thick stone walls and lower fibre penetration leave you with weak signal at the front door. Third, mobile coverage in pockets of south Wicklow (Aughrim, Tinahely) can drop to one bar, which matters if your Ring is set to fall back to LTE. We bring Chime Pro range extenders, weather-rated outdoor Cat6 cabling, and a couple of mid-range Wi-Fi mesh nodes on every Wicklow van trip so we can solve all three on the day.",
      scenario: {
        title: "A typical Wicklow install",
        body:
          "A family near Newtownmountkennedy books a Whole Home Bundle for a detached property with a 60-metre gravel driveway and a separate barn. The free consultation confirmed Wi-Fi reached the front door but not the driveway gate. We arrive with a Wi-Fi mesh node, weather-rated Cat6, and a Floodlight Cam Pro. The mesh node goes on a south-facing first-floor windowsill where it can transmit cleanly to a Floodlight at the gate; doorbell at the front door wires through the existing chime; second Floodlight on the gable covers the rear garden and barn. Three hours, full coverage, no roadside Wi-Fi dead zone. €999 bundle plus a small mesh-node materials cost agreed upfront.",
      },
      faqs: [
        {
          q: "Will Ring work on a remote Wicklow property with weak Wi-Fi?",
          a: "Yes. We carry Chime Pro extenders and mesh nodes on every Wicklow visit. If your existing Wi-Fi doesn't reach the camera, we'll either extend it on the day or quote you for a small upgrade.",
        },
        {
          q: "Can you cover a long driveway?",
          a: "Yes, the standard fix is a Floodlight Cam at the gate paired with a Video Doorbell at the main door. You get a motion alert the moment a car pulls in, plus a face-to-face record at the door.",
        },
        {
          q: "Do you charge extra for Wicklow callouts?",
          a: "No. Wicklow is within our standard Leinster service area, same flat install fee as Dublin. The only thing that can change the quote is materials like mesh nodes or outdoor cabling, and we'll always agree those upfront.",
        },
        {
          q: "Do you cover Greystones, Bray and the commuter belt the same week?",
          a: "Usually yes. The north-Wicklow commuter towns (Greystones, Bray, Kilmacanogue) are inside our daily Dublin radius. South Wicklow (Arklow, Aughrim) we tend to batch, typically a 7-10 day wait.",
        },
      ],
    },
  },
  {
    name: "Kildare",
    slug: "kildare",
    towns:
      "Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane, Kilcock",
    copy:
      "Smart Space covers all of County Kildare, Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane and Kilcock. Kildare is one of our most active counties outside Dublin, particularly around the M4 and M7 commuter belt. We install the full Ring range on Kildare homes: Video Doorbells (including the Pro models with pre-buffering), Floodlight Cams for driveways and rear gardens, and smart lock keyboxes for Airbnb hosts and eldercare setups. If you're building or renovating in Kildare, book a pre-install consultation so we can run cables before the walls close up.",
    extended: {
      teaser:
        "The M4/M7 commuter belt, we're in Naas, Maynooth and Celbridge every week, full Ring range fitted.",
      localContext:
        "Kildare is our second-busiest county after Dublin, and almost all of that activity is on the M4/M7 commuter belt, Naas, Newbridge, Maynooth, Celbridge, Leixlip, Clane. These are growth-phase commuter towns with a lot of new and recent builds, which means three things: structural walls are well-insulated (good for Wi-Fi), homeowners are often working from home (which makes them more security-conscious about midday deliveries), and there's a meaningful Airbnb / short-let market around Naas and Newbridge. We install more smart lock keyboxes per capita in Kildare than any other county. If you're renovating or building in Kildare, the highest-leverage thing you can do is book a pre-install consultation before the walls close up, running Cat6 to the front porch costs you nothing during construction and saves a future surface-mount or extender.",
      scenario: {
        title: "A typical Kildare install",
        body:
          "A homeowner in Maynooth is renovating a 1990s semi-D and books a pre-install consultation while the walls are open. We map out where she wants doorbell, driveway floodlight, and a rear-garden cam, then drop Cat6 to each spot during her electrician's first fix. Two weeks later, plastered and decorated, we come back to install the Plus Whole Home Bundle. Doorbell wires into the new Cat6 (no chime transformer issues), driveway floodlight pulls power off the new garage circuit, rear cam runs off the patio outlet. All three online inside 90 minutes. No surface trunking visible anywhere. €999 install plus the original Cat6 cost.",
      },
      faqs: [
        {
          q: "What's the best Ring setup for a Naas or Newbridge semi-D?",
          a: "The Plus Driveway Bundle (doorbell + floodlight cam) is the most common Kildare setup. Doorbell at the front door, floodlight covering the driveway approach, catches every visitor and every car pulling in.",
        },
        {
          q: "Can you install before walls close up on a new build?",
          a: "Yes, book a pre-install consultation while the electrician is still on first fix. We'll drop Cat6 to your doorbell and camera locations for nothing additional during that visit, then come back to mount and configure once you've moved in.",
        },
        {
          q: "Do you fit smart lock keyboxes for Airbnb hosts in Kildare?",
          a: "Yes, this is one of our most-requested Kildare installs. The standard short-let setup is a Ring doorbell at the front door plus a digital lockbox with rotating codes, you can issue a guest a 24-hour code from your phone without ever meeting them.",
        },
        {
          q: "Can you reach Athy, Castledermot, and south Kildare the same day?",
          a: "South Kildare we typically batch, Athy, Castledermot, Monasterevin tend to be a 5-7 day wait depending on what's already scheduled. North Kildare (Maynooth, Celbridge, Leixlip) is usually inside the week.",
        },
      ],
    },
  },
  {
    name: "Meath",
    slug: "meath",
    towns:
      "Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin, Duleek",
    copy:
      "County Meath is within our standard service area, we install Ring doorbells and cameras in Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin and Duleek. Many Meath homes are on larger sites with multiple entry points, so we typically recommend a Driveway or Whole Home bundle covering both front and rear. Our installers will survey the property, flag Wi-Fi dead zones, and set up motion zones that ignore roadside cars and tree branches. Meath installations are typically booked within the week, and we offer complimentary consultations with written quotes.",
    extended: {
      teaser:
        "Larger sites, more entry points, Meath homes almost always go for a bundle, not a single device.",
      localContext:
        "Meath homes tend to be bigger sites than Dublin or Kildare, Ashbourne, Ratoath, and Dunshaughlin in particular have a high concentration of detached properties on a third of an acre or more, with side gates, rear gardens, and often an outhouse or garage on a separate circuit. A single doorbell at the front door simply doesn't cover what these homeowners want to see. We almost always recommend a Driveway Bundle or Whole Home Bundle in Meath, and the M3-corridor proximity (lots of homes back onto fields or country lanes) means motion-zone tuning is more involved than in a tightly-built Dublin estate. Without zone tuning, every passing tractor and gust of wind triggers an alert. We dial in zone shapes and sensitivity manually before we leave so you only get alerts that matter.",
      scenario: {
        title: "A typical Meath install",
        body:
          "A family in Ashbourne books a Pro Whole Home Bundle for a detached 4-bed on a half-acre site. The consultation flagged three motion-hostile environments: a busy local road on the south side, mature trees casting shadow patterns at dawn, and a fox path across the rear lawn. Install day: doorbell at the front, floodlight on the gable covering the south-side driveway, second floodlight on the rear wall covering the patio and lawn. After mounting, we spend forty minutes purely on zone shaping, masking the road from the driveway cam, narrowing the rear cam to exclude the tree line, and setting an overnight low-light sensitivity that ignores the fox but catches a person. The homeowner gets two alerts that night, both legitimate.",
      },
      faqs: [
        {
          q: "Are bundles worth it in Meath?",
          a: "Almost always yes. Meath properties tend to be larger detached or semi-detached homes with multiple entry points (front, side gate, rear garden), and a single doorbell can't cover all of them. The Driveway and Whole Home bundles are priced to make the second and third camera much cheaper than buying them separately.",
        },
        {
          q: "Can you tune motion zones to ignore the M3 or N2 roadside?",
          a: "Yes, this is standard. We mask the road portion of the camera view and adjust sensitivity so passing cars don't trigger alerts. The neighbour walking past your gate will still alert; the lorry on the dual carriageway won't.",
        },
        {
          q: "How long is a typical Meath install?",
          a: "Single doorbell: about an hour. Driveway Bundle: 2 hours. Whole Home Bundle on a larger property: 2.5-3 hours including zone tuning and a full family walk-through.",
        },
        {
          q: "Do you cover the Drogheda / Meath border area?",
          a: "The Meath side of Drogheda (Donore, Slane) yes. The Louth side (Drogheda town itself) is in our /areas/louth coverage, same crew, same flat fees, just listed separately.",
        },
      ],
    },
  },
  {
    name: "Louth",
    slug: "louth",
    towns: "Drogheda, Dundalk, Ardee, Dunleer, Carlingford, Omeath",
    copy:
      "We cover County Louth, Drogheda, Dundalk, Ardee, Dunleer, Carlingford and Omeath, with the same 5-star Ring installation service we're known for in Dublin. Louth sits at the northern edge of Leinster, and we regularly install Ring systems in border-area homes where mobile signal is patchy and Wi-Fi reliability matters even more. We bring Ring Chime Pro signal extenders as standard, so every camera and doorbell stays online. Louth customers get the full Smart Space service: on-site consultation, professional mounting and wiring, app setup, and a 30-day follow-up call.",
  },
  {
    name: "Wexford",
    slug: "wexford",
    towns: "Wexford town, Enniscorthy, Gorey, New Ross, Rosslare",
    copy:
      "Smart Space covers County Wexford for Ring doorbell and camera installations, Wexford town, Enniscorthy, Gorey, New Ross and Rosslare. Wexford tends to be a slightly longer drive from our Dublin base, so we often batch appointments in the county and offer a small scheduling window. That means if you're ready to book a Ring install in Wexford, drop us a line and we'll let you know the next available date. All our standard services apply: Video Doorbells, Floodlight Cams, Driveway and Whole Home bundles, and installation-only for Ring devices you've already bought.",
  },
  {
    name: "Carlow",
    slug: "carlow",
    towns: "Carlow town, Tullow, Bagenalstown, Borris",
    copy:
      "Carlow is part of our Leinster service area. We install Ring doorbells and cameras in Carlow town, Tullow, Bagenalstown and Borris. Our installers will drive to Carlow for both residential and small-business jobs, if you run a shop, B&B or small office and want Ring cameras installed, we can do that too. Free in-home consultation, honest written quote, and a clean, professional install typically completed in under three hours for a standard doorbell-and-camera setup.",
  },
  {
    name: "Kilkenny",
    slug: "kilkenny",
    towns: "Kilkenny city, Thomastown, Callan, Castlecomer, Graiguenamanagh",
    copy:
      "We install Ring doorbells and security cameras across County Kilkenny, Kilkenny city, Thomastown, Callan, Castlecomer and Graiguenamanagh. Kilkenny has a mix of older period properties and newer developments, and we're comfortable working with both. Older homes often have existing wired doorbell systems that we can retrofit with a Ring Video Doorbell Pro (mains-powered, pre-buffered recording). Newer builds usually just need clean mounting and a Wi-Fi coverage check. Either way, we'll walk your property, identify the best camera positions, and deliver a professional install.",
  },
  {
    name: "Laois",
    slug: "laois",
    towns: "Portlaoise, Portarlington, Mountmellick, Mountrath, Abbeyleix",
    copy:
      "County Laois is within our Leinster service area. We cover Portlaoise, Portarlington, Mountmellick, Mountrath and Abbeyleix for Ring doorbell and camera installations. Many Laois homes are on larger plots with longer driveways, so we often recommend a Floodlight Cam at the entrance paired with a Video Doorbell at the main door. This gives you a full view of anyone arriving, plus motion alerts the moment a car pulls in. Free consultation available, we'll survey the property and send a written quote the same day.",
  },
  {
    name: "Offaly",
    slug: "offaly",
    towns: "Tullamore, Birr, Edenderry, Clara, Banagher",
    copy:
      "Smart Space installs Ring doorbells and cameras across County Offaly, Tullamore, Birr, Edenderry, Clara and Banagher. Offaly is one of the counties where we batch appointments, so get in touch and we'll let you know the next available date we're in the area. Installation includes everything you'd expect: professional mounting, weatherproofing, wiring, Wi-Fi coverage check, Ring app setup, and a full walkthrough before we leave. We also offer installation-only service for customers who've already bought a Ring, Eufy, Nest, Tapo or Aosu device.",
  },
  {
    name: "Westmeath",
    slug: "westmeath",
    towns: "Athlone, Mullingar, Moate, Kinnegad, Castlepollard",
    copy:
      "We cover County Westmeath for Ring installations, Athlone, Mullingar, Moate, Kinnegad and Castlepollard. Westmeath's commuter towns (particularly Mullingar and Kinnegad) are within easy reach, and Athlone we treat as a regular scheduled visit. Whether you want a single Ring Video Doorbell installed on a semi-D in Mullingar, or a Whole Home Bundle with doorbell plus two Floodlight Cams on a detached property outside Athlone, we'll scope it on a complimentary consultation and deliver a written quote the same day.",
  },
  {
    name: "Longford",
    slug: "longford",
    towns: "Longford town, Granard, Edgeworthstown, Ballymahon",
    copy:
      "County Longford is the furthest corner of our Leinster service area, we install Ring doorbells and cameras in Longford town, Granard, Edgeworthstown and Ballymahon. Like Offaly and Wexford, we batch Longford appointments, so please get in touch and we'll schedule your install on our next trip to the area. The full Smart Space service applies: on-site consultation, professional installation, network setup, app configuration, and a 30-day follow-up call. Longford customers receive the same 5-star service our Dublin customers do.",
  },
];

/** Slugs of counties that have a dedicated /areas/[county] detail page. */
export const DETAIL_COUNTY_SLUGS = ["dublin", "wicklow", "kildare", "meath"] as const;
export type DetailCountySlug = (typeof DETAIL_COUNTY_SLUGS)[number];

export function getCountyBySlug(slug: string): County | undefined {
  return COUNTIES.find((c) => c.slug === slug);
}
