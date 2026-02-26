import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import inkooFullNoir from "@/assets/inkoo-full-noir.svg";
import SEOHead from "@/components/SEOHead";

const PolitiqueConfidentialite = () => (
  <div className="min-h-screen bg-background text-foreground">
    <SEOHead title="Politique de confidentialité" description="Politique de confidentialité et gestion des cookies — INKOO B2B." path="/politique-de-confidentialite" />
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <img src={inkooFullNoir} alt="INKOO" className="h-5" />
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm prose-neutral dark:prose-invert">
      <h1>Politique de confidentialité</h1>
      <p><em>Dernière mise à jour : {new Date().toLocaleDateString("fr-BE")}</em></p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>INKOO SRL</strong><br />
        Siège social : Bruxelles, Belgique<br />
        Email : <a href="mailto:privacy@inkoo.eu">privacy@inkoo.eu</a>
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li><strong>Données d'identification</strong> : nom, prénom, adresse email professionnelle</li>
        <li><strong>Données professionnelles</strong> : entreprise, fonction, entité de rattachement</li>
        <li><strong>Données de commande</strong> : produits commandés, adresses de livraison, historique</li>
        <li><strong>Données techniques</strong> : adresse IP, type de navigateur, pages consultées</li>
        <li><strong>Données de contact</strong> : numéro de téléphone (facultatif), messages via formulaire</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <p>Vos données sont traitées pour :</p>
      <ul>
        <li>La gestion de votre compte et l'authentification</li>
        <li>Le traitement et le suivi de vos commandes</li>
        <li>La gestion des budgets et des approbations</li>
        <li>L'envoi de notifications relatives à vos commandes</li>
        <li>L'amélioration de nos services et de la Plateforme</li>
        <li>Le respect de nos obligations légales et comptables</li>
      </ul>

      <h2>4. Base légale</h2>
      <p>Les traitements de données reposent sur :</p>
      <ul>
        <li><strong>L'exécution du contrat</strong> : gestion des commandes et du compte</li>
        <li><strong>L'intérêt légitime</strong> : amélioration de la plateforme, statistiques d'usage</li>
        <li><strong>Le consentement</strong> : cookies analytiques et marketing</li>
        <li><strong>L'obligation légale</strong> : facturation, obligations comptables</li>
      </ul>

      <h2>5. Destinataires des données</h2>
      <p>Vos données peuvent être transmises à :</p>
      <ul>
        <li>L'administrateur de votre entreprise cliente (responsable boutique)</li>
        <li>Nos sous-traitants techniques (hébergement, envoi d'emails)</li>
        <li>Nos partenaires logistiques pour l'expédition des commandes</li>
        <li>Les autorités compétentes en cas d'obligation légale</li>
      </ul>
      <p>Nous ne vendons jamais vos données à des tiers.</p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li><strong>Données de compte</strong> : durée de la relation contractuelle + 3 ans</li>
        <li><strong>Données de commande</strong> : 10 ans (obligations comptables)</li>
        <li><strong>Données techniques</strong> : 13 mois maximum</li>
        <li><strong>Données de prospection</strong> : 3 ans après le dernier contact</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>La Plateforme utilise les catégories de cookies suivantes :</p>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Finalité</th>
            <th>Durée</th>
            <th>Consentement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Nécessaires</strong></td>
            <td>Authentification, session, préférences de langue</td>
            <td>Session / 1 an</td>
            <td>Non requis</td>
          </tr>
          <tr>
            <td><strong>Analytiques</strong></td>
            <td>Mesure d'audience, performance du site</td>
            <td>13 mois max</td>
            <td>Requis</td>
          </tr>
          <tr>
            <td><strong>Marketing</strong></td>
            <td>Publicités ciblées, suivi cross-site</td>
            <td>13 mois max</td>
            <td>Requis</td>
          </tr>
        </tbody>
      </table>
      <p>
        Vous pouvez gérer vos préférences de cookies à tout moment via la bannière de consentement
        ou en supprimant les cookies de votre navigateur.
      </p>

      <h2>8. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
        <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
        <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
        <li><strong>Droit à la limitation</strong> : limiter le traitement dans certains cas</li>
        <li><strong>Retrait du consentement</strong> : retirer votre consentement aux cookies à tout moment</li>
      </ul>
      <p>
        Pour exercer vos droits : <a href="mailto:privacy@inkoo.eu">privacy@inkoo.eu</a>
      </p>
      <p>
        Vous avez également le droit d'introduire une réclamation auprès de l'Autorité de Protection des Données (APD) :{" "}
        <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">
          www.autoriteprotectiondonnees.be
        </a>
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
        chiffrement des communications (TLS), contrôle d'accès par rôles, isolation des données par tenant,
        journalisation des accès et audits de sécurité réguliers.
      </p>

      <h2>10. Transferts internationaux</h2>
      <p>
        Vos données sont hébergées au sein de l'Union européenne. En cas de transfert hors UE (par exemple pour
        certains sous-traitants techniques), nous veillons à ce que des garanties appropriées soient en place
        (clauses contractuelles types, décision d'adéquation).
      </p>

      <h2>11. Modifications</h2>
      <p>
        Nous nous réservons le droit de modifier cette politique à tout moment. Toute modification substantielle
        vous sera communiquée par email ou via la Plateforme.
      </p>

      <h2>12. Contact</h2>
      <p>
        Délégué à la protection des données :<br />
        <a href="mailto:privacy@inkoo.eu">privacy@inkoo.eu</a>
      </p>
    </main>
  </div>
);

export default PolitiqueConfidentialite;
