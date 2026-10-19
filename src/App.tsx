import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { getIdTokenResult, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'
import { ArrowDown, ArrowRight, ArrowUpRight, Bird, CalendarDays, ChevronLeft, ChevronRight, Clock3, Facebook, Instagram, Mail, MapPin, Menu, ShieldCheck, Trophy, X } from 'lucide-react'
import { Article, demoArticles, tournamentDates } from './data'
import { auth, db, firebaseEnabled } from './firebase'

const gallery = [
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1800&q=90',
  'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1800&q=90',
  'https://images.unsplash.com/photo-1623998021722-b934f73081df?auto=format&fit=crop&w=1800&q=90',
]

function Brand() {
  return <Link className="brand" to="/" aria-label="Cognac Badminton, accueil"><img src="/logo.jpg" alt="" /></Link>
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className={open ? 'site-header menu-open' : 'site-header'}><div className="header-inner"><Brand /><button className="menu-toggle" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Navigation principale">{[['Le club', '/club'], ['Actualités', '/actualites'], ['Contact', '/contact']].map(([label, path]) => <NavLink key={path} onClick={() => setOpen(false)} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}<Link className="header-cta" onClick={() => setOpen(false)} to="/contact#inscription">Nous rejoindre <ArrowUpRight size={16} /></Link></nav></div></header>
}

function Footer() {
  return <footer className="site-footer"><div className="container footer-main"><div><Brand /><p className="footer-about">Le badminton à Cognac, pour tous les jeux et tous les niveaux.</p></div><div><span className="footer-label">Explorer</span><Link to="/club">Le club</Link><Link to="/actualites">Actualités</Link><Link to="/contact">Nous contacter</Link></div><div><span className="footer-label">Nous trouver</span><span className="footer-location"><MapPin size={16} /> Cognac · Charente</span><a href="mailto:badcognac@gmail.com"><Mail size={16} /> badcognac@gmail.com</a><a href="https://www.facebook.com/groups/cognac.badminton" target="_blank" rel="noreferrer"><Facebook size={16} /> Facebook</a><a href="https://www.instagram.com/cognac_badminton/" target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a></div><div className="footer-stamp"><span>COGNAC</span><strong>CB</strong><span>BADMINTON CLUB</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Cognac Badminton</span><Link to="/webmaster"><ShieldCheck size={14} /> Espace webmaster</Link><span>Jouons collectif.</span><span className="footer-credit">Photo : <a href="https://commons.wikimedia.org/wiki/File:Badminton_Tournament.jpg" target="_blank" rel="noreferrer">Itsn4kul10, Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></span></div></footer>
}

function PageFrame({ children }: { children: ReactNode }) {
  return <><a className="skip-link" href="#contenu">Aller au contenu</a><Header /><main id="contenu">{children}</main><Footer /></>
}

function SectionHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="section-head"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
}

function useArticles() {
  const [items, setItems] = useState<Article[]>(demoArticles)
  useEffect(() => {
    if (!db) return
    // Les contenus de démonstration restent visibles si Firebase n’est pas configuré.
    getDocs(query(collection(db, 'articles'), orderBy('date', 'desc'))).then(snapshot => {
      if (snapshot.size) setItems(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }) as Article))
    }).catch(() => undefined)
  }, [])
  return items
}

