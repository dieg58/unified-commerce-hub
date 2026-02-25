

# Audit complet de l'application INKOO B2B

Analyse approfondie des 4 parties de l'application avec recommandations classées par priorite.

---

## 1. LANDING PAGE (Front public)

### Bugs / Corrections urgentes
- **Textes non traduits** : Les contenus de la landing (features, testimonials, stats, "Comment ca marche") sont codés en dur en français. Ils devraient utiliser `t()` pour supporter le multilingue (EN/NL sont configurés).
- **Faux témoignages** : Les noms de clients (Véolia, Bouygues, Accor) et statistiques (500+ marques, 2M+ articles) sont fictifs. A remplacer par de vraies données ou supprimer la section.
- **Marquee infini** : L'animation du ticker de logos n'a pas de `animation-iteration-count: infinite` vérifiable ; sur certains navigateurs elle peut se figer.

### Améliorations UX
- **Navigation mobile** : Le `nav` principal est masqué en mobile (`hidden md:flex`) mais aucun hamburger menu n'est proposé. Les utilisateurs mobiles n'ont que les boutons Login/Demo.
- **Ancres de navigation** : Les liens `#services`, `#platform`, etc. pointent vers des ancres mais il n'y a pas de smooth scroll configuré dans le CSS global.
- **SEO** : Pas de balises meta (description, og:image, og:title) dans `index.html`. Le `<title>` est probablement générique.
- **Accessibilite** : Les images du hero et du PlatformShowcase n'ont pas toutes des `alt` descriptifs. Les contrastes sur la section "Comment ca marche" (texte blanc sur fond primaire) meritent verification.

### Ajouts recommandés
- **Section FAQ** avec un accordion (composant déjà installé via Radix) pour répondre aux questions fréquentes.
- **Logos réels de fournisseurs** (Midocean, Stanley/Stella, PF Concept, TopTex) au lieu de noms textuels.
- **Formulaire de contact** simplifié en footer (actuellement seul le DemoRequestDialog existe).
- **Page mentions légales / CGV** accessible depuis le footer.

---

## 2. SUPER ADMIN (`/dashboard`, `/tenants`, `/orders`, `/catalog-products`, `/settings`)

### Bugs / Corrections urgentes
- **Settings non persistées** : La page `/settings` (SettingsPage.tsx) utilise un `setTimeout` simulé pour le save. Les paramètres (nom plateforme, email support, devise, langue, sécurité) ne sont PAS sauvegardés en base. C'est purement cosmétique.
- **FK manquante dans la query Dashboard** : `orders_created_by_profiles_fkey` est référencée mais aucune FK explicite n'est définie dans le schéma entre `orders.created_by` et `profiles.id`. Si cette FK n'existe pas côté DB, la jointure échouera silencieusement.
- **Pagination absente** : Les queries `orders`, `tenants`, `profiles` chargent tout sans pagination. Avec la limite Supabase de 1000 lignes, les données seront tronquées silencieusement au-delà.
- **Subdomain affiché incorrectement** : Dans Tenants.tsx, le domaine est affiché comme `{slug}.domain.com` (ligne 151) au lieu de `{slug}.inkoo.eu`.

### Améliorations UX
- **Dashboard** : Ajouter un graphique de tendance (recharts est installé mais non utilisé ici) pour les commandes par semaine/mois.
- **Orders** : Permettre l'export CSV/PDF des commandes filtrées (comme c'est fait pour TenantOrders, mais pas pour la vue globale).
- **TenantDetail** : Le fichier fait 2000+ lignes. Refactoriser en composants séparés (UsersTab, ProductsTab, etc. dans des fichiers dédiés) pour la maintenabilité.
- **Notifications** : Le NotificationBell est présent dans le TopBar mais son fonctionnement temps réel (Supabase Realtime) n'est pas configuré. Les notifications ne se rafraîchissent qu'au rechargement.
- **Recherche globale** : Le champ de recherche dans le TopBar est purement visuel, il ne filtre rien.

### Ajouts recommandés
- **Logs d'activité** : Journal des actions admin (qui a approuvé quoi, quand) pour l'audit trail.
- **Gestion des stocks globale** : Vue consolidée des stocks bas sur tous les tenants.
- **Tableau de bord analytique** : Revenus par tenant, tendances, top produits, taux de conversion.

---

## 3. GESTION BOUTIQUE (`/tenant/*` — shop_manager / dept_manager)

