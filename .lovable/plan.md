

# Plan : Optimisation pour les résultats de recherche des LLM

## Contexte

Les LLM (ChatGPT, Perplexity, Claude, Gemini, etc.) utilisent des crawlers specifiques pour indexer le web et repondre aux requetes des utilisateurs. Pour apparaitre dans leurs resultats, il faut :

1. **Autoriser leurs crawlers** dans `robots.txt`
2. **Fournir du contenu semantique riche** que les LLM peuvent facilement extraire et comprendre
3. **Ajouter des meta-donnees specifiques** pour le Generative Engine Optimization (GEO)
4. **Creer une page `/llms.txt`** — un standard emergent pour fournir aux LLM un resume structure du site

## Modifications prevues

### 1. Mise a jour de `robots.txt` — Autoriser les crawlers LLM

Ajouter des regles explicites pour les crawlers connus :

- `GPTBot` (OpenAI / ChatGPT)
- `Google-Extended` (Gemini)
- `ClaudeBot` (Anthropic / Claude)
- `PerplexityBot` (Perplexity)
- `Bytespider` (ByteDance)
- `CCBot` (Common Crawl, utilise par beaucoup de LLM)

### 2. Nouveau fichier `public/llms.txt`

Le standard `llms.txt` (propose par llmstxt.org) permet aux LLM de comprendre rapidement un site. Il s'agit d'un fichier texte/markdown structure avec :

- Nom et description de l'entreprise
- Services proposes
- Informations de contact
- FAQ resumee
- Liens vers les pages cles

### 3. Nouveau fichier `public/llms-full.txt`

Version detaillee de `llms.txt` avec des informations plus completes sur chaque service, les avantages differenciants, les temoignages, et les stats cles.

### 4. Enrichissement du JSON-LD dans `index.html`

Ajouter au JSON-LD Organization existant :
- `sameAs` pour les profils reseaux sociaux
- `areaServed` pour preciser la zone geographique
- `knowsAbout` pour les sujets d'expertise

### 5. Enrichissement du JSON-LD dynamique dans `LandingPage.tsx`

Ajouter un bloc `WebSite` avec `potentialAction` (SearchAction) pour aider les LLM a comprendre la structure du site.

### 6. Meta-tag `robots` specifique dans `SEOHead.tsx`

Ajouter la meta `robots` avec `max-snippet:-1, max-image-preview:large` pour permettre aux LLM/moteurs d'extraire des snippets complets du contenu.

### 7. Ajout d'un lien `<link>` vers `llms.txt` dans `index.html`

Ajouter `<link rel="help" type="text/plain" href="/llms.txt">` pour faciliter la decouverte du fichier.

## Details techniques

| Fichier | Action |
|---|---|
| `public/robots.txt` | Modifier — ajouter crawlers LLM |
| `public/llms.txt` | Nouveau — resume structure pour LLM |
| `public/llms-full.txt` | Nouveau — version detaillee |
| `index.html` | Modifier — lien llms.txt + enrichir JSON-LD |
| `src/components/SEOHead.tsx` | Modifier — meta robots max-snippet |

Aucune nouvelle dependance requise. Tous les fichiers sont statiques ou modifient des composants existants.