function NewsCard({ article }: { article: Article }) {
  return <article className="news-card"><Link to={`/actualites/${article.id}`} className="news-image" aria-label={`Lire : ${article.title}`}><img src={article.image} alt={article.title} loading="lazy" /><span className="news-category">{article.category}</span></Link><div className="news-card-body"><time dateTime={article.date}>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${article.date}T12:00:00`))}</time><h3><Link to={`/actualites/${article.id}`}>{article.title}</Link></h3><p>{article.excerpt}</p><Link className="text-link" to={`/actualites/${article.id}`}>Lire l’article <ArrowRight size={15} /></Link></div></article>
}

function Home() {
  const [slide, setSlide] = useState(0)
  const news = useArticles().slice(0, 3)
  return <>
    <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(18,31,46,.92), rgba(18,31,46,.66) 48%, rgba(18,31,46,.13)), url("${gallery[slide]}")` }} aria-label="Présentation du Cognac Badminton">
      <div className="container hero-content"><img className="hero-logo" src="/logo.jpg" alt="Logo Cognac Badminton" /><span className="eyebrow light"><span className="eyebrow-dot" /> CLUB DE BADMINTON · COGNAC</span><h1>Du jeu.<br /><em>Du lien.</em><br />Du mouvement.</h1><p>Un club charentais où l’on vient pour jouer, progresser et se retrouver. Quel que soit votre niveau, le terrain est à vous.</p><div className="hero-actions"><Link className="button button-copper" to="/contact#inscription">Découvrir le club <ArrowUpRight size={17} /></Link><Link className="button button-quiet" to="/club#horaires"><Clock3 size={17} /> Voir les créneaux</Link></div></div>
      <div className="hero-index"><span>0{slide + 1}</span><span className="hero-index-line" />03</div><div className="hero-controls"><button aria-label="Photo précédente" onClick={() => setSlide((slide + gallery.length - 1) % gallery.length)}><ChevronLeft /></button><button aria-label="Photo suivante" onClick={() => setSlide((slide + 1) % gallery.length)}><ChevronRight /></button></div><a className="hero-scroll" href="#club-intro"><ArrowDown size={16} /> DÉFILER</a>
    </section>
    <section id="club-intro" className="intro-band"><div className="container intro-grid"><span className="eyebrow">LE CLUB EN BREF</span><p>Un filet, quelques volants et l’envie de jouer. <strong>Le Cognac Badminton rassemble</strong> les passionnés de tous âges et de tous niveaux autour d’un sport aussi vif que convivial.</p><Link className="text-link" to="/club">Rencontrer le club <ArrowRight size={15} /></Link></div></section>
    <section className="section section-news"><div className="container"><div className="section-row"><SectionHead eyebrow="ÇA BOUGE AU CLUB" title="Sur les terrains" copy="Les dernières nouvelles du Cognac Badminton." /><Link className="text-link all-news" to="/actualites">Toute l’actualité <ArrowRight size={16} /></Link></div><div className="row g-4">{news.map(article => <div className="col-md-4" key={article.id}><NewsCard article={article} /></div>)}</div></div></section>
    <section className="join-band"><div className="container join-inner"><div><span className="eyebrow light">LE TERRAIN VOUS ATTEND</span><h2>À chacun son<br /><em>prochain match.</em></h2></div><div className="join-actions"><p>Loisir, compétition ou découverte : trouvez votre place au club.</p><Link className="button button-light" to="/contact#inscription">Les inscriptions <ArrowUpRight size={17} /></Link><Link className="button button-outline-light" to="/club#horaires">Horaires & accès <ArrowRight size={16} /></Link></div><span className="join-shuttle"><Bird /></span></div></section>
  </>
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description: string }) {
  return <section className="page-intro"><div className="container page-intro-inner"><span className="eyebrow light">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><span className="intro-watermark" aria-hidden="true">CB</span></section>
}

