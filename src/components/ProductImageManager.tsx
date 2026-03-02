import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

/** Pending file not yet uploaded (for new products) */
export interface PendingImage {
  file: File;
  preview: string;
  id: string; // temp id
}

interface ProductImageManagerProps {
  /** Existing saved images (from DB) */
  existingImages: ProductImage[];
  /** Pending files queued for upload (new product flow) */
  pendingImages: PendingImage[];
  onPendingImagesChange: (images: PendingImage[]) => void;
  /** Called after an existing image is deleted from DB */
  onExistingImagesChange: (images: ProductImage[]) => void;
  /** Tenant & product IDs for direct upload/delete (edit flow) */
  tenantId?: string;
  productId?: string;
  /** If true, uploads happen immediately (edit mode) */
  immediateUpload?: boolean;
  onImageUploaded?: (img: ProductImage) => void;
  disabled?: boolean;
}

const ProductImageManager = ({
  existingImages,
  pendingImages,
  onPendingImagesChange,
  onExistingImagesChange,
  tenantId,
  productId,
  immediateUpload = false,
  onImageUploaded,
  disabled = false,
}: ProductImageManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const allItems = [
    ...existingImages.map((img) => ({ type: "existing" as const, ...img })),
    ...pendingImages.map((img) => ({ type: "pending" as const, id: img.id, image_url: img.preview, sort_order: existingImages.length + pendingImages.indexOf(img) })),
  ];

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (newFiles.length === 0) return;

    if (immediateUpload && tenantId && productId) {
      setUploading(true);
      try {
        for (const file of newFiles) {
          const ext = file.name.split(".").pop();
          const path = `${tenantId}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const { error } = await supabase.storage.from("product-images").upload(path, file);
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
          
          const nextOrder = existingImages.length;
          const { data: imgRow, error: dbErr } = await supabase
            .from("product_images")
            .insert({ product_id: productId, tenant_id: tenantId, image_url: publicUrl, sort_order: nextOrder })
            .select()
            .single();
          if (dbErr) throw dbErr;
          onImageUploaded?.({ id: imgRow.id, image_url: imgRow.image_url, sort_order: imgRow.sort_order });
        }
        toast.success(`${newFiles.length} image(s) ajoutée(s)`);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setUploading(false);
      }
    } else {
      // Queue as pending
      const newPending: PendingImage[] = newFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
      onPendingImagesChange([...pendingImages, ...newPending]);
    }
  }, [immediateUpload, tenantId, productId, existingImages, pendingImages, onPendingImagesChange, onImageUploaded]);

  const deleteExisting = async (img: ProductImage) => {
    try {
      await supabase.from("product_images").delete().eq("id", img.id);
      // Try to delete from storage too
      const urlParts = img.image_url.split("/product-images/");
      if (urlParts[1]) {
        await supabase.storage.from("product-images").remove([decodeURIComponent(urlParts[1])]);
      }
      onExistingImagesChange(existingImages.filter((i) => i.id !== img.id));
      toast.success("Image supprimée");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deletePending = (id: string) => {
    const img = pendingImages.find(p => p.id === id);
    if (img) URL.revokeObjectURL(img.preview);
    onPendingImagesChange(pendingImages.filter((p) => p.id !== id));
  };

  // Drag & drop reorder for existing images
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = async () => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const existingCount = existingImages.length;
    const pendingCount = pendingImages.length;

    // Work with combined list
    const combined = [...allItems];
    const [moved] = combined.splice(dragIdx, 1);
    combined.splice(dragOverIdx, 0, moved);

    // Split back
    const newExisting = combined.filter(i => i.type === "existing").map((i, idx) => ({ id: i.id, image_url: i.image_url, sort_order: idx }));
    const newPendingIds = combined.filter(i => i.type === "pending").map(i => i.id);
    const newPending = newPendingIds.map((id, idx) => pendingImages.find(p => p.id === id)!).filter(Boolean);

    onExistingImagesChange(newExisting);
    onPendingImagesChange(newPending);

    // Persist sort order for existing images
    for (const img of newExisting) {
      await supabase.from("product_images").update({ sort_order: img.sort_order }).eq("id", img.id);
    }

    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Images produit</label>
        <span className="text-xs text-muted-foreground">{allItems.length} image(s)</span>
      </div>

      {allItems.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {allItems.map((item, idx) => (
            <div
              key={item.id}
              draggable={!disabled}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group aspect-square rounded-lg border-2 overflow-hidden bg-muted/30 transition-all cursor-grab active:cursor-grabbing",
                dragOverIdx === idx && "border-primary scale-105",
                dragIdx === idx && "opacity-40",
                idx === 0 && "ring-2 ring-primary/30",
                "border-border"
              )}
            >
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded">
                  Principale
                </span>
              )}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  type="button"
                  onClick={() => item.type === "existing" ? deleteExisting(item as ProductImage) : deletePending(item.id)}
                  className="w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity">
                <GripVertical className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      )}

      <label className={cn(
        "flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {uploading ? "Upload en cours…" : "Ajouter des images"}
        </span>
      </label>
      
      {allItems.length > 1 && (
        <p className="text-[10px] text-muted-foreground">Glissez-déposez pour réorganiser. La première image est l'image principale.</p>
      )}
    </div>
  );
};

export default ProductImageManager;

/** Upload pending images for a newly created product, returns the URLs */
export async function uploadPendingImages(
  tenantId: string,
  productId: string,
  pendingImages: PendingImage[]
): Promise<ProductImage[]> {
  const results: ProductImage[] = [];
  for (let i = 0; i < pendingImages.length; i++) {
    const pending = pendingImages[i];
    const ext = pending.file.name.split(".").pop();
    const path = `${tenantId}/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, pending.file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    
    const { data: imgRow, error: dbErr } = await supabase
      .from("product_images")
      .insert({ product_id: productId, tenant_id: tenantId, image_url: publicUrl, sort_order: i })
      .select()
      .single();
    if (dbErr) throw dbErr;
    results.push({ id: imgRow.id, image_url: imgRow.image_url, sort_order: imgRow.sort_order });
  }
  // Set the first image as the product's main image_url for backward compat
  if (results.length > 0) {
    await supabase.from("products").update({ image_url: results[0].image_url }).eq("id", productId);
  }
  return results;
}
