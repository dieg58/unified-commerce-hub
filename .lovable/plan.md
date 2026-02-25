

# Plan: Fonctionnalites manquantes et ameliorations restantes

Apres analyse complete du code actuel, voici les lacunes et ameliorations identifiees, classees par priorite.

---

## Section 1 -- Bugs et corrections critiques

### 1.1 Settings super-admin non persistees en base
**Fichier**: `src/pages/SettingsPage.tsx` (lignes 27-51)
Les parametres generaux (nom plateforme, email support, devise, langue, securite) utilisent un `setTimeout` simule. Rien n'est sauvegarde.

**Plan**:
- Creer une table `platform_settings` (cle/valeur) via migration SQL avec RLS super_admin uniquement
- Charger les valeurs depuis la base au montage du composant
- Remplacer le `handleSave` simule par un vrai upsert

### 1.2 TenantStats non traduit
**Fichier**: `src/pages/tenant/TenantStats.tsx` (lignes 20-26)
Les presets de periode ("7 jours", "30 jours", "Ce mois", "Mois dernier") et d'autres labels sont codes en dur en francais. La locale `date-fns` est aussi fixee a `fr`.

**Plan**:
- Remplacer les labels par des cles `t()` 
- Utiliser `useLocaleDate` pour la locale dynamique de date-fns

### 1.3 NotificationBell partiellement non traduit
**Fichier**: `src/components/NotificationBell.tsx` (lignes 116-130)
"Notifications", "Tout lire", "Aucune notification", et les temps relatifs ("now", "m ago", "h ago") sont en dur (melange FR/EN).

**Plan**:
- Remplacer par des cles i18n
- Adapter `timeAgo` pour utiliser les traductions

### 1.4 EntitiesTab (tenant-detail) non traduit
**Fichier**: `src/components/tenant-detail/EntitiesTab.tsx`
Tous les headers et labels ("Entites", "Nom", "Code", "TVA", "Approbation", "Requise", "A la commande", etc.) sont en francais dur.

**Plan**:
- Remplacer par des cles `t()`

---

## Section 2 -- Fonctionnalites manquantes importantes

### 2.1 Notifications automatiques a la creation de commande
**Situation**: La table `notifications` est en Realtime mais aucune notification n'est creee automatiquement quand une commande est passee ou quand son statut change.

**Plan**:
- Creer un trigger SQL `after INSERT on orders` qui insere une notification pour le shop_manager du tenant
- Creer un trigger SQL `after UPDATE on orders` (changement de statut) qui insere une notification pour le createur de la commande
- Le Realtime existant dans `NotificationBell.tsx` prendra en charge l'affichage instantane

### 2.2 Historique des mouvements de stock dans l'interface tenant
**Situation**: La table `stock_movements` existe et est remplie mais aucune page ne l'affiche.

**Plan**:
- Ajouter un onglet ou section dans `TenantProducts` qui affiche l'historique des mouvements de stock (entrees, sorties, ajustements) avec filtres par produit et par date

### 2.3 Recherche et filtre sur TenantOrders
**Situation**: La page commandes tenant n'a pas de champ de recherche par nom d'utilisateur ou numero de commande.

**Plan**:
- Ajouter un `Input` de recherche dans le header des tabs qui filtre les commandes par ID partiel, nom d'utilisateur ou email

### 2.4 Re-commander un panier precedent (employee)
**Situation**: L'employe peut voir ses commandes passees mais ne peut pas en refaire une identique.

**Plan**:
- Ajouter un bouton "Re-commander" dans `MyOrders` qui charge les articles de la commande dans le panier actuel

---

## Section 3 -- Ameliorations UX recommandees

### 3.1 Pagination sur la page Tenants (super-admin)
**Fichier**: `src/pages/Tenants.tsx`
Actuellement, tous les tenants sont charges sans pagination, risquant une troncature a 1000 lignes.

**Plan**:
- Implementer la pagination serveur avec `.range()` et `count: "exact"`, comme deja fait pour Orders

### 3.2 Indicateur de budget consomme dans la liste des entites (tenant)
**Situation**: La page `TenantEntities` affiche les entites mais sans indicateur de budget restant.

**Plan**:
- Joindre la table `budgets` aux entites et afficher une barre de progression budget consomme/total

### 3.3 Validation explicite du checkout
**Situation**: Si l'employe clique "Confirmer" sans entite selectionnee, le bouton est silencieusement desactive. Pas de message d'erreur.

**Plan**:
- Ajouter des messages d'erreur visuels (texte rouge sous les selects vides) quand l'utilisateur tente de soumettre sans selection

### 3.4 Double store type selector -- simplifier
**Situation**: Il y a un toggle dans le header ET un selecteur plus gros sous le hero. Redondance.

**Plan**:
- Supprimer le selecteur secondaire sous le hero
- Garder uniquement le toggle compact dans le header

### 3.5 Confirmation avant vidage du panier au changement de store type
**Situation**: Le `confirm()` natif du navigateur est utilise. Pas homogene avec le reste de l'UI.

**Plan**:
- Remplacer par un `AlertDialog` Radix (composant deja installe) avec le meme message

---

## Section 4 -- Details techniques

### Migration SQL necessaire

```text
Table: platform_settings
  id         uuid PK default gen_random_uuid()
  key        text UNIQUE NOT NULL
  value      text
  updated_at timestamptz default now()

RLS: super_admin ALL only

Trigger: notify_on_order_insert
  AFTER INSERT ON orders
  -> INSERT INTO notifications (tenant_id, title, body, type, link)

Trigger: notify_on_order_status_change
  AFTER UPDATE OF status ON orders
  -> INSERT INTO notifications (user_id, title, body, type, link)
```

### Fichiers a modifier
| Fichier | Changement |
|---|---|
| `src/pages/SettingsPage.tsx` | Persistence reelle des settings |
| `src/pages/tenant/TenantStats.tsx` | i18n complet |
| `src/components/NotificationBell.tsx` | i18n + timeAgo traduit |
| `src/components/tenant-detail/EntitiesTab.tsx` | i18n |
| `src/pages/tenant/TenantOrders.tsx` | Ajout champ recherche |
| `src/pages/shop/MyOrders.tsx` | Bouton re-commander |
| `src/pages/Tenants.tsx` | Pagination serveur |
| `src/pages/tenant/TenantEntities.tsx` | Indicateur budget |
| `src/pages/Storefront.tsx` | Supprimer double selector, AlertDialog pour clear, validation checkout |
| `src/i18n/locales/*.json` | Nouvelles cles |

### Ordre d'implementation recommande
1. Migration SQL (table + triggers)
2. Settings persistence
3. Notifications automatiques (triggers)
4. i18n restant (TenantStats, NotificationBell, EntitiesTab)
5. Recherche TenantOrders
6. Pagination Tenants
7. UX Storefront (double selector, AlertDialog, validation)
8. Re-commander + indicateur budget entites

