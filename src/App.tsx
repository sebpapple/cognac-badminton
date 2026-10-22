import {
  CSSProperties,
  FormEvent,
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Menu,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { Article, ClubEvent, demoArticles, demoEvents } from "./data";
import {
  TeamData,
  TeamSource,
} from "./teamSources";
import { auth, db, firebaseEnabled } from "./firebase";

type SiteRole = "admin" | "editor";
type ManagedUser = {
  uid: string;
  email: string;
  displayName: string;
  role: SiteRole;
};
type BoardMember = {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  order?: number;
};
type WebmasterTab = "articles" | "board" | "events" | "teams";

function sortBoardMembers(members: BoardMember[]) {
  return [...members].sort((first, second) => {
    if (typeof first.order === "number" && typeof second.order === "number")
      return first.order - second.order;
    if (typeof first.order === "number") return -1;
    if (typeof second.order === "number") return 1;
    return first.name.localeCompare(second.name, "fr");
  });
}

function isFirestorePermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "permission-denied"
  );
}

function formatEventDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short" },
) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", options).format(
    new Date(year, month - 1, day, 12),
  );
}

function useEvents() {
  const [events, setEvents] = useState<ClubEvent[]>(db ? [] : demoEvents);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(db));
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const firestore = db;
    let active = true;
    getDocs(query(collection(firestore, "events"), orderBy("date", "asc")))
      .then((snapshot) => {
        if (active)
          setEvents(
            snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as ClubEvent,
            ),
          );
      })
      .catch(() => {
        if (active)
          setError(
            "Les évènements ne peuvent pas être chargés pour le moment.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return { events, error, loading };
}

const gallery = [
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1800&q=90",
  "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1800&q=90",
  "https://images.unsplash.com/photo-1623998021722-b934f73081df?auto=format&fit=crop&w=1800&q=90",
];
const web3FormsAccessKey = "55d8ccc0-bc5f-4bcf-af5a-452539af78ff";
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function resolveSiteRole(
  currentUser: User,
): Promise<{ role: SiteRole | null; isClaimAdmin: boolean }> {
  const token = await getIdTokenResult(currentUser);
  if (token.claims.admin === true) return { role: "admin", isClaimAdmin: true };
  if (!db) return { role: null, isClaimAdmin: false };
  const roleDocument = await getDoc(doc(db, "userRoles", currentUser.uid));
  const role = roleDocument.data()?.role;
  return {
    role: role === "admin" || role === "editor" ? role : null,
    isClaimAdmin: false,
  };
}

function useSiteSession() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [role, setRole] = useState<SiteRole | null>(null);
  const [isClaimAdmin, setIsClaimAdmin] = useState(false);

  useEffect(
    () =>
      auth
        ? onAuthStateChanged(auth, async (current) => {
            setAuthReady(false);
            setUser(current);
            setRole(null);
            setIsClaimAdmin(false);
            if (!current) {
              setAuthReady(true);
              return;
            }
            try {
              const access = await resolveSiteRole(current);
              setRole(access.role);
              setIsClaimAdmin(access.isClaimAdmin);
            } catch {
              setRole(null);
            } finally {
              setAuthReady(true);
            }
          })
        : undefined,
    [],
  );

  return { user, authReady, role, isClaimAdmin };
}

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Cognac Badminton, accueil">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className={open ? "site-header menu-open" : "site-header"}>
      <div className="header-inner">
        <Brand />
        <button
          className="menu-toggle"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Navigation principale"
        >
          {[
            ["Le club", "/club"],
            ["Créneaux", "/creneaux"],
            ["Évènements", "/evenements"],
            ["Les équipes", "/equipes"],
            ["Actualités", "/actualites"],
            ["Contact", "/contact"],
          ].map(([label, path]) => (
            <NavLink
              key={path}
              onClick={() => setOpen(false)}
              to={path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Brand />
          <p className="footer-about">
            Le badminton à Cognac, pour tous les jeux et tous les niveaux.
          </p>
        </div>
        <div>
          <span className="footer-label">Explorer</span>
          <Link to="/club">Le club</Link>
          <Link to="/creneaux">Créneaux</Link>
          <Link to="/evenements">Évènements</Link>
          <Link to="/actualites">Actualités</Link>
          <Link to="/contact">Nous contacter</Link>
        </div>
        <div>
          <span className="footer-label">Nous trouver</span>
          <span className="footer-location">
            <MapPin size={16} /> Cognac · Charente
          </span>
          <a href="mailto:badcognac@gmail.com">
            <Mail size={16} /> badcognac@gmail.com
          </a>
          <a
            href="https://www.facebook.com/groups/cognac.badminton"
            target="_blank"
            rel="noreferrer"
          >
            <Facebook size={16} /> Facebook
          </a>
          <a
            href="https://www.instagram.com/cognac_badminton/"
            target="_blank"
            rel="noreferrer"
          >
            <Instagram size={16} /> Instagram
          </a>
        </div>
        <div className="footer-stamp">
          <span>COGNAC</span>
          <strong>CB</strong>
          <span>BADMINTON CLUB</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Cognac Badminton</span>
        <Link to="/webmaster">
          <ShieldCheck size={14} /> Espace webmaster
        </Link>
        <Link to="/mentions-legales">Mentions légales</Link>
        <Link to="/rgpd">Données personnelles</Link>
        <span>Jouons collectif.</span>
      </div>
    </footer>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu">{children}</main>
      <Footer />
      <PageScrollControls />
    </>
  );
}

function PageScrollControls() {
  const { pathname } = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setShowBackToTop(false);
  }, [pathname]);

  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 300);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!showBackToTop) return null;
  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="Revenir en haut de page"
      title="Revenir en haut de page"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

function SectionHead({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function useArticles() {
  const [items, setItems] = useState<Article[]>(demoArticles);
  useEffect(() => {
    if (!db) return;
    // Les contenus de démonstration restent visibles si Firebase n’est pas configuré.
    getDocs(query(collection(db, "articles"), orderBy("date", "desc")))
      .then((snapshot) => {
        setItems(
          snapshot.docs.map(
            (entry) => ({ id: entry.id, ...entry.data() }) as Article,
          ),
        );
      })
      .catch(() => undefined);
  }, []);
  return items;
}

function useBoardMembers() {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    getDocs(collection(db, "boardMembers"))
      .then((snapshot) =>
        setMembers(
          sortBoardMembers(
            snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as BoardMember,
            ),
          ),
        ),
      )
      .catch(() =>
        setError(
          "Les membres du bureau ne peuvent pas être chargés pour le moment.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return { members, error, loading };
}

async function uploadBoardMemberPhoto(file: File): Promise<string> {
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error(
      "Configurez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET pour téléverser des photos.",
    );
  }
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", cloudinaryUploadPreset);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryCloudName)}/image/upload`,
    {
      method: "POST",
      body: data,
    },
  );
  if (!response.ok) throw new Error("Le téléversement de la photo a échoué.");
  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("secure_url" in result) ||
    typeof result.secure_url !== "string" ||
    !result.secure_url.startsWith("https://res.cloudinary.com/")
  ) {
    throw new Error("Cloudinary n’a pas renvoyé une URL de photo valide.");
  }
  return result.secure_url;
}

function BoardMembersGallery() {
  const { members, error, loading } = useBoardMembers();
  return (
    <div className="team-gallery">
      {members.map((member) => (
        <figure className="team-photo" key={member.id}>
          <img
            src={member.photoUrl}
            alt={`Portrait de ${member.name}`}
            loading="lazy"
          />
          <figcaption>
            <span>BUREAU DU CLUB</span>
            <strong>{member.name}</strong>
            <span className="team-member-role">{member.role}</span>
          </figcaption>
        </figure>
      ))}
      {error && (
        <p className="admin-empty" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="admin-empty" role="status">
          Chargement des membres du bureau…
        </p>
      )}
      {!loading && !error && members.length === 0 && (
        <p className="admin-empty">
          Les membres du bureau seront bientôt présentés.
        </p>
      )}
    </div>
  );
}

