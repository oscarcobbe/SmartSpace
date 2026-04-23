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
    shortDescription:
      "Get 2K image clarity and 6x zoom with our reimagined wired doorbell. Features include real-time Live View, Two-Way Talk, and instant motion alerts to your phone. Hardwired into your home's power for constant, reliable security, it is the perfect, affordable solution for families seeking doorstep oversight and total peace of mind.",
    highlights: [
      "Retinal 2K with 6x Enhanced Zoom",
      "Head-to-Toe Video",
      "Live View & Two-Way Talk",
      "Motion Detection",
      "Always-on Power",
    ],
    specs: {
      "Video Resolution": "Retinal 2K",
      "Zoom": "6x Enhanced",
      "Field of View": "Head-to-Toe (150° horizontal)",
      "Audio": "Two-way talk with noise cancellation",
      "Motion Detection": "Advanced motion zones",
      "Power": "Hardwired (8-24V AC)",
      "Connectivity": "Wi-Fi 802.11 b/g/n (2.4 GHz)",
      "Weather Rating": "IPX5",
    },
  },
  "pro-video-doorbell": {
    shortDescription:
      "Our most advanced wired doorbell features breakthrough 4K clarity and 10x zoom. This reimagined design includes radar-powered 3D motion alerts, enhanced two-way audio, and full-color night vision. Secure your home with crystal-clear video and real-time communication, ensuring you never miss a detail, day or night.",
    highlights: [
      "Retinal 4K",
      "Low-Light Sight & Adaptive Night Vision",
      "Wide Field of View",
      "10x Enhanced Zoom",
      "3D Motion Detection",
      "Head-to-Toe Video",
    ],
    specs: {
      "Video Resolution": "Retinal 4K",
      "Zoom": "10x Enhanced",
      "Field of View": "Wide, head-to-toe",
      "Night Vision": "Low-Light Sight with adaptive night vision & colour",
      "Audio": "Enhanced two-way talk",
      "Motion Detection": "3D Motion Detection (radar-powered)",
      "Power": "Hardwired (16-24V AC)",
      "Connectivity": "Dual-band Wi-Fi (2.4 / 5 GHz)",
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
    shortDescription:
      "Our most advanced floodlight camera with breakthrough 4K clarity and 10x zoom. Radar-powered 3D Motion Detection identifies exactly where someone moved on an aerial map. 2000-lumen floodlights plus an 85dB siren light up and deter intruders — day or night, driveway or back garden.",
    highlights: [
      "Retinal 4K",
      "Low-Light Sight",
      "Wide Field of View",
      "10x Enhanced Zoom",
      "85dB Siren & 2000 Lumen Floodlights",
      "3D Motion Detection",
    ],
    specs: {
      "Video Resolution": "Retinal 4K",
      "Zoom": "10x Enhanced",
      "Field of View": "Wide-angle",
      "Floodlights": "2,000 lumens (dual LED)",
      "Siren": "85dB built-in",
      "Night Vision": "Low-Light Sight",
      "Motion Detection": "3D Motion Detection (radar-powered)",
      "Power": "Hardwired (110-240V AC)",
      "Weather Rating": "IP55",
    },
  },

  // ── New lineup: Bundles ──
  "plus-driveway-bundle": {
    shortDescription:
      "Secure your home with our driveway bundle, combining 2K video clarity and powerful floodlight protection. Use the Video Doorbell Plus for sharp doorstep oversight and Two-Way Talk, while the Floodlight Cam illuminates large areas with LED lights and a remote-activated siren. This hardwired system provides non-stop power, customisable motion zones, and instant phone alerts, ensuring the family stays connected and every visitor is seen, day or night. Bundle saves €50.",
    highlights: [
      "2K & 1080p image quality",
      "Ring Video Doorbell Plus + Floodlight Cam",
      "Two-Way Talk on both devices",
      "2,000-lumen motion-activated floodlights",
      "Customisable motion zones",
      "Ring Chime included",
    ],
    specs: {},
  },
  "pro-driveway-bundle": {
    shortDescription:
      "Our top-tier driveway bundle combines the 4K Video Doorbell Pro with the 4K Floodlight Cam Pro for uncompromising security at your front door and driveway. Radar-powered 3D Motion Detection, 10x zoom on both devices, and a powerful 85dB siren protect what matters most. Hardwired, always-on, and professionally installed. Bundle saves €50.",
    highlights: [
      "All Retinal 4K image quality",
      "Ring Video Doorbell Pro + Floodlight Cam Pro",
      "3D Motion Detection on both devices",
      "10x zoom on both cameras",
      "85dB siren + 2,000-lumen floodlights",
      "Ring Chime included",
    ],
    specs: {},
  },
  "plus-whole-home-bundle": {
    shortDescription:
      "Our most popular full perimeter solution for 360-degree property awareness. This bundle features the crisp Retinal 2K Video Doorbell Wired for your entrance, paired with two Floodlight Cam Wired Plus units to provide high-intensity, motion-activated light to both your driveway and back garden. With 4000 total lumens of floodlighting and two 105dB sirens, this setup eliminates blind spots and deters intruders from every angle. Includes a Ring Chime. Bundle saves €100.",
    highlights: [
      "2K & 1080p image quality",
      "Video Doorbell Plus + 2x Floodlight Cam Plus",
      "4,000 total lumens of floodlighting",
      "Two 105dB sirens for intruder deterrence",
      "Eliminates blind spots front and rear",
      "Ring Chime included",
    ],
    specs: {},
  },
  "pro-whole-home-bundle": {
    shortDescription:
      "The ultimate whole-home security setup. The Ring Video Doorbell Pro at your entrance paired with two Floodlight Cam Pro units gives you all-Retinal-4K coverage of the front door, driveway, and back garden. 3D Motion Detection pinpoints activity on an aerial map. 4,000 lumens of floodlighting and 85dB sirens deter intruders day and night. Includes a Ring Chime. Bundle saves €100.",
    highlights: [
      "All Retinal 4K image quality",
      "Video Doorbell Pro + 2x Floodlight Cam Pro",
      "3D Motion Detection on every device",
      "4,000 total lumens of floodlighting",
      "Two 85dB built-in sirens",
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
