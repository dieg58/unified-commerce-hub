import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

export interface LogoPlacement {
  x: number;      // % from left
  y: number;      // % from top
  width: number;  // % of container width
  rotation: number;
  blend: string;
  opacity: number;
}

interface BrandedProductImageProps {
  imageUrl?: string | null;
  logoUrl?: string | null;
  logoPlacement?: LogoPlacement | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

const BrandedProductImage = ({
  imageUrl,
  logoUrl,
  logoPlacement,
  alt = "Product",
  className,
  imgClassName,
}: BrandedProductImageProps) => {
  const showOverlay = logoUrl && logoPlacement;

  return (
    <div className={cn("relative overflow-hidden", className)}>
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
            transform: `translate(-50%, -50%) rotate(${logoPlacement.rotation || 0}deg)`,
            mixBlendMode: (logoPlacement.blend || "multiply") as any,
            opacity: logoPlacement.opacity ?? 0.85,
            maxHeight: "40%",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
};

export default BrandedProductImage;
