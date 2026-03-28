import Link from "next/link";
import { ShopifyProduct } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";

function displayTitle(title: string): string {
  return title.replace(/\(Budget\)/gi, "(Plus)").replace(/\(Premium\)/gi, "(Pro)");
}

export default function ProductCard({ product }: { product: ShopifyProduct }) {
  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  const comparePrice = parseFloat(product.compareAtPriceRange?.minVariantPrice?.amount || "0");
  const hasDiscount = comparePrice > 0 && comparePrice > price;
  const shopifyImage = product.images.edges[0]?.node;
  const imageUrl = getProductImage(product.handle, shopifyImage?.url);

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group block bg-transparent rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square flex items-center justify-center mb-4">
        {hasDiscount && (
          <span className="absolute top-0 left-0 bg-brand-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
            Save &euro;{(comparePrice - price).toFixed(0)}
          </span>
        )}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.title}
            className="w-3/4 h-3/4 object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-3/4 h-3/4 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-bold text-[#1a1a1a] text-sm mb-1.5 group-hover:text-brand-500 transition-colors">
        {displayTitle(product.title)}
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-extrabold text-[#1a1a1a]">
          &euro;{price.toFixed(2)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-[#999] line-through">
            &euro;{comparePrice.toFixed(2)}
          </span>
        )}
      </div>
    </Link>
  );
}
