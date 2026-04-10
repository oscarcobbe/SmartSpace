import { NextResponse } from "next/server";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CheckoutBody {
  items: CartItem[];
  gclid?: string;
}

export async function POST(request: Request) {
  try {
    const { items, gclid }: CheckoutBody = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const totalEur = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Build form-encoded body for Stripe REST API
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append(
      "success_url",
      `https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}&amount=${totalEur.toFixed(2)}`
    );
    params.append("cancel_url", "https://smart-space.ie");
    params.append("billing_address_collection", "auto");
    params.append("metadata[gclid]", gclid ?? "");

    items.forEach((item, i) => {
      params.append(`line_items[${i}][price_data][currency]`, "eur");
      params.append(
        `line_items[${i}][price_data][unit_amount]`,
        String(Math.round(item.price * 100))
      );
      params.append(
        `line_items[${i}][price_data][product_data][name]`,
        item.name
      );
      if (item.image?.startsWith("https://")) {
        params.append(
          `line_items[${i}][price_data][product_data][images][0]`,
          item.image
        );
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
