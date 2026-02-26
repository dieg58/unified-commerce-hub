

# Plan : Produits demo avec logo realiste via IA generative

## Approche

Utiliser le modele **Gemini 3 Pro Image Preview** (disponible nativement via Lovable AI, pas besoin de cle API) pour generer des packshots realistes ou le logo du client est imprime/brode/serigraphie sur chaque produit, comme un vrai marquage.

Au lieu d'une simple superposition d'image (overlay), l'IA recoit l'image du produit + le logo et genere une nouvelle image ou le logo est integre de maniere realiste (respect des plis du textile, perspective, ombres).

```text
CreateTenantWizard                    Edge Function: seed-demo-products
─────────────────                    ────────────────────────────────────
  handleCreate()                     Pour chaque produit demo :
    1. Create tenant                   1. Fetch image de base (asset demo)
    2. Create branding                 2. Fetch logo client
    3. Create entities                 3. Appel Gemini Image via Lovable AI :
    4. ──invoke (fire & forget)──▶        prompt = "Place this logo on the
                                          [t-shirt/mug/bag] as if it were
                                          really printed/embroidered"
                                       4. Upload image generee → Storage
                                       5. Insert produit + prix dans DB
```

## Modifications prevues

### 1. Nouveau fichier : `supabase/functions/seed-demo-products/index.ts`

Edge Function qui :
- Recoit `tenant_id`, `entity_id`, `logo_url` en body
- Definit 20 produits demo avec metadata (nom, SKU, categorie, prix, type de marquage)
- Pour chaque produit :
  - Telecharge l'image de base depuis l'URL publique de l'app (`/assets/demo/xxx.jpg`)
  - Telecharge le logo du client
  - Convertit les deux images en base64
  - Appelle **Gemini 3 Pro Image Preview** via l'API Lovable AI avec un prompt contextuel par type de produit :
    - Textile (t-shirt, polo, hoodie) : "Place this logo on the chest area of this [product] as if it were screen-printed or embroidered. Maintain fabric texture, folds and shadows."
    - Drinkware (mug, gourde) : "Place this logo on this [product] as if it were printed directly on the surface. Respect the curvature and reflections."
    - Accessoires (sac, tote bag) : "Place this logo centered on this [product] as if it were printed or sewn on."
    - Papeterie (carnet, stylo) : "Place this logo on this [product] as if it were pad-printed or laser-engraved."
  - Upload l'image generee dans le bucket `product-images` sous `{tenant_id}/demo-{sku}.jpg`
  - Insere le produit dans la table `products`
  - Insere les prix dans `product_prices` (bulk + staff)
- **Fallback** : si le logo est absent ou si Gemini echoue sur une image, utilise l'image de base sans modification
- Retourne le nombre de produits crees

### 2. Liste des 20 produits demo

| # | Produit | SKU | Image base | Categorie | Prix | Marquage |
|---|---|---|---|---|---|---|
| 1 | T-Shirt Classic | DEMO-TSHIRT | tshirt.jpg | textile | 12.50 | serigraphie poitrine |
| 2 | Polo Premium | DEMO-POLO | polo.jpg | textile | 24.90 | broderie poitrine |
| 3 | Hoodie Confort | DEMO-HOODIE | hoodie.jpg | textile | 35.00 | serigraphie poitrine |
| 4 | Veste Softshell | DEMO-JACKET | jacket.jpg | textile | 45.00 | broderie poitrine |
| 5 | Casquette Brodee | DEMO-CAP | cap.jpg | accessories | 9.90 | broderie face |
| 6 | Tablier Pro | DEMO-APRON | apron.jpg | textile | 18.00 | serigraphie centre |
| 7 | Badge Nominatif | DEMO-BADGE | badge.jpg | accessories | 3.50 | impression |
| 8 | Sac a Dos | DEMO-BAG | bag.jpg | bags | 22.00 | broderie face |
| 9 | Gourde Isotherme | DEMO-BOTTLE | bottle.jpg | drinkware | 15.00 | gravure laser |
| 10 | Tote Bag | DEMO-TOTEBAG | totebag.jpg | bags | 8.50 | serigraphie centre |
| 11 | Mug Ceramique | DEMO-MUG | mug.jpg | drinkware | 7.90 | impression sublimation |
| 12 | Carnet A5 | DEMO-NOTEBOOK | notebook.jpg | stationery | 6.50 | marquage a chaud |
| 13 | Stylo Metal | DEMO-PEN | pen.jpg | stationery | 4.20 | gravure laser |
| 14 | Lanyard | DEMO-LANYARD | lanyard.jpg | accessories | 2.80 | impression sublimation |
| 15 | T-Shirt Col V | DEMO-TSHIRT-V | tshirt.jpg | textile | 13.50 | serigraphie poitrine |
| 16 | Polo Femme | DEMO-POLO-F | polo.jpg | textile | 24.90 | broderie poitrine |
| 17 | Hoodie Zip | DEMO-HOODIE-Z | hoodie.jpg | textile | 38.00 | serigraphie poitrine |
| 18 | Mug XL | DEMO-MUG-XL | mug.jpg | drinkware | 9.90 | impression sublimation |
| 19 | Stylo Bille | DEMO-PEN-B | pen.jpg | stationery | 2.50 | tampographie |
| 20 | Sac Shopping | DEMO-BAG-S | totebag.jpg | bags | 11.00 | serigraphie centre |

### 3. Appel Gemini Image — Detail technique

L'edge function utilise le secret `LOVABLE_API_KEY` (deja configure) pour appeler l'API Lovable AI :

```typescript
const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-pro-image-preview",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${productImageB64}` } },
        { type: "image_url", image_url: { url: `data:image/png;base64,${logoB64}` } },
      ],
    }],
  }),
});
```

Le prompt sera specifique au type de produit pour un resultat realiste. L'image generee est extraite de la reponse et uploadee dans Storage.

### 4. Modification de `src/components/tenants/CreateTenantWizard.tsx`

Dans `handleCreate()`, apres la creation des entites, ajouter :

```typescript
// Fire-and-forget: seed demo products in background
if (logoUrl) {
  supabase.functions.invoke("seed-demo-products", {
    body: {
      tenant_id: tenant.id,
      entity_id: firstEntityId,
      logo_url: logoUrl,
      app_url: window.location.origin,
    },
  }).then(() => {
    toast.success("20 produits démo personnalisés ajoutés !");
  }).catch((err) => {
    console.error("Demo seed error:", err);
  });
  toast.info("Génération des produits démo en cours...", {
    description: "Les packshots personnalisés avec votre logo seront prêts dans quelques instants.",
  });
}
```

### 5. Mise a jour de `supabase/config.toml`

Ajouter la declaration de la nouvelle function (gere automatiquement).

## Gestion des erreurs et fallbacks

- Si `logo_url` est vide → on insere les produits avec les images de base, sans generation IA
- Si Gemini echoue sur un produit specifique → on utilise l'image de base pour ce produit et on continue avec les autres
- Timeout global de 120s pour la generation des 20 images (traitement sequentiel avec ~5s par image)
- Les produits sont inseres au fur et a mesure (pas de transaction globale) pour que les premiers soient disponibles rapidement

## Fichiers impactes

| Fichier | Action |
|---|---|
| `supabase/functions/seed-demo-products/index.ts` | Nouveau |
| `src/components/tenants/CreateTenantWizard.tsx` | Modifier — appel post-creation |

