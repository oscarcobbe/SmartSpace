import {
  Video, Mic, Moon, Radar, CloudRain, Wifi, Battery, Home, Bell, Sun, Eye,
  ShieldCheck, Camera, Zap, Volume2, Smartphone, Lock, type LucideIcon,
} from "lucide-react";

export interface ProductFeatureSet {
  shortDescription: string;
  highlights: string[];
  specs: Record<string, string>;
}

// Per-handle curated data — matches Shopify product handles
const featuresByHandle: Record<string, ProductFeatureSet> = {
  // ── New lineup: Video Doorbells ──
  "plus-video-doorbell": {
    // All specs below match Ring's official product page (Wired Video
    // Doorbell Plus, 2nd Gen) — verified against ring.com/eu/en, not
    // inferred from product name.
    shortDescription:
      "Get 2K (1920×1920) image clarity with our reimagined wired doorbell. Features include 3D Motion Detection, real-time Live View, Two-Way Talk, and Low-Light Sight with Adaptive Night Vision. Hardwired into your home's power for constant, reliable security.",
    highlights: [
      "2K HD video (1920×1920)",
      "Head-to-Toe Video (140°×140°, 1:1)",
      "3D Motion Detection with custom zones",
      "Low-Light Sight with Adaptive Night Vision",
      "Live View & Two-Way Talk",
    ],
    specs: {
      "Video Resolution": "2K (1920×1920)",
      "Field of View": "140° Horizontal × 140° Vertical (1:1)",
      "Night Vision": "Low-Light Sight with Adaptive Night Vision",
      "Audio": "Two-Way Talk",
      "Motion Detection": "3D Motion Detection with customisable zones",
      "Power": "Hardwired (16–24 VAC, included transformer 24VDC 12W)",
      "Connectivity": "Wi-Fi 6 (802.11ax), dual-band 2.4 / 5 GHz",
      "Weather Rating": "Weather Resistant",
    },
  },
  "pro-video-doorbell": {
    // Specs match Ring's Wired Video Doorbell Pro (3rd Gen) on
    // ring.com/eu/en. The 4K claim is verified — Ring lists this model
    // as 4K (2880×2880).
    shortDescription:
      "Our most advanced wired doorbell features 4K (2880×2880) video, 3D Motion Detection (radar-powered), and Audio+ two-way talk. Low-Light Sight with Adaptive Night Vision keeps every visitor visible day or night.",
    highlights: [
      "4K HD video (2880×2880)",
      "Head-to-Toe Video (140°×140°, 1:1)",
      "3D Motion Detection (radar-powered)",
      "Low-Light Sight with Adaptive Night Vision",
      "Two-Way Talk with Audio+",
    ],
    specs: {
      "Video Resolution": "4K (2880×2880)",
      "Field of View": "140° Horizontal × 140° Vertical (1:1)",
      "Night Vision": "Low-Light Sight with Adaptive Night Vision",
      "Audio": "Two-Way Talk with Audio+",
      "Motion Detection": "3D Motion Detection with customisable zones",
      "Power": "Hardwired (16–24 VAC, included transformer 24VDC 12W)",
      "Connectivity": "Wi-Fi 6 (802.11ax), dual-band 2.4 / 5 GHz",
      "Weather Rating": "−20°C to 48.5°C, Weather Resistant",
    },
  },

  // ── New lineup: Floodlight Cams ──
  "plus-floodlight-cam": {
    shortDescription:
      "Hardwired for non-stop protection, this camera features powerful LED floodlights and a remote-activated siren for driveways or gardens. Use customizable motion zones to focus on what matters most, ensuring reliable, day-and-night visibility and security. It offers total peace of mind for larger outdoor areas with advanced, real-time detection.",
    highlights: [
      "1080p Video with HDR & Colour Night Vision",
      "Two-Way Talk",
      "2000 lumen floodlights with brightness control",
      "Built-in Security Siren",
      "Motion-Activated Notifications",
      "2.4GHz Connectivity",
    ],
    specs: {
      "Video Resolution": "1080p HDR",
      "Field of View": "140° horizontal",
      "Floodlights": "2,000 lumens (dual LED, brightness control)",
      "Night Vision": "Colour Night Vision",
      "Audio": "Two-way talk + built-in siren",
      "Motion Detection": "Advanced motion zones with notifications",
      "Power": "Hardwired (110-240V AC)",
      "Connectivity": "Wi-Fi 802.11 b/g/n (2.4 GHz)",
      "Weather Rating": "IP55",
    },
  },
  "pro-floodlight-cam": {
    // Specs match Ring's Floodlight Cam Pro (2nd Gen) on ring.com/eu/en.
    // 4K claim is verified — Ring lists this model as 4K (3840×2160).
    shortDescription:
      "Our most advanced floodlight camera with 4K (3840×2160) video, radar-powered 3D Motion Detection on an aerial map, and Audio+ two-way talk. 2000-lumen floodlights plus an 85dB siren light up and deter intruders — day or night, driveway or back garden.",
    highlights: [
      "4K HD video (3840×2160)",
      "Wide Field of View (140°×85°)",
      "3D Motion Detection (radar-powered)",
      "Low-Light Sight",
      "85dB Siren & 2,000-lumen Floodlights",
      "Two-Way Talk with Audio+",
    ],
    specs: {
      "Video Resolution": "4K (3840×2160)",
      "Field of View": "140° Horizontal × 85° Vertical",
      "Floodlights": "2,000 lumens (3000K warm white, adjustable)",
      "Siren": "85dB built-in",
      "Night Vision": "Low-Light Sight",
      "Audio": "Two-Way Talk with Audio+ and noise cancellation",
      "Motion Detection": "3D Motion Detection with customisable zones",
      "Power": "Hardwired (100–240V AC)",
      "Connectivity": "Wi-Fi 6 (802.11ax), dual-band 2.4 / 5 GHz",
      "Weather Rating": "IP65",
    },
  },

  // ── New lineup: Bundles ──
  "plus-driveway-bundle": {
    // Bundles a Wired Video Doorbell Plus (2K, 1920×1920) with a
    // Floodlight Cam Wired Plus (1080p). Resolutions verified against
    // ring.com/eu/en product pages.
    shortDescription:
      "Secure your home with our driveway bundle, pairing the 2K Wired Video Doorbell Plus with the Floodlight Cam Wired Plus. Two-Way Talk on both devices, 2,000 lumens of motion-activated floodlighting, and a 105dB siren protect your front door and driveway day or night. Hardwired, professionally installed. Bundle saves €50.",
    highlights: [
      "2K Doorbell + 1080p Floodlight Cam",
      "Ring Video Doorbell Plus + Floodlight Cam Plus",
      "Two-Way Talk on both devices",
      "2,000-lumen motion-activated floodlights",
      "3D Motion Detection on the doorbell",
      "Ring Chime included",
    ],
    specs: {},
  },
  "pro-driveway-bundle": {
    // Bundles a Wired Video Doorbell Pro (4K, 2880×2880) with a
    // Floodlight Cam Pro (4K, 3840×2160). Both 4K claims verified
    // against Ring's official product pages.
    shortDescription:
      "Our top-tier driveway bundle combines the 4K Pro Video Doorbell with the 4K Pro Floodlight Cam for the highest-resolution security at your front door and driveway. Radar-powered 3D Motion Detection, Audio+ on both devices, and a powerful 85dB siren protect what matters most. Hardwired, always-on, professionally installed. Bundle saves €50.",
    highlights: [
      "All-4K image quality (both devices)",
      "Ring Video Doorbell Pro + Floodlight Cam Pro",
      "3D Motion Detection on both devices",
      "Audio+ two-way talk on both cameras",
      "85dB siren + 2,000-lumen floodlights",
      "Ring Chime included",
    ],
    specs: {},
  },
  "plus-whole-home-bundle": {
    // Bundles a Wired Video Doorbell Plus (2K) with TWO Floodlight Cam
    // Plus units (1080p each). Siren on Floodlight Plus is 105dB per
    // Ring's spec.
    shortDescription:
      "Our most popular full perimeter solution. The 2K Wired Video Doorbell Plus for your entrance, paired with two Floodlight Cam Wired Plus units to cover both the driveway and back garden. 4,000 total lumens of floodlighting and two 105dB sirens eliminate blind spots from every angle. Includes a Ring Chime. Bundle saves €100.",
    highlights: [
      "2K Doorbell + 2× 1080p Floodlight Cams",
      "Doorbell Plus + 2× Floodlight Cam Plus",
      "4,000 total lumens of floodlighting",
      "Two 105dB sirens",
      "Eliminates blind spots front and rear",
      "Ring Chime included",
    ],
    specs: {},
  },
  "pro-whole-home-bundle": {
    // Bundles a Wired Video Doorbell Pro (4K) with TWO Floodlight Cam
    // Pro units (4K each). All three devices 4K — Ring's highest tier.
    shortDescription:
      "The ultimate whole-home setup. The 4K Pro Video Doorbell at your entrance paired with two 4K Pro Floodlight Cams gives you the highest-resolution coverage of the front door, driveway, and back garden. 3D Motion Detection pinpoints activity on an aerial map. 4,000 total lumens and two 85dB sirens. Includes a Ring Chime. Bundle saves €100.",
    highlights: [
      "All-4K image quality (every device)",
      "Doorbell Pro + 2× Floodlight Cam Pro",
      "3D Motion Detection on every device",
      "Audio+ two-way talk on every device",
      "4,000 total lumens + two 85dB sirens",
      "Ring Chime included",
    ],
    specs: {},
  },
  "eldercare-security-bundle": {
    shortDescription:
      "The Basic Ring Video Doorbell Plus + Digital Lockbox designed for elderly relatives and their carers. The doorbell lets family see who's at the door from anywhere, while the Wi-Fi keybox gives carers secure, auditable key access via a one-time code. Peace of mind at the front door, without hiding keys under plant pots.",
    highlights: [
      "Basic Video Doorbell Plus supplied and installed",
      "Digital Lockbox for carer access",
      "Ring Chime included",
      "App setup for family members",
      "Motion zone & alert configuration",
      "Professional mounting & wiring",
    ],
    specs: {},
  },

  // ── Legacy handles (kept for existing Shopify references) ──
  "basic-video-doorbell-mains-or-battery-powered": {
    shortDescription:
      "See, hear, and speak to visitors from anywhere with the Ring Battery Video Doorbell. Wire-free installation means you can set it up in minutes — no electrician needed. Enjoy 1080p HD video, advanced motion detection, and instant phone alerts for complete peace of mind at your front door.",
    highlights: [
      "1080p HD video with enhanced colour night vision",
      "Two-way talk with noise cancellation",
      "Advanced motion detection with customisable zones",
      "Wire-free battery or hardwired installation",
      "Instant notifications sent to your phone",
      "Works with Alexa for hands-free monitoring",
    ],
    specs: {
      "Video Resolution": "1080p HD",
      "Field of View": "155° horizontal, 90° vertical",
      "Night Vision": "Enhanced colour night vision",
      "Power": "Rechargeable battery or hardwired (8-24V AC)",
      "Connectivity": "Wi-Fi 802.11 b/g/n (2.4 GHz)",
      "Audio": "Two-way talk with noise cancellation",
      "Weather Rating": "IPX5 (rain, snow, extreme temperatures)",
      "Dimensions": "12.6 x 6.2 x 2.8 cm",
    },
  },
  "advanced-video-doorbell-pro-wired": {
    shortDescription:
      "The Ring Video Doorbell Pro (Wired) delivers crystal-clear 1536p HD+ video with a head-to-toe view, so you never miss a detail. Hardwired for reliable, always-on power, it features 3D Motion Detection with Bird's Eye View and pre-roll video preview for precise alerts.",
    highlights: [
      "1536p HD+ video with head-to-toe view",
      "3D Motion Detection with Bird's Eye View",
      "Pre-roll video preview before motion events",
      "Two-way talk with Audio+ technology",
      "Hardwired for always-on, reliable power",
      "Sleek, slim profile complements any doorway",
    ],
    specs: {
      "Video Resolution": "1536p HD+ (Head-to-Toe)",
      "Field of View": "150° horizontal, head-to-toe vertical",
      "Night Vision": "Colour Night Vision with HDR",
      "Power": "Hardwired (16-24V AC, 30VA transformer required)",
      "Connectivity": "Dual-band Wi-Fi (2.4 / 5 GHz)",
      "Audio": "Two-way talk with Audio+",
      "Motion Detection": "3D Motion Detection, Bird's Eye View",
      "Dimensions": "11.4 x 4.9 x 2.2 cm",
    },
  },
};