function NewsCard({ article }: { article: Article }) {
  return (
    <article className="news-card">
      <Link
        to={`/actualites/${article.id}`}
        className="news-image"
        aria-label={`Lire : ${article.title}`}
      >
        {article.image ? (
          <img src={article.image} alt={article.title} loading="lazy" />
        ) : (
          <span
            className="news-image-empty"
            role="img"
            aria-label="Article sans photo"
          >
            Cognac Badminton
          </span>
        )}
        <span className="news-category">{article.category}</span>
      </Link>
      <div className="news-card-body">
        <time dateTime={article.date}>
          {new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(`${article.date}T12:00:00`))}
        </time>
        <h3>
          <Link to={`/actualites/${article.id}`}>{article.title}</Link>
        </h3>
        <p>{article.excerpt}</p>
        <Link className="text-link" to={`/actualites/${article.id}`}>
          Lire l’article <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

function Home() {
  const [slide, setSlide] = useState(0);
  const news = useArticles().slice(0, 3);
  return (
    <>
      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(18,31,46,.92), rgba(18,31,46,.66) 48%, rgba(18,31,46,.13)), url("${gallery[slide]}")`,
        }}
        aria-label="Présentation du Cognac Badminton"
      >
        <div className="container hero-content">
          <img
            className="hero-logo"
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Logo Cognac Badminton"
          />
          <span className="eyebrow light">
            <span className="eyebrow-dot" /> CLUB DE BADMINTON · COGNAC
          </span>
          <h1>
            <em>Cognac</em> Badminton
            <br />
          </h1>
          <p>
            Le club qui a du <em>corps</em> et du <em>cœur</em>.<br />
            On lève le volant <em>ensemble</em>.<br />
            <em>Cognac Badminton, ça se déguste en équipe.</em>
          </p>
          <div className="hero-actions">
            <Link className="button button-copper" to="/contact#inscription">
              Découvrir le club <ArrowUpRight size={17} />
            </Link>
            <Link className="button button-quiet" to="/creneaux">
              <Clock3 size={17} /> Voir les créneaux
            </Link>
          </div>
        </div>
        <div className="hero-index">
          <span>0{slide + 1}</span>
          <span className="hero-index-line" />
          03
        </div>
        <div className="hero-controls">
          <button
            aria-label="Photo précédente"
            onClick={() =>
              setSlide((slide + gallery.length - 1) % gallery.length)
            }
          >
            <ChevronLeft />
          </button>
          <button
            aria-label="Photo suivante"
            onClick={() => setSlide((slide + 1) % gallery.length)}
          >
            <ChevronRight />
          </button>
        </div>
        <a className="hero-scroll" href="#club-intro">
          <ArrowDown size={16} /> DÉFILER
        </a>
      </section>
      <section id="club-intro" className="intro-band">
        <div className="container intro-grid">
          <span className="eyebrow">LE CLUB EN BREF</span>
          <p>
            Un filet, quelques volants et l’envie de jouer.{" "}
            <strong>Le Cognac Badminton rassemble</strong> les passionnés de
            tous âges et de tous niveaux autour d’un sport aussi vif que
            convivial.
          </p>
          <Link className="text-link" to="/club">
            Rencontrer le club <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="section club-story">
        <div className="container story-grid">
          <div className="story-photo">
            <img
              src={gallery[0]}
              alt="Terrain de badminton prêt pour une partie"
            />
            <span className="photo-caption">LE PLAISIR DU JEU, ENSEMBLE</span>
          </div>
          <div className="story-copy">
            <span className="eyebrow">NOTRE ESPRIT</span>
            <h2>
              Le bon match,
              <br />
              <em>c’est celui qu’on partage.</em>
            </h2>
            <p>
              Le Cognac Badminton fait vivre le badminton au cœur de la
              Charente. Le club rassemble des joueurs curieux, des compétiteurs
              et des familles autour d’une même envie : se retrouver sur les
              terrains.
            </p>
            <p>
              Son histoire s’écrit avec ses bénévoles, ses joueurs et ses
              partenaires. Envie d’en faire partie ? Venez découvrir une séance.
            </p>
            <Link className="text-link" to="/contact#inscription">
              Faire un essai <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="club-values">
        <div className="container values-grid">
          <div>
            <span className="eyebrow light">UN CLUB POUR VOUS</span>
            <h2>
              Votre jeu.
              <br />
              <em>Votre rythme.</em>
            </h2>
          </div>
          <div className="value-item">
            <span>01</span>
            <h3>Loisir</h3>
            <p>Du jeu libre et des rencontres dans une ambiance détendue.</p>
          </div>
          <div className="value-item">
            <span>02</span>
            <h3>Progression</h3>
            <p>Des séances encadrées pour apprendre et évoluer à son rythme.</p>
          </div>
          <div className="value-item">
            <span>03</span>
            <h3>Compétition</h3>
            <p>Des équipes et des tournois pour se challenger.</p>
          </div>
        </div>
      </section>
      <section className="section section-news">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="ÇA BOUGE AU CLUB"
              title="Actualités"
              copy="Les dernières nouvelles du Cognac Badminton."
            />
            <Link className="text-link all-news" to="/actualites">
              Toute l’actualité <ArrowRight size={16} />
            </Link>
          </div>
          <div className="row g-4">
            {news.map((article) => (
              <div className="col-md-4" key={article.id}>
                <NewsCard article={article} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
}) {
  return (
    <section className="page-intro">
      <div className="container page-intro-inner">
        <span className="eyebrow light">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="intro-watermark" aria-hidden="true">
        CB
      </span>
    </section>
  );
}

function Club() {
  return (
    <>
      <PageIntro
        eyebrow="COGNAC BADMINTON · DEPUIS TOUJOURS EN MOUVEMENT"
        title={
          <>
            Un club, mille
            <br />
            <em>façons de jouer.</em>
          </>
        }
        description="Le badminton se partage. À Cognac, nous faisons vivre un club ouvert, dynamique et attentif à chacun."
      />
      <section className="section team-section">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="LES VISAGES DU CLUB"
              title="Une équipe, des rencontres"
              copy="Découvrez les membres du bureau de Cognac Badminton."
            />
          </div>
          <BoardMembersGallery />
        </div>
      </section>
    </>
  );
}

function EventList() {
  const { events, error, loading } = useEvents();
  return (
    <div className="tournament-list" aria-live="polite">
      {events.map((event, index) => (
        <article className="tournament" key={event.id}>
          <span className="tournament-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <time className="tournament-date" dateTime={event.date}>
            <strong>{formatEventDate(event.date, { day: "2-digit" })}</strong>
            <span>
              {formatEventDate(event.date, { month: "short" })
                .replace(".", "")
                .toLocaleUpperCase("fr-FR")}
            </span>
          </time>
          <div className="tournament-name">
            <h3>{event.title}</h3>
            <p>{event.detail}</p>
          </div>
          <ArrowUpRight className="tournament-arrow" />
        </article>
      ))}
      {loading && (
        <p className="admin-empty" role="status">
          Chargement des évènements…
        </p>
      )}
      {error && (
        <p className="admin-empty" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="admin-empty">
          Aucun évènement n’est programmé pour le moment.
        </p>
      )}
    </div>
  );
}

function EventsPage() {
  return (
    <>
      <PageIntro
        eyebrow="COGNAC BADMINTON · À VOS AGENDAS"
        title={
          <>
            Les évènements
            <br />
            <em>du club.</em>
          </>
        }
        description="Retrouvez les rendez-vous sportifs et les temps forts du Cognac Badminton."
      />
      <section className="section tournament-section">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="RENDEZ-VOUS DU CLUB"
              title="À noter dans vos agendas"
              copy="Les dates et informations sont communiquées par le club et peuvent évoluer."
            />
            <Trophy className="section-icon" />
          </div>
          <EventList />
        </div>
      </section>
    </>
  );
}

function EventsManager({ role }: { role: SiteRole }) {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [editing, setEditing] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      setLoading(false);
      return;
    }
    const firestore = db;
    let active = true;
    getDocs(query(collection(firestore, "events"), orderBy("date", "asc")))
      .then((snapshot) => {
        if (active)
          setEvents(
            snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as ClubEvent,
            ),
          );
      })
      .catch(() => {
        if (active)
          setError(
            "Impossible de charger les évènements. Vérifiez les règles Firestore et le rôle webmaster.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    const firestore = db;
    const form = new FormData(event.currentTarget);
    const eventData = {
      title: String(form.get("title") ?? "").trim(),
      date: String(form.get("date") ?? ""),
      detail: String(form.get("detail") ?? "").trim(),
      updatedAt: serverTimestamp(),
    };
    if (!eventData.title || !eventData.date || !eventData.detail) {
      setError("Renseignez le nom, la date et les détails de l’évènement.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(firestore, "events", editing.id), eventData);
        setEvents((current) =>
          current
            .map((item) =>
              item.id === editing.id ? { ...eventData, id: editing.id } : item,
            )
            .sort((first, second) => first.date.localeCompare(second.date)),
        );
      } else {
        const newEvent = await addDoc(
          collection(firestore, "events"),
          eventData,
        );
        setEvents((current) =>
          [...current, { ...eventData, id: newEvent.id }].sort(
            (first, second) => first.date.localeCompare(second.date),
          ),
        );
      }
      setEditing(null);
      setNotice("Évènement enregistré.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Firestore a refusé l’enregistrement. Vérifiez que firestore.rules est publié sur le projet Firebase utilisé et que votre compte a le rôle éditeur ou administrateur."
          : "Enregistrement impossible. Vérifiez les règles Firestore.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (
      !db ||
      !window.confirm("Supprimer cet évènement ? Cette action est définitive.")
    )
      return;
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "events", id));
      setEvents((current) => current.filter((event) => event.id !== id));
      if (editing?.id === id) setEditing(null);
      setNotice("Évènement supprimé.");
    } catch {
      setError(
        "Suppression refusée. Vérifiez que votre compte est administrateur et que les règles Firestore sont à jour.",
      );
    }
  }

  return (
    <section className="webmaster-panel" aria-label="Gestion des évènements">
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-list" aria-live="polite">
        {loading ? (
          <p className="admin-empty" role="status">
            Chargement des évènements…
          </p>
        ) : events.length === 0 ? (
          <p className="admin-empty">
            Aucun évènement enregistré. Vous pouvez en ajouter avec le
            formulaire ci-dessous.
          </p>
        ) : (
          events.map((item) => (
            <div className="admin-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {formatEventDate(item.date, { dateStyle: "long" })} ·{" "}
                  {item.detail}
                </span>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(item)}
              >
                Modifier
              </button>
              {role === "admin" && (
                <button
                  type="button"
                  className="delete-action"
                  disabled={saving}
                  onClick={() => void remove(item.id)}
                >
                  Supprimer
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <form
        className="admin-editor"
        key={editing?.id ?? "new-event"}
        onSubmit={save}
      >
        <h3>{editing ? "Modifier un évènement" : "Nouvel évènement"}</h3>
        <div className="form-row">
          <label>
            Nom de l’évènement
            <input
              name="title"
              defaultValue={editing?.title}
              maxLength={120}
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              name="date"
              defaultValue={editing?.date}
              required
            />
          </label>
        </div>
        <label>
          Lieu, horaire ou informations complémentaires
          <textarea
            name="detail"
            rows={2}
            defaultValue={editing?.detail}
            maxLength={500}
            required
          />
        </label>
        <button
          className="button button-copper"
          type="submit"
          disabled={saving || loading}
        >
          {saving
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Ajouter l’évènement"}{" "}
          <ArrowRight size={16} />
        </button>
        {editing && (
          <button
            type="button"
            className="cancel-edit"
            onClick={() => setEditing(null)}
          >
            Annuler la modification
          </button>
        )}
      </form>
    </section>
  );
}

function SchedulePage() {
  return (
    <>
      <PageIntro
        eyebrow="COGNAC BADMINTON · HORAIRES"
        title={
          <>
            Trouvez votre
            <br />
            <em>créneau de jeu.</em>
          </>
        }
        description="Retrouvez les horaires hebdomadaires des séances adultes et jeunes ainsi que les gymnases."
      />
      <section className="section schedule-page">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="TROUVEZ VOTRE CRÉNEAU"
              title="On se retrouve au gymnase"
              copy="Le club est labellisé École Française de Badminton. Deux entraînements jeunes sont proposés chaque semaine aux 5–17 ans ; au-delà de 17 ans, les joueurs rejoignent les créneaux adultes."
            />
          </div>
          <div className="schedule-groups">
            <section
              className="schedule-venue"
              aria-labelledby="adultes-heading"
            >
              <h3 id="adultes-heading">Adultes · Gymnase Beaulieu</h3>
              <p className="venue-address">Rue du Port, Cognac</p>
              <div
                className="schedule-table"
                role="table"
                aria-label="Horaires adultes à Beaulieu"
              >
                <div className="schedule-line schedule-heading" role="row">
                  <span role="columnheader">Jour</span>
                  <span role="columnheader">Horaires</span>
                  <span role="columnheader">Séance</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Lundi</strong>
                  <span role="cell">18h30–20h</span>
                  <span role="cell">Initiation débutant</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader"></strong>
                  <span role="cell">20h–22h</span>
                  <span role="cell">Jeu libre · priorité débutants</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Mardi</strong>
                  <span role="cell">18h30–22h</span>
                  <span role="cell">Jeu libre jeunes et adultes</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Mercredi</strong>
                  <span role="cell">18h30–22h</span>
                  <span role="cell">Jeu libre jeunes et adultes</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Jeudi</strong>
                  <span role="cell">18h30h–22h</span>
                  <span role="cell">Jeu libre jeunes et adultes</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Vendredi</strong>
                  <span role="cell">18h–20h</span>
                  <span role="cell">Jeu libre jeunes et adultes</span>
                </div>
              </div>
            </section>
            <section
              className="schedule-venue"
              aria-labelledby="jeunes-heading"
            >
              <h3 id="jeunes-heading">Jeunes · Gymnase Jean Monnet</h3>
              <p className="venue-address">
                Collège Jean Monnet · Cognac · École Française de Badminton
              </p>
              <div
                className="schedule-table"
                role="table"
                aria-label="Horaires jeunes à Jean Monnet"
              >
                <div className="schedule-line schedule-heading" role="row">
                  <span role="columnheader">Jour</span>
                  <span role="columnheader">Horaires</span>
                  <span role="columnheader">Âge</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Mardi</strong>
                  <span role="cell">18h15–19h45</span>
                  <span role="cell">5–10 ans</span>
                </div>
                <div className="schedule-line" role="row">
                  <strong role="rowheader">Jeudi</strong>
                  <span role="cell">18h15–19h45</span>
                  <span role="cell">11–17 ans</span>
                </div>
              </div>
              <p className="schedule-footnote">
                Au-delà de 17 ans, les joueurs sont accueillis sur les créneaux
                adultes.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

function TeamCard({ team }: { team: TeamSource }) {
  return (
    <Link className="team-hub-card" to={`/equipes/${team.id}`}>
      <span className="team-division">{team.shortName}</span>
      <div>
        <h2>{team.name}</h2>
        <p>Effectif, calendrier et résultats</p>
      </div>
      <ArrowUpRight className="team-card-arrow" size={20} />
    </Link>
  );
}

function TeamsOverview() {
  const { teams, loading, error } = useTeamList();
  return (
    <>
      <PageIntro
        eyebrow="COGNAC BADMINTON · INTERCLUBS"
        title={
          <>
            Nos équipes
            <br />
            <em>en compétition.</em>
          </>
        }
        description="Retrouvez les effectifs, calendriers et résultats de nos équipes interclubs."
      />
      <section className="section team-hub">
        <div className="container">
          {loading && (
            <p className="admin-empty" role="status">
              Chargement des équipes…
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="team-hub-list">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
          {!loading && !error && teams.length === 0 && (
            <p className="team-empty">
              La liste des équipes sera disponible après la prochaine
              synchronisation FFBaD.
            </p>
          )}
          <p className="team-data-source">
            Les données sont synchronisées depuis les fiches officielles
            FFBaD/ICBaD.
          </p>
        </div>
      </section>
    </>
  );
}

type TeamDocument = Partial<TeamData> & { updatedAt?: Timestamp };

function compareTeamDivisions(first: TeamSource, second: TeamSource) {
  const getRank = (team: TeamSource) => {
    const match = team.shortName.match(/^\s*([NRD])\s*(\d+)/i);
    if (!match) return { level: 3, division: Number.MAX_SAFE_INTEGER };
    const levels = { N: 0, R: 1, D: 2 };
    return {
      level: levels[match[1].toUpperCase() as "N" | "R" | "D"],
      division: Number(match[2]),
    };
  };
  const firstRank = getRank(first);
  const secondRank = getRank(second);
  return (
    firstRank.level - secondRank.level ||
    firstRank.division - secondRank.division ||
    first.shortName.localeCompare(second.shortName, "fr", {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function useTeamList() {
  const [teams, setTeams] = useState<TeamSource[]>([]);
  const [loading, setLoading] = useState(Boolean(db));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const firestore = db;
    setLoading(true);
    return onSnapshot(
      collection(firestore, "teams"),
      (snapshot) => {
        const currentTeams = snapshot.docs
          .map((entry) => {
            const value = entry.data();
            if (
              typeof value.name !== "string" ||
              typeof value.shortName !== "string" ||
              typeof value.sourceUrl !== "string"
            )
              return null;
            return {
              id: entry.id,
              name: value.name,
              shortName: value.shortName,
              sourceUrl: value.sourceUrl,
            };
          })
          .filter((team): team is TeamSource => team !== null)
          .sort(compareTeamDivisions);
        setTeams(currentTeams);
        setError("");
        setLoading(false);
      },
      () => {
        setError("Impossible de charger la liste des équipes.");
        setLoading(false);
      },
    );
  }, []);

  return { teams, loading, error };
}

function useTeamData(teamId: string | null) {
  const [data, setData] = useState<TeamDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(db && teamId));
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    if (!db || !teamId) {
      setLoading(false);
      if (teamId) setError("Les données d’équipe ne sont pas disponibles.");
      return;
    }

    const firestore = db;
    setLoading(true);
    return onSnapshot(
      doc(firestore, "teams", teamId),
      (snapshot) => {
        const value = snapshot.exists() ? snapshot.data() : null;
        setData(
          value
            ? {
                players: Array.isArray(value?.players) ? value.players : [],
                matches: Array.isArray(value?.matches) ? value.matches : [],
                standings: Array.isArray(value?.standings)
                  ? value.standings
                  : [],
                name: value?.name,
                shortName: value?.shortName,
                sourceUrl: value?.sourceUrl,
                season: value?.season,
                updatedAt: value?.updatedAt,
              }
            : null,
        );
        setLoading(false);
      },
      () => {
        setError("Impossible de charger les données de cette équipe.");
        setLoading(false);
      },
    );
  }, [teamId]);

  return { data, loading, error };
}

function formatTeamDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function renderStandingPlace(position: string) {
  const place = Number.parseInt(position, 10);
  const medal =
    place === 1
      ? "🥇"
      : place === 2
        ? "🥈"
        : place === 3
          ? "🥉"
          : null;
  if (!medal) return position;

  return (
    <span
      className="team-rank-indicator"
      aria-label={`${place}${place === 1 ? "re" : "e"} place`}
    >
      <span aria-hidden="true">{medal}</span>
    </span>
  );
}

type PlayerSortKey = "name" | "role";
type PlayerSort = { key: PlayerSortKey; direction: "ascending" | "descending" };

function TeamDetails() {
  const { teamId } = useParams();
  const { data, loading, error } = useTeamData(teamId ?? null);
  const team: TeamSource | null =
    data?.name && data.shortName && data.sourceUrl && teamId
      ? {
          id: teamId,
          name: data.name,
          shortName: data.shortName,
          sourceUrl: data.sourceUrl,
        }
      : null;
  const [playerSort, setPlayerSort] = useState<PlayerSort>({
    key: "name",
    direction: "ascending",
  });
  const sortedPlayers = useMemo(
    () =>
      [...(data?.players ?? [])].sort((first, second) => {
        const comparison = (first[playerSort.key] ?? "").localeCompare(
          second[playerSort.key] ?? "",
          "fr",
          { sensitivity: "base", numeric: true },
        );
        return playerSort.direction === "ascending" ? comparison : -comparison;
      }),
    [data?.players, playerSort],
  );
  if (loading)
    return (
      <section className="section article-missing">
        <div className="container">
          <p className="admin-empty" role="status">
            Chargement des données de l’équipe…
          </p>
        </div>
      </section>
    );
  if (error || !team)
    return (
      <section className="section article-missing">
        <div className="container">
          <p>{error || "Cette équipe n’existe pas ou n’est plus active."}</p>
          <Link className="text-link" to="/equipes">
            Voir toutes les équipes <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  return (
    <>
      <PageIntro
        eyebrow={`ÉQUIPE · ${team.shortName}`}
        title={
          <>
            {team.name}
            <br />
            <em>Interclubs</em>
          </>
        }
        description="Composition, calendrier et résultats de l’équipe."
      />
      <section className="section team-detail">
        <div className="container">
          <div className="team-detail-nav">
            <Link className="text-link" to="/equipes">
              <ChevronLeft size={16} /> Toutes les équipes
            </Link>
            <a
              className="text-link"
              href={data?.sourceUrl ?? team.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir sur FFBaD <ArrowUpRight size={16} />
            </a>
          </div>
          {data?.updatedAt && (
            <p className="team-source-note">
              Données FFBaD synchronisées le{" "}
              {data.updatedAt.toDate().toLocaleDateString("fr-FR")} à{" "}
              {data.updatedAt.toDate().toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Ces
              informations proviennent de la FFBaD
              {data.season ? ` pour la saison ${data.season}` : ""}.
            </p>
          )}
          {loading && (
            <p className="admin-empty" role="status">
              Chargement des données de l’équipe…
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && (
            <>
              <section className="team-data-section">
                <h2>Composition</h2>
                {data?.players?.length ? (
                  <div className="team-table-wrap">
                    <table className="team-table">
                      <caption>Joueurs de l’équipe {team.shortName}</caption>
                      <thead>
                        <tr>
                          {(
                            [
                              ["name", "Joueur"],
                              ["role", "Classements FFBaD (S · D · M)"],
                            ] as const
                          ).map(([key, label]) => (
                            <th
                              key={key}
                              scope="col"
                              aria-sort={
                                playerSort.key === key
                                  ? playerSort.direction
                                  : "none"
                              }
                            >
                              <button
                                className="team-sort-button"
                                type="button"
                                aria-label={`Trier par ${label}${
                                  playerSort.key === key
                                    ? `, ordre ${
                                        playerSort.direction === "ascending"
                                          ? "croissant"
                                          : "décroissant"
                                      }`
                                    : ""
                                }`}
                                onClick={() =>
                                  setPlayerSort((current) => ({
                                    key,
                                    direction:
                                      current.key === key &&
                                      current.direction === "ascending"
                                        ? "descending"
                                        : "ascending",
                                  }))
                                }
                              >
                                {label}
                                {playerSort.key === key ? (
                                  playerSort.direction === "ascending" ? (
                                    <ArrowUp size={14} aria-hidden="true" />
                                  ) : (
                                    <ArrowDown size={14} aria-hidden="true" />
                                  )
                                ) : (
                                  <ArrowUpDown
                                    size={14}
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPlayers.map((player, index) => (
                          <tr key={`${player.name}-${index}`}>
                            <td>
                              {player.gender === "female" ? (
                                <span
                                  className="team-gender-icon team-gender-female"
                                  role="img"
                                  aria-label="Femme"
                                >
                                  ♀
                                </span>
                              ) : player.gender === "male" ? (
                                <span
                                  className="team-gender-icon team-gender-male"
                                  role="img"
                                  aria-label="Homme"
                                >
                                  ♂
                                </span>
                              ) : (
                                <span aria-label="Sexe non renseigné">—</span>
                              )}
                              <span className="team-player-name">
                                {player.name}
                              </span>
                            </td>
                            <td>{player.role || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="team-empty">
                    La composition n’a pas encore été publiée.
                  </p>
                )}
              </section>
              <section className="team-data-section">
                <h2>Classement</h2>
                {data?.standings?.length ? (
                  <div className="team-table-wrap">
                    <table className="team-table">
                      <caption>
                        Classement de la division de l’équipe {team.shortName}
                      </caption>
                      <thead>
                        <tr>
                          <th className="team-rank-cell" scope="col">
                            Place
                          </th>
                          <th scope="col">Équipe</th>
                          <th scope="col">Jouées</th>
                          <th scope="col">Gagnées</th>
                          <th scope="col">Nulles</th>
                          <th scope="col">Perdues</th>
                          <th scope="col">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.standings.map((standing, index) => (
                          <tr key={`${standing.team}-${index}`}>
                            <td className="team-rank-cell">
                              {renderStandingPlace(standing.position)}
                            </td>
                            <td>{standing.team}</td>
                            <td>{standing.played}</td>
                            <td>{standing.won}</td>
                            <td>{standing.drawn}</td>
                            <td>{standing.lost}</td>
                            <td>{standing.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="team-empty">
                    Le classement n’est pas disponible pour le moment.
                  </p>
                )}
              </section>
              <section className="team-data-section">
                <h2>Calendrier et résultats</h2>
                {data?.matches?.length ? (
                  <div className="team-table-wrap">
                    <table className="team-table">
                      <caption>
                        Rencontres de l’équipe {team.shortName}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Rencontre</th>
                          <th scope="col">Lieu</th>
                          <th scope="col">Position</th>
                          <th scope="col">Résultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.matches]
                          .sort((first, second) =>
                            first.date.localeCompare(second.date),
                          )
                          .map((match, index) => (
                            <tr
                              key={`${match.date}-${match.opponent}-${index}`}
                            >
                              <td>{formatTeamDate(match.date)}</td>
                              <td>{match.opponent}</td>
                              <td>{match.location || "—"}</td>
                              <td>
                                {match.home ? "Domicile" : "Extérieur"}
                              </td>
                              <td>{match.score || "À venir"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="team-empty">
                    Aucun calendrier n’a encore été publié.
                  </p>
                )}
              </section>
            </>
          )}
          <p className="team-data-source">
            Source : fiches publiques de la FFBaD.{" "}
            <a
              href={data?.sourceUrl ?? team.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Consulter la fiche officielle FFBaD
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function News() {
  const items = useArticles();
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const visible = items.slice((page - 1) * pageSize, page * pageSize);
  return (
    <>
      <PageIntro
        eyebrow="LE JOURNAL DU CLUB"
        title={
          <>
            Les nouvelles
            <br />
            <em>du terrain.</em>
          </>
        }
        description="La vie du club, les rendez-vous et les histoires qui se jouent à Cognac."
      />
      <section className="section news-page">
        <div className="container">
          <div className="news-toolbar">
            <span>{items.length} ACTUALITÉS</span>
            <span>SAISON 2026—2027</span>
          </div>
          <div className="row g-4">
            {visible.map((article) => (
              <div className="col-md-4" key={article.id}>
                <NewsCard article={article} />
              </div>
            ))}
          </div>
          <nav
            className="pagination-row"
            aria-label="Pagination des actualités"
          >
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              aria-label="Page précédente"
            >
              <ChevronLeft />
            </button>
            <span>
              0{page} <i /> 0{pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              aria-label="Page suivante"
            >
              <ChevronRight />
            </button>
          </nav>
        </div>
      </section>
    </>
  );
}

function renderFormattedContent(content: string): ReactNode {
  const html = content.replace(/\n/g, "<br>");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const renderNodes = (
    nodes: NodeListOf<ChildNode> | HTMLCollection,
    prefix: string,
  ): ReactNode[] =>
    Array.from(nodes).map((node, index) => {
      const key = `${prefix}-${index}`;
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (!(node instanceof Element)) return null;
      const children = renderNodes(node.childNodes, key);
      switch (node.tagName.toLowerCase()) {
        case "br":
          return <br key={key} />;
        case "b":
        case "strong":
          return <strong key={key}>{children}</strong>;
        case "i":
        case "em":
          return <em key={key}>{children}</em>;
        case "u":
          return <u key={key}>{children}</u>;
        case "s":
        case "strike":
          return <s key={key}>{children}</s>;
        case "span": {
          const rawStyle = node.getAttribute("style") ?? "";
          const color = rawStyle.match(
            /(?:^|;)\s*color:\s*(#[\da-f]{6})\s*(?:;|$)/i,
          )?.[1];
          const size = rawStyle.match(
            /(?:^|;)\s*font-size:\s*(12|14|16|18|24|32)px\s*(?:;|$)/i,
          )?.[1];
          const style: CSSProperties = {};
          if (color) style.color = color;
          if (size) style.fontSize = `${size}px`;
          return Object.keys(style).length ? (
            <span key={key} style={style}>
              {children}
            </span>
          ) : (
            <Fragment key={key}>{children}</Fragment>
          );
        }
        default:
          return <Fragment key={key}>{children}</Fragment>;
      }
    });
  return renderNodes(parsed.body.childNodes, "content");
}

function ArticleDetail() {
  const { id } = useParams();
  const article = useArticles().find((item) => item.id === id);
  if (!article)
    return (
      <section className="section article-missing">
        <div className="container">
          <p>Cette actualité n’est pas disponible.</p>
          <Link className="text-link" to="/actualites">
            Retour aux actualités <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  return (
    <>
      <article className="article-detail">
        <div className="container article-container">
          <Link className="text-link" to="/actualites">
            <ArrowRight className="back-arrow" size={16} /> Toutes les
            actualités
          </Link>
          <span className="eyebrow article-category">{article.category}</span>
          <h1>{article.title}</h1>
          <div className="article-meta">
            <time dateTime={article.date}>
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(`${article.date}T12:00:00`))}
            </time>
            <span>Par {article.author}</span>
          </div>
          {article.image && (
            <img
              className="article-cover"
              src={article.image}
              alt={article.title}
            />
          )}
          <p className="article-excerpt">{article.excerpt}</p>
          <div className="article-content">
            <p>{renderFormattedContent(article.content)}</p>
          </div>
        </div>
      </article>
      <section className="article-more">
        <div className="container">
          <Link className="text-link" to="/actualites">
            Toutes les actualités <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}

function ArticleContentEditor({ defaultValue }: { defaultValue?: string }) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [color, setColor] = useState("#b86a31");
  const [fontSize, setFontSize] = useState("18");

  function wrapSelection(open: string, close: string) {
    const field = contentRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = field.value.slice(start, end) || "texte";
    field.setRangeText(`${open}${selected}${close}`, start, end, "select");
    field.focus();
    field.setSelectionRange(
      start + open.length,
      start + open.length + selected.length,
    );
  }

  return (
    <div className="article-content-editor">
      <div
        className="format-toolbar"
        role="toolbar"
        aria-label="Mise en forme du contenu"
      >
        <button
          type="button"
          aria-label="Gras"
          title="Gras"
          onClick={() => wrapSelection("<strong>", "</strong>")}
        >
          <strong>G</strong>
        </button>
        <button
          type="button"
          aria-label="Italique"
          title="Italique"
          onClick={() => wrapSelection("<em>", "</em>")}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          aria-label="Souligné"
          title="Souligné"
          onClick={() => wrapSelection("<u>", "</u>")}
        >
          <u>S</u>
        </button>
        <button
          type="button"
          aria-label="Barré"
          title="Barré"
          onClick={() => wrapSelection("<s>", "</s>")}
        >
          <s>B</s>
        </button>
        <label className="format-option">
          Couleur
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            wrapSelection(`<span style="color:${color}">`, "</span>")
          }
        >
          Appliquer la couleur
        </button>
        <label className="format-option">
          Taille
          <select
            value={fontSize}
            onChange={(event) => setFontSize(event.target.value)}
          >
            <option value="12">Petite</option>
            <option value="14">Normale</option>
            <option value="16">Moyenne</option>
            <option value="18">Grande</option>
            <option value="24">Très grande</option>
            <option value="32">Titre</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            wrapSelection(`<span style="font-size:${fontSize}px">`, "</span>")
          }
        >
          Appliquer la taille
        </button>
      </div>
      <label>
        Contenu
        <textarea
          ref={contentRef}
          name="content"
          rows={8}
          defaultValue={defaultValue}
          required
        />
      </label>
      <p className="format-help">
        Sélectionnez un texte puis choisissez sa mise en forme. Sans sélection,
        un exemple est inséré à remplacer.
      </p>
    </div>
  );
}

function ImageCropper({
  file,
  onCancel,
  onComplete,
}: {
  file: File;
  onCancel: () => void;
  onComplete: (file: File) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    positionX: number;
    positionY: number;
  } | null>(null);
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0.5);
  const [positionY, setPositionY] = useState(0.5);
  const [error, setError] = useState("");
  const [cropping, setCropping] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const cropRatio = 4 / 3;
  const baseWidth = image
    ? Math.min(image.naturalWidth, image.naturalHeight * cropRatio)
    : 0;
  const baseHeight = baseWidth / cropRatio;
  const cropWidth = baseWidth / zoom;
  const cropHeight = baseHeight / zoom;
  const centerX =
    cropWidth / 2 + (image ? (image.naturalWidth - cropWidth) * positionX : 0);
  const centerY =
    cropHeight / 2 +
    (image ? (image.naturalHeight - cropHeight) * positionY : 0);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!image || !stageRef.current) return;
    stageRef.current.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      positionX,
      positionY,
    };
  }

  function moveCrop(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage || !image) return;
    const scale = stage.getBoundingClientRect().width / cropWidth;
    const xRange = image.naturalWidth - cropWidth;
    const yRange = image.naturalHeight - cropHeight;
    if (xRange > 0)
      setPositionX(
        Math.max(
          0,
          Math.min(
            1,
            drag.positionX - (event.clientX - drag.x) / scale / xRange,
          ),
        ),
      );
    if (yRange > 0)
      setPositionY(
        Math.max(
          0,
          Math.min(
            1,
            drag.positionY - (event.clientY - drag.y) / scale / yRange,
          ),
        ),
      );
  }

  function stopDrag() {
    dragRef.current = null;
  }

  async function cropImage() {
    if (!image) return;
    setCropping(true);
    setError("");
    try {
      const outputWidth = Math.max(1, Math.round(Math.min(cropWidth, 1600)));
      const outputHeight = Math.round(outputWidth / cropRatio);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error(
          "Impossible de préparer le recadrage sur cet appareil.",
        );
      context.drawImage(
        image,
        centerX - cropWidth / 2,
        centerY - cropHeight / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Le recadrage de la photo a échoué.")),
          "image/jpeg",
          0.9,
        ),
      );
      if (blob.size > 5 * 1024 * 1024)
        throw new Error("La photo recadrée dépasse 5 Mo.");
      onComplete(
        new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
        }),
      );
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Le recadrage de la photo a échoué.",
      );
    } finally {
      setCropping(false);
    }
  }

  return (
    <div className="image-cropper">
      <p className="crop-instructions">
        Déplacez la photo dans le cadre 4:3 ou ajustez sa position avec les
        curseurs. Ce cadrage sera utilisé pour la vignette.
      </p>
      <div
        ref={stageRef}
        className="crop-stage"
        role="group"
        aria-label="Zone de recadrage 4 sur 3. Faites glisser la photo pour ajuster son cadrage."
        onPointerDown={startDrag}
        onPointerMove={moveCrop}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <img
          src={imageUrl}
          alt="Aperçu de la photo à recadrer"
          draggable={false}
          onLoad={(event) => setImage(event.currentTarget)}
          onError={() =>
            setError(
              "Cette image ne peut pas être affichée. Choisissez un autre fichier.",
            )
          }
          style={
            image
              ? {
                  width: `${(image.naturalWidth * (stageRef.current?.clientWidth ?? 1)) / cropWidth}px`,
                  height: `${(image.naturalHeight * (stageRef.current?.clientWidth ?? 1)) / cropWidth}px`,
                  left: `calc(50% - ${(centerX * (stageRef.current?.clientWidth ?? 1)) / cropWidth}px)`,
                  top: `calc(50% - ${(centerY * (stageRef.current?.clientWidth ?? 1)) / cropWidth}px)`,
                }
              : undefined
          }
        />
      </div>
      <label>
        Zoom
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </label>
      <label>
        Position horizontale
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={positionX}
          onChange={(event) => setPositionX(Number(event.target.value))}
        />
      </label>
      <label>
        Position verticale
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={positionY}
          onChange={(event) => setPositionY(Number(event.target.value))}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="crop-actions">
        <button
          className="button button-copper"
          type="button"
          onClick={cropImage}
          disabled={!image || cropping}
        >
          {cropping ? "Recadrage…" : "Valider le recadrage"}
        </button>
        <button
          className="cancel-edit"
          type="button"
          onClick={onCancel}
          disabled={cropping}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function BoardMembersManager() {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [editing, setEditing] = useState<BoardMember | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingMemberId, setDraggingMemberId] = useState<string | null>(null);
  const [dragOverMemberId, setDragOverMemberId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadMembers() {
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      setLoading(false);
      return;
    }
    const snapshot = await getDocs(collection(db, "boardMembers"));
    setMembers(
      sortBoardMembers(
        snapshot.docs.map(
          (entry) => ({ id: entry.id, ...entry.data() }) as BoardMember,
        ),
      ),
    );
  }

  useEffect(() => {
    loadMembers()
      .catch(() =>
        setError(
          "Impossible de charger les membres du bureau. Vérifiez les règles Firestore.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    const firestore = db;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const role = String(form.get("role") ?? "").trim();
    if (!name || !role || (!editing?.photoUrl && !photoFile)) {
      setError("Renseignez le nom, la fonction et une photo pour ce membre.");
      return;
    }
    if (cropSource) {
      setError("Validez ou annulez le recadrage avant d’enregistrer.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const photoUrl = photoFile
        ? await uploadBoardMemberPhoto(photoFile)
        : editing?.photoUrl;
      if (!photoUrl) throw new Error("La photo de ce membre est obligatoire.");
      const memberOrder =
        editing?.order ??
        members.findIndex((member) => member.id === editing?.id);
      const nextOrder = editing
        ? memberOrder < 0
          ? members.length
          : memberOrder
        : members.length;
      const memberData = {
        name,
        role,
        photoUrl,
        order: nextOrder,
        updatedAt: serverTimestamp(),
      };
      let id: string;
      if (editing) {
        id = editing.id;
        await updateDoc(doc(firestore, "boardMembers", id), memberData);
      } else {
        const newMemberRef = doc(collection(firestore, "boardMembers"));
        const batch = writeBatch(firestore);
        members.forEach((member, index) =>
          batch.update(doc(firestore, "boardMembers", member.id), {
            order: index,
            updatedAt: serverTimestamp(),
          }),
        );
        batch.set(newMemberRef, memberData);
        await batch.commit();
        id = newMemberRef.id;
      }
      const savedMember = { id, name, role, photoUrl, order: nextOrder };
      setMembers((current) =>
        sortBoardMembers([
          ...current.filter((member) => member.id !== id),
          savedMember,
        ]),
      );
      setEditing(null);
      setPhotoFile(null);
      setNotice("Membre du bureau enregistré.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Firestore a refusé l’enregistrement. Publiez firestore.rules sur le projet Firebase utilisé par le site et vérifiez que votre compte a le rôle éditeur ou administrateur."
          : saveError instanceof Error
            ? saveError.message
            : "Enregistrement impossible. Vérifiez les règles Firestore.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reorderMember(memberId: string, targetId: string) {
    const firestore = db;
    if (!firestore || savingOrder || memberId === targetId) return;
    const previousMembers = members;
    const reordered = [...members];
    const sourceIndex = reordered.findIndex((member) => member.id === memberId);
    const targetIndex = reordered.findIndex((member) => member.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [movedMember] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedMember);
    const orderedMembers = reordered.map((member, index) => ({
      ...member,
      order: index,
    }));
    setMembers(orderedMembers);
    setSavingOrder(true);
    setError("");
    setNotice("");
    try {
      const batch = writeBatch(firestore);
      orderedMembers.forEach((member, index) =>
        batch.update(doc(firestore, "boardMembers", member.id), {
          order: index,
          updatedAt: serverTimestamp(),
        }),
      );
      await batch.commit();
      setNotice("Ordre des membres du bureau enregistré.");
    } catch {
      setMembers(previousMembers);
      setError(
        "Impossible d’enregistrer le nouvel ordre des membres. Vérifiez les règles Firestore.",
      );
    } finally {
      setSavingOrder(false);
      setDraggingMemberId(null);
      setDragOverMemberId(null);
    }
  }

  async function remove(member: BoardMember) {
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    if (
      !window.confirm(`Retirer ${member.name} du bureau affiché sur le site ?`)
    )
      return;
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "boardMembers", member.id));
      setMembers((current) =>
        current.filter((entry) => entry.id !== member.id),
      );
      if (editing?.id === member.id) {
        setEditing(null);
        setPhotoFile(null);
      }
      setNotice("Membre retiré du site.");
    } catch {
      setError("Suppression impossible. Vérifiez les règles Firestore.");
    }
  }

  function choosePhoto(file: File | undefined) {
    setError("");
    if (!file) {
      setCropSource(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choisissez une image au format JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La photo ne doit pas dépasser 5 Mo.");
      return;
    }
    setCropSource(file);
  }

  return (
    <section className="board-admin">
      {!cloudinaryCloudName || !cloudinaryUploadPreset ? (
        <p className="form-error" role="status">
          Configurez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET
          pour activer le téléversement des photos.
        </p>
      ) : null}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="board-order-help">
        Glissez les membres pour modifier leur ordre d’affichage, ou utilisez
        les boutons Monter et Descendre.
      </p>
      <div className="admin-list" aria-live="polite">
        {loading ? (
          <p className="admin-empty">Chargement des membres…</p>
        ) : members.length === 0 ? (
          <p className="admin-empty">Aucun membre du bureau pour le moment.</p>
        ) : (
          members.map((member, index) => (
            <div
              className={`admin-item board-admin-item${dragOverMemberId === member.id ? " is-drop-target" : ""}`}
              key={member.id}
              draggable={!savingOrder}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", member.id);
                setDraggingMemberId(member.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverMemberId(member.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void reorderMember(
                  event.dataTransfer.getData("text/plain") ||
                    draggingMemberId ||
                    "",
                  member.id,
                );
              }}
              onDragEnd={() => {
                setDraggingMemberId(null);
                setDragOverMemberId(null);
              }}
            >
              <img src={member.photoUrl} alt="" />
              <div>
                <strong>{member.name}</strong>
                <span>{member.role}</span>
              </div>
              <div
                className="board-order-actions"
                aria-label={`Ordre de ${member.name}`}
              >
                <button
                  type="button"
                  aria-label={`Monter ${member.name}`}
                  title="Monter"
                  disabled={savingOrder || index === 0}
                  onClick={() =>
                    void reorderMember(
                      member.id,
                      members[index - 1]?.id ?? member.id,
                    )
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Descendre ${member.name}`}
                  title="Descendre"
                  disabled={savingOrder || index === members.length - 1}
                  onClick={() =>
                    void reorderMember(
                      member.id,
                      members[index + 1]?.id ?? member.id,
                    )
                  }
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                disabled={savingOrder}
                onClick={() => {
                  setEditing(member);
                  setPhotoFile(null);
                  setError("");
                  setNotice("");
                }}
              >
                Modifier
              </button>
              <button
                type="button"
                className="delete-action"
                disabled={savingOrder}
                onClick={() => remove(member)}
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
      <form
        className="admin-editor"
        key={editing?.id ?? "new-board-member"}
        onSubmit={save}
      >
        <h3>{editing ? "Modifier un membre" : "Ajouter un membre"}</h3>
        <div className="form-row">
          <label>
            Nom complet
            <input
              name="name"
              defaultValue={editing?.name}
              maxLength={100}
              required
            />
          </label>
          <label>
            Fonction au bureau
            <input
              name="role"
              defaultValue={editing?.role}
              maxLength={100}
              placeholder="Président·e, trésorier·ère…"
              required
            />
          </label>
        </div>
        <label>
          Photo (JPG, PNG ou WebP, 5 Mo maximum)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!editing?.photoUrl}
            onChange={(event) => choosePhoto(event.currentTarget.files?.[0])}
          />
        </label>
        {cropSource && (
          <ImageCropper
            file={cropSource}
            onCancel={() => setCropSource(null)}
            onComplete={(file) => {
              setPhotoFile(file);
              setCropSource(null);
            }}
          />
        )}
        {(photoPreview || editing?.photoUrl) && (
          <img
            className="board-photo-preview"
            src={photoPreview || editing?.photoUrl}
            alt="Aperçu de la photo du membre"
          />
        )}
        <button
          className="button button-copper"
          type="submit"
          disabled={
            saving ||
            loading ||
            Boolean(cropSource) ||
            ((!cloudinaryCloudName || !cloudinaryUploadPreset) &&
              (!editing?.photoUrl || Boolean(photoFile)))
          }
        >
          {saving
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Ajouter au bureau"}{" "}
          <ArrowRight size={16} />
        </button>
        {editing && (
          <button
            type="button"
            className="cancel-edit"
            onClick={() => {
              setEditing(null);
              setPhotoFile(null);
              setError("");
            }}
          >
            Annuler
          </button>
        )}
      </form>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("access_key", web3FormsAccessKey);
    formData.set(
      "subject",
      `Contact Cognac Badminton : ${String(formData.get("subject") ?? "").trim()}`,
    );
    formData.set("from_name", "Cognac Badminton");
    formData.set("replyto", String(formData.get("email") ?? "").trim());
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("success" in result) ||
        result.success !== true
      ) {
        throw new Error("Web3Forms rejected the contact message");
      }
      setSent(true);
    } catch {
      setError(
        "Le message n’a pas pu être envoyé. Vérifiez votre connexion ou écrivez-nous directement par e-mail.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="ON ÉCHANGE ?"
        title={
          <>
            À bientôt
            <br />
            <em>sur le terrain.</em>
          </>
        }
        description="Une question sur le club, les séances ou les inscriptions ? Écrivez-nous."
      />
      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-details">
            <span className="eyebrow">COGNAC BADMINTON</span>
            <h2>
              Le premier échange
              <br />
              commence ici.
            </h2>
            <div className="contact-detail">
              <Mail />
              <div>
                <span>CONTACT DIRECT</span>
                <p>
                  Contactez-nous directement par courriel :{" "}
                  <a href="mailto:badcognac@gmail.com">
                    badcognac@gmail.com
                  </a>
                </p>
                <p>
                  ou{" "}
                  <Link to="#message">
                    utilisez le formulaire de contact.
                  </Link>
                </p>
              </div>
            </div>
            <div className="contact-detail">
              <MapPin />
              <div>
                <span>GYMNASES</span>
                <p>
                  Adultes : Gymnase Beaulieu, rue du Port à Cognac.
                  <br />
                  Jeunes : Gymnase Jean Monnet (Collège Jean Monnet).
                </p>
              </div>
            </div>
            <div className="contact-detail">
              <Clock3 />
              <div>
                <span>RENSEIGNEMENTS</span>
                <p>
                  Vous pouvez aussi poser votre question directement sur place :
                  Gymnase Beaulieu, rue du Port à Cognac.
                </p>
              </div>
            </div>
            <div className="contact-note">
              <CalendarDays size={18} />
              <p>
                Le club est labellisé École Française de Badminton. Deux
                créneaux jeunes par semaine accueillent les 5–17 ans ; au-delà
                de 17 ans, les joueurs sont admis sur les créneaux adultes.
              </p>
            </div>
          </div>
          <form id="message" className="contact-form" onSubmit={submit}>
            <span className="eyebrow">ÉCRIVEZ-NOUS</span>
            <h3>Votre message</h3>
            {sent ? (
              <div className="form-success" role="status">
                Merci pour votre message. Le club revient vers vous dès que
                possible.
              </div>
            ) : (
              <>
                <input
                  type="checkbox"
                  name="botcheck"
                  className="visually-hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
                <div className="form-row">
                  <label>
                    Nom complet
                    <input name="name" autoComplete="name" required />
                  </label>
                  <label>
                    Adresse e-mail
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>
                <label>
                  Objet
                  <select name="subject" defaultValue="" required>
                    <option value="" disabled>
                      Choisir un sujet
                    </option>
                    <option>Inscription</option>
                    <option>Horaires et séances</option>
                    <option>Compétition</option>
                    <option>Autre demande</option>
                  </select>
                </label>
                <label>
                  Votre message
                  <textarea
                    name="message"
                    rows={5}
                    required
                    minLength={10}
                    maxLength={5000}
                  />
                </label>
                <p className="contact-privacy">
                  Vos coordonnées sont utilisées pour répondre à votre demande.
                  {" "}
                  <Link to="/rgpd">Lire la politique de confidentialité</Link>.
                </p>
                <button
                  className="button button-copper"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Envoi en cours…" : "Envoyer le message"}{" "}
                  <ArrowRight size={17} />
                </button>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </section>
    </>
  );
}

function LegalNotice() {
  return (
    <>
      <PageIntro
        eyebrow="INFORMATIONS DU SITE"
        title={
          <>
            Mentions <em>légales.</em>
          </>
        }
        description="Les informations relatives à l’éditeur, à la publication et à l’hébergement du site."
      />
      <section className="section legal-section">
        <div className="container legal-content">
          <section>
            <h2>Éditeur du site</h2>
            <p>
              <strong>Cognac Badminton (CB16)</strong>
              <br />
              Siège social : Rue du Port, 16100 Cognac, France
              <br />
              Courriel : <a href="mailto:badcognac@gmail.com">badcognac@gmail.com</a>
              <br />
              Aucun numéro de téléphone public n’a été communiqué par le club.
            </p>
          </section>
          <section>
            <h2>Directeur de la publication</h2>
            <p>Philippe Pech.</p>
          </section>
          <section>
            <h2>Hébergement</h2>
            <p>
              Le site est hébergé par GitHub Pages, service de GitHub, Inc.,
              88 Colin P Kelly Jr St, San Francisco, CA 94107, États-Unis.
              <br />
              <a href="https://support.github.com/contact" target="_blank" rel="noreferrer">
                Contacter l’assistance GitHub
              </a>
            </p>
          </section>
          <section>
            <h2>Propriété intellectuelle</h2>
            <p>
              Les textes, photographies, marques et autres éléments présents
              sur ce site peuvent être protégés par des droits de propriété
              intellectuelle. Leur réutilisation nécessite l’autorisation
              préalable de leurs titulaires, sauf exception légale. Les
              contenus de tiers restent la propriété de leurs auteurs ou
              ayants droit.
            </p>
          </section>
          <section>
            <h2>Sources et informations</h2>
            <p>
              Les informations sportives publiées sur les pages des équipes
              sont issues des pages publiques de la{" "}
              <a href="https://icbad.ffbad.org/instance/CB16" target="_blank" rel="noreferrer">
                FFBaD / ICBaD
              </a>
              . Les contenus du site sont fournis à titre informatif ; pour
              confirmer un horaire ou une rencontre, contactez le club.
            </p>
            <p>
              <a href="https://entreprendre.service-public.gouv.fr/vosdroits/F37351" target="_blank" rel="noreferrer">
                Informations officielles sur les mentions des sites internet
              </a>
              {" · "}
              <a href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164/" target="_blank" rel="noreferrer">
                Loi pour la confiance dans l’économie numérique
              </a>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <PageIntro
        eyebrow="VIE PRIVÉE"
        title={
          <>
            Données <em>personnelles.</em>
          </>
        }
        description="Comment le Cognac Badminton utilise les données personnelles sur ce site et comment exercer vos droits."
      />
      <section className="section legal-section">
        <div className="container legal-content">
          <p className="legal-updated">Dernière mise à jour : 22 octobre 2026</p>
          <section>
            <h2>Responsable du traitement</h2>
            <p>
              Le responsable du traitement est Cognac Badminton (CB16), Rue du
              Port, 16100 Cognac, France. Pour toute question ou demande
              concernant vos données, écrivez à{" "}
              <a href="mailto:badcognac@gmail.com">badcognac@gmail.com</a>.
            </p>
          </section>
          <section>
            <h2>Données et finalités</h2>
            <ul>
              <li>
                <strong>Formulaire de contact :</strong> nom, adresse e-mail,
                sujet et message, afin de répondre à votre demande. La base
                juridique est l’intérêt légitime du club à traiter les demandes
                qui lui sont adressées.
              </li>
              <li>
                <strong>Administration du site :</strong> adresse e-mail,
                identifiant de compte et rôle des personnes autorisées, pour
                sécuriser l’accès webmaster et gérer les contenus. Les comptes
                et rôles sont conservés tant que l’accès est nécessaire, puis
                supprimés ou désactivés. La base juridique est l’intérêt
                légitime du club à administrer et sécuriser son site.
              </li>
              <li>
                <strong>Contenus du club :</strong> noms, fonctions et
                photographies des membres du bureau, ainsi que les informations
                sportives publiées par la FFBaD/ICBaD (noms des joueurs,
                équipes, classements et rencontres). Ces données servent à
                présenter les activités du club. Les photographies sont
                publiées avec l’accord des personnes concernées. La base
                juridique est leur consentement pour les portraits et
                l’intérêt légitime du club pour les informations sportives
                publiques ; les données d’équipe sont actualisées
                périodiquement et les contenus sont retirés lorsqu’ils ne
                sont plus utiles ou à jour.
              </li>
            </ul>
            <p>
              Le site ne propose ni inscription à une newsletter ni collecte
              de données de paiement. Ne transmettez pas de données sensibles
              dans le formulaire de contact.
            </p>
          </section>
          <section>
            <h2>Destinataires et prestataires</h2>
            <p>
              Les données sont accessibles aux personnes habilitées du club et
              aux prestataires nécessaires au fonctionnement du site :
              Web3Forms pour transmettre les messages, Google Firebase pour
              l’authentification webmaster et les contenus administrés,
              Cloudinary pour héberger les photographies du bureau, GitHub
              Pages pour l’hébergement du site et Cloudflare pour la
              synchronisation des données sportives publiques. Les images
              hébergées par Unsplash sont chargées depuis leurs serveurs. Ces
              prestataires peuvent traiter des données techniques de connexion
              (par exemple l’adresse IP) selon leurs propres politiques.
            </p>
            <p>
              Les services peuvent traiter des données hors de l’Espace
              économique européen. Les modalités et garanties applicables sont
              décrites dans les informations de confidentialité des
              prestataires :{" "}
              <a href="https://web3forms.com/privacy" target="_blank" rel="noreferrer">Web3Forms</a>
              {" · "}
              <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">Firebase / Google</a>
              {" · "}
              <a href="https://cloudinary.com/privacy" target="_blank" rel="noreferrer">Cloudinary</a>
              {" · "}
              <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHub</a>
              {" · "}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare</a>
              {" · "}
              <a href="https://unsplash.com/privacy" target="_blank" rel="noreferrer">Unsplash</a>.
            </p>
          </section>
          <section>
            <h2>Durées de conservation</h2>
            <p>
              Le club supprime les messages de contact une fois la demande
              traitée. Web3Forms indique toutefois conserver les soumissions
              pendant une durée maximale de trois ans, sauf suppression
              anticipée ou durée plus courte applicable à l’offre utilisée.
              Les contenus du club sont conservés pendant leur publication ;
              les données d’équipe sont remplacées ou supprimées lors des
              synchronisations. Lorsqu’un portrait est retiré du site, le
              fichier correspondant sur Cloudinary doit aussi être supprimé
              séparément. Les comptes webmaster sont conservés pendant la
              durée de leur habilitation.
            </p>
            <p>
              Les données d’équipe proviennent de pages publiques FFBaD/ICBaD.
              Une demande de rectification ou de retrait peut nécessiter une
              correction de la source fédérale ; tant qu’elles y figurent,
              certaines données peuvent être réimportées lors d’une
              synchronisation.
            </p>
          </section>
          <section>
            <h2>Cookies et traceurs</h2>
            <p>
              Le site n’intègre pas d’outil de mesure d’audience ni de publicité.
              L’espace webmaster utilise une authentification et un stockage
              technique nécessaires au maintien de la connexion. Les
              prestataires d’hébergement et de sécurité peuvent également
              utiliser des traceurs strictement nécessaires à leur service.
            </p>
          </section>
          <section>
            <h2>Vos droits</h2>
            <p>
              Dans les conditions prévues par la réglementation, vous pouvez
              demander l’accès à vos données, leur rectification, leur
              effacement ou la limitation de leur traitement, vous opposer à
              certains traitements et, lorsque ce droit s’applique, demander
              leur portabilité. Lorsque le traitement repose sur votre accord,
              vous pouvez le retirer à tout moment, sans effet rétroactif.
            </p>
            <p>
              Adressez votre demande à{" "}
              <a href="mailto:badcognac@gmail.com">badcognac@gmail.com</a> ou
              par courrier au siège social indiqué dans les{" "}
              <Link to="/mentions-legales">mentions légales</Link>. Vous
              pouvez également adresser une réclamation à la{" "}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
                Commission nationale de l’informatique et des libertés (CNIL)
              </a>
              .
            </p>
          </section>
          <section>
            <h2>En savoir plus</h2>
            <p>
              <a href="https://www.cnil.fr/fr/les-droits-pour-maitriser-vos-donnees-personnelles" target="_blank" rel="noreferrer">
                Vos droits sur les données personnelles — CNIL
              </a>
              {" · "}
              <a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr" target="_blank" rel="noreferrer">
                Règlement général sur la protection des données (RGPD)
              </a>
              {" · "}
              <a href="https://entreprendre.service-public.gouv.fr/vosdroits/F24270" target="_blank" rel="noreferrer">
                Protection des données personnelles — Service-Public.fr
              </a>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function TeamManager() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const syncUrl = import.meta.env.VITE_TEAM_SYNC_URL;

  async function refresh() {
    if (!db || !auth?.currentUser) {
      setError("Connectez-vous avec un compte administrateur Firebase.");
      return;
    }
    const firestore = db;
    const currentUser = auth.currentUser;
    if (!syncUrl) {
      setError(
        "Le service de synchronisation FFBaD n’est pas configuré. Consultez le README pour le déployer.",
      );
      return;
    }

    setError("");
    setNotice("");
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(syncUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as {
        error?: string;
        teams?: Record<string, TeamData>;
      };
      if (!response.ok)
        throw new Error(result.error ?? "La récupération FFBaD a échoué.");
      const teams = Object.entries(result.teams ?? {});
      if (teams.length === 0 || teams.length > 100)
        throw new Error(
          "La FFBaD n’a pas retourné une liste d’équipes exploitable.",
        );

      for (const [id, data] of teams) {
        const sourceTeamId =
          typeof data?.sourceUrl === "string"
            ? data.sourceUrl.match(
                /^https:\/\/icbad\.ffbad\.org\/equipe\/(\d+)$/,
              )?.[1]
            : undefined;
        if (
          !data ||
          typeof data !== "object" ||
          !/^\d+$/.test(id) ||
          sourceTeamId !== id ||
          typeof data.name !== "string" ||
          !data.name.trim() ||
          typeof data.shortName !== "string" ||
          !data.shortName.trim() ||
          !Array.isArray(data.players) ||
          data.players.length === 0 ||
          !Array.isArray(data.matches) ||
          !Array.isArray(data.standings) ||
          typeof data.season !== "string"
        )
          throw new Error(
            `Les données reçues pour ${
              typeof data?.shortName === "string" ? data.shortName : id
            } sont incomplètes ; rien n’a été enregistré.`,
          );
      }

      const existingTeams = await getDocs(collection(firestore, "teams"));
      const currentIds = new Set(teams.map(([id]) => id));
      const obsoleteTeams = existingTeams.docs.filter(
        (entry) => !currentIds.has(entry.id),
      );
      if (teams.length + obsoleteTeams.length > 500)
        throw new Error(
          "La liste dépasse la limite d’une écriture Firestore atomique ; rien n’a été enregistré.",
        );

      const batch = writeBatch(firestore);
      teams.forEach(([id, data]) => {
        batch.set(doc(firestore, "teams", id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      });
      obsoleteTeams.forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
      setNotice("Les données FFBaD ont été récupérées et publiées.");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "La synchronisation FFBaD a échoué. Les données précédentes sont conservées.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="team-admin" aria-label="Actualisation des équipes">
      <div className="admin-top">
        <div>
          <span className="eyebrow">DONNÉES DES INTERCLUBS</span>
          <h2>Actualiser les équipes</h2>
        </div>
      </div>
      <p className="team-admin-help">
        Récupère les compositions, classements et rencontres publiés sur le site
        de la FFBaD, puis les enregistre dans Firebase pour les pages du club.
      </p>
      <button
        className="button button-copper"
        type="button"
        onClick={refresh}
        disabled={saving || !syncUrl}
      >
        {saving ? "Récupération des données FFBaD…" : "Actualiser équipes"}{" "}
        <ArrowRight size={16} />
      </button>
      {!syncUrl && (
        <p className="team-source-note" role="status">
          Le Worker de synchronisation n’est pas encore configuré. Suivez les
          étapes de déploiement du README.
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Webmaster() {
  const { user, authReady, role } = useSiteSession();
  const [activeTab, setActiveTab] = useState<WebmasterTab>("articles");
  const [items, setItems] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user || !role || !db) return;
    let active = true;
    setLoadingItems(true);
    getDocs(query(collection(db, "articles"), orderBy("date", "desc")))
      .then((snapshot) => {
        if (active)
          setItems(
            snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as Article,
            ),
          );
      })
      .catch(() => {
        if (active)
          setError(
            "Impossible de charger les articles. Vérifiez les règles Firestore et le rôle webmaster.",
          );
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [user, role]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!auth) return;
    const form = new FormData(event.currentTarget);
    setLoginPending(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        String(form.get("email")),
        String(form.get("password")),
      );
    } catch {
      setError("Connexion impossible. Vérifiez vos identifiants.");
    } finally {
      setLoginPending(false);
    }
  }
  async function resetPassword() {
    setError("");
    setNotice("");
    if (!auth || !loginEmail.trim()) {
      setError(
        "Saisissez votre adresse e-mail avant de demander un lien de réinitialisation.",
      );
      return;
    }
    setResetPending(true);
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim());
      setNotice(
        "Un lien de réinitialisation a été envoyé si cette adresse correspond à un compte.",
      );
    } catch {
      setError(
        "Impossible d’envoyer le lien. Vérifiez l’adresse et la configuration Firebase.",
      );
    } finally {
      setResetPending(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    setError("");
    setNotice("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const article = {
      title: String(form.get("title")),
      category: String(form.get("category")),
      date: String(form.get("date")),
      author: String(form.get("author")),
      excerpt: String(form.get("excerpt")),
      image: String(form.get("image")),
      content: String(form.get("content")),
    };
    try {
      if (editing) await updateDoc(doc(db, "articles", editing.id), article);
      else await addDoc(collection(db, "articles"), article);
      const snapshot = await getDocs(
        query(collection(db, "articles"), orderBy("date", "desc")),
      );
      setItems(
        snapshot.docs.map(
          (entry) => ({ id: entry.id, ...entry.data() }) as Article,
        ),
      );
      setEditing(null);
      setNotice("Article enregistré.");
    } catch {
      setError(
        "Enregistrement refusé. Vérifiez les droits de votre compte administrateur.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (
      !db ||
      !window.confirm("Supprimer cet article ? Cette action est définitive.")
    )
      return;
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "articles", id));
      setItems(items.filter((article) => article.id !== id));
      setNotice("Article supprimé.");
    } catch {
      setError(
        "Suppression refusée. Vérifiez les droits de votre compte administrateur.",
      );
    }
  }
  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const tabs: WebmasterTab[] =
      role === "admin"
        ? ["articles", "board", "events", "teams"]
        : ["articles", "board", "events"];
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    document.getElementById(`webmaster-tab-${tabs[nextIndex]}`)?.focus();
  }
  useEffect(() => {
    if (role !== "admin" && activeTab === "teams") setActiveTab("articles");
  }, [activeTab, role]);
  return (
    <>
      <PageIntro
        eyebrow="GESTION DU SITE"
        title={
          <>
            Espace
            <br />
            <em>webmaster.</em>
          </>
        }
        description="Administration du site Cognac Badminton."
      />
      <section className="section admin-section">
        <div className="container admin-container">
          {!firebaseEnabled ? (
            <div className="admin-message">
              <ShieldCheck size={28} />
              <h2>Configuration requise</h2>
              <p>
                Configurez Firebase Authentication et Firestore. Le README
                détaille la création et l’activation du compte webmaster.
              </p>
            </div>
          ) : !authReady ? (
            <div className="admin-message" role="status">
              <ShieldCheck size={28} />
              <h2>Vérification de la session</h2>
              <p>Chargement du compte webmaster…</p>
            </div>
          ) : !user ? (
            <form className="admin-login" onSubmit={login}>
              <ShieldCheck size={24} />
              <span className="eyebrow">ACCÈS RÉSERVÉ</span>
              <h2>Connexion webmaster</h2>
              <label>
                Adresse e-mail
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Mot de passe
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button
                className="button button-copper"
                type="submit"
                disabled={loginPending}
              >
                {loginPending ? "Connexion…" : "Se connecter"}{" "}
                <ArrowRight size={16} />
              </button>
              <button
                className="password-reset"
                type="button"
                onClick={resetPassword}
                disabled={resetPending}
              >
                {resetPending ? "Envoi…" : "Mot de passe oublié ?"}
              </button>
              {notice && (
                <p role="status" className="form-success">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
            </form>
          ) : !role ? (
            <div className="admin-message" role="status">
              <ShieldCheck size={28} />
              <h2>Compte non autorisé</h2>
              <p>
                Ce compte n’a pas de rôle sur le site. Demandez à un
                administrateur de l’ajouter dans la gestion des comptes.
              </p>
              <button
                className="button button-outline"
                onClick={() => signOut(auth!)}
              >
                Déconnexion <X size={16} />
              </button>
            </div>
          ) : (
            <div className="admin-dashboard">
              <div className="admin-top">
                <div>
                  <span className="eyebrow">
                    CONNECTÉ : {user.email} ·{" "}
                    {role === "admin" ? "ADMINISTRATEUR" : "ÉDITEUR"}
                  </span>
                </div>
                <div className="admin-actions">
                  {role === "admin" && (
                    <Link
                      className="button button-outline"
                      to="/webmaster/utilisateurs"
                    >
                      Gérer les comptes <ArrowRight size={16} />
                    </Link>
                  )}
                  <button
                    className="button button-outline"
                    onClick={() => signOut(auth!)}
                  >
                    Déconnexion <X size={16} />
                  </button>
                </div>
              </div>
              <div
                className="webmaster-tabs"
                role="tablist"
                aria-label="Sections de gestion"
                onKeyDown={handleTabKeyDown}
              >
                <button
                  id="webmaster-tab-articles"
                  className="webmaster-tab"
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "articles"}
                  aria-controls="webmaster-articles-panel"
                  tabIndex={activeTab === "articles" ? 0 : -1}
                  onClick={() => setActiveTab("articles")}
                >
                  Actualités
                </button>
                <button
                  id="webmaster-tab-board"
                  className="webmaster-tab"
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "board"}
                  aria-controls="webmaster-board-panel"
                  tabIndex={activeTab === "board" ? 0 : -1}
                  onClick={() => setActiveTab("board")}
                >
                  Membres du bureau
                </button>
                <button
                  id="webmaster-tab-events"
                  className="webmaster-tab"
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "events"}
                  aria-controls="webmaster-events-panel"
                  tabIndex={activeTab === "events" ? 0 : -1}
                  onClick={() => setActiveTab("events")}
                >
                  Évènements
                </button>
                {role === "admin" && (
                  <button
                    id="webmaster-tab-teams"
                    className="webmaster-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "teams"}
                    aria-controls="webmaster-teams-panel"
                    tabIndex={activeTab === "teams" ? 0 : -1}
                    onClick={() => setActiveTab("teams")}
                  >
                    Équipes
                  </button>
                )}
              </div>
              {activeTab === "articles" ? (
                <section
                  id="webmaster-articles-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-articles"
                  className="webmaster-panel"
                >
                  {notice && (
                    <p role="status" className="form-success">
                      {notice}
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="form-error">
                      {error}
                    </p>
                  )}
                  <div className="admin-list" aria-live="polite">
                    {loadingItems ? (
                      <p className="admin-empty">Chargement des articles…</p>
                    ) : items.length === 0 ? (
                      <p className="admin-empty">
                        Aucun article publié. Le formulaire ci-dessous vous
                        permet d’en créer un.
                      </p>
                    ) : (
                      items.map((item) => (
                        <div className="admin-item" key={item.id}>
                          <div>
                            <strong>{item.title}</strong>
                            <span>
                              {item.date} · {item.category}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Modifier
                          </button>
                          {role === "admin" && (
                            <button
                              type="button"
                              className="delete-action"
                              onClick={() => remove(item.id)}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    className="admin-editor"
                    key={editing?.id ?? "new-article"}
                    onSubmit={save}
                  >
                    <h3>
                      {editing
                        ? "Modifier une actualité"
                        : "Nouvelle actualité"}
                    </h3>
                    <div className="form-row">
                      <label>
                        Titre
                        <input
                          name="title"
                          defaultValue={editing?.title}
                          required
                        />
                      </label>
                      <label>
                        Catégorie
                        <input
                          name="category"
                          defaultValue={editing?.category}
                          required
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Date
                        <input
                          type="date"
                          name="date"
                          defaultValue={
                            editing?.date ??
                            new Date().toISOString().slice(0, 10)
                          }
                          required
                        />
                      </label>
                      <label>
                        Auteur
                        <input
                          name="author"
                          defaultValue={editing?.author}
                          required
                        />
                      </label>
                    </div>
                    <label>
                      URL de l’image (facultatif)
                      <input
                        type="url"
                        name="image"
                        defaultValue={editing?.image ?? ""}
                        placeholder="https://…"
                      />
                    </label>
                    <label>
                      Résumé
                      <textarea
                        name="excerpt"
                        rows={2}
                        defaultValue={editing?.excerpt}
                        required
                      />
                    </label>
                    <ArticleContentEditor defaultValue={editing?.content} />
                    <button
                      className="button button-copper"
                      type="submit"
                      disabled={saving || loadingItems}
                    >
                      {saving
                        ? "Enregistrement…"
                        : editing
                          ? "Enregistrer les modifications"
                          : "Publier l’article"}{" "}
                      <ArrowRight size={16} />
                    </button>
                    {editing && (
                      <button
                        type="button"
                        className="cancel-edit"
                        onClick={() => setEditing(null)}
                      >
                        Annuler la modification
                      </button>
                    )}
                  </form>
                </section>
              ) : activeTab === "board" ? (
                <section
                  id="webmaster-board-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-board"
                  className="webmaster-panel"
                >
                  <BoardMembersManager />
                </section>
              ) : activeTab === "events" ? (
                <section
                  id="webmaster-events-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-events"
                  className="webmaster-panel"
                >
                  <EventsManager role={role} />
                </section>
              ) : role === "admin" ? (
                <section
                  id="webmaster-teams-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-teams"
                  className="webmaster-panel"
                >
                  <TeamManager />
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function UserManagement() {
  const { user, authReady, role, isClaimAdmin } = useSiteSession();
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [editingMember, setEditingMember] = useState<ManagedUser | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadMembers() {
    if (!db) return;
    const snapshot = await getDocs(collection(db, "userRoles"));
    setMembers(
      snapshot.docs
        .map((entry) => ({ ...entry.data(), uid: entry.id }) as ManagedUser)
        .sort((first, second) =>
          first.displayName.localeCompare(second.displayName, "fr"),
        ),
    );
  }

  useEffect(() => {
    if (!user || role !== "admin" || !db) return;
    const firestore = db;
    const currentUser = user;
    let active = true;
    setLoadingMembers(true);
    async function load() {
      try {
        if (isClaimAdmin) {
          await setDoc(
            doc(firestore, "userRoles", currentUser.uid),
            {
              uid: currentUser.uid,
              email: currentUser.email ?? "",
              displayName:
                currentUser.displayName ||
                currentUser.email ||
                "Administrateur principal",
              role: "admin",
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
        const snapshot = await getDocs(collection(firestore, "userRoles"));
        if (active)
          setMembers(
            snapshot.docs
              .map(
                (entry) => ({ ...entry.data(), uid: entry.id }) as ManagedUser,
              )
              .sort((first, second) =>
                first.displayName.localeCompare(second.displayName, "fr"),
              ),
          );
      } catch {
        if (active)
          setError(
            "Impossible de charger les comptes. Vérifiez les règles Firestore.",
          );
      } finally {
        if (active) setLoadingMembers(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, role, isClaimAdmin]);

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !user) return;
    setError("");
    setNotice("");
    setSavingMember(true);
    const form = new FormData(event.currentTarget);
    const uid = String(form.get("uid") ?? "").trim();
    const member = {
      uid,
      email: String(form.get("email") ?? "").trim(),
      displayName: String(form.get("displayName") ?? "").trim(),
      role: String(
        form.get("role") ?? editingMember?.role ?? "editor",
      ) as SiteRole,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "userRoles", uid), member);
      await loadMembers();
      setEditingMember(null);
      setNotice("Rôle enregistré.");
    } catch {
      setError(
        "Enregistrement refusé. Vérifiez que vous êtes administrateur et que le UID existe dans Firebase Authentication.",
      );
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(member: ManagedUser) {
    if (
      !db ||
      !user ||
      member.uid === user.uid ||
      !window.confirm(
        `Retirer le rôle de ${member.displayName} ? Le compte Firebase Authentication ne sera pas supprimé.`,
      )
    )
      return;
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "userRoles", member.uid));
      await loadMembers();
      setNotice("Accès au site retiré. Le compte Authentication reste actif.");
    } catch {
      setError("Suppression refusée. Vérifiez votre rôle administrateur.");
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="ADMINISTRATION"
        title={
          <>
            Gérer les
            <br />
            <em>comptes.</em>
          </>
        }
        description="Associez un rôle du site à un compte déjà créé dans Firebase Authentication."
      />
      <section className="section admin-section">
        <div className="container admin-container">
          {!firebaseEnabled ? (
            <div className="admin-message">
              <ShieldCheck size={28} />
              <h2>Configuration requise</h2>
              <p>Configurez Firebase pour gérer les rôles du site.</p>
            </div>
          ) : !authReady ? (
            <div className="admin-message" role="status">
              <ShieldCheck size={28} />
              <h2>Vérification de la session</h2>
              <p>Chargement du compte administrateur…</p>
            </div>
          ) : !user || role !== "admin" ? (
            <div className="admin-message" role="status">
              <ShieldCheck size={28} />
              <h2>Accès réservé aux admins</h2>
              <p>
                Un administrateur peut associer ici les rôles admin et éditeur.
              </p>
              <Link className="button button-outline" to="/webmaster">
                Retour aux actualités <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="admin-dashboard">
              <div className="admin-top">
                <div>
                  <span className="eyebrow">CONNECTÉ : {user.email}</span>
                  <h2>Comptes du site</h2>
                </div>
                <div className="admin-actions">
                  <Link className="button button-outline" to="/webmaster">
                    Actualités <ArrowRight size={16} />
                  </Link>
                  <button
                    className="button button-outline"
                    onClick={() => signOut(auth!)}
                  >
                    Déconnexion <X size={16} />
                  </button>
                </div>
              </div>
              <p className="users-guidance">
                Crée d’abord le compte dans Firebase Authentication, puis copie
                son UID depuis la liste des utilisateurs. Retirer un rôle ne
                supprime pas le compte Firebase.
              </p>
              {notice && (
                <p role="status" className="form-success">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="admin-list" aria-live="polite">
                {loadingMembers ? (
                  <p className="admin-empty">Chargement des comptes…</p>
                ) : members.length === 0 ? (
                  <p className="admin-empty">
                    Aucun compte associé à un rôle du site.
                  </p>
                ) : (
                  members.map((member) => (
                    <div className="admin-item user-role-item" key={member.uid}>
                      <div>
                        <strong>{member.displayName}</strong>
                        <span>
                          {member.email} ·{" "}
                          {member.role === "admin"
                            ? "Administrateur"
                            : "Éditeur"}{" "}
                          · UID : {member.uid}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingMember(member)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="delete-action"
                        disabled={member.uid === user.uid}
                        onClick={() => removeMember(member)}
                      >
                        Retirer
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form
                className="admin-editor"
                key={editingMember?.uid ?? "new-member"}
                onSubmit={saveMember}
              >
                <h3>
                  {editingMember ? "Modifier un rôle" : "Associer un compte"}
                </h3>
                <label>
                  UID Firebase Authentication
                  <input
                    name="uid"
                    defaultValue={editingMember?.uid}
                    required
                    readOnly={Boolean(editingMember)}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Nom affiché
                    <input
                      name="displayName"
                      defaultValue={editingMember?.displayName}
                      required
                    />
                  </label>
                  <label>
                    Adresse e-mail
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingMember?.email}
                      required
                    />
                  </label>
                </div>
                <label>
                  Rôle
                  <select
                    name="role"
                    defaultValue={editingMember?.role ?? "editor"}
                    disabled={Boolean(
                      editingMember &&
                      isClaimAdmin &&
                      editingMember.uid === user.uid,
                    )}
                  >
                    <option value="editor">
                      Éditeur · publier et modifier des articles
                    </option>
                    <option value="admin">
                      Administrateur · articles et gestion des rôles
                    </option>
                  </select>
                </label>
                {editingMember?.uid === user.uid && isClaimAdmin && (
                  <p className="admin-empty">
                    Le compte administrateur principal ne peut pas perdre son
                    claim depuis cette page.
                  </p>
                )}
                <button
                  className="button button-copper"
                  type="submit"
                  disabled={savingMember}
                >
                  {savingMember
                    ? "Enregistrement…"
                    : editingMember
                      ? "Enregistrer le rôle"
                      : "Associer ce compte"}{" "}
                  <ArrowRight size={16} />
                </button>
                {editingMember && (
                  <button
                    type="button"
                    className="cancel-edit"
                    onClick={() => setEditingMember(null)}
                  >
                    Annuler
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function App() {
  return (
    <PageFrame>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/club" element={<Club />} />
        <Route path="/creneaux" element={<SchedulePage />} />
        <Route path="/evenements" element={<EventsPage />} />
        <Route path="/equipes" element={<TeamsOverview />} />
        <Route path="/equipes/:teamId" element={<TeamDetails />} />
        <Route path="/actualites" element={<News />} />
        <Route path="/actualites/:id" element={<ArticleDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mentions-legales" element={<LegalNotice />} />
        <Route path="/rgpd" element={<PrivacyPolicy />} />
        <Route path="/webmaster" element={<Webmaster />} />
        <Route path="/webmaster/utilisateurs" element={<UserManagement />} />
        <Route
          path="*"
          element={
            <section className="not-found">
              <h1>Cette page n’existe pas.</h1>
              <Link className="text-link" to="/">
                Retour à l’accueil <ArrowRight />
              </Link>
            </section>
          }
        />
      </Routes>
    </PageFrame>
  );
}
