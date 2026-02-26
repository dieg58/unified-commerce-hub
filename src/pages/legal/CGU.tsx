import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import inkooFullNoir from "@/assets/inkoo-full-noir.svg";
import SEOHead from "@/components/SEOHead";

const CGU = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEOHead title="Conditions générales d'utilisation" description="CGU de la plateforme INKOO B2B." path="/conditions-generales" />
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <img src={inkooFullNoir} alt="INKOO" className="h-5" />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm prose-neutral dark:prose-invert">
      <h1>Conditions générales d'utilisation</h1>
      <p><em>Dernière mise à jour : {new Date().toLocaleDateString("fr-BE")}</em></p>

      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme
        INKOO B2B (ci-après « la Plateforme »), éditée par INKOO SRL, à destination de ses clients professionnels
        et de leurs collaborateurs.
      </p>

      <h2>2. Accès à la Plateforme</h2>
      <p>
        L'accès à la Plateforme est réservé aux utilisateurs disposant d'un compte validé. La création de compte
        est soumise à l'approbation d'un administrateur. L'utilisateur s'engage à fournir des informations exactes
        et à maintenir la confidentialité de ses identifiants de connexion.
      </p>

      <h2>3. Services proposés</h2>
      <p>La Plateforme permet notamment :</p>
      <ul>
        <li>La consultation et la commande de produits de merchandising personnalisés</li>
        <li>La gestion de webshops dédiés par entreprise cliente</li>
        <li>Le suivi des commandes et expéditions</li>
        <li>La gestion des budgets et des entités</li>
        <li>L'accès à un catalogue de produits fournisseurs</li>
      </ul>

      <h2>4. Obligations de l'utilisateur</h2>
      <p>L'utilisateur s'engage à :</p>
      <ul>
        <li>Utiliser la Plateforme de manière conforme à sa destination</li>
        <li>Ne pas tenter d'accéder à des fonctionnalités ou données non autorisées</li>
        <li>Respecter les droits de propriété intellectuelle d'INKOO et de ses partenaires</li>
        <li>Signaler tout dysfonctionnement ou faille de sécurité constatée</li>
      </ul>

      <h2>5. Commandes et facturation</h2>
      <p>
        Les commandes passées via la Plateforme sont soumises aux conditions commerciales convenues entre
        INKOO SRL et l'entreprise cliente. Les prix affichés sont indicatifs et hors taxes sauf mention contraire.
        La facturation est effectuée selon les modalités convenues contractuellement.
      </p>

      <h2>6. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments de la Plateforme (design, code, contenus, logos) est la propriété d'INKOO SRL.
        Les logos et visuels des clients restent la propriété de leurs propriétaires respectifs et sont utilisés
        dans le cadre des services de personnalisation.
      </p>

      <h2>7. Protection des données</h2>
      <p>
        Le traitement des données personnelles est effectué conformément au RGPD et à notre{" "}
        <Link to="/politique-de-confidentialite" className="underline">politique de confidentialité</Link>.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        INKOO SRL s'engage à assurer la disponibilité de la Plateforme dans la mesure du possible. Toutefois,
        elle ne saurait être tenue responsable des interruptions temporaires liées à la maintenance, aux mises
        à jour ou à des événements de force majeure. INKOO SRL ne garantit pas l'exactitude des informations
        produit fournies par les fabricants tiers.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        INKOO SRL se réserve le droit de suspendre ou supprimer l'accès d'un utilisateur en cas de non-respect
        des présentes CGU, sans préjudice de tout dommage et intérêt.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        INKOO SRL se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
        informés de toute modification substantielle. L'utilisation continue de la Plateforme après modification
        vaut acceptation des nouvelles conditions.
      </p>

      <h2>11. Droit applicable et litiges</h2>
      <p>
        Les présentes CGU sont régies par le droit belge. Tout litige sera soumis à la compétence exclusive des
        tribunaux de Bruxelles, sous réserve des dispositions impératives applicables.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question : <a href="mailto:info@inkoo.eu">info@inkoo.eu</a>
      </p>
    </main>
  </div>
);

export default CGU;
