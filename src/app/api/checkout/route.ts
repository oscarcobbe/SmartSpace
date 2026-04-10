import { NextResponse } from "next/server";
import Stripe from "stripe";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as any);

    const totalEur = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "eur",
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            ...(item.image?.startsWith("https://") ? { images: [item.image] } : {}),
          },
        },
        quantity: item.quantity,
      })),
      success_url: `https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}&amount=${totalEur.toFixed(2)}`,
      cancel_url: "https://smart-space.ie",
      metadata: { gclid: gclid ?? "" },
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["IE"] },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe checkout error:", message, err);
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}
