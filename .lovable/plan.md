

## Plan : Amélioration de l'expérience démo (3 axes)

### 1. Étape de création enrichie avec suivi détaillé du chargement

Actuellement, l'étape 3 du `DemoWizardDialog` affiche un simple spinner avec une progress bar statique à 60%. Le plan :

- Remplacer par une liste d'étapes visuelles animées qui s'activent séquentiellement :
  1. "Analyse de votre site web..." (avec icône Globe)
  2. "Extraction des couleurs et du logo..." (avec icône Palette)
  3. "Création de votre espace..." (avec icône Store)
  4. "Ajout des produits démo..." (avec icône Package)
  5. "Configuration finale..." (avec icône Settings)
- Chaque étape passe de "en attente" → "en cours" (spinner) → "terminé" (check vert) avec un timer progressif simulé (le backend est un seul appel, mais le frontend anime les sous-étapes toutes les 2-3s)
- La progress bar avance en conséquence (0% → 20% → 40% → 60% → 80% → 100%)
- Fichier modifié : `src/components/DemoWizardDialog.tsx`

### 2. Sidebar repliée à l'arrivée sur la boutique démo

Actuellement, `TenantAdminSidebar` initialise `manualCollapsed` à `false`. Le plan :

- Après la création démo, naviguer vers `/tenant` avec un query param `?demo=1`
- Dans `TenantAdminSidebar`, détecter ce param et initialiser `manualCollapsed` à `true`
- Le gestionnaire voit ainsi la sidebar repliée au premier chargement, mettant l'accent sur le contenu principal
- Fichiers modifiés : `src/components/DemoWizardDialog.tsx`, `src/components/TenantAdminSidebar.tsx`

### 3. Guided tour interactif (onboarding pas à pas)

Créer un système de "guided tour" avec des tooltips focalisés qui apparaissent séquentiellement pour expliquer les fonctionnalités clés. Implémentation sans dépendance externe :

- Nouveau composant `GuidedTour.tsx` : overlay semi-transparent avec un "spotlight" (trou) sur l'élément ciblé + tooltip positionné dynamiquement
- Étapes du tour :
  1. Sidebar : "Voici votre menu de navigation" (cible : la sidebar)
  2. Dashboard KPIs : "Suivez vos indicateurs clés" (cible : la grille KPI)
  3. Onboarding card : "Complétez ces étapes pour configurer votre boutique" (cible : OnboardingCard)
  4. Bouton boutique : "Accédez à votre boutique ici" (cible : lien /shop dans la sidebar)
  5. Bulle d'aide : "Besoin d'aide ? Contactez-nous ici" (cible : HelpBubble)
- Le tour se déclenche automatiquement à l'arrivée d'un nouveau gestionnaire démo (détection via `?demo=1` ou flag localStorage)
- Boutons "Suivant" / "Passer" sur chaque étape
- Progression persistée dans localStorage pour ne pas se relancer
- Fichiers créés : `src/components/GuidedTour.tsx`
- Fichiers modifiés : `src/pages/TenantDashboard.tsx`, `src/components/TenantAdminLayout.tsx`

### Fichiers impactés (résumé)

| Fichier | Action |
|---|---|
| `src/components/DemoWizardDialog.tsx` | Refonte étape 3 avec sous-étapes animées + ajout `?demo=1` |
| `src/components/TenantAdminSidebar.tsx` | Détection `?demo=1` pour sidebar repliée |
| `src/components/GuidedTour.tsx` | Nouveau composant tour guidé avec spotlight |
| `src/pages/TenantDashboard.tsx` | Intégrer le GuidedTour |
| `src/components/TenantAdminLayout.tsx` | Intégrer le GuidedTour au layout |
| `src/i18n/locales/fr.json`, `en.json`, `nl.json` | Clés i18n pour le tour |

