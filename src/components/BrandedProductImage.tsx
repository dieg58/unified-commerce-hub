import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

export interface LogoPlacement {
  x: number;      // % from left
  y: number;      // % from top
  width: number;  // % of container width (max width)
  maxHeight?: number; // % of container height (max height)
  rotation: number;
  blend: string;
  opacity: number;
  mode?: "light" | "dark"; // light = colored logo, dark = white logo
}

interface BrandedProductImageProps {
  imageUrl?: string | null;
  logoUrl?: string | null;
  logoPlacement?: LogoPlacement | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Class applied to the inner wrapper that contains both image and logo overlay */
  innerClassName?: string;
}

const BrandedProductImage = ({
  imageUrl,
  logoUrl,
  logoPlacement,
  alt = "Product",
  className,
  imgClassName,
  innerClassName,
}: BrandedProductImageProps) => {
  const showOverlay = logoUrl && logoPlacement;
  const isDarkBg = logoPlacement?.mode === "dark";

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className={cn("relative w-full h-full", innerClassName)}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className={cn("w-full h-full object-cover", imgClassName)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-muted-foreground/15" />
          </div>
        )}
        {showOverlay && (
          <img
            src={logoUrl}
            alt="Logo"
            className="absolute pointer-events-none select-none"
            style={{
              left: `${logoPlacement.x}%`,
              top: `${logoPlacement.y}%`,
              width: `${logoPlacement.width}%`,
              height: `${logoPlacement.maxHeight ?? 40}%`,
              transform: `translate(-50%, -50%) rotate(${logoPlacement.rotation || 0}deg)`,
              mixBlendMode: (isDarkBg ? "screen" : (logoPlacement.blend || "multiply")) as any,
              opacity: logoPlacement.opacity ?? 0.85,
              filter: isDarkBg ? "brightness(100)" : "none",
              objectFit: "contain",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BrandedProductImage;
