/**
 * Static product catalogue — frozen from Shopify on 2026-04-24.
 *
 * The site no longer fetches products from Shopify at runtime. All product
 * data (titles, prices, variants, options, images) is imported from here.
 * Updating prices or adding new products = edit this file, rebuild, deploy.
 *
 * Shape matches the ShopifyProduct type so call-sites don't need to change.
 */

import type { ShopifyProduct } from "@/lib/shopify";

export const PRODUCT_CATALOGUE: ShopifyProduct[] = [
  {
    "id": "gid://shopify/Product/15300830200131",
    "title": "Plus Video Doorbell",
    "handle": "plus-video-doorbell",
    "description": "Our most affordable wired Video Doorbell is equipped with all the features for peace of mind. Answer the door from anywhere with Live View, HD Video and Two-Way Talk, know what's happening on your doorstep with Advanced Motion Detection and receive real-time notifications straight to your phone. Ring Chime included.",
    "descriptionHtml": "<p>Our most affordable wired Video Doorbell is equipped with all the features for peace of mind. Answer the door from anywhere with Live View, HD Video and Two-Way Talk, know what's happening on your doorstep with Advanced Motion Detection and receive real-time notifications straight to your phone. Ring Chime included.</p>",
    "productType": "Video Doorbell",
    "tags": [
      "Doorbell",
      "Plus",
      "Single"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "299.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "399.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152398659",
            "title": "No New Cabling Required",
            "availableForSale": true,
            "price": {
              "amount": "299.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152431427",
            "title": "New Cabling & Power Source Required",
            "availableForSale": true,
            "price": {
              "amount": "399.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830298435",
    "title": "Pro Video Doorbell",
    "handle": "pro-video-doorbell",
    "description": "Our most advanced wired video doorbell gets a sleek new design featuring breakthrough 4K clarity and cutting-edge security features. Retinal 4K with up to 10x Enhanced Zoom - Catch detail even at a distance with wide-angle 4K video. Live View & Two-Way Talk with Audio+ - See, hear, and speak to who's there in real time with our enhanced sound quality. 3D Motion Detection - Receive accurate alerts with radar-powered motion detection. Low-Light Sight - Get a full-colour view in low-light conditions. Ring Chime included.",
    "descriptionHtml": "<p>Our most advanced wired video doorbell gets a sleek new design featuring breakthrough 4K clarity and cutting-edge security features. Retinal 4K with up to 10x Enhanced Zoom - Catch detail even at a distance with wide-angle 4K video. Live View &amp; Two-Way Talk with Audio+ - See, hear, and speak to who's there in real time with our enhanced sound quality. 3D Motion Detection - Receive accurate alerts with radar-powered motion detection. Low-Light Sight - Get a full-colour view in low-light conditions. Ring Chime included.</p>",
    "productType": "Video Doorbell",
    "tags": [
      "Doorbell",
      "Pro",
      "Single"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "479.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "579.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152529731",
            "title": "No New Cabling Required",
            "availableForSale": true,
            "price": {
              "amount": "479.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152562499",
            "title": "New Cabling & Power Source Required",
            "availableForSale": true,
            "price": {
              "amount": "579.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830331203",
    "title": "Plus Floodlight Cam",
    "handle": "plus-floodlight-cam",
    "description": "Hardwired for non-stop peace of mind, Ring Floodlight Cam Wired Plus offers reliable outdoor protection and advanced motion detection, day or night. Designed for larger areas of your home, such as driveways and gardens, featuring a remote-activated security siren and LED floodlights for protection when you need it. Customisable Motion Zones let you focus your security on the areas of your property that matter most. 1080p image quality.",
    "descriptionHtml": "<p>Hardwired for non-stop peace of mind, Ring Floodlight Cam Wired Plus offers reliable outdoor protection and advanced motion detection, day or night. Designed for larger areas of your home, such as driveways and gardens, featuring a remote-activated security siren and LED floodlights for protection when you need it. Customisable Motion Zones let you focus your security on the areas of your property that matter most. 1080p image quality.</p>",
    "productType": "Security Cam",
    "tags": [
      "Camera",
      "Floodlight",
      "Plus",
      "Single"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "379.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "449.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Will A New Power Source Be Required ?",
        "values": [
          "No - Replaces Existing Light",
          "Yes - New Power Source Required"
        ]
      },
      {
        "name": "Colour",
        "values": [
          "Black",
          "White"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152628035",
            "title": "No - Replaces Existing Light / Black",
            "availableForSale": true,
            "price": {
              "amount": "379.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "No - Replaces Existing Light"
              },
              {
                "name": "Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152660803",
            "title": "No - Replaces Existing Light / White",
            "availableForSale": true,
            "price": {
              "amount": "379.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "No - Replaces Existing Light"
              },
              {
                "name": "Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152693571",
            "title": "Yes - New Power Source Required / Black",
            "availableForSale": true,
            "price": {
              "amount": "449.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "Yes - New Power Source Required"
              },
              {
                "name": "Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152726339",
            "title": "Yes - New Power Source Required / White",
            "availableForSale": true,
            "price": {
              "amount": "449.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "Yes - New Power Source Required"
              },
              {
                "name": "Colour",
                "value": "White"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830363971",
    "title": "Pro Floodlight Cam",
    "handle": "pro-floodlight-cam",
    "description": "Protect large outdoor areas like the driveway, back garden, or property boundary with Ring's most advanced floodlight camera. Retinal 4K with up to 10x Enhanced Zoom - Catch detail even at a distance with wide-angle 4K video. Live View & Two-Way Talk with Audio+ - See, hear, and speak in real time. Low-Light Sight - Get a full-colour view in low-light conditions. Light Up Large Outdoor Areas - Give unwanted visitors nowhere to hide with 2000 lumen floodlights.",
    "descriptionHtml": "<p>Protect large outdoor areas like the driveway, back garden, or property boundary with Ring's most advanced floodlight camera. Retinal 4K with up to 10x Enhanced Zoom - Catch detail even at a distance with wide-angle 4K video. Live View &amp; Two-Way Talk with Audio+ - See, hear, and speak in real time. Low-Light Sight - Get a full-colour view in low-light conditions. Light Up Large Outdoor Areas - Give unwanted visitors nowhere to hide with 2000 lumen floodlights.</p>",
    "productType": "Security Cam",
    "tags": [
      "Camera",
      "Floodlight",
      "Pro",
      "Single"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "479.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "549.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Will A New Power Source Be Required ?",
        "values": [
          "No - Replaces Existing Light",
          "Yes - New Power Source Required"
        ]
      },
      {
        "name": "Colour",
        "values": [
          "Black",
          "White"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152759107",
            "title": "No - Replaces Existing Light / Black",
            "availableForSale": true,
            "price": {
              "amount": "479.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "No - Replaces Existing Light"
              },
              {
                "name": "Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152791875",
            "title": "No - Replaces Existing Light / White",
            "availableForSale": true,
            "price": {
              "amount": "479.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "No - Replaces Existing Light"
              },
              {
                "name": "Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152824643",
            "title": "Yes - New Power Source Required / Black",
            "availableForSale": true,
            "price": {
              "amount": "549.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "Yes - New Power Source Required"
              },
              {
                "name": "Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319152857411",
            "title": "Yes - New Power Source Required / White",
            "availableForSale": true,
            "price": {
              "amount": "549.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Will A New Power Source Be Required ?",
                "value": "Yes - New Power Source Required"
              },
              {
                "name": "Colour",
                "value": "White"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830495043",
    "title": "Plus Driveway Bundle",
    "handle": "plus-driveway-bundle",
    "description": "Our most streamlined, 24/7 hardwired solution for total property awareness. The Video Doorbell Wired delivers crisp 1080p HD video and two-way talk in a sleek, battery-free design. We pair this with the Floodlight Cam Wired Plus, featuring 2000 lumens of motion-activated light to protect your driveway and car. This bundle includes a Ring Chime, ensuring you hear real-time notifications throughout your home. A professional, always-on security setup expertly integrated into your existing wiring. Bundle saves €50.",
    "descriptionHtml": "<p>Our most streamlined, 24/7 hardwired solution for total property awareness. The Video Doorbell Wired delivers crisp 1080p HD video and two-way talk in a sleek, battery-free design. We pair this with the Floodlight Cam Wired Plus, featuring 2000 lumens of motion-activated light to protect your driveway and car. This bundle includes a Ring Chime, ensuring you hear real-time notifications throughout your home. A professional, always-on security setup expertly integrated into your existing wiring. Bundle saves €50.</p>",
    "productType": "Bundle",
    "tags": [
      "Bundle",
      "Driveway",
      "Plus"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "658.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "828.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      },
      {
        "name": "Will A New Power Source Be Required For The Floodlight ?",
        "values": [
          "No",
          "Yes"
        ]
      },
      {
        "name": "Floodlight Colour",
        "values": [
          "Black",
          "White"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153054019",
            "title": "No New Cabling Required / No / Black",
            "availableForSale": true,
            "price": {
              "amount": "658.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153086787",
            "title": "No New Cabling Required / No / White",
            "availableForSale": true,
            "price": {
              "amount": "658.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153119555",
            "title": "No New Cabling Required / Yes / Black",
            "availableForSale": true,
            "price": {
              "amount": "728.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153152323",
            "title": "No New Cabling Required / Yes / White",
            "availableForSale": true,
            "price": {
              "amount": "728.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153185091",
            "title": "New Cabling & Power Source Required / No / Black",
            "availableForSale": true,
            "price": {
              "amount": "758.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153217859",
            "title": "New Cabling & Power Source Required / No / White",
            "availableForSale": true,
            "price": {
              "amount": "758.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153250627",
            "title": "New Cabling & Power Source Required / Yes / Black",
            "availableForSale": true,
            "price": {
              "amount": "828.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153283395",
            "title": "New Cabling & Power Source Required / Yes / White",
            "availableForSale": true,
            "price": {
              "amount": "828.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830527811",
    "title": "Pro Driveway Bundle",
    "handle": "pro-driveway-bundle",
    "description": "The ultimate technical choice for high-performance home security. This flagship bundle features Retinal 4K resolution on both units, providing 10x Enhanced Zoom for identifying faces and license plates with surgical precision. The Pro series introduces 3D Motion Detection and Bird's Eye View aerial mapping to track movement across your property. We include a Ring Chime Pro in this bundle, which acts as both a digital ringer and a Wi-Fi extender, boosting the signal to your outdoor cameras. Engineered for Leinster's most advanced smart homes. Bundle saves €50.",
    "descriptionHtml": "<p>The ultimate technical choice for high-performance home security. This flagship bundle features Retinal 4K resolution on both units, providing 10x Enhanced Zoom for identifying faces and license plates with surgical precision. The Pro series introduces 3D Motion Detection and Bird's Eye View aerial mapping to track movement across your property. We include a Ring Chime Pro in this bundle, which acts as both a digital ringer and a Wi-Fi extender, boosting the signal to your outdoor cameras. Engineered for Leinster's most advanced smart homes. Bundle saves €50.</p>",
    "productType": "Bundle",
    "tags": [
      "Bundle",
      "Driveway",
      "Pro"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "908.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "1078.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      },
      {
        "name": "Will A New Power Source Be Required For The Floodlight ?",
        "values": [
          "No",
          "Yes"
        ]
      },
      {
        "name": "Floodlight Colour",
        "values": [
          "Black",
          "White"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153316163",
            "title": "No New Cabling Required / No / Black",
            "availableForSale": true,
            "price": {
              "amount": "908.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153348931",
            "title": "No New Cabling Required / No / White",
            "availableForSale": true,
            "price": {
              "amount": "908.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153381699",
            "title": "No New Cabling Required / Yes / Black",
            "availableForSale": true,
            "price": {
              "amount": "978.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153414467",
            "title": "No New Cabling Required / Yes / White",
            "availableForSale": true,
            "price": {
              "amount": "978.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153447235",
            "title": "New Cabling & Power Source Required / No / Black",
            "availableForSale": true,
            "price": {
              "amount": "1008.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153480003",
            "title": "New Cabling & Power Source Required / No / White",
            "availableForSale": true,
            "price": {
              "amount": "1008.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "No"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153512771",
            "title": "New Cabling & Power Source Required / Yes / Black",
            "availableForSale": true,
            "price": {
              "amount": "1078.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319153545539",
            "title": "New Cabling & Power Source Required / Yes / White",
            "availableForSale": true,
            "price": {
              "amount": "1078.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "Will A New Power Source Be Required For The Floodlight ?",
                "value": "Yes"
              },
              {
                "name": "Floodlight Colour",
                "value": "White"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15300830822723",
    "title": "Eldercare Security Bundle",
    "handle": "eldercare-security-bundle",
    "description": "Balance independence with 24/7 security. This bundle features the Ring Video Doorbell Wired and Chime for remote visual verification and clear internal alerts. The centerpiece is our IP65-rated Smart Wi-Fi Keybox. Engineered for Irish conditions, it features a Tuya Gateway for instant remote management via smartphone. Access is granted via fingerprint, backlit code, or RFID, with physical keys included as a fail-safe. Easily manage carer access and monitor entry logs in real-time. This is the ultimate Safe-Entry system for modern, professionally installed eldercare.",
    "descriptionHtml": "<p>Balance independence with 24/7 security. This bundle features the Ring Video Doorbell Wired and Chime for remote visual verification and clear internal alerts. The centerpiece is our IP65-rated Smart Wi-Fi Keybox. Engineered for Irish conditions, it features a Tuya Gateway for instant remote management via smartphone. Access is granted via fingerprint, backlit code, or RFID, with physical keys included as a fail-safe. Easily manage carer access and monitor entry logs in real-time. This is the ultimate Safe-Entry system for modern, professionally installed eldercare.</p>",
    "productType": "Bundle",
    "tags": [
      "Bundle",
      "Eldercare"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "509.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "609.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319155609923",
            "title": "No New Cabling Required",
            "availableForSale": true,
            "price": {
              "amount": "509.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54319155642691",
            "title": "New Cabling & Power Source Required",
            "availableForSale": true,
            "price": {
              "amount": "609.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15301445812547",
    "title": "Plus Whole Home Bundle",
    "handle": "plus-whole-home-bundle",
    "description": "Our most popular Full Perimeter solution for 360-degree property awareness. This bundle features the crisp 1080p HD Video Doorbell Wired for your entrance, paired with two Floodlight Cam Wired Plus units to provide high-intensity, motion-activated light to both your driveway and back garden. With 4000 total lumens of floodlighting and two 105dB sirens, this setup eliminates blind spots and deters intruders from every angle. Includes a Ring Chime. Bundle saves €100.",
    "descriptionHtml": "<p>Our most popular Full Perimeter solution for 360-degree property awareness. This bundle features the crisp 1080p HD Video Doorbell Wired for your entrance, paired with two Floodlight Cam Wired Plus units to provide high-intensity, motion-activated light to both your driveway and back garden. With 4000 total lumens of floodlighting and two 105dB sirens, this setup eliminates blind spots and deters intruders from every angle. Includes a Ring Chime. Bundle saves €100.</p>",
    "productType": "Bundle",
    "tags": [
      "Bundle",
      "Plus",
      "Whole Home"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "987.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "1227.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      },
      {
        "name": "New Power Sources Required For Floodlights",
        "values": [
          "0",
          "1",
          "2"
        ]
      },
      {
        "name": "Floodlight Colours",
        "values": [
          "Both Black",
          "Both White",
          "Mixed (Black & White)"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065296195",
            "title": "No New Cabling Required / 0 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "987.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065328963",
            "title": "No New Cabling Required / 0 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "987.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065361731",
            "title": "No New Cabling Required / 0 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "987.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065394499",
            "title": "No New Cabling Required / 1 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1057.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065427267",
            "title": "No New Cabling Required / 1 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1057.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065460035",
            "title": "No New Cabling Required / 1 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1057.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065492803",
            "title": "No New Cabling Required / 2 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1127.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065525571",
            "title": "No New Cabling Required / 2 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1127.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065558339",
            "title": "No New Cabling Required / 2 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1127.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065591107",
            "title": "New Cabling & Power Source Required / 0 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1087.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065623875",
            "title": "New Cabling & Power Source Required / 0 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1087.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065656643",
            "title": "New Cabling & Power Source Required / 0 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1087.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065689411",
            "title": "New Cabling & Power Source Required / 1 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1157.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065722179",
            "title": "New Cabling & Power Source Required / 1 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1157.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065754947",
            "title": "New Cabling & Power Source Required / 1 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1157.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065787715",
            "title": "New Cabling & Power Source Required / 2 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1227.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065820483",
            "title": "New Cabling & Power Source Required / 2 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1227.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321065853251",
            "title": "New Cabling & Power Source Required / 2 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1227.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15301446107459",
    "title": "Pro Whole Home Bundle",
    "handle": "pro-whole-home-bundle",
    "description": "The pinnacle of professional home security, engineered for zero-compromise property protection. This flagship bundle delivers Retinal 4K resolution across all three zones—front door, driveway, and rear garden—offering 10x Enhanced Zoom for surgical detail. Both Pro Floodlights utilize Radar-powered 3D Motion Detection and Bird's Eye View mapping to track an intruder's exact path across your entire property with pinpoint accuracy. Includes a Ring Chime. Bundle saves €100.",
    "descriptionHtml": "<p>The pinnacle of professional home security, engineered for zero-compromise property protection. This flagship bundle delivers Retinal 4K resolution across all three zones—front door, driveway, and rear garden—offering 10x Enhanced Zoom for surgical detail. Both Pro Floodlights utilize Radar-powered 3D Motion Detection and Bird's Eye View mapping to track an intruder's exact path across your entire property with pinpoint accuracy. Includes a Ring Chime. Bundle saves €100.</p>",
    "productType": "Bundle",
    "tags": [
      "Bundle",
      "Pro",
      "Whole Home"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "1337.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "1577.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "Choose A Power Option",
        "values": [
          "No New Cabling Required",
          "New Cabling & Power Source Required"
        ]
      },
      {
        "name": "New Power Sources Required For Floodlights",
        "values": [
          "0",
          "1",
          "2"
        ]
      },
      {
        "name": "Floodlight Colours",
        "values": [
          "Both Black",
          "Both White",
          "Mixed (Black & White)"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321067852099",
            "title": "No New Cabling Required / 0 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1337.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321067884867",
            "title": "No New Cabling Required / 0 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1337.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321067917635",
            "title": "No New Cabling Required / 0 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1337.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321067950403",
            "title": "No New Cabling Required / 1 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1407.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321067983171",
            "title": "No New Cabling Required / 1 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1407.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068015939",
            "title": "No New Cabling Required / 1 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1407.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068048707",
            "title": "No New Cabling Required / 2 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1477.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068081475",
            "title": "No New Cabling Required / 2 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1477.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068114243",
            "title": "No New Cabling Required / 2 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1477.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "No New Cabling Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068147011",
            "title": "New Cabling & Power Source Required / 0 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1437.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068179779",
            "title": "New Cabling & Power Source Required / 0 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1437.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068212547",
            "title": "New Cabling & Power Source Required / 0 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1437.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "0"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068245315",
            "title": "New Cabling & Power Source Required / 1 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1507.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068278083",
            "title": "New Cabling & Power Source Required / 1 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1507.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068310851",
            "title": "New Cabling & Power Source Required / 1 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1507.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "1"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068343619",
            "title": "New Cabling & Power Source Required / 2 / Both Black",
            "availableForSale": true,
            "price": {
              "amount": "1577.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both Black"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068376387",
            "title": "New Cabling & Power Source Required / 2 / Both White",
            "availableForSale": true,
            "price": {
              "amount": "1577.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Both White"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321068409155",
            "title": "New Cabling & Power Source Required / 2 / Mixed (Black & White)",
            "availableForSale": true,
            "price": {
              "amount": "1577.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "Choose A Power Option",
                "value": "New Cabling & Power Source Required"
              },
              {
                "name": "New Power Sources Required For Floodlights",
                "value": "2"
              },
              {
                "name": "Floodlight Colours",
                "value": "Mixed (Black & White)"
              }
            ]
          }
        }
      ]
    }
  },
  {
    "id": "gid://shopify/Product/15301577965891",
    "title": "Installation Only",
    "handle": "installation-only",
    "description": "Already have a Ring, Eufy, Nest, Tapo or similar smart home device? We will professionally install it for you. Same expert service, same price — regardless of brand. Includes professional mounting, wiring, app setup, and configuration.",
    "descriptionHtml": "<p>Already have a Ring, Eufy, Nest, Tapo or similar smart home device? We will professionally install it for you. Same expert service, same price — regardless of brand. Includes professional mounting, wiring, app setup, and configuration.</p>",
    "productType": "Installation",
    "tags": [
      "Installation",
      "Service"
    ],
    "priceRange": {
      "minVariantPrice": {
        "amount": "139.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "776.0",
        "currencyCode": "EUR"
      }
    },
    "compareAtPriceRange": {
      "minVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      },
      "maxVariantPrice": {
        "amount": "0.0",
        "currencyCode": "EUR"
      }
    },
    "options": [
      {
        "name": "How Many Devices To Be Installed",
        "values": [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6"
        ]
      },
      {
        "name": "Video Doorbell - Existing Working Wired Doorbell",
        "values": [
          "Yes",
          "No - New Cabling & Power Required",
          "No Doorbell Required"
        ]
      },
      {
        "name": "External Cameras - How Many Need New Power Cabling",
        "values": [
          "None",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6"
        ]
      }
    ],
    "images": {
      "edges": []
    },
    "variants": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635819843",
            "title": "1 / Yes / None",
            "availableForSale": true,
            "price": {
              "amount": "139.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "1"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635852611",
            "title": "1 / No - New Cabling & Power Required / None",
            "availableForSale": true,
            "price": {
              "amount": "229.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "1"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635885379",
            "title": "1 / No Doorbell Required / None",
            "availableForSale": true,
            "price": {
              "amount": "139.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "1"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635918147",
            "title": "1 / No Doorbell Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "229.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "1"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635950915",
            "title": "2 / Yes / None",
            "availableForSale": true,
            "price": {
              "amount": "264.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321635983683",
            "title": "2 / Yes / 1",
            "availableForSale": true,
            "price": {
              "amount": "321.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636016451",
            "title": "2 / No - New Cabling & Power Required / None",
            "availableForSale": true,
            "price": {
              "amount": "321.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636049219",
            "title": "2 / No - New Cabling & Power Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "378.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636081987",
            "title": "2 / No Doorbell Required / None",
            "availableForSale": true,
            "price": {
              "amount": "264.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636114755",
            "title": "2 / No Doorbell Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "321.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636147523",
            "title": "2 / No Doorbell Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "378.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "2"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636180291",
            "title": "3 / Yes / None",
            "availableForSale": true,
            "price": {
              "amount": "375.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636213059",
            "title": "3 / Yes / 1",
            "availableForSale": true,
            "price": {
              "amount": "429.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636245827",
            "title": "3 / Yes / 2",
            "availableForSale": true,
            "price": {
              "amount": "483.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636278595",
            "title": "3 / No - New Cabling & Power Required / None",
            "availableForSale": true,
            "price": {
              "amount": "429.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636311363",
            "title": "3 / No - New Cabling & Power Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "483.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636344131",
            "title": "3 / No - New Cabling & Power Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "537.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636376899",
            "title": "3 / No Doorbell Required / None",
            "availableForSale": true,
            "price": {
              "amount": "375.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636409667",
            "title": "3 / No Doorbell Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "429.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636442435",
            "title": "3 / No Doorbell Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "483.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636475203",
            "title": "3 / No Doorbell Required / 3",
            "availableForSale": true,
            "price": {
              "amount": "537.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "3"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636507971",
            "title": "4 / Yes / None",
            "availableForSale": true,
            "price": {
              "amount": "473.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636540739",
            "title": "4 / Yes / 1",
            "availableForSale": true,
            "price": {
              "amount": "524.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636573507",
            "title": "4 / Yes / 2",
            "availableForSale": true,
            "price": {
              "amount": "575.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636606275",
            "title": "4 / Yes / 3",
            "availableForSale": true,
            "price": {
              "amount": "626.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636639043",
            "title": "4 / No - New Cabling & Power Required / None",
            "availableForSale": true,
            "price": {
              "amount": "524.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636671811",
            "title": "4 / No - New Cabling & Power Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "575.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636704579",
            "title": "4 / No - New Cabling & Power Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "626.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636737347",
            "title": "4 / No - New Cabling & Power Required / 3",
            "availableForSale": true,
            "price": {
              "amount": "677.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636770115",
            "title": "4 / No Doorbell Required / None",
            "availableForSale": true,
            "price": {
              "amount": "473.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636802883",
            "title": "4 / No Doorbell Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "524.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636835651",
            "title": "4 / No Doorbell Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "575.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636868419",
            "title": "4 / No Doorbell Required / 3",
            "availableForSale": true,
            "price": {
              "amount": "626.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636901187",
            "title": "4 / No Doorbell Required / 4",
            "availableForSale": true,
            "price": {
              "amount": "677.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "4"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "4"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636933955",
            "title": "5 / Yes / None",
            "availableForSale": true,
            "price": {
              "amount": "521.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636966723",
            "title": "5 / Yes / 1",
            "availableForSale": true,
            "price": {
              "amount": "566.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321636999491",
            "title": "5 / Yes / 2",
            "availableForSale": true,
            "price": {
              "amount": "611.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637032259",
            "title": "5 / Yes / 3",
            "availableForSale": true,
            "price": {
              "amount": "656.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637065027",
            "title": "5 / Yes / 4",
            "availableForSale": true,
            "price": {
              "amount": "701.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "Yes"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "4"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637097795",
            "title": "5 / No - New Cabling & Power Required / None",
            "availableForSale": true,
            "price": {
              "amount": "566.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637130563",
            "title": "5 / No - New Cabling & Power Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "611.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637163331",
            "title": "5 / No - New Cabling & Power Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "656.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637196099",
            "title": "5 / No - New Cabling & Power Required / 3",
            "availableForSale": true,
            "price": {
              "amount": "701.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637228867",
            "title": "5 / No - New Cabling & Power Required / 4",
            "availableForSale": true,
            "price": {
              "amount": "746.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No - New Cabling & Power Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "4"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637261635",
            "title": "5 / No Doorbell Required / None",
            "availableForSale": true,
            "price": {
              "amount": "521.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "None"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637294403",
            "title": "5 / No Doorbell Required / 1",
            "availableForSale": true,
            "price": {
              "amount": "566.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "1"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637327171",
            "title": "5 / No Doorbell Required / 2",
            "availableForSale": true,
            "price": {
              "amount": "611.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "2"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637359939",
            "title": "5 / No Doorbell Required / 3",
            "availableForSale": true,
            "price": {
              "amount": "656.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "3"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637392707",
            "title": "5 / No Doorbell Required / 4",
            "availableForSale": true,
            "price": {
              "amount": "701.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "4"
              }
            ]
          }
        },
        {
          "node": {
            "id": "gid://shopify/ProductVariant/54321637425475",
            "title": "5 / No Doorbell Required / 5",
            "availableForSale": true,
            "price": {
              "amount": "746.0",
              "currencyCode": "EUR"
            },
            "compareAtPrice": null,
            "selectedOptions": [
              {
                "name": "How Many Devices To Be Installed",
                "value": "5"
              },
              {
                "name": "Video Doorbell - Existing Working Wired Doorbell",
                "value": "No Doorbell Required"
              },
              {
                "name": "External Cameras - How Many Need New Power Cabling",
                "value": "5"
              }
            ]
          }
        }
      ]
    }
  }
];