function Club() {
  return <><PageIntro eyebrow="COGNAC BADMINTON · DEPUIS TOUJOURS EN MOUVEMENT" title={<>Un club, mille<br /><em>façons de jouer.</em></>} description="Le badminton se partage. À Cognac, nous faisons vivre un club ouvert, dynamique et attentif à chacun." />
    <section className="section club-story"><div className="container story-grid"><div className="story-photo"><img src={gallery[0]} alt="Terrain de badminton prêt pour une partie" /><span className="photo-caption">LE PLAISIR DU JEU, ENSEMBLE</span></div><div className="story-copy"><span className="eyebrow">NOTRE ESPRIT</span><h2>Le bon match,<br /><em>c’est celui qu’on partage.</em></h2><p>Le Cognac Badminton fait vivre le badminton au cœur de la Charente. Le club rassemble des joueurs curieux, des compétiteurs et des familles autour d’une même envie : se retrouver sur les terrains.</p><p>Son histoire s’écrit avec ses bénévoles, ses joueurs et ses partenaires. Envie d’en faire partie ? Venez découvrir une séance.</p><Link className="text-link" to="/contact#inscription">Faire un essai <ArrowRight size={16} /></Link></div></div></section>
    <section className="section history-section"><div className="container history-grid"><div><SectionHead eyebrow="NOTRE HISTOIRE" title="Les saisons s’écrivent ensemble" copy="Quelques repères pour raconter l’aventure du club. Les dates et événements sont à compléter à partir des archives de Cognac Badminton." /></div><div className="history-list"><article><span>LES DÉBUTS</span><h3>Les premières volées</h3><p>Origines et création du club à renseigner avec les membres fondateurs.</p></article><article><span>AU FIL DES SAISONS</span><h3>Une aventure collective</h3><p>Équipes, bénévoles et moments marquants à documenter avec le club.</p></article><article><span>AUJOURD’HUI</span><h3>Le jeu continue</h3><p>Une communauté ouverte à celles et ceux qui veulent jouer à Cognac.</p></article></div></div></section>
    <section className="section team-section"><div className="container"><div className="section-row"><SectionHead eyebrow="LES VISAGES DU CLUB" title="Une équipe, des rencontres" copy="Les images ci-dessous sont provisoires et prévues pour accueillir les photos autorisées des membres, encadrants et équipes." /></div><div className="team-gallery">{gallery.map((image, index) => <figure className="team-photo" key={image}><img src={image} alt={`Photo d’illustration temporaire pour ${['les joueurs et joueuses', 'l’encadrement', 'les équipes'][index]}`} loading="lazy" /><figcaption><span>PHOTO À REMPLACER</span><strong>{['Les joueurs et joueuses', 'L’encadrement', 'Les équipes'][index]}</strong></figcaption></figure>)}</div></div></section>
    <section className="club-values"><div className="container values-grid"><div><span className="eyebrow light">UN CLUB POUR VOUS</span><h2>Votre jeu.<br /><em>Votre rythme.</em></h2></div><div className="value-item"><span>01</span><h3>Loisir</h3><p>Du jeu libre et des rencontres dans une ambiance détendue.</p></div><div className="value-item"><span>02</span><h3>Progression</h3><p>Des séances encadrées pour apprendre et évoluer à son rythme.</p></div><div className="value-item"><span>03</span><h3>Compétition</h3><p>Des équipes et des tournois pour se challenger.</p></div></div></section>
    <section className="section" id="horaires"><div className="container"><div className="section-row"><SectionHead eyebrow="TROUVEZ VOTRE CRÉNEAU" title="On se retrouve au gymnase" copy="Le club est labellisé École Française de Badminton. Deux entraînements jeunes sont proposés chaque semaine aux 5–17 ans ; au-delà de 17 ans, les joueurs rejoignent les créneaux adultes." /><Link className="text-link" to="/contact">Poser une question <ArrowRight size={16} /></Link></div><div className="schedule-groups"><section className="schedule-venue" aria-labelledby="adultes-heading"><h3 id="adultes-heading">Adultes · Gymnase Beaulieu</h3><p className="venue-address">Rue du Port, Cognac</p><div className="schedule-table" role="table" aria-label="Horaires adultes à Beaulieu"><div className="schedule-line schedule-heading" role="row"><span role="columnheader">Jour</span><span role="columnheader">Horaires</span><span role="columnheader">Séance</span></div><div className="schedule-line" role="row"><strong role="rowheader">Lundi</strong><span role="cell">18h30–20h</span><span role="cell">Initiation débutant</span></div><div className="schedule-line" role="row"><strong role="rowheader">Lundi</strong><span role="cell">20h–22h</span><span role="cell">Jeu libre · priorité débutants</span></div><div className="schedule-line" role="row"><strong role="rowheader">Mercredi</strong><span role="cell">18h30–22h</span><span role="cell">Jeu libre jeunes et adultes</span></div><div className="schedule-line" role="row"><strong role="rowheader">Jeudi</strong><span role="cell">18h30–20h</span><span role="cell">Entraînement compétiteurs</span></div><div className="schedule-line" role="row"><strong role="rowheader">Jeudi</strong><span role="cell">20h–22h</span><span role="cell">Jeu libre compétiteurs</span></div><div className="schedule-line" role="row"><strong role="rowheader">Vendredi</strong><span role="cell">18h–20h</span><span role="cell">Jeu libre jeunes et adultes</span></div></div></section><section className="schedule-venue" aria-labelledby="jeunes-heading"><h3 id="jeunes-heading">Jeunes · Gymnase Jean Monnet</h3><p className="venue-address">Collège Jean Monnet · Cognac · École Française de Badminton</p><div className="schedule-table" role="table" aria-label="Horaires jeunes à Jean Monnet"><div className="schedule-line schedule-heading" role="row"><span role="columnheader">Jour</span><span role="columnheader">Horaires</span><span role="columnheader">Âge</span></div><div className="schedule-line" role="row"><strong role="rowheader">Mardi</strong><span role="cell">18h15–19h45</span><span role="cell">5–10 ans</span></div><div className="schedule-line" role="row"><strong role="rowheader">Jeudi</strong><span role="cell">18h15–19h45</span><span role="cell">11–17 ans</span></div></div><p className="schedule-footnote">Au-delà de 17 ans, les joueurs sont accueillis sur les créneaux adultes.</p></section></div></div></section>
    <section className="section tournament-section"><div className="container"><div className="section-row"><SectionHead eyebrow="À VOS AGENDAS" title="Calendrier des tournois" copy="Dates indicatives : consultez le calendrier officiel du club avant de vous déplacer." /><Trophy className="section-icon" /></div><div className="tournament-list">{tournamentDates.map((event, index) => <article className="tournament" key={event.title}><span className="tournament-number">0{index + 1}</span><div className="tournament-date"><strong>{event.day}</strong><span>{event.month}</span></div><div className="tournament-name"><h3>{event.title}</h3><p>{event.detail}</p></div><ArrowUpRight className="tournament-arrow" /></article>)}</div></div></section>
  </>
}

