# CapMuscu — capmuscu.fr

Compagnon de musculation gratuit, lumineux et accessible à tous les âges : générateur de séance avec bouton « Machine prise », encyclopédie de 923 exercices, outils pratiques (calories, protéines, 1RM) et veille quotidienne.

Stack : Astro (SSG, TypeScript strict), Tailwind CSS 4, données JSON locales, scripts Node.js. Aucune API payante, aucun compte, aucune base de données serveur.

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:4321
npm test             # tests d'intégrité des données + générateur de séance
npm run build        # génère le site statique dans dist/
npm run preview      # prévisualise dist/
npm run update-data  # met à jour src/data/news.json (PubMed + flux RSS)
```

## Structure

| Chemin | Rôle |
| --- | --- |
| `src/data/exercises.json` | Base des exercices (100) |
| `src/data/muscles.json` | Muscles et zones (accueil / générateur) |
| `src/data/news.json` | Actus et études (écrit par le collecteur) |
| `src/data/recipes.json` | Modèle des recettes (3 exemples, futur `/recettes`) |
| `src/lib/session.ts` | Générateur de séance et remplacement d'exercice |
| `src/scripts/collectors/` | Collecteurs PubMed et RSS avec repli |
| `tests/` | Tests Vitest |

Pages générées : `/`, `/seance/`, `/exercices/`, `/exercices/[slug]/`, `/exercices/[muscle]-[materiel]/` (ex. `/exercices/pectoraux-halteres/`), `/muscles/[muscle]/`, `/outils/`, `/feedback/`, `sitemap-index.xml`, `robots.txt`.

La page `/feedback/` prépare un email avec le type de retour, la page concernée et le message. L'envoi n'a lieu qu'après confirmation dans l'application de messagerie de l'utilisateur ; le site n'enregistre pas les retours.

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

## Automatisation quotidienne

`.github/workflows/daily-update.yml` s'exécute chaque matin à 05h00 (heure de Paris), lance `npm run update-data`, teste, construit et pousse `news.json`. Si une source est indisponible, les dernières données valides sont conservées et la date de dernière mise à jour affichée reste exacte. L'hébergeur reconstruit le site à chaque commit, ce qui renouvelle aussi « L'exercice découverte du jour ».

## Déploiement gratuit

Réglages communs : commande de build `npm run build`, dossier de sortie `dist`, Node 20 ou plus.

**Cloudflare Pages** : *Workers & Pages → Create → Pages → Connect to Git*, choisissez le dépôt, puis ajoutez le domaine dans *Custom domains* → `capmuscu.fr`. Cloudflare configure le DNS automatiquement si le domaine est géré chez eux.

**Vercel** : *Add New → Project*, importez le dépôt (Astro est détecté), puis *Settings → Domains* → `capmuscu.fr` et créez les enregistrements DNS indiqués.

**Netlify** : *Add new site → Import from Git*, puis *Domain management → Add a domain* → `capmuscu.fr`.

Après la mise en ligne, soumettez `https://capmuscu.fr/sitemap-index.xml` dans la Google Search Console.

## Accessibilité

Contraste élevé par défaut, mode sombre, police de base 16 px ajustée selon l'écran, cibles tactiles d'au moins 48 px, navigation clavier avec lien d'évitement et focus visible, régions `aria-live` pour les résultats. Le contenu est donné à titre informatif et ne remplace pas un avis médical.
