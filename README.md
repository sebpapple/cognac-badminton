# Cognac Badminton

Site responsive réalisé avec React, TypeScript, Vite et Bootstrap. Il comprend l’accueil et son carrousel, la présentation du club, des pages dédiées aux horaires et aux évènements, les équipes interclubs, les actualités paginées, un formulaire de contact accessible et un espace webmaster. Les horaires, les membres du bureau, les évènements, les actualités, les coordonnées publiques et les textes/photos de la page d’accueil sont administrables depuis le site lorsque Firebase est configuré.

## Démarrer

Installer Node.js 20 ou plus récent, puis lancer à la racine du projet :

```sh
npm install
npm run dev
```

Vérification de production : `npm run build`.

`npm test` exécute les tests automatisés des parcours publics et interactions principales. Chaque build lance d’abord cette suite, puis vérifie TypeScript et génère le site. Les tests simulent Firebase et l’envoi du formulaire : ils ne nécessitent ni identifiants, ni accès réseau à ces services.

## Installer le site comme application

Le site est une PWA installable sur Android et iPhone, sans publication dans une boutique :

- **Android** : ouvrir le site dans Chrome puis choisir **Installer l’application** (ou **Ajouter à l’écran d’accueil**).
- **iPhone/iPad** : ouvrir le site dans Safari, toucher **Partager**, puis **Sur l’écran d’accueil**.

L’installation nécessite le site publié en HTTPS. La page d’accueil, les fichiers nécessaires à l’application et les ressources du même domaine déjà consultées sont mises en cache pour permettre un affichage hors ligne ; les données dynamiques (Firebase, actualités à jour et formulaire de contact) nécessitent une connexion. Le service worker est activé uniquement dans les builds de production.

## Publier sur GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit et publie le site à chaque push sur `main`.

1. Dans GitHub, ouvrir **Settings > Pages** et choisir **GitHub Actions** comme source de déploiement.
2. Envoyer les changements sur la branche `main` ; suivre le déploiement dans l’onglet **Actions**.
3. Le site sera disponible à l’adresse `https://sebpapple.github.io/cognac-badminton/`.

