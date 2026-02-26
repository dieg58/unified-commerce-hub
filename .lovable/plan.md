

## Plan: Wizard public de création de boutique démo avec auto-login et notification email

### Composants

#### 1. Edge Function `create-demo-tenant` (publique, sans auth)
- Reçoit : `full_name`, `email`, `company`, `phone`, `website_url` (optionnel)
- Validation stricte des inputs (regex email, longueurs max)
- Anti-abus : vérifie qu'aucun `demo_requests` avec le même email n'existe dans les 24h
- Utilise le service role key pour :
  1. Insérer dans `demo_requests` (lead tracking)
  2. Créer un user via `supabase.auth.admin.createUser()` avec `email_confirm: true` et un mot de passe généré
  3. Créer le tenant avec `status = 'demo'`
  4. Insérer `tenant_branding` (couleurs par défaut ou extraites si `website_url` fourni via appel interne à extract-branding)
  5. Rattacher le profil au tenant (`profiles.tenant_id`)
  6. Attribuer le rôle `shop_manager` dans `user_roles`
  7. Créer l'entité HQ + budgets par défaut
  8. Lancer le seed des produits démo (fire-and-forget)
  9. Envoyer un email de notification à `diego@inkoo.eu` via Resend avec toutes les infos du lead
- Retourne : `{ slug, email, password }` pour permettre l'auto-login côté frontend

#### 2. Composant `DemoWizardDialog`
- Wizard en 3 étapes remplaçant le CTA principal :
  - **Etape 1** : Nom, Email pro, Entreprise, Téléphone (capture lead)
  - **Etape 2** : URL site web (optionnel) avec bouton "Auto-remplir" pour extraire le branding + aperçu couleurs/logo. L'extraction se fait via appel direct à `extract-branding` (déjà publique... non, elle requiert auth). On fera l'extraction côté edge function `create-demo-tenant` plutôt.
  - **Etape 3** : Loader animé puis écran de succès avec auto-login et redirection vers `/tenant`
- Après réception de `{ email, password }`, appelle `supabase.auth.signInWithPassword()` pour connecter automatiquement le prospect
- Redirige vers `/tenant` (dashboard shop_manager)

#### 3. Modification de la Landing Page
- CTA principal : "Créer ma boutique démo" → ouvre `DemoWizardDialog`
- CTA secondaire conservé : "Demander une démo" pour ceux qui préfèrent être contactés

#### 4. Notification email (dans l'edge function)
- Utilise Resend (secret `RESEND_API_KEY` déjà configuré)
- Template HTML avec tableau : nom, email, entreprise, téléphone, site web, slug créé
- Envoi à `diego@inkoo.eu` depuis `Inkoo <noreply@inkoo.eu>`

### Sécurité
- Edge function publique (`verify_jwt = false`) car pas d'auth au moment de l'appel
- Rate limiting via vérification doublon email 24h dans `demo_requests`
- Inputs validés côté serveur (regex, longueurs max, sanitisation HTML)
- Le mot de passe généré est aléatoire (16 chars) et transmis une seule fois au frontend pour l'auto-login

### Fichiers à créer/modifier
- `supabase/functions/create-demo-tenant/index.ts` (nouveau)
- `supabase/config.toml` (ajout config function, auto-géré)
- `src/components/DemoWizardDialog.tsx` (nouveau)
- `src/pages/LandingPage.tsx` (remplacement CTA)

