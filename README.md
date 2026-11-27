# CapMuscu — capmuscu.fr

Compagnon de musculation gratuit, lumineux et accessible à tous les âges : générateur de séance avec bouton « Machine prise », encyclopédie de 913 exercices, outils pratiques (calories, protéines, 1RM) et veille quotidienne.

Stack : Astro (SSG, TypeScript strict), Tailwind CSS 4, données JSON locales, fonctions Vercel et Vercel Blob privé. Aucun compte n'est nécessaire pour utiliser le site et les données d'entraînement restent sur l'appareil. Les inscriptions email ne sont enregistrées qu'après consentement ; aucun email n'est envoyé automatiquement.

## Lancer en local

```bash
npm install
npm run dev          # interface seule : http://localhost:4321
npm test             # tests d'intégrité des données + générateur de séance
npm run build        # génère le site statique dans dist/
npm run preview      # prévisualise dist/
npm run update-data  # met à jour src/data/news.json (PubMed + flux RSS)
```

Pour tester aussi les API Vercel en local, installez la CLI Vercel (`npm install --global vercel`), liez le projet avec `vercel link`, récupérez les variables d'environnement avec `vercel env pull .env.local`, puis lancez `vercel dev`. Les secrets ne doivent jamais être ajoutés au dépôt.

## Structure

| Chemin | Rôle |
| --- | --- |
| `src/data/exercises.json` | Base des exercices (913) |
| `src/data/muscles.json` | Muscles et zones (accueil / générateur) |
| `src/data/news.json` | Actus et études (écrit par le collecteur) |
| `src/data/recipes.json` | Modèle des recettes (3 exemples, futur `/recettes`) |
| `src/lib/session.ts` | Générateur de séance et remplacement d'exercice |
| `api/newsletter.ts` | Inscription email avec consentement, enregistrée dans Blob privé |
| `api/analytics.ts` | Événements facultatifs pseudonymisés et suppression après retrait du consentement |
| `api/admin/` | Connexion, statistiques et gestion privée des inscriptions |
| `src/lib/server/` | Authentification et accès serveur au stockage Vercel Blob |
| `src/scripts/collectors/` | Collecteurs PubMed et RSS avec repli |
| `tests/` | Tests Vitest |

Pages générées : `/`, `/seance/`, `/compte/`, `/favoris/`, `/exercices/`, `/exercices/[slug]/`, `/exercices/[muscle]-[materiel]/` (ex. `/exercices/pectoraux-halteres/`), `/muscles/[muscle]/`, `/outils/`, `/feedback/`, `sitemap-index.xml`, `robots.txt`.

Dans l'encyclopédie, la recherche et les filtres par muscle, matériel, niveau et zone sont conservés dans l'URL pour pouvoir partager une sélection.

La page `/feedback/` prépare un email avec le type de retour, la page concernée et le message. L'envoi n'a lieu qu'après confirmation dans l'application de messagerie de l'utilisateur ; le site n'enregistre pas les retours.

## Installer CapMuscu

CapMuscu est une application web installable (PWA). Sur téléphone ou ordinateur, ouvrez `/installer/` sur le site publié en HTTPS et suivez les instructions du navigateur. Sur iPhone/iPad, utilisez Safari → **Partager** → **Sur l'écran d'accueil**. L'application s'ouvre sur le générateur de séance (`/seance/`) et peut fonctionner hors ligne pour les pages déjà visitées, avec le générateur comme repli. L'installation ne crée pas de compte et ne synchronise pas l'historique, qui reste sur l'appareil.

## Ajouter un exercice

Ajoutez un objet à `src/data/exercises.json` :

```json
{
  "id": "mon-exercice",
  "slug": "mon-exercice",
  "name": "Mon exercice",
  "description": "Présentation claire (2 à 3 phrases).",
  "primaryMuscle": "Pectoraux",
  "secondaryMuscles": ["Triceps"],
  "equipment": "Haltères",
  "difficulty": "Débutant",
  "mechanics": "Polyarticulaire",
  "executionSteps": ["…", "…", "…", "…"],
  "safetyTips": ["…", "…", "…"],
  "commonMistakes": ["…", "…", "…"],
  "alternatives": ["id-exercice-meme-muscle", "autre-id"]
}
```

