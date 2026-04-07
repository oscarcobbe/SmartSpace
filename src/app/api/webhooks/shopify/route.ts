import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const order = await request.json();

    const customerName = `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || "Customer";
    const email = order.customer?.email || order.email || "";
    const orderId = order.name || order.id?.toString();

    console.log("🛒 Order received:", { orderId, customerName, email });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
