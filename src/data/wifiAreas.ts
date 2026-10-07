/**
 * Local SEO data for the home network diagnosis service, one entry per area
 * we build a dedicated /services/wifi/areas/[area] page for.
 *
 * Deliberately separate from counties.ts (which is the Ring install local
 * data): the local angle here is the network, not security mounting, so each
 * area needs its own differentiated copy rather than a shared paragraph.
 *
 * The briefing's wording rules apply to every line, same as the hub and the
 * package pages:
 *   - never call it Wi-Fi installation; it is a home network assessment / survey;
 *   - say powerline out loud;
 *   - "monitored", never "managed";
 *   - avoid "professional-grade" and any unsupported superlative;
 *   - no product or maker names.
 *
 * Prices are NOT written into this prose on purpose. The number lives once in
 * wifiPackages.ts (ASSESSMENT_EURO) and the page interpolates it, so a price
 * change never leaves a stale figure buried in a local page.
 */

export type WifiAreaFaq = { q: string; a: string };

export interface WifiArea {
  name: string;
  slug: string;
  /** Reused from the county data so the two local sets name the same towns. */
  towns: string;
  /** One-liner for the hub teaser + meta description. ~150 chars. */
  teaser: string;
  /** The local angle: what the network problem tends to be here, and why. */
  localContext: string;
  /** A concrete assessment scenario in this area, a credibility builder. */
  scenario: { title: string; body: string };
  /** Local long-tail FAQ. */
  faqs: WifiAreaFaq[];
}

