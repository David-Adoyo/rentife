import Image from "next/image";
import Link from "next/link";

/** Horizontal lockup: house mark + gradient wordmark. */
export function Logo({ tone = "colour", className = "" }: { tone?: "colour" | "white"; className?: string }) {
  const suffix = tone === "white" ? "-white" : "";
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="Rentife home">
      <Image src={`/brand/rentife-mark${suffix}.png`} alt="" width={491} height={502} priority className="h-8 w-auto" />
      <Image src={`/brand/rentife-wordmark${suffix}.png`} alt="Rentife" width={409} height={101} priority className="h-6 w-auto" />
    </Link>
  );
}
