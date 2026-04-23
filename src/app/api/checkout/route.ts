import { NextResponse } from "next/server";
import { getProductByHandle } from "@/lib/shopify";
import type { AttributionRecord } from "@/lib/leads";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  bookingDate?: string;
  bookingSlot?: string;
  bookingLabel?: string;
}

interface CheckoutBody {
  items: CartItem[];
  attribution?: AttributionRecord;
  gclid?: string; // legacy
}

interface ResolvedItem {
  id: string;
  title: string;
  unitAmountCents: number;
  quantity: number;
  image: string;
  bookingDate?: string;
  bookingSlot?: string;
  bookingLabel?: string;
}

/**
 * Resolve every cart item against Shopify's Storefront API. NEVER trusts the
 * client-submitted name — uses Shopify's canonical title. Verifies the
 * submitted price is within the product's variant price range (with a small
 * tolerance for rounding). Fails the whole checkout if any product is unknown
 * or the price is out of range.
 */
async function resolveItems(items: CartItem[]): Promise<ResolvedItem[]> {
  const resolved: ResolvedItem[] = [];
  for (const item of items) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 20) {
      throw new Error(`Invalid quantity for item ${item.productId}`);
    }
    if (!Number.isFinite(item.price) || item.price <= 0 || item.price > 20_000) {
      throw new Error(`Invalid price for item ${item.productId}`);
    }

    const product = await getProductByHandle(item.productId);
    if (!product) {
      throw new Error(`Unknown product: ${item.productId}`);
    }

    // Verify the submitted price is within the product's variant range
    // (prevents a manipulated client from sending e.g. €1 for a €500 bundle).
    // Allow a 5% tolerance either side to absorb rounding / price updates
    // mid-session.
    const minPrice = parseFloat(product.priceRange.minVariantPrice.amount);
    const maxPrice = parseFloat(product.priceRange.maxVariantPrice.amount);
    if (item.price < minPrice * 0.95 || item.price > maxPrice * 1.05) {
      throw new Error(
        `Price out of range for ${item.productId}: submitted €${item.price}, expected €${minPrice}–€${maxPrice}`
      );
    }

    const authoritativeCents = Math.round(item.price * 100);

    resolved.push({
      id: item.productId,
      title: product.title, // server-side title, never client-submitted
      unitAmountCents: authoritativeCents,
      quantity: item.quantity,
      image: item.image?.startsWith("https://") ? item.image : "",
      bookingDate: item.bookingDate,
      bookingSlot: item.bookingSlot,
      bookingLabel: item.bookingLabel,
    });
  }
  return resolved;
}

export async function POST(request: Request) {
  try {
    const { items, attribution, gclid: legacyGclid }: CheckoutBody = await request.json();
    const gclid = attribution?.gclid ?? legacyGclid ?? "";

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    let resolved: ResolvedItem[];
    try {
      resolved = await resolveItems(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid items";
      console.error("[checkout] item resolution failed:", msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Build form-encoded body for Stripe REST API
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append(
      "success_url",
      `https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}`
    );
    params.append("cancel_url", "https://smart-space.ie");
    params.append("billing_address_collection", "required");
    params.append("phone_number_collection[enabled]", "true");
    params.append("custom_fields[0][key]", "installation_address");
    params.append("custom_fields[0][label][type]", "custom");
    params.append("custom_fields[0][label][custom]", "Installation Address (if different from billing)");
    params.append("custom_fields[0][type]", "text");
    params.append("custom_fields[0][optional]", "true");
    params.append("allow_promotion_codes", "true");
    params.append("metadata[gclid]", gclid);
    // Attach additional attribution as Stripe metadata so the Stripe webhook
    // can log it to the leads sheet once payment completes.
    if (attribution?.landingPage) params.append("metadata[landing_page]", attribution.landingPage);
    if (attribution?.referrer) params.append("metadata[referrer]", attribution.referrer);
    if (attribution?.utmSource) params.append("metadata[utm_source]", attribution.utmSource);
    if (attribution?.utmMedium) params.append("metadata[utm_medium]", attribution.utmMedium);
    if (attribution?.utmCampaign) params.append("metadata[utm_campaign]", attribution.utmCampaign);
    if (attribution?.utmContent) params.append("metadata[utm_content]", attribution.utmContent);
    if (attribution?.utmTerm) params.append("metadata[utm_term]", attribution.utmTerm);

    // Pass booking info from the first item that has it
    const bookedItem = resolved.find((i) => i.bookingDate && i.bookingSlot);
    if (bookedItem) {
      params.append("metadata[booking_date]", bookedItem.bookingDate ?? "");
      params.append("metadata[booking_slot]", bookedItem.bookingSlot ?? "");
      params.append("metadata[booking_label]", bookedItem.bookingLabel ?? "");
      params.append("metadata[product_name]", bookedItem.title);
    }

    resolved.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`, "eur");
      params.append(`line_items[${i}][price_data][unit_amount]`, String(item.unitAmountCents));
      params.append(`line_items[${i}][price_data][product_data][name]`, item.title);
      if (item.image) {
        params.append(`line_items[${i}][price_data][product_data][images][0]`, item.image);
      }
      params.append(`line_items[${i}][quantity]`, String(item.quantity));
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe API error:", data);
      return NextResponse.json(
        { error: `Checkout failed: ${data.error?.message ?? "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Checkout error:", message, err);
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}
