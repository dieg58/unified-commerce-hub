import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import inkooFullNoir from "@/assets/inkoo-full-noir.svg";
import SEOHead from "@/components/SEOHead";

const MentionsLegales = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEOHead title="Mentions légales" description="Mentions légales de la plateforme INKOO B2B." path="/mentions-legales" />
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <img src={inkooFullNoir} alt="INKOO" className="h-5" />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm prose-neutral dark:prose-invert">
      <h1>Mentions légales</h1>
      <p><em>Dernière mise à jour : {new Date().toLocaleDateString("fr-BE")}</em></p>

      <h2>1. Éditeur du site</h2>
      <p>
        <strong>INKOO SRL</strong><br />
        Forme juridique : Société à responsabilité limitée<br />
        Siège social : Bruxelles, Belgique<br />
        Numéro d'entreprise (BCE) : à compléter<br />
        TVA : BE 0XXX.XXX.XXX<br />
        Email : <a href="mailto:info@inkoo.eu">info@inkoo.eu</a><br />
        Site web : <a href="https://inkoo.eu" target="_blank" rel="noopener noreferrer">inkoo.eu</a>
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>Le directeur de la publication est le représentant légal d'INKOO SRL.</p>

      <h2>3. Hébergement</h2>
      <p>
        Le site est hébergé par :<br />
        <strong>Lovable / Supabase</strong><br />
        Infrastructure cloud européenne
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu du site (textes, images, logos, graphismes, icônes, logiciels) est la propriété exclusive d'INKOO SRL
        ou de ses partenaires et est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction, représentation,
        modification ou exploitation non autorisée est strictement interdite.
      </p>

      <h2>5. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre{" "}
        <Link to="/politique-de-confidentialite" className="underline">politique de confidentialité</Link>.
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité
        de vos données.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Le site utilise des cookies. Vous pouvez gérer vos préférences via la bannière de consentement
        affichée lors de votre première visite. Pour plus de détails, consultez notre{" "}
        <Link to="/politique-de-confidentialite" className="underline">politique de confidentialité</Link>.
      </p>

      <h2>7. Limitation de responsabilité</h2>
      <p>
        INKOO SRL s'efforce de fournir des informations exactes et à jour. Toutefois, elle ne saurait être tenue
        responsable des erreurs, omissions ou résultats obtenus suite à l'utilisation de ces informations.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit belge. En cas de litige, les tribunaux de Bruxelles
        seront seuls compétents.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales :{" "}
        <a href="mailto:info@inkoo.eu">info@inkoo.eu</a>
      </p>
    </main>
  </div>
);

export default MentionsLegales;
