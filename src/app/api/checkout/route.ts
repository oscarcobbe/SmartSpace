import { NextResponse } from "next/server";
import { getProductById } from "@/data/products";

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
  gclid?: string;
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
 * Resolve every cart item against the local product catalog. NEVER trusts
 * the client-submitted price or name — uses src/data/products.ts as the
 * authoritative source. Fails the whole checkout if any product is unknown
 * or has an invalid quantity.
 */
function resolveItems(items: CartItem[]): ResolvedItem[] {
  return items.map((item) => {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 20) {
      throw new Error(`Invalid quantity for item ${item.productId}`);
    }

    const product = getProductById(item.productId);
    if (!product) {
      throw new Error(`Unknown product: ${item.productId}`);
    }

    const authoritativeCents = Math.round(product.price * 100);
    if (authoritativeCents <= 0 || authoritativeCents > 20_000_00) {
      throw new Error(`Price out of bounds for ${item.productId}`);
    }

    return {
      id: product.id,
      title: product.name, // server-side name, never client-submitted
      unitAmountCents: authoritativeCents,
      quantity: item.quantity,
      image: item.image?.startsWith("https://") ? item.image : "",
      bookingDate: item.bookingDate,
      bookingSlot: item.bookingSlot,
      bookingLabel: item.bookingLabel,
    };
  });
}

export async function POST(request: Request) {
  try {
    const { items, gclid }: CheckoutBody = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    let resolved: ResolvedItem[];
    try {
      resolved = resolveItems(items);
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
    params.append("metadata[gclid]", gclid ?? "");

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