// Fallback features by Shopify productType
const featuresByType: Record<string, ProductFeatureSet> = {
  "Video Doorbell": {
    shortDescription:
      "See, hear, and speak to anyone at your front door from anywhere. Ring Video Doorbells deliver HD video, instant alerts, and two-way talk for complete peace of mind.",
    highlights: [
      "HD video with night vision",
      "Two-way talk with noise cancellation",
      "Advanced motion detection with customisable zones",
      "Instant notifications to your phone",
      "Works with Alexa",
      "Easy DIY or professional installation",
    ],
    specs: {
      "Video": "HD (1080p+)",
      "Night Vision": "Yes",
      "Audio": "Two-way talk",
      "Motion Detection": "Customisable zones",
      "Weather Rating": "IPX5",
      "Connectivity": "Wi-Fi",
    },
  },
  "Security Cam": {
    shortDescription:
      "Keep watch over your home inside and out with Ring Security Cameras. HD video, customisable motion detection, and two-way talk let you stay connected to what matters.",
    highlights: [
      "HD video with colour night vision",
      "Customisable motion detection zones",
      "Two-way talk with built-in microphone",
      "Weather-resistant for outdoor use",
      "Real-time motion alerts to your phone",
      "Works with Alexa and the Ring App",
    ],
    specs: {
      "Video": "HD (1080p+)",
      "Night Vision": "Colour Night Vision",
      "Audio": "Two-way talk",
      "Motion Detection": "Customisable zones",
      "Connectivity": "Wi-Fi",
      "Weather Rating": "IPX5+",
    },
  },
};

