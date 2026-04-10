"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Check, Loader2 } from "lucide-react";

interface AddToCartButtonProps {
  productId: string;
  name: string;
  price: number;
  image: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  disabledText?: string;
}

export default function AddToCartButton({
  productId,
  name,
  price,
  image,
  className = "",
  size = "md",
  disabled,
  disabledText,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle");

  const handleClick = async () => {
    setStatus("loading");
    addItem({ productId, name, price, image, quantity: 1 });
    setStatus("added");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const sizeClasses = {
    sm: "text-xs px-4 py-2",
    md: "text-sm px-6 py-2.5",
    lg: "text-sm px-8 py-3.5",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all ${sizeClasses[size]} ${
        status === "added"
          ? "bg-green-500 text-white"
          : "bg-brand-500 hover:bg-brand-600 text-white"
      } disabled:opacity-70 ${className}`}
    >
      {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === "added" && <Check className="w-4 h-4" />}
      {status === "idle" && <ShoppingBag className="w-4 h-4" />}
      {status === "loading"
        ? "Adding..."
        : status === "added"
        ? "Added!"
        : disabled && disabledText
        ? disabledText
        : "Add to Cart"}
    </button>
  );
}
