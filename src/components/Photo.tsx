import { sized } from "../lib/images";

/** Plain <img> with explicit size, lazy loading and a CDN-sized source (no client JS, no layout shift). */
export function Photo({ src, alt, w = 800, className, priority = false, ratio }: { src: string; alt: string; w?: number; className?: string; priority?: boolean; ratio?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={sized(src, w)} alt={alt} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" style={ratio ? { aspectRatio: ratio } : undefined} referrerPolicy="no-referrer" />;
}
