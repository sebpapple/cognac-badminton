export type Article = {
  id: string
  title: string
  category: string
  date: string
  author: string
  excerpt: string
  image: string
  content: string
}

export const demoArticles: Article[] = [
  { id: 'rentrée', title: 'La saison reprend sur les terrains', category: 'Vie du club', date: '2026-09-08', author: 'Le bureau', excerpt: 'Une nouvelle saison, de nouveaux défis et toujours le même plaisir de jouer ensemble.', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=85', content: 'Que vous découvriez le badminton ou que vous soyez déjà compétiteur, le club vous accueille pour partager une saison sportive et conviviale.' },
  { id: 'jeunes', title: 'Le plaisir de progresser ensemble', category: 'Formation', date: '2026-08-21', author: 'Équipe encadrante', excerpt: 'Coordination, échanges et premiers matchs : le badminton se découvre en s’amusant.', image: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1200&q=85', content: 'Nos séances jeunes mettent l’accent sur le jeu, la coordination et le plaisir de progresser ensemble. Contactez le club pour connaître les modalités.' },
  { id: 'tournoi', title: 'Les rendez-vous de la saison', category: 'Compétition', date: '2026-08-02', author: 'Le bureau', excerpt: 'Le calendrier de compétition se dessine : préparez vos volants et réservez vos dates.', image: 'https://images.unsplash.com/photo-1623998021722-b934f73081df?auto=format&fit=crop&w=1200&q=85', content: 'Les dates et lieux des compétitions sont communiqués au fil de la saison. Consultez le calendrier officiel auprès du club avant de vous déplacer.' },
  { id: 'convivialite', title: 'Le badminton, aussi pour le plaisir', category: 'Club', date: '2026-07-14', author: 'Le bureau', excerpt: 'Parties libres, rencontres et une place pour chaque niveau au Cognac Badminton.', image: 'https://images.unsplash.com/photo-1617696618050-b0fef0c666af?auto=format&fit=crop&w=1200&q=85', content: 'Le club rassemble des joueuses et joueurs de tous horizons. Les séances loisirs sont l’occasion de bouger, de progresser à son rythme et de faire connaissance.' },
]

export const tournamentDates = [
  { month: 'NOV', day: '14', title: 'Tournoi départemental', detail: 'Date et lieu à confirmer auprès du club' },
  { month: 'DÉC', day: '06', title: 'Rencontre interclubs', detail: 'Calendrier prévisionnel' },
  { month: 'JAN', day: '17', title: 'Plateau jeunes', detail: 'Date et lieu à confirmer auprès du club' },
]