export const WIFI_AREAS: WifiArea[] = [
  {
    name: "Dublin",
    slug: "dublin",
    towns:
      "Dublin city, Dún Laoghaire, Tallaght, Swords, Blanchardstown, Clontarf, Howth, Malahide, Dundrum, Rathmines",
    teaser:
      "In most Dublin homes the broadband is fine and the house is the problem. We measure both and prove which, before you spend on a fix.",
    localContext:
      "Dublin is the one place where the answer is usually not your broadband. Most homes here are on Virgin Media or eir fibre with strong speed at the router, so when the top-floor office drops a call or the back bedroom gets nothing, the house is the thing losing it, not the line. The usual culprits are solid: red-brick period walls in Rathmines, Drumcondra and Phibsborough that a single router simply cannot get through, pebbledash semi-Ds in Tallaght and Crumlin with the router stranded in the hall, and apartments around the Docklands and Smithfield where the box sits by the front door and the far room is a floor plan away. The assessment settles it either way: a wired test at the router shows exactly what your line delivers, then every floor is measured so the report can say plainly whether the problem is the broadband or the layout, and what to do about it.",
    scenario: {
      title: "A Rathmines red-brick that drops work calls",
      body:
        "A homeowner in a Rathmines red-brick works from the converted top floor and loses Teams calls every afternoon, while the broadband tests perfectly in the kitchen below. We test the line at the router by cable, confirm it is delivering full speed, then measure each floor: the signal falls off a cliff through two solid brick walls on the way up. A trial system goes in on the top floor and a monitoring unit runs for three days. The report shows the line was never the problem and the top floor held a steady connection on the trial. The fix quoted from it is powerline carrying the connection up through the house wiring to one access point on the top floor. The assessment fee comes off the work in full.",
    },
    faqs: [
      {
        q: "Is it my broadband or my house in a Dublin home?",
        a: "In most Dublin homes, the house. Fibre speeds at the router are usually strong here, so a room that struggles is losing the signal between the router and that room. The assessment tests the line at the router by cable and measures every floor, so the report says which it is rather than guessing.",
      },
      {
        q: "Will it work in a period red-brick with thick walls?",
        a: "Yes, and those houses are exactly why the service exists. Solid brick stops a single router reaching the far rooms. The fix is powerline, which carries the connection over the electrical wiring already in the walls to an access point where it is needed, so there are no cables run through the brick.",
      },
      {
        q: "My router is by the front door of my apartment and the bedroom gets nothing.",
        a: "A common Dublin layout. We measure what reaches the far room, and if powerline suits the apartment's wiring the fix is an access point nearer the bedroom on one network name. The three-day trial proves it works in your flat before you commit.",
      },
      {
        q: "Which Dublin areas do you cover?",
        a: "All of them, D1 through D24 plus Dún Laoghaire-Rathdown, Fingal and South Dublin, the same area as our smart security installs.",
      },
    ],
  },
  {
    name: "Wicklow",
    slug: "wicklow",
    towns:
      "Bray, Greystones, Wicklow town, Arklow, Rathdrum, Newtownmountkennedy, Enniskerry, Blessington",
    teaser:
      "In Wicklow it can genuinely be the line or the house. The wired test at the router settles which before anyone quotes a fix.",
    localContext:
      "Wicklow is where it is worth actually measuring, because here it can honestly be either. Fibre reaches patchily outside the north-Wicklow commuter towns, so a slow connection in Rathdrum, Roundwood or out past Blessington might be the broadband line itself rather than the house. At the same time the housing stock works against you: older homes with thick stone walls, and longer runs from the router to a far bedroom or a garden room, both of which lose signal even on a good line. The assessment is built for exactly this. A wired test at the router shows what the line delivers before any Wi-Fi is involved, every floor is measured, and the report tells you plainly whether to take the figures to your broadband provider or whether the fix is in the house. If it is the house, powerline carries the connection over the wiring to where it is needed.",
    scenario: {
      title: "A stone-walled house near Rathdrum",
      body:
        "A family near Rathdrum can stream fine in the sitting room but get nothing in the back bedroom or the converted garden room. We test the line at the router by cable first: it is slower than they expected but not the main issue. Measuring floor by floor shows two thick stone walls taking the signal down to nothing before it reaches the back of the house. A trial runs for three days. The report hands them two things: the broadband figures to raise with their provider, and the result of the trial, which held a steady connection to the back bedroom on powerline. The quoted fix is powerline to an access point at the back of the house, and the garden room if it shares the same wiring.",
    },
    faqs: [
      {
        q: "Is it the broadband line or my Wi-Fi?",
        a: "In Wicklow it is genuinely worth measuring, because it can be either. We test the line at the router by cable and measure the house, so the report tells you which, and if it is the line you keep the figures to take to your provider.",
      },
      {
        q: "Will it work in an old house with thick stone walls?",
        a: "Yes. Stone walls are one of the main reasons a single router does not reach the far rooms here. The fix is powerline, carrying the connection over the existing electrical wiring to an access point past the walls that are blocking it, measured first so the quote reflects your house.",
      },
      {
        q: "Can you get a connection to a garden room or an outbuilding?",
        a: "Often, if the building is on the same electrical wiring as the house, because that is what powerline runs over. The assessment measures it before anyone promises it, and the three-day trial shows what it actually holds.",
      },
      {
        q: "Do you charge extra to come to Wicklow?",
        a: "No. Wicklow is within our standard Leinster service area, the same assessment fee as Dublin.",
      },
    ],
  },
  {
    name: "Kildare",
    slug: "kildare",
    towns:
      "Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane, Kilcock",
    teaser:
      "Big commuter-belt homes and working from home: the line is usually strong, the house is too large for one router, and a dropped call costs you.",
    localContext:
      "Kildare's commuter belt is mostly newer, larger homes, Naas, Newbridge, Maynooth, Celbridge, Leixlip, Clane, and a lot of people in them working from home. The broadband is typically strong, so the problem is rarely the line. It is that a bigger footprint, a home office at the far end or over the garage, and solid modern insulation leave one router unable to cover the whole house. What makes it sting here is the work-from-home reliability: a Teams or Zoom call that freezes at 9am is not a minor annoyance. The assessment measures what each floor actually carries and runs a trial for three days so you can judge it against a real working week. Where a household wants warning before the next drop, the connection can be monitored: a small unit stays wired to the router and alerts us when the broadband, or a device that matters, goes offline.",
    scenario: {
      title: "A Maynooth home office over the garage",
      body:
        "A homeowner in a Maynooth new-build runs their work from a room over the garage, the far corner of the house, and loses calls through the morning while the broadband tests fine downstairs. The wired test at the router confirms the line is strong. Measuring the house shows the office is two rooms and a stairwell too far for the single router. A trial runs for three days across real working days, and the report shows the office held steady on it. The quoted fix is powerline to an access point on the office floor, and they add monitoring so they are warned if the line drops before a call rather than during one.",
    },
    faqs: [
      {
        q: "Why do my work calls drop when the broadband looks fine?",
        a: "Because the broadband can be fine at the router and still not reach the room you work in. In Kildare's larger homes the line is usually strong and the house is too big for one router. The assessment measures the room that struggles, not just the router, so the report shows where the connection is being lost.",
      },
      {
        q: "My home office is over the garage at the far end of the house.",
        a: "A classic Kildare case. The fix is powerline carrying the connection over the house wiring to an access point on that floor, quoted from what the assessment measures, and trialled for three days first so you see it hold across a working week.",
      },
      {
        q: "What does monitoring do for someone working from home?",
        a: "A small unit stays wired to your router and tests the broadband through the day. If the line, or a device you named, goes offline, we are alerted, so you get warning before a call rather than a surprise during one. It is monitored, not managed: we see that something dropped, we get no access to your devices or accounts.",
      },
      {
        q: "It is a new build, is it still worth measuring?",
        a: "Often yes. New builds have good broadband but a large, well-insulated footprint that one router cannot fully cover, which is why the far rooms still struggle. The assessment shows whether that is what is happening in your house.",
      },
    ],
  },
  {
    name: "Meath",
    slug: "meath",
    towns:
      "Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin, Duleek",
    teaser:
      "Larger detached sites, garden rooms and outbuildings: one router was never going to cover it. We measure the whole house before quoting.",
    localContext:
      "Meath homes tend to be bigger sites than Dublin or Kildare, Ashbourne, Ratoath and Dunshaughlin in particular have a lot of detached houses on a third of an acre or more, often with a garden room, a converted attic, or an outbuilding in the mix. One router by the front door was never going to cover a house that size plus a garden office down the lawn. The broadband is usually fine; the distances and the number of rooms are the problem. The assessment measures every floor and the far corners, runs a three-day trial on the part that struggles, and the written report shows exactly where the connection is lost. The fix is powerline carrying the connection over the house wiring to access points placed where the measurements say, including a garden room or outbuilding when it shares the same electrical supply, which the survey checks before anyone promises it.",
    scenario: {
      title: "An Ashbourne detached with a garden room",
      body:
        "A family in Ashbourne have a detached four-bed on a half-acre with a garden room used as an office, and neither the garden room nor two upstairs bedrooms hold a connection. The wired test at the router shows the broadband is healthy. Measuring the house and the garden room shows the signal gone well before either. A trial runs for three days. The report confirms the line is fine and the trial held upstairs, and notes that the garden room is on the same supply as the house, so powerline can reach it. The quoted fix is powerline to access points upstairs and in the garden room, on one network name throughout, with the assessment fee credited against it.",
    },
    faqs: [
      {
        q: "My house is too big for one router, what can be done?",
        a: "Measure it, then carry the connection to where it is needed. The assessment measures every floor and the far corners, and the fix is powerline over the house wiring to access points placed by those measurements, so the whole house runs on one network name.",
      },
      {
        q: "Can you get a connection to a garden room or outbuilding?",
        a: "Often, if it is on the same electrical supply as the house, since that is what powerline uses. The survey checks the supply and the three-day trial shows what it holds, so the garden room is only promised once it has been measured.",
      },
      {
        q: "Is it my broadband or the size of the house?",
        a: "In Meath it is usually the size. The broadband is typically fine at the router and the distances and number of rooms are what lose it. The assessment tests the line by cable so the report can say so plainly, and shows where the signal is actually dropping.",
      },
      {
        q: "Do you cover the Meath side of Drogheda?",
        a: "Yes, the Meath side (Donore, Slane) is within our standard area. Drogheda town itself sits in County Louth, same crew and same assessment.",
      },
    ],
  },
];

export const WIFI_AREA_SLUGS = WIFI_AREAS.map((a) => a.slug);

export function getWifiAreaBySlug(slug: string): WifiArea | undefined {
  return WIFI_AREAS.find((a) => a.slug === slug);
}