export function getProductFeatures(
  handle: string,
  productType: string
): ProductFeatureSet | null {
  return featuresByHandle[handle] ?? featuresByType[productType] ?? null;
}

// Map feature text keywords to lucide-react icons
const iconKeywords: [RegExp, LucideIcon][] = [
  [/retinal|video|1080p|1536p|2k|4k|hdr|hd/i, Video],
  [/two-way talk|audio|noise cancel/i, Mic],
  [/night vision|low-light/i, Moon],
  [/3d motion|motion|radar/i, Radar],
  [/weather|outdoor|ipx|ip55/i, CloudRain],
  [/wi-fi|dual-band|connectivity|2\.4ghz/i, Wifi],
  [/battery|rechargeable|wire-free/i, Battery],
  [/alexa|smart home|app/i, Home],
  [/siren|alert|notification/i, Bell],
  [/floodlight|spotlight|lumen|light/i, Sun],
  [/bird's eye|head-to-toe|view|field of view|zoom/i, Eye],
  [/privacy|cover|secure/i, ShieldCheck],
  [/camera|cam/i, Camera],
  [/hardwired|always-on|power|plug/i, Zap],
  [/chime|volume|speaker/i, Volume2],
  [/phone|notification|instant/i, Smartphone],
  [/save|bundle|pack/i, Lock],
];

export function getFeatureIcon(featureText: string): LucideIcon {
  for (const [regex, icon] of iconKeywords) {
    if (regex.test(featureText)) return icon;
  }
  return ShieldCheck;
}
