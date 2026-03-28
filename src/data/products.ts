export type ProductCategory = "doorbell" | "camera" | "bundle" | "accessory";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  longDescription: string;
  featured: boolean;
  badge?: string;
  features: string[];
  specs: Record<string, string>;
}

export const categoryInfo: Record<
  ProductCategory,
  { label: string; description: string; slug: string }
> = {
  doorbell: {
    label: "Video Doorbells",
    description: "See, hear, and speak to anyone at your door from anywhere with Ring Video Doorbells.",
    slug: "doorbells",
  },
  camera: {
    label: "Security Cameras",
    description: "Keep watch over your home inside and out with Ring Security Cameras.",
    slug: "cameras",
  },
  bundle: {
    label: "Bundles & Packs",
    description: "Save more with Ring bundles. Complete home security packages at great prices.",
    slug: "bundles",
  },
  accessory: {
    label: "Accessories",
    description: "Enhance your Ring setup with chimes, mounts, and more.",
    slug: "accessories",
  },
};

export const products: Product[] = [
  {
    id: "stick-up-cam-battery",
    name: "Stick Up Cam Battery",
    category: "camera",
    price: 44.99,
    originalPrice: 79.99,
    image: "https://eu.ring.com/cdn/shop/files/variant-13406586896407-en-eu_2000x2000.png?v=1773740218",
    description: "Versatile indoor/outdoor security camera with flexible battery-powered placement.",
    longDescription: "The Ring Stick Up Cam Battery is a versatile indoor/outdoor security camera that goes practically anywhere. With flexible battery-powered placement, HD video, two-way talk, and customisable motion detection, you can keep an eye on your home from every angle. Easy to install and wire-free.",
    featured: true,
    badge: "Save 44%",
    features: [
      "1080p HD video with night vision",
      "Two-way talk with noise cancellation",
      "Customisable motion zones",
      "Weather-resistant for indoor/outdoor use",
      "Quick-release rechargeable battery",
      "Works with Alexa for hands-free monitoring",
    ],
    specs: {
      "Video": "1080p HD",
      "Field of View": "130° diagonal",
      "Night Vision": "Infrared LED",
      "Power": "Rechargeable battery",
      "Connectivity": "Wi-Fi 802.11 b/g/n",
      "Weather Rating": "IPX5",
      "Dimensions": "9.7 x 6.0 x 6.0 cm",
    },
  },
  {
    id: "stick-up-cam-2pack",
    name: "Stick Up Cam Battery (2-Pack)",
    category: "camera",
    price: 79.99,
    originalPrice: 159.98,
    image: "https://eu.ring.com/cdn/shop/files/variant-30043091894295-en-eu_30db8f9e-e46c-4896-954a-398813749a3e.jpg?v=1773740218",
    description: "Two versatile indoor/outdoor cameras for complete home coverage.",
    longDescription: "Get complete home coverage with two Ring Stick Up Cam Battery cameras. Place one inside, one outside — or anywhere you need an extra set of eyes. Save compared to buying individually, and enjoy the same great features including HD video, two-way talk, and motion alerts.",
    featured: true,
    badge: "Save 50%",
    features: [
      "Two cameras for complete coverage",
      "1080p HD video with night vision",
      "Place indoors or outdoors",
      "Two-way talk on both cameras",
      "Customisable motion zones",
      "Save 50% vs buying separately",
    ],
    specs: {
      "Video": "1080p HD (each)",
      "Field of View": "130° diagonal (each)",
      "Night Vision": "Infrared LED",
      "Power": "Rechargeable battery (each)",
      "Connectivity": "Wi-Fi 802.11 b/g/n",
      "Pack Contents": "2x Stick Up Cam Battery",
    },
  },
  {
    id: "stick-up-indoor-bundle",
    name: "Stick Up Cam + Indoor Cam Bundle",
    category: "bundle",
    price: 54.99,
    originalPrice: 129.98,
    image: "https://eu.ring.com/cdn/shop/files/Squirrelfish_Slate_1_White_ATF_1500x1500_a1b7992e-4af7-43bf-8a2d-4ec5d0e70c9a_2000x2000.png?v=1773731604",
    description: "Complete home coverage with one outdoor Stick Up Cam and one Indoor Camera.",
    longDescription: "The ultimate starter bundle for whole-home security. Get outdoor protection with the Stick Up Cam Battery and indoor peace of mind with the compact Indoor Camera. Both feature HD video, two-way talk, and motion alerts — all managed from a single Ring app.",
    featured: true,
    badge: "Save 58%",
    features: [
      "1x Stick Up Cam Battery (outdoor)",
      "1x Indoor Camera (indoor)",
      "Both with 1080p HD video",
      "Two-way talk on both devices",
      "Manage both from the Ring app",
      "Save 58% vs buying separately",
    ],
    specs: {
      "Outdoor Camera": "Stick Up Cam Battery",
      "Indoor Camera": "Indoor Camera Plus",
      "Video": "1080p HD (both)",
      "Power": "Battery (outdoor), Plug-in (indoor)",
      "Connectivity": "Wi-Fi",
      "Pack Contents": "2 cameras, mounting hardware",
    },
  },
  {
    id: "pan-tilt-bundle",
    name: "Pan-Tilt Indoor Cam + Stick Up Cam Bundle",
    category: "bundle",
    price: 79.99,
    originalPrice: 149.98,
    image: "https://eu.ring.com/cdn/shop/files/variant-52958218158418-en-eu_2000x2000.png?v=1773731326",
    description: "360-degree indoor coverage plus outdoor protection in one bundle.",
    longDescription: "Get the best of both worlds: 360-degree indoor coverage with the Pan-Tilt Indoor Cam and reliable outdoor security with the Stick Up Cam Battery. The Pan-Tilt cam lets you remotely control the camera angle for full room coverage, while the Stick Up Cam guards your outdoors.",
    featured: true,
    badge: "Save 47%",
    features: [
      "1x Pan-Tilt Indoor Cam (360° view)",
      "1x Stick Up Cam Battery (outdoor)",
      "Remote pan and tilt control",
      "1080p HD video on both",
      "Two-way talk",
      "Save 47% vs buying separately",
    ],
    specs: {
      "Indoor Camera": "Pan-Tilt Indoor Cam",
      "Outdoor Camera": "Stick Up Cam Battery",
      "Indoor FOV": "360° pan, 169° vertical tilt",
      "Video": "1080p HD (both)",
      "Power": "Plug-in (indoor), Battery (outdoor)",
      "Pack Contents": "2 cameras, mounting hardware",
    },
  },
  {
    id: "doorbell-plus-wired",
    name: "Wired Video Doorbell Plus",
    category: "doorbell",
    price: 179.99,
    image: "https://eu.ring.com/cdn/shop/files/Ring_Phantom_1500x1500_01_7f8a2ae0-f53b-410a-8e2a-a363f0a227d8_2000x2000.jpg?v=1773731300",
    description: "Premium wired doorbell with Retinal 2K video and head-to-toe view.",
    longDescription: "The Ring Wired Video Doorbell Plus delivers crystal-clear Retinal 2K video with a head-to-toe view so you never miss a detail. Hardwired for reliable, always-on power with advanced motion detection and a sleek, slim design that complements any doorway.",
    featured: false,
    features: [
      "Retinal 2K video quality",
      "Head-to-toe HD+ view",
      "Advanced motion detection",
      "Two-way talk with Audio+",
      "Hardwired for always-on power",
      "Slim, sleek design",
    ],
    specs: {
      "Video": "Retinal 2K (2048 x 1536)",
      "Field of View": "150° horizontal, head-to-toe",
      "Night Vision": "Colour Night Vision",
      "Power": "Hardwired (8-24V AC)",
      "Audio": "Two-way with Audio+",
      "Dimensions": "12.8 x 5.6 x 2.4 cm",
    },
  },
  {
    id: "doorbell-battery",
    name: "Battery Video Doorbell",
    category: "doorbell",
    price: 59.99,
    image: "https://eu.ring.com/cdn/shop/files/Ring_Phantom_1500x1500_01_7f8a2ae0-f53b-410a-8e2a-a363f0a227d8_2000x2000.jpg?v=1773731300",
    description: "Wire-free smart doorbell with 1080p HD video and easy DIY installation.",
    longDescription: "The Ring Battery Video Doorbell brings smart home security to any front door — no wiring required. With 1080p HD video, two-way talk, and advanced motion detection, you can see, hear, and speak to visitors from anywhere using your phone. Easy DIY setup in minutes.",
    featured: false,
    features: [
      "1080p HD video",
      "Two-way talk",
      "Advanced motion detection",
      "Wire-free installation",
      "Rechargeable battery",
      "Works with Ring Chime",
    ],
    specs: {
      "Video": "1080p HD",
      "Field of View": "155° horizontal",
      "Night Vision": "Infrared",
      "Power": "Rechargeable battery or hardwired",
      "Connectivity": "Wi-Fi 802.11 b/g/n",
      "Dimensions": "12.6 x 6.2 x 2.8 cm",
    },
  },
  {
    id: "indoor-cam-2nd-gen",
    name: "Indoor Camera Plus",
    category: "camera",
    price: 49.99,
    image: "https://eu.ring.com/cdn/shop/files/Squirrelfish_Slate_1_White_ATF_1500x1500_a1b7992e-4af7-43bf-8a2d-4ec5d0e70c9a_2000x2000.png?v=1773731604",
    description: "Compact indoor security camera with 1080p HD video and privacy cover.",
    longDescription: "The Ring Indoor Camera Plus is a compact, plug-in security camera perfect for keeping an eye on your home. Features 1080p HD video, two-way talk, a manual privacy cover for peace of mind, and colour night vision. Place it on a flat surface or mount it on the wall.",
    featured: false,
    features: [
      "1080p HD video",
      "Colour night vision",
      "Manual privacy cover",
      "Two-way talk",
      "Compact plug-in design",
      "Wall or tabletop mounting",
    ],
    specs: {
      "Video": "1080p HD",
      "Field of View": "143° horizontal",
      "Night Vision": "Colour Night Vision",
      "Power": "Plug-in (USB-C)",
      "Privacy": "Manual privacy cover",
      "Dimensions": "4.8 x 4.8 x 7.1 cm",
    },
  },
  {
    id: "chime-pro",
    name: "Chime Pro (2nd Gen)",
    category: "accessory",
    price: 59.99,
    image: "https://eu.ring.com/cdn/shop/files/variant-13622341468183-en-eu.png?v=1752005940",
    description: "Wi-Fi extender and indoor chime for your Ring doorbell.",
    longDescription: "Never miss a doorbell alert with the Ring Chime Pro. It plugs into any standard power socket and delivers crisp, clear doorbell notifications throughout your home. Plus, it doubles as a Wi-Fi extender to boost your Ring device signal for better performance.",
    featured: false,
    features: [
      "Hear doorbell alerts throughout your home",
      "Built-in Wi-Fi extender",
      "Multiple notification sounds",
      "Adjustable volume",
      "Do Not Disturb mode",
      "Simple plug-in setup",
    ],
    specs: {
      "Audio": "Built-in speaker",
      "Wi-Fi": "Built-in extender",
      "Power": "Plug-in (mains socket)",
      "Connectivity": "Wi-Fi 802.11 a/b/g/n/ac",
      "Dimensions": "7.1 x 6.2 x 3.4 cm",
      "Compatibility": "All Ring doorbells and cameras",
    },
  },
  {
    id: "floodlight-cam-wired-pro",
    name: "Floodlight Cam Wired Pro",
    category: "camera",
    price: 249.99,
    image: "https://eu.ring.com/cdn/shop/files/variant-27953690181655-en-eu_b4dad571-f98e-4646-9d27-37debc690d79.png?v=1773731442",
    description: "Powerful floodlight with HD camera, 3D motion detection, and Bird's Eye View.",
    longDescription: "The Ring Floodlight Cam Wired Pro delivers advanced security with 3D Motion Detection and Bird's Eye View for precise alerts. Ultra-bright LED floodlights illuminate your property while the 1080p HDR camera captures every detail. Hardwired for reliable, always-on performance.",
    featured: false,
    features: [
      "1080p HDR video",
      "3D Motion Detection with Bird's Eye View",
      "Ultra-bright LED floodlights (2000 lumens)",
      "Colour night vision",
      "Built-in siren",
      "Hardwired for constant power",
    ],
    specs: {
      "Video": "1080p HDR",
      "Field of View": "140° horizontal",
      "Floodlights": "2000 lumens",
      "Motion": "3D Motion Detection",
      "Power": "Hardwired (110-240V)",
      "Weather Rating": "IP55",
    },
  },
  {
    id: "pan-tilt-indoor-cam",
    name: "Pan-Tilt Indoor Cam",
    category: "camera",
    price: 69.99,
    image: "https://eu.ring.com/cdn/shop/files/variant-52958218256722-en-eu.png?v=1773731326",
    description: "360-degree pan and tilt indoor camera with remote control.",
    longDescription: "See every corner of the room with the Ring Pan-Tilt Indoor Cam. Remotely control the camera angle from your phone with 360° pan and 169° vertical tilt. Features 1080p HD video, two-way talk, and a manual privacy cover. Perfect for living rooms, nurseries, or pet monitoring.",
    featured: false,
    features: [
      "360° pan and 169° tilt",
      "1080p HD video",
      "Remote camera control via app",
      "Two-way talk",
      "Manual privacy cover",
      "Colour night vision",
    ],
    specs: {
      "Video": "1080p HD",
      "Pan Range": "360° horizontal",
      "Tilt Range": "169° vertical",
      "Night Vision": "Colour Night Vision",
      "Power": "Plug-in (USB-C)",
      "Privacy": "Manual privacy cover",
    },
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((p) => p.category === category);
}

export function getFeaturedProducts(limit = 4): Product[] {
  return products.filter((p) => p.featured).slice(0, limit);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, limit);
}