function News() {
  const items = useArticles()
  const [page, setPage] = useState(1)
  const pageSize = 3
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const visible = items.slice((page - 1) * pageSize, page * pageSize)
  return <><PageIntro eyebrow="LE JOURNAL DU CLUB" title={<>Les nouvelles<br /><em>du terrain.</em></>} description="La vie du club, les rendez-vous et les histoires qui se jouent à Cognac." /><section className="section news-page"><div className="container"><div className="news-toolbar"><span>{items.length} ACTUALITÉS</span><span>SAISON 2026—2027</span></div><div className="row g-4">{visible.map(article => <div className="col-md-4" key={article.id}><NewsCard article={article} /></div>)}</div><nav className="pagination-row" aria-label="Pagination des actualités"><button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Page précédente"><ChevronLeft /></button><span>0{page} <i /> 0{pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Page suivante"><ChevronRight /></button></nav></div></section></>
}

function ArticleDetail() {
  const { id } = useParams()
  const article = useArticles().find(item => item.id === id)
  if (!article) return <section className="section article-missing"><div className="container"><p>Cette actualité n’est pas disponible.</p><Link className="text-link" to="/actualites">Retour aux actualités <ArrowRight size={16} /></Link></div></section>
  return <><article className="article-detail"><div className="container article-container"><Link className="text-link" to="/actualites"><ArrowRight className="back-arrow" size={16} /> Toutes les actualités</Link><span className="eyebrow article-category">{article.category}</span><h1>{article.title}</h1><div className="article-meta"><time dateTime={article.date}>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${article.date}T12:00:00`))}</time><span>Par {article.author}</span></div><img className="article-cover" src={article.image} alt={article.title} /><p className="article-excerpt">{article.excerpt}</p><div className="article-content">{article.content.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></div></article><section className="article-more"><div className="container"><Link className="text-link" to="/actualites">Toutes les actualités <ArrowRight size={16} /></Link></div></section></>
}

function Contact() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!db) { setError('Le formulaire sera disponible après la configuration de Firebase.'); return }
    const form = new FormData(event.currentTarget)
    try {
      // L’écriture publique est limitée aux champs attendus par firestore.rules.
      await addDoc(collection(db, 'messages'), { name: form.get('name'), email: form.get('email'), subject: form.get('subject'), message: form.get('message'), createdAt: new Date().toISOString() })
      setSent(true)
    } catch { setError('Le message n’a pas pu être envoyé. Réessayez ultérieurement.') }
  }
  return <><PageIntro eyebrow="ON ÉCHANGE ?" title={<>À bientôt<br /><em>sur le terrain.</em></>} description="Une question sur le club, les séances ou les inscriptions ? Écrivez-nous." /><section className="section contact-section"><div className="container contact-grid"><div className="contact-details"><span className="eyebrow">COGNAC BADMINTON</span><h2>Le premier échange<br />commence ici.</h2><div className="contact-detail"><Mail /><div><span>CONTACT</span><Link to="#message">Posez votre question dans le groupe du club ou utilisez le formulaire.</Link></div></div><div className="contact-detail"><MapPin /><div><span>GYMNASES</span><p>Adultes : Gymnase Beaulieu, rue du Port à Cognac.<br />Jeunes : Gymnase Jean Monnet (Collège Jean Monnet).</p></div></div><div className="contact-detail"><Clock3 /><div><span>RENSEIGNEMENTS</span><p>Vous pouvez aussi poser votre question directement sur place : Gymnase Beaulieu, rue du Port à Cognac.</p></div></div><div className="contact-note"><CalendarDays size={18} /><p>Le club est labellisé École Française de Badminton. Deux créneaux jeunes par semaine accueillent les 5–17 ans ; au-delà de 17 ans, les joueurs sont admis sur les créneaux adultes.</p></div></div><form id="message" className="contact-form" onSubmit={submit}><span className="eyebrow">ÉCRIVEZ-NOUS</span><h3>Votre message</h3>{sent ? <div className="form-success" role="status">Merci pour votre message. Le club revient vers vous dès que possible.</div> : <><div className="form-row"><label>Nom complet<input name="name" autoComplete="name" required /></label><label>Adresse e-mail<input type="email" name="email" autoComplete="email" required /></label></div><label>Objet<select name="subject" defaultValue="" required><option value="" disabled>Choisir un sujet</option><option>Inscription</option><option>Horaires et séances</option><option>Compétition</option><option>Autre demande</option></select></label><label>Votre message<textarea name="message" rows={5} required minLength={10} maxLength={5000} /></label><button className="button button-copper" type="submit">Envoyer le message <ArrowRight size={17} /></button>{error && <p className="form-error" role="alert">{error}</p>}</>}</form></div></section><section className="inscription-strip" id="inscription"><div className="container"><span className="eyebrow light">ENVIE DE JOUER ?</span><h2>Une première séance,<br /><em>ça ne s’oublie pas.</em></h2><p>Contactez le club pour connaître les modalités d’essai et les inscriptions.</p><a className="button button-light" href="#message">Demander une séance d’essai <ArrowUpRight size={17} /></a></div></section></>
}

function Webmaster() {
  const [user, setUser] = useState<User | null>(null)
  const [hasAdminClaim, setHasAdminClaim] = useState(false)
  const [items, setItems] = useState<Article[]>([])
  const [editing, setEditing] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => auth ? onAuthStateChanged(auth, async current => {
    setUser(current)
    if (!current) { setHasAdminClaim(false); return }
    try { setHasAdminClaim((await getIdTokenResult(current)).claims.admin === true) }
    catch { setHasAdminClaim(false) }
  }) : undefined, [])
  useEffect(() => {
    if (!user || !hasAdminClaim || !db) return
    getDocs(query(collection(db, 'articles'), orderBy('date', 'desc'))).then(snapshot => setItems(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }) as Article))).catch(() => setError('Accès refusé. Vérifiez le rôle administrateur de votre compte.'))
  }, [user, hasAdminClaim])
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!auth) return
    const form = new FormData(event.currentTarget)
    try { await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password'))) } catch { setError('Connexion impossible. Vérifiez vos identifiants.') }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!db) return
    const form = new FormData(event.currentTarget)
    const article = { title: String(form.get('title')), category: String(form.get('category')), date: String(form.get('date')), author: String(form.get('author')), excerpt: String(form.get('excerpt')), image: String(form.get('image')), content: String(form.get('content')) }
    try {
      if (editing) await updateDoc(doc(db, 'articles', editing.id), article)
      else await addDoc(collection(db, 'articles'), article)
      const snapshot = await getDocs(query(collection(db, 'articles'), orderBy('date', 'desc')))
      setItems(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }) as Article)); setEditing(null); setNotice('Article enregistré.'); setError('')
    } catch { setError('Enregistrement refusé. Vérifiez les droits de votre compte administrateur.') }
  }
  async function remove(id: string) {
    if (!db || !window.confirm('Supprimer cet article ? Cette action est définitive.')) return
    try { await deleteDoc(doc(db, 'articles', id)); setItems(items.filter(article => article.id !== id)); setNotice('Article supprimé.') }
    catch { setError('Suppression refusée. Vérifiez les droits de votre compte administrateur.') }
  }
  return <><PageIntro eyebrow="GESTION DU SITE" title={<>Espace<br /><em>webmaster.</em></>} description="Administration des actualités du Cognac Badminton." /><section className="section admin-section"><div className="container admin-container">{!firebaseEnabled ? <div className="admin-message"><ShieldCheck size={28} /><h2>Configuration requise</h2><p>Connectez Firebase Authentication et Firestore pour activer l’espace webmaster. Les étapes sont décrites dans le README.</p></div> : !user ? <form className="admin-login" onSubmit={login}><ShieldCheck size={24} /><span className="eyebrow">ACCÈS RÉSERVÉ</span><h2>Connexion webmaster</h2><label>Adresse e-mail<input type="email" name="email" autoComplete="username" required /></label><label>Mot de passe<input type="password" name="password" autoComplete="current-password" required /></label><button className="button button-copper" type="submit">Se connecter <ArrowRight size={16} /></button>{error && <p role="alert" className="form-error">{error}</p>}</form> : !hasAdminClaim ? <div className="admin-message"><ShieldCheck size={28} /><h2>Compte non autorisé</h2><p>Ce compte ne possède pas le rôle webmaster. Demandez à un administrateur de lui attribuer le claim requis.</p><button className="button button-outline" onClick={() => signOut(auth!)}>Déconnexion <X size={16} /></button></div> : <div className="admin-dashboard"><div className="admin-top"><div><span className="eyebrow">CONNECTÉ : {user.email}</span><h2>Actualités</h2></div><button className="button button-outline" onClick={() => signOut(auth!)}>Déconnexion <X size={16} /></button></div>{notice && <p role="status" className="form-success">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}<div className="admin-list">{items.map(item => <div className="admin-item" key={item.id}><div><strong>{item.title}</strong><span>{item.date} · {item.category}</span></div><button onClick={() => { setEditing(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Modifier</button><button className="delete-action" onClick={() => remove(item.id)}>Supprimer</button></div>)}</div><form className="admin-editor" onSubmit={save}><h3>{editing ? 'Modifier une actualité' : 'Nouvelle actualité'}</h3><div className="form-row"><label>Titre<input name="title" defaultValue={editing?.title} required /></label><label>Catégorie<input name="category" defaultValue={editing?.category} required /></label></div><div className="form-row"><label>Date<input type="date" name="date" defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)} required /></label><label>Auteur<input name="author" defaultValue={editing?.author} required /></label></div><label>URL de l’image<input type="url" name="image" defaultValue={editing?.image} required /></label><label>Résumé<textarea name="excerpt" rows={2} defaultValue={editing?.excerpt} required /></label><label>Contenu<textarea name="content" rows={5} defaultValue={editing?.content} required /></label><button className="button button-copper" type="submit">{editing ? 'Enregistrer les modifications' : 'Publier l’article'} <ArrowRight size={16} /></button>{editing && <button type="button" className="cancel-edit" onClick={() => setEditing(null)}>Annuler</button>}</form></div>}</div></section></>
}

export default function App() {
  return <PageFrame><Routes><Route path="/" element={<Home />} /><Route path="/club" element={<Club />} /><Route path="/actualites" element={<News />} /><Route path="/actualites/:id" element={<ArticleDetail />} /><Route path="/contact" element={<Contact />} /><Route path="/webmaster" element={<Webmaster />} /><Route path="*" element={<section className="not-found"><h1>Cette page n’existe pas.</h1><Link className="text-link" to="/">Retour à l’accueil <ArrowRight /></Link></section>} /></Routes></PageFrame>
}