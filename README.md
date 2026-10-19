# Cognac Badminton

Site responsive réalisé avec React, TypeScript, Vite et Bootstrap. Il comprend l’accueil et son carrousel, la présentation du club, les actualités paginées, un formulaire de contact accessible et un espace webmaster.

## Démarrer

Installer Node.js 20 ou plus récent, puis lancer à la racine du projet :

```sh
npm install
npm run dev
```

Vérification de production : `npm run build`.

## Firebase

1. Créer un projet Firebase, activer Authentication par e-mail/mot de passe et créer une base Cloud Firestore.
2. Copier `.env.example` vers `.env.local` et y renseigner la configuration de l’application Web Firebase.
3. Déployer `firestore.rules` dans la base.
4. Attribuer le custom claim `admin: true` aux comptes webmaster uniquement depuis un environnement serveur de confiance utilisant le Firebase Admin SDK. Une connexion seule n’accorde aucun droit d’écriture.

Les actualités utilisent la collection `articles`, le formulaire la collection `messages`. Sans Firebase, le site affiche les articles de démonstration et l’administration reste désactivée.

## À confirmer avant publication

Les horaires et gymnases affichés sont ceux communiqués par le club. Les articles, photographies distantes et dates de tournoi restent des contenus de démonstration ou indicatifs. La chronologie historique est un canevas à compléter avec les archives du club. Renseigner les coordonnées et liens sociaux officiels avant publication ; aucun n’a été inventé.