Règles (vérifiées par `npm test`) : `id` = `slug`, aucun champ vide, au moins 4 étapes, `primaryMuscle` = nom exact dans `muscles.json`, `equipment` ∈ `Salle de sport` | `Haltères` | `Poids du corps`, au moins 2 alternatives existantes ciblant le même muscle principal, contenu suffisant pour le SEO. Les pages de fiche et les pages croisées muscle + matériel sont générées automatiquement.

## Ajouter des recettes (V2)

Complétez `src/data/recipes.json` (modèle déjà en place : nom, durée, protéines, calories, ingrédients, étapes). Pour publier la rubrique, créez `src/pages/recettes/index.astro` et `src/pages/recettes/[slug].astro` en vous inspirant de `src/pages/exercices/[slug].astro` (`getStaticPaths()` sur `recipes` exporté par `src/lib/data.ts`), et ajoutez un schéma `Recipe` JSON-LD.

## Visuels des exercices (silhouette et animation)

- `<BodyMap />` : silhouette SVG (face et dos) ; muscle principal en bleu vif pulsé, muscles secondaires en bleu doux.
- `<ExerciseMotion />` : alternance départ / arrivée toutes les 0,9 s avec bouton Pause / Lecture. Sans photos (ou si une image ne charge pas), un schéma vectoriel et la silhouette s'affichent à la place.
- Photos : base libre de droits [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (licence Unlicense). La correspondance est dans `src/data/exercise-media.json` (id CapMuscu → id free-exercise-db).
- Pour (re)télécharger les images dans `public/images/exercises/<slug>/0.jpg` et `1.jpg` et renseigner le champ `images` : `npm run fetch-images` (derrière un proxy d'entreprise : `$env:NODE_OPTIONS="--use-system-ca"` avant la commande).
- Pour associer un nouvel exercice : ajoutez sa ligne dans `exercise-media.json`, puis relancez la commande.
- `npm test` vérifie que chaque image référencée existe.

## Design et typographie

- Polices auto-hébergées (aucun appel externe) : Plus Jakarta Sans (titres) et Inter (texte) via `@fontsource`.
- Icônes : [Lucide](https://lucide.dev) (licence ISC), intégrées en SVG par `src/lib/icons.ts`.
- Badges colorés par muscle et par niveau : teintes dans `src/lib/ui.ts` (contraste ≥ 7:1 en clair et en sombre).
- Mobile : typographie compacte et fluide, barre d'onglets fixe en bas d'écran ; sur ordinateur, navigation dans l'en-tête.
- `/seance` : cases « Fait ✓ » enregistrées dans le `localStorage` avec la séance en cours.
- Le générateur peut enregistrer les répétitions et la charge de chaque série validée ; ces données restent sur l'appareil et alimentent le volume précis dans l'historique.
- Une séance générée peut être enregistrée comme modèle local (10 maximum), reprise ou relancée sans progression précédente.
- Les commandes « Taille du texte » du pied de page proposent trois tailles et mémorisent la préférence sur l'appareil.
- Les séances en cours et l'historique restent sur l'appareil ; l'historique doit être exporté manuellement pour être conservé lors d'un changement d'appareil.
- `/compte/` permet une connexion Firebase (lien par email ou Google) et une synchronisation manuelle de l'historique, des modèles et des favoris. Le site reste utilisable sans compte.
- Les favoris d'exercices sont disponibles sans compte depuis `/favoris/` et sont conservés dans le navigateur.

## Comptes Firebase (facultatifs)

Le compte utilise Firebase Authentication et Cloud Firestore. Dans Firebase Console, activez les fournisseurs **Lien par e-mail** et **Google**, ajoutez `capmuscu.fr` aux domaines autorisés, créez Firestore et publiez les règles de `firebase/firestore.rules`. Les données sont synchronisées uniquement après une action explicite dans `/compte/` : la fusion ajoute les éléments présents sur les appareils, le remplacement met à jour la sauvegarde cloud depuis l'appareil courant, et la restauration remplace les données locales depuis le cloud. Une suppression de compte ou une demande RGPD se fait auprès du contact indiqué dans la politique de confidentialité.

La configuration Web Firebase dans `src/lib/firebase.ts` ne contient que des identifiants publics de l'application ; la sécurité des données repose sur les règles Firestore, qui n'autorisent chaque compte qu'à accéder à ses propres sauvegardes.

## Automatisation quotidienne

`.github/workflows/daily-update.yml` s'exécute chaque matin à 05h00 (heure de Paris), lance `npm run update-data`, teste, construit et pousse `news.json`. Si une source est indisponible, les dernières données valides sont conservées et la date de dernière mise à jour affichée reste exacte. L'hébergeur reconstruit le site à chaque commit, ce qui renouvelle aussi « L'exercice découverte du jour ».

## Déploiement Vercel

Importez le dépôt depuis *Vercel → Add New → Project* et laissez Vercel détecter Astro et appliquer ses réglages de build par défaut. Ne remplacez pas le réglage de sortie détecté par un dossier personnalisé : les fonctions placées dans `api/` doivent être déployées avec les pages statiques. Ajoutez ensuite le domaine `capmuscu.fr` dans *Settings → Domains*.

Dans le tableau de bord Vercel, créez un **Blob Store privé** et connectez-le au projet. Ajoutez les variables d'environnement suivantes dans *Settings → Environment Variables* :

- `ANALYTICS_HASH_SECRET` : secret aléatoire d'au moins 32 caractères pour pseudonymiser les visiteurs.
- `ADMIN_AUTH_SECRET` : secret aléatoire distinct d'au moins 32 caractères pour signer les sessions admin.
- `ADMIN_PASSWORD` : mot de passe admin unique d'au moins 16 caractères.

Vous pouvez générer chaque secret avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` et conserver le mot de passe dans un gestionnaire de mots de passe. Ne réutilisez pas les secrets et ne les mettez jamais dans le code. La liaison du Blob Store fournit au serveur les accès privés nécessaires ; aucune clé n'est exposée au navigateur.

### Statistiques et tableau de bord admin

Les statistiques ne démarrent qu'après consentement. Les visiteurs uniques sont des navigateurs ayant accepté, pas un décompte garanti de personnes ; les identifiants sont propres à chaque appareil. Aucune charge, historique de séance, donnée de santé ou valeur de calculateur n'est envoyée. Les événements sont pseudonymisés, expirent après environ 13 mois et sont supprimés au retrait du consentement.

Le tableau de bord est accessible à `/admin/`. La connexion vérifie le mot de passe côté serveur, limite les tentatives à cinq par adresse IP sur 15 minutes (seul un hash est conservé) et utilise un cookie de session `HttpOnly`, `Secure`, `SameSite=Strict` valable huit heures. L'administration permet aussi de consulter, exporter en CSV et supprimer les inscriptions email. Ces inscriptions et leurs choix de consentement sont conservés dans le Blob Store privé ; aucun service d'envoi d'emails n'est utilisé. Pour révoquer les sessions, changez `ADMIN_AUTH_SECRET` ; pour changer le mot de passe, modifiez `ADMIN_PASSWORD`.

Après la mise en ligne, soumettez `https://capmuscu.fr/sitemap-index.xml` dans la Google Search Console.

## Accessibilité

Contraste élevé par défaut, mode sombre, police de base 16 px ajustée selon l'écran, cibles tactiles d'au moins 48 px, navigation clavier avec lien d'évitement et focus visible, régions `aria-live` pour les résultats. Le contenu est donné à titre informatif et ne remplace pas un avis médical.