### Bugs / Corrections urgentes
- **TenantDashboard non traduit** : Les textes "Tableau de bord", "Commandes", "Chiffre d'affaires", "Actions requises", etc. sont codés en dur en français (pas de `t()`).
- **TenantOrders non traduit** : Idem — tous les labels ("Toutes", "En attente", "Interne", "Employé", "Aucune commande") sont en dur.
- **TenantProducts non traduit** : Même problème.
- **TenantSettings non traduit** : Même problème.
- **dept_manager limité** : Le sidebar montre Orders/Approvals/Stats mais le dept_manager ne peut pas voir le détail d'une commande (`/orders/:orderId`) car cette route n'est pas dans les routes tenant en mode subdomain.
- **Lien "Voir détail" cassé** : Dans TenantOrders, le lien `navigate(/orders/${order.id})` pointe vers la route super-admin. Les shop_managers en mode subdomain n'y ont pas accès.

### Améliorations UX
- **Produits** : Ajouter la possibilité de modifier le prix depuis la vue produits (actuellement seul le toggle bulk/staff est disponible).
- **Commandes** : Ajouter une recherche par nom d'utilisateur ou numéro de commande.
- **Entités** : Afficher un indicateur de budget consommé/restant directement dans la liste des entités.
- **Stats** : La page TenantStats existe mais n'a pas été lue — vérifier qu'elle utilise recharts pour des graphiques utiles.
- **Codes promo** : Ajouter un indicateur visuel pour les codes expirés vs actifs.

### Ajouts recommandés
- **Route détail commande** dédiée pour le tenant (`/tenant/orders/:orderId`) avec les mêmes infos que la vue super-admin.
- **Historique des modifications** de stock (la table `stock_movements` existe mais n'est pas utilisée dans l'interface tenant).
- **Notification en temps réel** quand une nouvelle commande arrive (Supabase Realtime sur `orders`).
- **Import CSV** de produits en masse.

---

## 4. ESPACE EMPLOYE (`/shop`, `/shop/orders`, `/shop/wishlist`, `/shop/profile`)

### Bugs / Corrections urgentes
- **Pas de sidebar pour les employés** : Le StorefrontLayout masque complètement le sidebar (`showSidebar` = false pour les employés). Les employés n'ont AUCUNE navigation visible pour accéder à Wishlist, Orders ou Profile depuis le storefront. Ils sont bloqués sur la boutique.
- **Panier vidé au changement de store type** : `clear()` est appelé quand on switch entre Bulk/Staff. Les utilisateurs perdent leur panier sans avertissement ni confirmation.
- **Double store type selector** : Il y a un toggle en header ET un sélecteur plus gros en dessous du hero. Redondance confuse.
- **Checkout sans validation** : L'entité de facturation et l'entité de livraison sont obligatoires mais aucun message d'erreur n'est affiché si l'utilisateur clique "Confirmer" sans les avoir sélectionnées (le bouton est juste désactivé silencieusement).

### Améliorations UX
- **Navigation employé** : Ajouter une barre de navigation minimale (tabs ou bottom nav mobile) avec les liens Shop / Wishlist / Commandes / Profil.
- **Page produit détaillée** : Actuellement pas de vue détail produit (pas de route `/shop/product/:id`). L'employé ne voit que la grille avec description tronquée.
- **Confirmation de commande** : Après checkout réussi, rediriger vers une page de confirmation ou afficher un récapitulatif plutôt qu'un simple toast.
- **Images dans le panier** : Le panier affiche un placeholder générique pour tous les produits au lieu de la vraie image produit.
- **Budget personnel** : La table `user_budgets` existe mais n'est pas utilisée dans l'interface employé. L'employé ne sait pas combien il lui reste.
- **Responsive** : Le storefront est globalement fonctionnel en mobile mais le checkout dialog est difficile à utiliser sur petit écran (beaucoup de dropdowns).

### Ajouts recommandés
- **Barre de navigation bottom** pour mobile (Shop / Favoris / Commandes / Profil) visible pour les employés.
- **Page détail produit** avec description complète, galerie d'images, variantes et avis.
- **Historique de réapprovisionnement** de commande (re-commander un panier précédent).
- **Affichage du budget restant** de l'employé dans le header ou le panier.
- **Notifications push** (ou in-app) quand le statut d'une commande change.

---

## Vérifications transversales recommandées

| Verification | Statut |
|---|---|
| RLS policies couvrent tous les cas CRUD | A vérifier — les policies `RESTRICTIVE` (`No`) sont correctement en place mais l'absence de policy `INSERT` sur certaines tables (addresses, billing_profiles) pourrait bloquer des opérations légitimes |
| Queries limitées a 1000 rows | Non géré — aucune pagination implémentée |
| Traductions EN/NL complètes | A vérifier — de nombreuses pages utilisent des strings en dur en français |
| Mobile responsive | Partiellement — le storefront est OK, les admin panels ne sont pas testés mobile |
| Performance (bundle size) | TenantDetail.tsx (2000 lignes) devrait être code-split |
| Edge Functions error handling | Les appels `supabase.functions.invoke` dans les mutations utilisent `.catch(console.warn)` — les erreurs sont silencieuses |
| Données orphelines | Pas de cascade delete configurée entre orders/order_items (FK non déclarées dans le schéma visible) |

