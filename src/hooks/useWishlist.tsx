import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useWishlist = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", profile!.id);
      if (error) throw error;
      return data.map((w) => w.product_id);
    },
    enabled: !!profile?.id,
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      const isFav = wishlistItems.includes(productId);
      if (isFav) {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", profile!.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wishlist_items")
          .insert({ user_id: profile!.id, product_id: productId, tenant_id: tenantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist", profile?.id] }),
  });

  const isFavorite = (productId: string) => wishlistItems.includes(productId);

  return { wishlistItems, toggleFavorite: toggle.mutate, isFavorite, isToggling: toggle.isPending };
};
