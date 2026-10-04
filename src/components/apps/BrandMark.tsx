import type { Brand } from '@/lib/brands';

/** A brand's real logo (SVG, in the current text colour), or its fallback mark. */
export function BrandMark({ brand, size = 20 }: { brand: Brand; size?: number }) {
  if (!brand.logo) {
    return (
      <span aria-hidden className="font-bold leading-none" style={{ fontSize: size * 0.9 }}>
        {brand.glyph}
      </span>
    );
  }
  return (
    <svg aria-hidden viewBox={brand.logo.viewBox} width={size} height={size} fill="currentColor" className="block">
      <path d={brand.logo.path} />
    </svg>
  );
}
