

## Plan : Gestionnaire de produits demo avec placement visuel du logo

### Approche

Abandonner completement l'approche IA (Gemini) pour le branding des produits demo. A la place :

1. **Stocker la position du logo par produit** dans une nouvelle table `demo_product_templates`
2. **Interface d'edition visuelle** avec un rectangle draggable/resizable sur chaque image produit
3. **Affichage CSS overlay** dans le storefront : le logo est superpose en temps reel via CSS

```text
┌─────────────────────────────────────────────────┐
│  Page "Produits Demo" (TenantSettings ou SA)    │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ T-Shirt  │  │  Polo    │  │ Hoodie   │      │
│  │ ┌──┐     │  │  ┌──┐    │  │  ┌──┐    │      │
│  │ │Lo│◄drag│  │  │Lo│    │  │  │Lo│    │      │
│  │ └──┘     │  │  └──┘    │  │  └──┘    │      │
│  │ x:25 y:30│  │          │  │          │      │
│  │ w:15%    │  │          │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  [+ Ajouter un produit]  [Sauvegarder tout]    │
└─────────────────────────────────────────────────┘

Storefront (lecture) :
┌────────────┐
│ product.jpg│  ← image de base
│   ┌──┐     │
│   │Lo│     │  ← logo CSS overlay (position from DB)
│   └──┘     │
└────────────┘
```

### Fichiers a creer/modifier

#### 1. Migration : table `demo_product_templates`

```sql
CREATE TABLE demo_product_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  base_image text NOT NULL,        -- ex: "tshirt.jpg"
  category text NOT NULL DEFAULT 'textile',
  price numeric NOT NULL DEFAULT 0,
  logo_x numeric NOT NULL DEFAULT 25,   -- % from left
  logo_y numeric NOT NULL DEFAULT 30,   -- % from top
  logo_width numeric NOT NULL DEFAULT 15, -- % of container width
  logo_rotation numeric NOT NULL DEFAULT 0,
  logo_blend text NOT NULL DEFAULT 'multiply',
  logo_opacity numeric NOT NULL DEFAULT 0.9,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
```

Pre-inserer les 20 produits actuels avec des placements par defaut adaptes a chaque categorie. Cette table est globale (pas par tenant), car les templates demo sont les memes pour tous.

RLS : SELECT pour tous les authentifies, ALL pour super_admin.

#### 2. Nouveau : `src/components/DemoProductEditor.tsx`

Composant principal d'edition :
- Grille de cartes, chaque carte affiche l'image de base avec le logo overlay positionne
- Clic sur une carte ouvre un dialog d'edition
- Dans le dialog : l'image est affichee en grand, le logo est un `<div>` draggable et resizable
- Utiliser `mousedown/mousemove/mouseup` natif (pas de lib externe) pour le drag
- Handles de resize aux coins du rectangle logo
- Inputs numeriques pour ajuster x, y, width, rotation, opacity en complement
- Bouton sauvegarder qui met a jour `demo_product_templates`
- Bouton "+ Ajouter un produit demo" pour creer de nouvelles entrees

#### 3. Nouveau : `src/components/BrandedProductImage.tsx`

Composant d'affichage utilise dans le storefront :
- Props : `baseImage`, `logoUrl`, `logoX`, `logoY`, `logoWidth`, `logoRotation`, `logoBlend`, `logoOpacity`, `className`
- Rendu : `<div relative>` + `<img product>` + `<img logo absolute>`
- `mix-blend-mode` et `opacity` appliques au logo
- Si pas de `logoUrl`, affiche juste l'image de base

#### 4. Modifier : `supabase/functions/seed-demo-products/index.ts`

Simplifier radicalement :
- Lire les templates depuis `demo_product_templates` au lieu de la liste hardcodee
- Pour chaque template, inserer le produit avec `image_url = baseUrl/demo/{base_image}`
- Stocker `logo_x`, `logo_y`, `logo_width`, etc. dans un champ JSONB `logo_placement` sur la table `products` (ajouter via migration)
- Supprimer toute la logique IA (Gemini), SVG conversion, image generation

#### 5. Migration : ajouter `logo_placement jsonb` a `products`

```sql
ALTER TABLE products ADD COLUMN logo_placement jsonb;
```

Ce champ stocke `{x, y, width, rotation, blend, opacity}` copie depuis le template lors du seeding. Le storefront le lit pour positionner le logo.

#### 6. Modifier : `src/pages/Storefront.tsx`

- Importer `BrandedProductImage`
- Remplacer `<img src={product.image_url}>` par `<BrandedProductImage>` en passant `product.logo_placement` et le `logoUrl` du tenant
- Quand `logo_placement` est null, afficher l'image normalement

#### 7. Modifier : `src/pages/shop/ProductDetail.tsx`

- Meme remplacement pour la page detail produit

#### 8. Modifier : `src/pages/tenant/TenantSettings.tsx`

- Ajouter une nouvelle section "Produits de demonstration" avec le composant `DemoProductEditor`
- Remplacer le bouton de regeneration actuel par l'editeur visuel complet

#### 9. Ajouter acces Super Admin

- Dans la page `TenantDetail.tsx` ou dans les settings SA, integrer aussi `DemoProductEditor` pour que les SA puissent configurer les templates globaux

### Comportement du drag & resize

Le rectangle logo dans l'editeur :
- **Drag** : `onMouseDown` capture la position initiale, `onMouseMove` met a jour `logo_x`/`logo_y` en % relatif au conteneur image
- **Resize** : handle en bas-droite, modifie `logo_width` en %
- **Contraintes** : le logo reste dans les limites de l'image (clamp 0-100%)
- **Preview temps reel** : le logo du tenant est affiche dans le rectangle pendant l'edition

### Fichiers impactes

| Fichier | Action |
|---|---|
| Migration : `demo_product_templates` + `products.logo_placement` | Creer |
| `src/components/DemoProductEditor.tsx` | Creer |
| `src/components/BrandedProductImage.tsx` | Creer |
| `supabase/functions/seed-demo-products/index.ts` | Simplifier (supprimer IA) |
| `src/pages/Storefront.tsx` | Modifier (overlay) |
| `src/pages/shop/ProductDetail.tsx` | Modifier (overlay) |
| `src/pages/tenant/TenantSettings.tsx` | Modifier (editeur) |

