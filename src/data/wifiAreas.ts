/**
 * The local SmartSpace Networks pages, /services/wifi/areas/[area].
 *
 * Every word on them is Nigel's, from his trial page (October 2026), with
 * only the area name and the towns changed. The first version (1 October)
 * described each county's housing and broadband in its own words, with a
 * customer story for each that never happened; Oscar asked on 13 October for
 * Nigel's language only, so that prose is gone and only the facts remain:
 * which towns are covered.
 */

export interface WifiArea {
  name: string;
  slug: string;
  /** Towns named on the page, so a search for one of them finds it. */
  towns: string;
}

export const WIFI_AREAS: WifiArea[] = [
  {
    name: "Dublin",
    slug: "dublin",
    towns: "Dublin city, Dún Laoghaire, Tallaght, Swords, Blanchardstown, Clontarf, Howth, Malahide, Dundrum, Rathmines",
  },
  {
    name: "Wicklow",
    slug: "wicklow",
    towns: "Bray, Greystones, Wicklow town, Arklow, Rathdrum, Newtownmountkennedy, Enniskerry, Blessington",
  },
  {
    name: "Kildare",
    slug: "kildare",
    towns: "Naas, Newbridge, Maynooth, Celbridge, Leixlip, Kildare town, Athy, Clane, Kilcock",
  },
  {
    name: "Meath",
    slug: "meath",
    towns: "Navan, Ashbourne, Ratoath, Trim, Dunboyne, Kells, Dunshaughlin, Duleek",
  },
];

export const WIFI_AREA_SLUGS = WIFI_AREAS.map((a) => a.slug);

export function getWifiAreaBySlug(slug: string): WifiArea | undefined {
  return WIFI_AREAS.find((a) => a.slug === slug);
}
