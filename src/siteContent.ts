export type ClubInformation = {
  email: string;
  postalAddress: string;
  city: string;
  department: string;
  facebookUrl: string;
  instagramUrl: string;
};

export const defaultClubInformation: ClubInformation = {
  email: "badcognac@gmail.com",
  postalAddress: "Rue du Port, 16100",
  city: "Cognac",
  department: "Charente",
  facebookUrl: "https://www.facebook.com/groups/cognac.badminton",
  instagramUrl: "https://www.instagram.com/cognac_badminton/",
};

export type HomePageContent = {
  heroImages: string[];
  heroEyebrow: string;
  heroTitleAccent: string;
  heroTitle: string;
  heroPitch: string;
  heroLine: string;
  heroSlogan: string;
  introEyebrow: string;
  introText: string;
  storyEyebrow: string;
  storyTitle: string;
  storyAccent: string;
  storyParagraph1: string;
  storyParagraph2: string;
  storyImage: string;
  storyImageAlt: string;
  storyCaption: string;
  valuesEyebrow: string;
  valuesTitle: string;
  valuesAccent: string;
  value1Title: string;
  value1Description: string;
  value2Title: string;
  value2Description: string;
  value3Title: string;
  value3Description: string;
};

export const defaultHomePageContent: HomePageContent = {
  heroImages: [
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1800&q=90",
    "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1800&q=90",
    "https://images.unsplash.com/photo-1623998021722-b934f73081df?auto=format&fit=crop&w=1800&q=90",
  ],
  heroEyebrow: "CLUB DE BADMINTON · COGNAC",
  heroTitleAccent: "Cognac",
  heroTitle: "Badminton",
  heroPitch: "Le club qui a du <em>corps</em> et du cœur.",
  heroLine: "On lève le volant <em>ensemble</em>.",
  heroSlogan: "Cognac Badminton, ça se déguste en équipe.",
  introEyebrow: "LE CLUB EN BREF",
  introText:
    "Un filet, quelques volants et l’envie de jouer. Le Cognac Badminton rassemble les passionnés de tous âges et de tous niveaux autour d’un sport aussi vif que convivial.",
  storyEyebrow: "NOTRE ESPRIT",
  storyTitle: "Le bon match,",
  storyAccent: "c’est celui qu’on partage.",
  storyParagraph1:
    "Le Cognac Badminton fait vivre le badminton au cœur de la Charente. Le club rassemble des joueurs curieux, des compétiteurs et des familles autour d’une même envie : se retrouver sur les terrains.",
  storyParagraph2:
    "Son histoire s’écrit avec ses bénévoles, ses joueurs et ses partenaires. Envie d’en faire partie ? Venez découvrir une séance.",
  storyImage:
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=85",
  storyImageAlt: "Terrain de badminton prêt pour une partie",
  storyCaption: "LE PLAISIR DU JEU, ENSEMBLE",
  valuesEyebrow: "UN CLUB POUR VOUS",
  valuesTitle: "Votre jeu.",
  valuesAccent: "Votre rythme.",
  value1Title: "Loisir",
  value1Description:
    "Du jeu libre et des rencontres dans une ambiance détendue.",
  value2Title: "Progression",
  value2Description:
    "Des séances encadrées pour apprendre et évoluer à son rythme.",
  value3Title: "Compétition",
  value3Description: "Des équipes et des tournois pour se challenger.",
};
