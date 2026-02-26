

# Plan : Optimisation SEO & GEO complète pour INKOO B2B

## Contexte actuel

L'application est une SPA React sans aucune optimisation SEO :
- Pas de balises `<title>` dynamiques par page
- Pas de sitemap.xml
- robots.txt basique sans lien sitemap
- Pas de données structurées (JSON-LD / Schema.org)
- `<html lang="en">` alors que le contenu est en français par défaut
- Pas de balises `hreflang` pour le multilingue (fr/nl/en)
- Pas de balises canonical
- Pas de meta geo pour le GEO (localisation géographique)
- Open Graph et Twitter Cards statiques (pas dynamiques par page)

## Modifications prévues

### 1. Composant SEO réutilisable (`src/components/SEOHead.tsx`)

Creer un composant qui utilise `document.title` et manipule les meta tags du `<head>` dynamiquement via `useEffect` :
- `title` dynamique par page
- `meta description` dynamique
- `canonical` URL
- Open Graph (`og:title`, `og:description`, `og:url`, `og:image`, `og:locale`)
- Twitter Cards
- `hreflang` alternates (fr, nl, en)
- Meta geo-tags (`geo.region`, `geo.placename`, `geo.position`, `ICBM`)

### 2. Mise a jour de `index.html`

- Changer `lang="en"` en `lang="fr"` (langue par defaut)
- Ajouter les meta geo statiques pour INKOO (Belgique)
- Ajouter le lien canonical par defaut
- Ajouter le JSON-LD `Organization` inline

### 3. Donnees structurees JSON-LD (Schema.org)

Injecter via le composant SEO :
- **Organization** : nom, logo, URL, coordonnees, reseaux sociaux
- **WebSite** avec SearchAction
- **FAQPage** sur la landing page (les 6 FAQ existantes)
- **Service** pour chaque service INKOO (sourcing, webshop, stockage, expedition)

### 4. Integration du composant SEO dans les pages publiques

- **LandingPage** : titre principal + description riche + FAQ structured data
- **Login** : titre "Connexion — INKOO B2B"
- **NotFound** : titre "Page introuvable — INKOO B2B"

### 5. Sitemap statique (`public/sitemap.xml`)

```xml
<urlset>
  <url><loc>https://inkoo.eu/</loc><priority>1.0</priority></url>
  <url><loc>https://inkoo.eu/login</loc><priority>0.5</priority></url>
</urlset>
```
Avec les balises `xhtml:link` hreflang pour chaque URL.

### 6. Mise a jour de `robots.txt`

Ajouter la directive `Sitemap: https://inkoo.eu/sitemap.xml`.

### 7. Meta GEO (Geolocalisation)

Ajout des balises GEO pour positionner INKOO en Belgique :
- `geo.region` : BE
- `geo.placename` : Brussels
- `geo.position` : latitude;longitude
- `ICBM` : latitude, longitude

### 8. Lang dynamique sur `<html>`

Le composant SEO mettra a jour `document.documentElement.lang` en fonction de la langue i18next active (fr/nl/en).

## Details techniques

- Pas de dependance supplementaire (pas de react-helmet) — manipulation directe du DOM dans `useEffect` avec cleanup
- Le composant SEO sera leger (~80 lignes) et reutilisable
- Les pages protegees (dashboard, tenant, shop) n'ont pas besoin de SEO car elles sont derriere une authentification
- Le JSON-LD FAQ sera genere dynamiquement depuis les cles i18n existantes

## Fichiers impactes

| Fichier | Action |
|---|---|
| `src/components/SEOHead.tsx` | Nouveau — composant SEO reutilisable |
| `index.html` | Modifier — lang, geo, canonical, JSON-LD Organization |
| `public/robots.txt` | Modifier — ajouter Sitemap |
| `public/sitemap.xml` | Nouveau — sitemap statique |
| `src/pages/LandingPage.tsx` | Modifier — integrer SEOHead + FAQ JSON-LD |
| `src/pages/Login.tsx` | Modifier — integrer SEOHead |
| `src/pages/NotFound.tsx` | Modifier — integrer SEOHead |

