# Cognac Badminton

Site responsive réalisé avec React, TypeScript, Vite et Bootstrap. Il comprend l’accueil et son carrousel, la présentation du club, des pages dédiées aux créneaux et aux évènements, les équipes interclubs, les actualités paginées, un formulaire de contact accessible et un espace webmaster.

## Démarrer

Installer Node.js 20 ou plus récent, puis lancer à la racine du projet :

```sh
npm install
npm run dev
```

Vérification de production : `npm run build`.

## Publier sur GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit et publie le site à chaque push sur `main`.

1. Dans GitHub, ouvrir **Settings > Pages** et choisir **GitHub Actions** comme source de déploiement.
2. Envoyer les changements sur la branche `main` ; suivre le déploiement dans l’onglet **Actions**.
3. Le site sera disponible à l’adresse `https://sebpapple.github.io/cognac-badminton/`.

Firebase reste facultatif : sans configuration, les articles et évènements de démonstration s’affichent et l’espace webmaster est désactivé. Ces données d’exemple, notamment les dates d’évènements, sont à confirmer par le club avant publication. Pour l’activer en production, ajouter dans **Settings > Secrets and variables > Actions > Variables** les variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` et `VITE_FIREBASE_APP_ID`, en reprenant les valeurs de l’application Web Firebase. Ce sont des paramètres publics intégrés au bundle, pas des secrets serveur. Ne pas ajouter de clé de compte de service. Vérifier également que le domaine `sebpapple.github.io` est autorisé dans les domaines approuvés de Firebase Authentication.

Pour les portraits des membres du bureau, ajouter également les variables publiques `VITE_CLOUDINARY_CLOUD_NAME` et `VITE_CLOUDINARY_UPLOAD_PRESET` dans les variables du dépôt GitHub ; les renseigner aussi dans `.env.local` pour les tests locaux. Créer dans Cloudinary un preset de téléversement **non signé**, limité aux images JPG, PNG et WebP avec une taille maximale de 5 Mo. Le webmaster peut déplacer et zoomer chaque photo dans un cadre 4:3 avant son envoi. Le preset non signé est public par nature ; ces restrictions réduisent les abus possibles, mais ne remplacent pas la surveillance du quota Cloudinary. Publier également les nouvelles règles Firestore avant d’utiliser la gestion des membres. Obtenir l’accord des personnes avant de publier leur portrait.

## Équipes interclubs

La page `/equipes` renvoie vers les fiches R3, D2, D3 et D4 ; chaque fiche est intégrée depuis le site public FFBaD afin d’afficher son calendrier, ses résultats et son effectif à la consultation. Un lien permet aussi d’ouvrir la fiche directement sur FFBaD si l’intégration est indisponible. Les fiches sont des pages tierces complètes, pas des tableaux extraits ; leur présentation, disponibilité et politique d’intégration dépendent de la FFBaD. L’API documentée publiquement pointe vers un environnement de test et requiert des identifiants ; aucun accès de production n’est configuré.

## Firebase

1. Créer un projet Firebase, activer Authentication par e-mail/mot de passe et créer une base Cloud Firestore.
2. Copier `.env.example` vers `.env.local` et y renseigner la configuration de l’application Web ainsi que `FIREBASE_PROJECT_ID`.
3. Déployer `firestore.rules` dans la base.
4. Dans Firebase Console > Authentication > Users, créer les comptes du bureau (un compte par personne).
5. Depuis un terminal de confiance connecté au projet (Application Default Credentials, par exemple via `gcloud auth application-default login`), attribuer le rôle :

	```sh
	npm run webmaster:claim -- grant badcognac@gmail.com
	```

	Pour retirer le rôle : `npm run webmaster:claim -- revoke badcognac@gmail.com`. Fermer puis rouvrir la session sur `/webmaster` afin de renouveler le jeton.

Le script utilise Firebase Admin côté serveur local uniquement. Ne jamais ajouter de clé de compte de service au dépôt ni au bundle navigateur.

Après le premier déploiement, les administrateurs peuvent associer les comptes du bureau dans `/webmaster/utilisateurs`. Dans Firebase Console > Authentication > Users, copier l’UID de chaque compte, puis saisir son UID, son e-mail, son nom et son rôle. Les administrateurs gèrent les rôles et peuvent supprimer des articles ; les éditeurs peuvent créer et modifier les articles. Retirer un rôle révoque l’accès au site sans supprimer le compte Authentication.

Cette gestion des rôles utilise uniquement Firestore et ne nécessite pas Firebase Functions. Après une modification des permissions, republier le contenu de `firestore.rules` dans Firestore Database > Rules.

L’espace webmaster sépare les onglets « Actualités », « Membres du bureau » et « Évènements ». Les évènements publics sont gérés dans l’onglet dédié : les éditeurs peuvent les créer et les modifier, les administrateurs peuvent aussi les supprimer. Ils sont enregistrés dans la collection Firestore `events` et affichés sur la page `/evenements`.

Les éditeurs et administrateurs peuvent gérer les membres du bureau dans l’onglet « Membres du bureau » de `/webmaster`. Leurs noms, fonctions, ordre d’affichage et URL de portraits sont enregistrés dans la collection Firestore `boardMembers`; les images elles-mêmes sont téléversées sur Cloudinary. L’ordre peut être modifié par glisser-déposer ou avec les boutons Monter/Descendre. Supprimer un membre le retire du site, mais ne supprime pas sa photo du compte Cloudinary : les ressources inutilisées peuvent être supprimées séparément depuis la médiathèque Cloudinary.

Dans l’espace webmaster, la barre d’outils du contenu des actualités permet d’appliquer du gras, de l’italique, du souligné, du barré, une couleur et une taille de texte aux sélections. Le rendu public n’interprète que ces balises de mise en forme autorisées ; le texte des articles existants reste compatible.

### Envoi des messages par e-mail

Le formulaire utilise [Web3Forms](https://web3forms.com/) pour envoyer les messages à `sebastien.grauby@gmail.com`, sans serveur ni Firebase Blaze. La clé d’accès fournie pour le formulaire est intégrée au code du site ; les clés Web3Forms sont destinées à être utilisées dans un site statique et sont visibles dans le bundle publié. Limiter son utilisation au domaine du site depuis les réglages Web3Forms.

L’offre gratuite de Web3Forms annonce 250 soumissions par mois. Le service traite les données envoyées par les visiteurs ; informer ceux-ci du traitement des données et consulter les conditions de confidentialité du fournisseur. En cas d’échec du formulaire, la page affiche une erreur et propose l’adresse e-mail directe via `mailto:`.

## À confirmer avant publication

Les horaires et gymnases affichés sont ceux communiqués par le club. Les articles, photographies distantes et dates de tournoi restent des contenus de démonstration ou indicatifs. La chronologie historique est un canevas à compléter avec les archives du club. Renseigner les coordonnées et liens sociaux officiels avant publication ; aucun n’a été inventé.