Firebase reste facultatif : sans configuration, les contenus de démonstration et les valeurs par défaut du club et de l’accueil s’affichent, et l’espace webmaster est désactivé. Les données d’exemple, notamment les dates d’évènements et les photos distantes, sont à vérifier par le club avant publication. Pour activer Firebase en production, ajouter dans **Settings > Secrets and variables > Actions > Variables** les variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` et `VITE_FIREBASE_APP_ID`, en reprenant les valeurs de l’application Web Firebase. Ce sont des paramètres publics intégrés au bundle, pas des secrets serveur. Ne pas ajouter de clé de compte de service. Vérifier également que le domaine `sebpapple.github.io` est autorisé dans les domaines approuvés de Firebase Authentication.

Dans `/webmaster`, les administrateurs peuvent modifier l’adresse e-mail, l’adresse du siège social, la ville, le département et les liens sociaux depuis l’onglet **Informations du club**. Ces coordonnées sont réutilisées dans le pied de page, la page Contact et les pages légales ; les gymnases et adresses d’entraînement sont gérés dans l’onglet **Horaires**. L’onglet **Page d’accueil** permet de mettre à jour les textes, les valeurs du club et les quatre photos en fournissant leurs URL HTTPS publiques. Le club doit valider les droits d’utilisation et le texte alternatif de la photo avant publication. Ces deux réglages sont stockés dans `siteContent/clubInformation` et `siteContent/homePage` dans Firestore et leurs écritures sont réservées aux comptes ayant le rôle `admin`. Publier `firestore.rules` avant de les utiliser.

Pour les photos des actualités et portraits des membres du bureau, ajouter également les variables publiques `VITE_CLOUDINARY_CLOUD_NAME` et `VITE_CLOUDINARY_UPLOAD_PRESET` dans les variables du dépôt GitHub ; les renseigner aussi dans `.env.local` pour les tests locaux. Créer dans Cloudinary un preset de téléversement **non signé**, limité aux images JPG, PNG et WebP avec une taille maximale de 5 Mo. Le webmaster peut déplacer et zoomer chaque photo dans un cadre 4:3 avant son envoi. La photo est facultative : le logo du club est affiché à sa place. Sans variables Cloudinary, l’ajout et la modification des membres et actualités restent disponibles sans photo. Le preset non signé est public par nature ; ces restrictions réduisent les abus possibles, mais ne remplacent pas la surveillance du quota Cloudinary. Publier également les nouvelles règles Firestore avant d’utiliser la gestion des membres. Obtenir l’accord des personnes avant de publier leur portrait.

## Équipes interclubs

La page des équipes et les fiches individuelles sont générées à partir des équipes Cognac que le Worker découvre dans les classements publics ICBaD/FFBaD, au lieu d’une liste codée en dur. L’identifiant de fiche publique FFBaD sert d’identifiant Firestore et d’URL de détail. La synchronisation manuelle depuis `/webmaster` ou le Cron Cloudflare (quotidien à 06:00 UTC) collecte toutes les équipes trouvées, les publie ensemble et retire les anciennes équipes qui ne figurent plus sur la page fédérale. Si la collecte échoue, les données précédemment publiées restent intactes. La lecture publique est autorisée ; les écritures manuelles sont réservées aux admins Firebase et l’écriture planifiée utilise un compte de service protégé comme secret Cloudflare.

Pour activer la synchronisation :

1. Dans `workers/team-sync/wrangler.toml`, vérifier le Project ID Firebase et la liste `ALLOWED_ORIGINS` (site GitHub Pages et origines locales de développement).
2. Dans Google Cloud Console, créer un compte de service dédié au Worker et lui accorder le rôle IAM **Cloud Datastore User** sur le projet Firebase. Générer une clé JSON pour ce compte. Ce compte sert uniquement à l’écriture planifiée ; les règles Firestore ne s’appliquent pas aux comptes de service, c’est pourquoi cette clé ne doit jamais être publiée ni ajoutée au dépôt.
3. Depuis un terminal avec Node.js, se connecter à Cloudflare puis créer le Worker :

	```sh
	npx wrangler login
	npx wrangler deploy --config workers/team-sync/wrangler.toml
	```

4. Enregistrer le JSON comme secret Worker. À l’invite, coller le contenu complet du fichier de clé JSON :

	```sh
	npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON --config workers/team-sync/wrangler.toml
	```

5. Redéployer pour publier le déclencheur Cron avec le secret configuré :

	```sh
	npx wrangler deploy --config workers/team-sync/wrangler.toml
	```

6. Copier l’URL `workers.dev` affichée par Wrangler et l’enregistrer comme variable GitHub Actions `VITE_TEAM_SYNC_URL`. Pour le développement local, ajouter `VITE_TEAM_SYNC_URL` à `.env.local`.
7. Publier les règles de `firestore.rules`, puis reconstruire/redéployer le site afin que cette variable soit intégrée.

Le déclencheur est configuré dans `wrangler.toml` et l’observabilité Cloudflare est activée pour voir les exécutions et erreurs. Le Cron Cloudflare utilise UTC. Après le déploiement, vérifier dans Cloudflare Dashboard > Workers & Pages > `cognac-badminton-team-sync` > Settings > Triggers que le Cron est actif, puis consulter **Observability > Logs**. Les logs indiquent le démarrage (expression Cron et heure planifiée), la réussite ou l’erreur. En cas d’échec, la collecte ne publie pas de mise à jour partielle ; le bouton manuel reste disponible.

Après toute modification du parseur dans `workers/team-sync`, redéployer le Worker avec la commande de l’étape 5. Les données déjà enregistrées dans Firestore ne sont pas recalculées immédiatement ; lancer « Actualiser équipes » dans `/webmaster` pour ne pas attendre la prochaine exécution planifiée. Après une modification de l’interface, reconstruire/redéployer également le site.

Le Worker n’accepte que les URL ICBaD construites à partir des liens de la page publique du club. La route HTTP manuelle vérifie le jeton Firebase et le rôle `admin` avant de lire les pages. La clé du compte de service n’est utilisée que par le déclencheur planifié et doit rester dans les secrets Cloudflare ; ne jamais la committer ni l’ajouter à `.env.local`.

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

Les éditeurs et administrateurs peuvent modifier les séances, lieux et horaires dans l’onglet « Horaires » de `/webmaster`. Ces informations sont stockées dans le document Firestore `siteContent/horaires`. Si seul l’ancien document `siteContent/schedule` existe, le site le lit automatiquement ; le prochain enregistrement crée la version `siteContent/horaires`. Publier `firestore.rules` pour autoriser la lecture publique et les modifications par les rôles éditeur/administrateur.

La page des horaires utilise désormais l’adresse `/horaires`. L’ancienne adresse `/creneaux` redirige automatiquement vers la nouvelle pour préserver les liens et favoris déjà partagés.

Dans l’espace webmaster, la barre d’outils du contenu des actualités permet d’appliquer du gras, de l’italique, du souligné, du barré, une couleur et une taille de texte aux sélections. Le rendu public n’interprète que ces balises de mise en forme autorisées ; le texte des articles existants reste compatible.

### Envoi des messages par e-mail

Le formulaire utilise [Web3Forms](https://web3forms.com/) pour envoyer les messages à `badcognac@gmail.com`, sans serveur ni Firebase Blaze. La clé d’accès fournie pour le formulaire est intégrée au code du site ; les clés Web3Forms sont destinées à être utilisées dans un site statique et sont visibles dans le bundle publié. Limiter son utilisation au domaine du site depuis les réglages Web3Forms.

L’offre gratuite de Web3Forms annonce 250 soumissions par mois. Le club supprime les messages une fois la demande traitée ; la politique Web3Forms indique une conservation maximale de trois ans pour les soumissions, sauf suppression anticipée ou durée plus courte liée à l’offre. En cas d’échec du formulaire, la page affiche une erreur et propose l’adresse e-mail directe via `mailto:`.

## Mentions légales et données personnelles

Les pages `/mentions-legales` et `/rgpd` présentent l’éditeur, le directeur de la publication, l’hébergeur, les traitements de données du site, les prestataires et les droits des personnes. Les coordonnées de l’association et la règle de conservation des messages ont été communiquées par le club. Revoir ces informations si les coordonnées, fournisseurs, fonctionnalités du site ou pratiques de conservation changent. Les informations des fournisseurs et leurs durées de conservation peuvent également évoluer.

Références utilisées : [mentions obligatoires des sites internet — Service-Public.fr](https://entreprendre.service-public.gouv.fr/vosdroits/F37351), [protection des données personnelles — Service-Public.fr](https://entreprendre.service-public.gouv.fr/vosdroits/F24270), [Web3Forms — politique de confidentialité](https://web3forms.com/privacy) et [CNIL](https://www.cnil.fr/).

## À confirmer avant publication

Les horaires et gymnases affichés sont ceux communiqués par le club. Les articles, photographies distantes et dates de tournoi restent des contenus de démonstration ou indicatifs. La chronologie historique est un canevas à compléter avec les archives du club. Renseigner les coordonnées et liens sociaux officiels avant publication ; aucun n’a été inventé.