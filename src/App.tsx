import {
  createContext,
  CSSProperties,
  FormEvent,
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
  House,
  Instagram,
  Mail,
  MapPin,
  Menu,
  Network,
  Plane,
  ShieldCheck,
  X,
} from "lucide-react";
import { Article, ClubEvent, demoArticles, demoEvents } from "./data";
import {
  ClubInformation,
  defaultClubInformation,
  defaultHomePageContent,
  HomePageContent,
} from "./siteContent";
import { TeamData, TeamSource } from "./teamSources";
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
type HorairesSlot = {
  day: string;
  time: string;
  activity: string;
};
type HorairesHebdomadaires = {
  adultVenue: string;
  adultAddress: string;
  adultSlots: HorairesSlot[];
  youthVenue: string;
  youthAddress: string;
  youthNote: string;
  youthSlots: HorairesSlot[];
};
type WebmasterTab =
  | "articles"
  | "board"
  | "events"
  | "horaires"
  | "club"
  | "homepage"
  | "teams";

const defaultHorairesHebdomadaires: HorairesHebdomadaires = {
  adultVenue: "Adultes · Gymnase Beaulieu",
  adultAddress: "Rue du Port, Cognac",
  adultSlots: [
    { day: "Lundi", time: "18h30–20h", activity: "Initiation débutant" },
    {
      day: "Lundi",
      time: "20h–22h",
      activity: "Jeu libre · priorité débutants",
    },
    {
      day: "Mardi",
      time: "18h30–22h",
      activity: "Jeu libre jeunes et adultes",
    },
    {
      day: "Mercredi",
      time: "18h30–22h",
      activity: "Jeu libre jeunes et adultes",
    },
    {
      day: "Jeudi",
      time: "18h30–22h",
      activity: "Jeu libre jeunes et adultes",
    },
    {
      day: "Vendredi",
      time: "18h–20h",
      activity: "Jeu libre jeunes et adultes",
    },
  ],
  youthVenue: "Jeunes · Gymnase Jean Monnet",
  youthAddress: "Collège Jean Monnet · Cognac · École Française de Badminton",
  youthNote:
    "Au-delà de 17 ans, les joueurs sont accueillis aux horaires adultes.",
  youthSlots: [
    { day: "Mardi", time: "18h15–19h45", activity: "5–10 ans" },
    { day: "Jeudi", time: "18h15–19h45", activity: "11–17 ans" },
  ],
};

function sortBoardMembers(members: BoardMember[]) {
  return [...members].sort((first, second) => {
    if (typeof first.order === "number" && typeof second.order === "number")
      return first.order - second.order;
    if (typeof first.order === "number") return -1;
    if (typeof second.order === "number") return 1;
    return first.name.localeCompare(second.name, "fr");
  });
}

function BoardMemberPhoto({
  member,
  className,
}: {
  member: BoardMember;
  className?: string;
}) {
  const hasPhoto = Boolean(member.photoUrl);
  return (
    <img
      className={`${className ?? ""}${hasPhoto ? "" : " board-photo-placeholder"}`}
      src={member.photoUrl || `${import.meta.env.BASE_URL}logo.png`}
      alt={
        hasPhoto
          ? `Portrait de ${member.name}`
          : `Logo Cognac Badminton pour ${member.name}`
      }
      loading="lazy"
    />
  );
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

function renderInlineEmphasis(text: string): ReactNode {
  return text.split(/(<em>.*?<\/em>)/g).map((segment, index) => {
    const match = segment.match(/^<em>(.*?)<\/em>$/);
    return match ? <em key={index}>{match[1]}</em> : segment;
  });
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

const web3FormsAccessKey = "55d8ccc0-bc5f-4bcf-af5a-452539af78ff";
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

type SiteContentState = {
  clubInformation: ClubInformation;
  homePageContent: HomePageContent;
  clubError: string;
  homePageError: string;
  loading: boolean;
};

const SiteContentContext = createContext<SiteContentState | null>(null);

function useSiteContent() {
  const content = useContext(SiteContentContext);
  if (!content) throw new Error("SiteContentProvider is missing.");
  return content;
}

function mergeStringFields<T extends object>(
  defaults: T,
  data: Record<string, unknown>,
): T {
  const result = { ...defaults } as T;
  const values = data as Partial<Record<keyof T, unknown>>;
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    if (typeof values[key] === "string") {
      result[key] = values[key] as T[typeof key];
    }
  }
  return result;
}

function SiteContentProvider({ children }: { children: ReactNode }) {
  const [clubInformation, setClubInformation] =
    useState(defaultClubInformation);
  const [homePageContent, setHomePageContent] = useState(defaultHomePageContent);
  const [clubError, setClubError] = useState("");
  const [homePageError, setHomePageError] = useState("");
  const [clubLoaded, setClubLoaded] = useState(!db);
  const [homePageLoaded, setHomePageLoaded] = useState(!db);

  useEffect(() => {
    if (!db) return;
    const firestore = db;
    const unsubscribeClub = onSnapshot(
      doc(firestore, "siteContent", "clubInformation"),
      (snapshot) => {
        setClubInformation(
          snapshot.exists()
            ? mergeStringFields(defaultClubInformation, snapshot.data())
            : defaultClubInformation,
        );
        setClubError("");
        setClubLoaded(true);
      },
      () => {
        setClubError(
          "Les informations du club n’ont pas pu être chargées. Les valeurs par défaut sont affichées.",
        );
        setClubLoaded(true);
      },
    );
    const unsubscribeHomePage = onSnapshot(
      doc(firestore, "siteContent", "homePage"),
      (snapshot) => {
        if (!snapshot.exists()) {
          setHomePageContent(defaultHomePageContent);
        } else {
          const data = snapshot.data();
          const { heroImages: defaultImages, ...defaultCopy } =
            defaultHomePageContent;
          const content = mergeStringFields(defaultCopy, data);
          if (content.heroPitch === "Le club qui a du corps et du cœur.") {
            content.heroPitch = defaultHomePageContent.heroPitch;
          }
          if (content.heroLine === "On lève le volant ensemble.") {
            content.heroLine = defaultHomePageContent.heroLine;
          }
          const images = data.heroImages;
          setHomePageContent({
            ...content,
            heroImages:
              Array.isArray(images) &&
              images.length === defaultImages.length &&
              images.every((image: unknown) => typeof image === "string")
                ? images
                : defaultImages,
          });
        }
        setHomePageError("");
        setHomePageLoaded(true);
      },
      () => {
        setHomePageError(
          "Le contenu de l’accueil n’a pas pu être chargé. Les valeurs par défaut sont affichées.",
        );
        setHomePageLoaded(true);
      },
    );
    return () => {
      unsubscribeClub();
      unsubscribeHomePage();
    };
  }, []);

  return (
    <SiteContentContext.Provider
      value={{
        clubInformation,
        homePageContent,
        clubError,
        homePageError,
        loading: !clubLoaded || !homePageLoaded,
      }}
    >
      {children}
    </SiteContentContext.Provider>
  );
}

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

function scrollToPageTop() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.scrollTo({
    top: 0,
    behavior: reducedMotion ? "auto" : "smooth",
  });
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
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  return (
    <header
      className={open ? "site-header menu-open" : "site-header"}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuToggleRef.current?.focus();
        }
      }}
    >
      <div className="header-inner">
        <Brand />
        <button
          ref={menuToggleRef}
          className="menu-toggle"
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav
          id="primary-navigation"
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Navigation principale"
        >
          {[
            ["Accueil", "/"],
            ["Actualités", "/actualites"],
            ["Évènements", "/evenements"],
            ["Horaires", "/horaires"],
            ["Les équipes", "/equipes"],
            ["Le bureau", "/bureau"],
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
  const { clubInformation, clubError, homePageError } = useSiteContent();
  return (
    <footer className="site-footer">
      {(clubError || homePageError) && (
        <div className="container">
          <p className="site-content-warning" role="status">
            Certaines informations du site utilisent leurs valeurs par défaut.
            Le webmaster peut vérifier leur configuration.
          </p>
        </div>
      )}
      <div className="container footer-main">
        <div>
          <Brand />
          <p className="footer-about">
            Le badminton à Cognac, pour tous les jeux et tous les niveaux.
          </p>
        </div>
        <div>
          <span className="footer-label">Explorer</span>
          <Link to="/actualites">Actualités</Link>
          <Link to="/evenements">Évènements</Link>
          <Link to="/horaires">Horaires</Link>
          <Link to="/bureau">Le bureau</Link>
          <Link to="/contact">Nous contacter</Link>
        </div>
        <div>
          <span className="footer-label">Nous trouver</span>
          <span className="footer-location">
            <MapPin size={16} /> {clubInformation.city} ·{" "}
            {clubInformation.department}
          </span>
          <a href={`mailto:${clubInformation.email}`}>
            <Mail size={16} /> {clubInformation.email}
          </a>
          {clubInformation.facebookUrl && (
            <a
              href={clubInformation.facebookUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Facebook size={16} /> Facebook
            </a>
          )}
          {clubInformation.instagramUrl && (
            <a
              href={clubInformation.instagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={16} /> Instagram
            </a>
          )}
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

function getFallbackPageHeading(pathname: string): string {
  if (pathname.startsWith("/actualites/")) return "Actualité indisponible";
  if (/^\/equipes\/[^/]+$/.test(pathname)) return "Équipe";
  if (pathname === "/webmaster/utilisateurs") return "Gérer les comptes";

  const routeHeadings: Record<string, string> = {
    "/bureau": "Le bureau",
    "/contact": "Contact",
    "/equipes": "Nos équipes",
    "/evenements": "Les évènements du club",
    "/horaires": "Horaires",
    "/mentions-legales": "Mentions légales",
    "/rgpd": "Données personnelles",
    "/webmaster": "Espace webmaster",
    "/actualites": "Actualités",
  };
  return routeHeadings[pathname] ?? "Page indisponible";
}

function PageFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const [pageTitle, setPageTitle] = useState("Cognac Badminton");

  useEffect(() => {
    const main = document.getElementById("contenu");
    const updatePageHeading = () => {
      const headingElement = main?.querySelector("h1");
      const headingMarkup = headingElement?.innerHTML.replace(
        /<br\s*\/?>/gi,
        " ",
      );
      const heading =
        (
          (headingMarkup
            ? new DOMParser().parseFromString(headingMarkup, "text/html").body
                .textContent
            : null) ??
          headingElement?.textContent ??
          ""
        )
          .replace(/\s+/g, " ")
          .trim() ||
        getFallbackPageHeading(pathname);

      const title =
        pathname === "/"
          ? "Cognac Badminton | Jouons collectif"
          : `${heading} | Cognac Badminton`;
      document.title = title;
      main?.setAttribute("aria-label", heading);
      setPageTitle(heading);
      return headingElement;
    };

    const headingElement = updatePageHeading();
    if (previousPath.current !== pathname) {
      if (headingElement) {
        headingElement.setAttribute("tabindex", "-1");
        headingElement.focus({ preventScroll: true });
      } else {
        main?.focus({ preventScroll: true });
      }
    }
    previousPath.current = pathname;

    if (!main) return;
    const headingObserver = new MutationObserver(updatePageHeading);
    headingObserver.observe(main, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => headingObserver.disconnect();
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" tabIndex={-1} aria-label={pageTitle}>
        {children}
      </main>
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
      onClick={scrollToPageTop}
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

async function uploadClubImage(file: File): Promise<string> {
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
          <BoardMemberPhoto member={member} />
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
            aria-label="Logo Cognac Badminton utilisé comme illustration"
          >
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
          </span>
        )}
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
  const { homePageContent } = useSiteContent();
  const news = useArticles().slice(0, 3);
  return (
    <>
      <section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(18,31,46,.92), rgba(18,31,46,.66) 48%, rgba(18,31,46,.13)), url(${JSON.stringify(homePageContent.heroImages[slide])})`,
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
            <span className="eyebrow-dot" /> {homePageContent.heroEyebrow}
          </span>
          <h1>
            <em>{homePageContent.heroTitleAccent}</em>{" "}
            {homePageContent.heroTitle}
            <br />
          </h1>
          <p>
            {renderInlineEmphasis(homePageContent.heroPitch)}
            <br />
            {renderInlineEmphasis(homePageContent.heroLine)}
            <br />
            <em>{homePageContent.heroSlogan}</em>
          </p>
          <div className="hero-actions">
            <Link className="button button-copper" to="/contact#inscription">
              Découvrir le club <ArrowUpRight size={17} />
            </Link>
            <Link className="button button-quiet" to="/horaires">
              <Clock3 size={17} /> Voir les horaires
            </Link>
          </div>
        </div>
        <div className="hero-index" aria-hidden="true">
          <span>0{slide + 1}</span>
          <span className="hero-index-line" />
          {String(homePageContent.heroImages.length).padStart(2, "0")}
        </div>
        <span className="visually-hidden" aria-live="polite" aria-atomic="true">
          Photo {slide + 1} sur {homePageContent.heroImages.length}
        </span>
        <div className="hero-controls">
          <button
            aria-label="Photo précédente"
            onClick={() =>
              setSlide(
                (currentSlide) =>
                  (currentSlide + homePageContent.heroImages.length - 1) %
                  homePageContent.heroImages.length,
              )
            }
          >
            <ChevronLeft />
          </button>
          <button
            aria-label="Photo suivante"
            onClick={() =>
              setSlide(
                (currentSlide) =>
                  (currentSlide + 1) % homePageContent.heroImages.length,
              )
            }
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
          <span className="eyebrow">{homePageContent.introEyebrow}</span>
          <p>
            {homePageContent.introText}
          </p>
          <Link className="text-link" to="/bureau">
            Rencontrer le club <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="section club-story">
        <div className="container story-grid">
          <div className="story-photo">
            <img
              src={homePageContent.storyImage}
              alt={homePageContent.storyImageAlt}
            />
            <span className="photo-caption">{homePageContent.storyCaption}</span>
          </div>
          <div className="story-copy">
            <span className="eyebrow">{homePageContent.storyEyebrow}</span>
            <h2>
              {homePageContent.storyTitle}
              <br />
              <em>{homePageContent.storyAccent}</em>
            </h2>
            <p>{homePageContent.storyParagraph1}</p>
            <p>{homePageContent.storyParagraph2}</p>
            <Link className="text-link" to="/contact#inscription">
              Faire un essai <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="club-values">
        <div className="container values-grid">
          <div>
            <span className="eyebrow light">
              {homePageContent.valuesEyebrow}
            </span>
            <h2>
              {homePageContent.valuesTitle}
              <br />
              <em>{homePageContent.valuesAccent}</em>
            </h2>
          </div>
          <div className="value-item">
            <span>01</span>
            <h3>{homePageContent.value1Title}</h3>
            <p>{homePageContent.value1Description}</p>
          </div>
          <div className="value-item">
            <span>02</span>
            <h3>{homePageContent.value2Title}</h3>
            <p>{homePageContent.value2Description}</p>
          </div>
          <div className="value-item">
            <span>03</span>
            <h3>{homePageContent.value3Title}</h3>
            <p>{homePageContent.value3Description}</p>
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
            <Network className="section-icon" aria-hidden="true" />
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
    <div className="events-list" aria-live="polite">
      {events.map((event) => (
        <article className="events-item" key={event.id}>
          <time className="events-date" dateTime={event.date}>
            <strong>{formatEventDate(event.date, { day: "2-digit" })}</strong>
            <span className="events-date-month">
              {formatEventDate(event.date, { month: "short" })
                .replace(".", "")
                .toLocaleUpperCase("fr-FR")}
            </span>
            <span className="events-date-year">
              {formatEventDate(event.date, { year: "numeric" })}
            </span>
          </time>
          <div className="events-name">
            <h3>{event.title}</h3>
            <p>{event.detail}</p>
          </div>
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
      <section className="section events-section">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="RENDEZ-VOUS DU CLUB"
              title="À noter dans vos agendas"
              copy="Les dates et informations sont communiquées par le club et peuvent évoluer."
            />
            <CalendarDays className="section-icon" />
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

function useHorairesHebdomadaires() {
  const [horaires, setHoraires] = useState<HorairesHebdomadaires | null>(
    db ? null : defaultHorairesHebdomadaires,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(db));

  useEffect(() => {
    if (!db) return;
    const firestore = db;
    let active = true;
    getDoc(doc(firestore, "siteContent", "horaires"))
      .then(async (snapshot) => {
        if (!active) return;
        const legacySnapshot = snapshot.exists()
          ? null
          : await getDoc(doc(firestore, "siteContent", "schedule"));
        if (!active) return;
        const dataSnapshot = snapshot.exists() ? snapshot : legacySnapshot;
        if (!dataSnapshot?.exists()) {
          setHoraires(defaultHorairesHebdomadaires);
          return;
        }
        const data = dataSnapshot.data();
        setHoraires({
          ...defaultHorairesHebdomadaires,
          ...data,
          adultSlots: Array.isArray(data.adultSlots)
            ? data.adultSlots
            : defaultHorairesHebdomadaires.adultSlots,
          youthSlots: Array.isArray(data.youthSlots)
            ? data.youthSlots
            : defaultHorairesHebdomadaires.youthSlots,
        } as HorairesHebdomadaires);
      })
      .catch(() => {
        if (active)
          setError("Les horaires ne peuvent pas être chargés pour le moment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { horaires, error, loading };
}

function HorairesTable({
  title,
  thirdColumnLabel,
  slots,
}: {
  title: string;
  thirdColumnLabel: string;
  slots: HorairesSlot[];
}) {
  const seenDays = new Set<string>();
  return (
    <div className="horaires-table" role="table" aria-label={title}>
      <div className="horaires-line horaires-heading" role="row">
        <span role="columnheader">Jour</span>
        <span role="columnheader">Horaires</span>
        <span role="columnheader">{thirdColumnLabel}</span>
      </div>
      {slots.map((slot, index) => {
        const normalizedDay = slot.day.trim().toLocaleLowerCase("fr");
        const showDay = !normalizedDay || !seenDays.has(normalizedDay);
        if (normalizedDay) seenDays.add(normalizedDay);
        return (
          <div
            className="horaires-line"
            role="row"
            key={`${slot.day}-${index}`}
          >
            <strong role="rowheader" aria-label={slot.day || undefined}>
              {showDay ? slot.day : ""}
            </strong>
            <span role="cell">{slot.time}</span>
            <span role="cell">{slot.activity}</span>
          </div>
        );
      })}
    </div>
  );
}

function HorairesPage() {
  const { horaires, error, loading } = useHorairesHebdomadaires();
  return (
    <>
      <PageIntro
        eyebrow="COGNAC BADMINTON · HORAIRES"
        title={
          <>
            Trouvez vos
            <br />
            <em>horaires de jeu.</em>
          </>
        }
        description="Retrouvez les horaires hebdomadaires des séances adultes et jeunes ainsi que les gymnases."
      />
      <section className="section horaires-page">
        <div className="container">
          <div className="section-row">
            <SectionHead
              eyebrow="HORAIRES DES SÉANCES"
              title="On se retrouve au gymnase"
              copy="Le club est labellisé École Française de Badminton. Deux entraînements jeunes sont proposés chaque semaine aux 5–17 ans ; au-delà de 17 ans, les joueurs rejoignent les horaires adultes."
            />
            <Clock3 className="section-icon" aria-hidden="true" />
          </div>
          {loading ? (
            <p className="admin-empty" role="status">
              Chargement des horaires…
            </p>
          ) : error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : horaires ? (
            <div className="horaires-groups">
              <section
                className="horaires-venue"
                aria-labelledby="adultes-heading"
              >
                <h3 id="adultes-heading">{horaires.adultVenue}</h3>
                <p className="venue-address">{horaires.adultAddress}</p>
                <HorairesTable
                  title="adultes · Beaulieu"
                  thirdColumnLabel="Séance"
                  slots={horaires.adultSlots}
                />
              </section>
              <section
                className="horaires-venue"
                aria-labelledby="jeunes-heading"
              >
                <h3 id="jeunes-heading">{horaires.youthVenue}</h3>
                <p className="venue-address">{horaires.youthAddress}</p>
                <HorairesTable
                  title="jeunes · Jean Monnet"
                  thirdColumnLabel="Âge"
                  slots={horaires.youthSlots}
                />
                {horaires.youthNote && (
                  <p className="horaires-footnote">{horaires.youthNote}</p>
                )}
              </section>
            </div>
          ) : null}
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

function getMatchResultClass(match: TeamData["matches"][number]): string {
  const score = match.score.match(/^\s*(\d+)\s*[-–—:]\s*(\d+)\s*$/);
  if (!score) return "";
  const homeScore = Number(score[1]);
  const awayScore = Number(score[2]);
  if (homeScore === awayScore) return "team-match-score-draw";
  const clubScore = match.home ? homeScore : awayScore;
  const opponentScore = match.home ? awayScore : homeScore;
  return clubScore > opponentScore
    ? "team-match-score-win"
    : "team-match-score-loss";
}

function renderStandingPlace(position: string) {
  const place = Number.parseInt(position, 10);
  const medal =
    place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;
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

type PlayerSortKey = "name" | "single" | "double" | "mixed";
type PlayerSort = { key: PlayerSortKey; direction: "ascending" | "descending" };

function getPlayerRankings(role?: string): [string, string, string] {
  const rankings = (role ?? "")
    .split(/\s*[·•]\s*/)
    .map((ranking) => ranking.trim());
  return [rankings[0] ?? "", rankings[1] ?? "", rankings[2] ?? ""];
}

function getRankingClass(ranking: string): string {
  const normalizedRanking = ranking.toUpperCase();
  if (/^N[1-3]$/.test(normalizedRanking)) return "team-ranking-national";
  if (/^R[4-6]$/.test(normalizedRanking)) return "team-ranking-regional";
  if (/^D[7-9]$/.test(normalizedRanking)) return "team-ranking-departmental";
  if (/^P(10|11|12)$/.test(normalizedRanking)) return "team-ranking-promotion";
  if (normalizedRanking === "NC") return "team-ranking-unclassified";
  return "";
}

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
  const sortedPlayers = useMemo(() => {
    const rankingIndex = {
      single: 0,
      double: 1,
      mixed: 2,
    } as const;
    return [...(data?.players ?? [])].sort((first, second) => {
      const firstValue =
        playerSort.key === "name"
          ? first.name
          : getPlayerRankings(first.role)[rankingIndex[playerSort.key]];
      const secondValue =
        playerSort.key === "name"
          ? second.name
          : getPlayerRankings(second.role)[rankingIndex[playerSort.key]];
      const comparison = (firstValue ?? "").localeCompare(
        secondValue ?? "",
        "fr",
        { sensitivity: "base", numeric: true },
      );
      return playerSort.direction === "ascending" ? comparison : -comparison;
    });
  }, [data?.players, playerSort]);
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
              . Ces informations proviennent de la FFBaD
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
                    <table
                      className="team-table"
                      aria-label={`Joueurs de l’équipe ${team.shortName}`}
                    >
                      <thead>
                        <tr>
                          {(
                            [
                              ["name", "Joueur"],
                              ["single", "Simple"],
                              ["double", "Double"],
                              ["mixed", "Mixte"],
                            ] as const
                          ).map(([key, label]) => (
                            <th
                              key={key}
                              className={
                                key === "name"
                                  ? undefined
                                  : "team-ranking-column"
                              }
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
                                  <ArrowUpDown size={14} aria-hidden="true" />
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
                            {getPlayerRankings(player.role).map(
                              (ranking, rankingIndex) => (
                                <td
                                  key={`${player.name}-${rankingIndex}`}
                                  className="team-ranking-column"
                                >
                                  {ranking ? (
                                    <span
                                      className={`team-ranking ${getRankingClass(ranking)}`}
                                    >
                                      {ranking}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              ),
                            )}
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
                    <table
                      className="team-table"
                      aria-label={`Classement de la division de l’équipe ${team.shortName}`}
                    >
                      <thead>
                        <tr>
                          <th className="team-rank-cell" scope="col">
                            Place
                          </th>
                          <th scope="col">Équipe</th>
                          <th className="team-table-center-cell" scope="col">
                            Jouées
                          </th>
                          <th className="team-table-center-cell" scope="col">
                            Gagnées
                          </th>
                          <th className="team-table-center-cell" scope="col">
                            Nulles
                          </th>
                          <th className="team-table-center-cell" scope="col">
                            Perdues
                          </th>
                          <th className="team-table-center-cell" scope="col">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.standings.map((standing, index) => (
                          <tr key={`${standing.team}-${index}`}>
                            <td className="team-rank-cell">
                              {renderStandingPlace(standing.position)}
                            </td>
                            <td>{standing.team}</td>
                            <td className="team-table-center-cell">
                              {standing.played}
                            </td>
                            <td className="team-table-center-cell">
                              {standing.won}
                            </td>
                            <td className="team-table-center-cell">
                              {standing.drawn}
                            </td>
                            <td className="team-table-center-cell">
                              {standing.lost}
                            </td>
                            <td className="team-table-center-cell">
                              {standing.points}
                            </td>
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
                    <table
                      className="team-table"
                      aria-label={`Rencontres de l’équipe ${team.shortName}`}
                    >
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Rencontre</th>
                          <th scope="col">Lieu</th>
                          <th className="team-table-center-cell" scope="col">
                            Résultat
                          </th>
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
                              <td>
                                <span className="team-match-location">
                                  {match.home ? (
                                    <House size={16} aria-hidden="true" />
                                  ) : (
                                    <Plane size={16} aria-hidden="true" />
                                  )}
                                  <span className="visually-hidden">
                                    {match.home
                                      ? "À domicile : "
                                      : "En déplacement : "}
                                  </span>
                                  {match.location || "—"}
                                </span>
                              </td>
                              <td className="team-table-center-cell">
                                <span
                                  className={`team-match-score ${getMatchResultClass(match)}`}
                                >
                                  {match.score || "À venir"}
                                </span>
                              </td>
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
          {article.image ? (
            <img
              className="article-cover"
              src={article.image}
              alt={article.title}
            />
          ) : (
            <div className="article-cover-empty">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Logo Cognac Badminton utilisé comme illustration"
              />
            </div>
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
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
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
    if (!name || !role) {
      setError("Renseignez le nom et la fonction de ce membre.");
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
        ? await uploadClubImage(photoFile)
        : removePhoto
          ? ""
          : (editing?.photoUrl ?? "");
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
      setCropSource(null);
      setRemovePhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
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
        setCropSource(null);
        setRemovePhoto(false);
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
    setRemovePhoto(false);
    setCropSource(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setCropSource(null);
    setRemovePhoto(true);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  return (
    <section className="board-admin">
      {!cloudinaryCloudName || !cloudinaryUploadPreset ? (
        <p className="board-upload-notice" role="status">
          Le téléversement de portraits est désactivé faute de configuration
          Cloudinary ; vous pouvez tout de même ajouter ou modifier un membre
          sans photo.
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
        les boutons Monter et Descendre. La photo est facultative : le logo du
        club s’affiche en son absence.
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
              <div className="board-member-identity">
                <BoardMemberPhoto member={member} />
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
              </div>
              <div className="board-member-controls">
                <button
                  type="button"
                  disabled={savingOrder}
                  onClick={() => {
                    setEditing(member);
                    setPhotoFile(null);
                    setCropSource(null);
                    setRemovePhoto(false);
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
              </div>
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
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => choosePhoto(event.currentTarget.files?.[0])}
          />
        </label>
        {cropSource && (
          <ImageCropper
            file={cropSource}
            onCancel={() => {
              setCropSource(null);
              if (photoInputRef.current) photoInputRef.current.value = "";
            }}
            onComplete={(file) => {
              setPhotoFile(file);
              setCropSource(null);
            }}
          />
        )}
        <img
          className={`board-photo-preview${!removePhoto && (photoPreview || editing?.photoUrl) ? "" : " board-photo-placeholder"}`}
          src={
            (removePhoto ? "" : photoPreview) ||
            (removePhoto ? "" : editing?.photoUrl) ||
            `${import.meta.env.BASE_URL}logo.png`
          }
          alt={
            photoPreview || (editing?.photoUrl && !removePhoto)
              ? "Aperçu de la photo du membre"
              : "Logo Cognac Badminton utilisé sans portrait"
          }
        />
        <div className="photo-form-actions">
          {(photoFile || cropSource || editing?.photoUrl) && (
            <button
              className="button button-outline photo-remove-button"
              type="button"
              onClick={clearPhoto}
              disabled={saving}
            >
              Supprimer la photo
            </button>
          )}
          <button
            className="button button-copper"
            type="submit"
            disabled={
              saving ||
              loading ||
              Boolean(cropSource) ||
              (Boolean(photoFile) &&
                (!cloudinaryCloudName || !cloudinaryUploadPreset))
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
                setCropSource(null);
                setRemovePhoto(false);
                setError("");
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function Contact() {
  const { clubInformation } = useSiteContent();
  const {
    horaires,
    error: horairesError,
    loading: horairesLoading,
  } = useHorairesHebdomadaires();
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
                  <a href={`mailto:${clubInformation.email}`}>
                    {clubInformation.email}
                  </a>{" "}
                  ou utilisez ce formulaire.
                </p>
              </div>
            </div>
            <div className="contact-detail">
              <MapPin />
              <div>
                <span>GYMNASES</span>
                {horairesLoading ? (
                  <p role="status">Chargement des lieux d’entraînement…</p>
                ) : horairesError ? (
                  <p className="form-error" role="alert">
                    {horairesError}
                  </p>
                ) : horaires ? (
                  <p>
                    {horaires.adultVenue}, {horaires.adultAddress}.
                    <br />
                    {horaires.youthVenue}, {horaires.youthAddress}.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="contact-detail">
              <Clock3 />
              <div>
                <span>RENSEIGNEMENTS</span>
                <p>
                  Vous pouvez aussi poser votre question directement sur place
                  lors des horaires d’ouverture aux gymnases indiqués dans les
                  horaires du club.
                </p>
              </div>
            </div>
            <div className="contact-note">
              <CalendarDays size={18} />
              <p>
                Le club est labellisé École Française de Badminton. Deux
                entraînements jeunes par semaine accueillent les 5–17 ans ;
                au-delà de 17 ans, les joueurs sont admis aux horaires adultes.
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
                  Vos coordonnées sont utilisées pour répondre à votre demande.{" "}
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
  const { clubInformation } = useSiteContent();
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
              Siège social : {clubInformation.postalAddress}{" "}
              {clubInformation.city}, {clubInformation.department}, France
              <br />
              Courriel :{" "}
              <a href={`mailto:${clubInformation.email}`}>
                {clubInformation.email}
              </a>
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
              Le site est hébergé par GitHub Pages, service de GitHub, Inc., 88
              Colin P Kelly Jr St, San Francisco, CA 94107, États-Unis.
              <br />
              <a
                href="https://support.github.com/contact"
                target="_blank"
                rel="noreferrer"
              >
                Contacter l’assistance GitHub
              </a>
            </p>
          </section>
          <section>
            <h2>Propriété intellectuelle</h2>
            <p>
              Les textes, photographies, marques et autres éléments présents sur
              ce site peuvent être protégés par des droits de propriété
              intellectuelle. Leur réutilisation nécessite l’autorisation
              préalable de leurs titulaires, sauf exception légale. Les contenus
              de tiers restent la propriété de leurs auteurs ou ayants droit.
            </p>
          </section>
          <section>
            <h2>Sources et informations</h2>
            <p>
              Les informations sportives publiées sur les pages des équipes sont
              issues des pages publiques de la{" "}
              <a
                href="https://icbad.ffbad.org/instance/CB16"
                target="_blank"
                rel="noreferrer"
              >
                FFBaD / ICBaD
              </a>
              . Les contenus du site sont fournis à titre informatif ; pour
              confirmer un horaire ou une rencontre, contactez le club.
            </p>
            <p>
              <a
                href="https://entreprendre.service-public.gouv.fr/vosdroits/F37351"
                target="_blank"
                rel="noreferrer"
              >
                Informations officielles sur les mentions des sites internet
              </a>
              {" · "}
              <a
                href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164/"
                target="_blank"
                rel="noreferrer"
              >
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
  const { clubInformation } = useSiteContent();
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
          <p className="legal-updated">
            Dernière mise à jour : 22 octobre 2026
          </p>
          <section>
            <h2>Responsable du traitement</h2>
            <p>
              Le responsable du traitement est Cognac Badminton (CB16),{" "}
              {clubInformation.postalAddress} {clubInformation.city},{" "}
              {clubInformation.department}, France. Pour toute question ou
              demande concernant vos données, écrivez à{" "}
              <a href={`mailto:${clubInformation.email}`}>
                {clubInformation.email}
              </a>
              .
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
                présenter les activités du club. Les photographies sont publiées
                avec l’accord des personnes concernées. La base juridique est
                leur consentement pour les portraits et l’intérêt légitime du
                club pour les informations sportives publiques ; les données
                d’équipe sont actualisées périodiquement et les contenus sont
                retirés lorsqu’ils ne sont plus utiles ou à jour.
              </li>
            </ul>
            <p>
              Le site ne propose ni inscription à une newsletter ni collecte de
              données de paiement. Ne transmettez pas de données sensibles dans
              le formulaire de contact.
            </p>
          </section>
          <section>
            <h2>Destinataires et prestataires</h2>
            <p>
              Les données sont accessibles aux personnes habilitées du club et
              aux prestataires nécessaires au fonctionnement du site : Web3Forms
              pour transmettre les messages, Google Firebase pour
              l’authentification webmaster et les contenus administrés,
              Cloudinary pour héberger les photos des actualités et du bureau,
              GitHub Pages pour l’hébergement du site et Cloudflare pour la
              synchronisation des données sportives publiques. Les images
              hébergées par Unsplash sont chargées depuis leurs serveurs. Ces
              prestataires peuvent traiter des données techniques de connexion
              (par exemple l’adresse IP) selon leurs propres politiques.
            </p>
            <p>
              Les services peuvent traiter des données hors de l’Espace
              économique européen. Les modalités et garanties applicables sont
              décrites dans les informations de confidentialité des prestataires
              :{" "}
              <a
                href="https://web3forms.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Web3Forms
              </a>
              {" · "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Firebase / Google
              </a>
              {" · "}
              <a
                href="https://cloudinary.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Cloudinary
              </a>
              {" · "}
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              {" · "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noreferrer"
              >
                Cloudflare
              </a>
              {" · "}
              <a
                href="https://unsplash.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Unsplash
              </a>
              .
            </p>
          </section>
          <section>
            <h2>Durées de conservation</h2>
            <p>
              Le club supprime les messages de contact une fois la demande
              traitée. Web3Forms indique toutefois conserver les soumissions
              pendant une durée maximale de trois ans, sauf suppression
              anticipée ou durée plus courte applicable à l’offre utilisée. Les
              contenus du club sont conservés pendant leur publication ; les
              données d’équipe sont remplacées ou supprimées lors des
              synchronisations. Lorsqu’un portrait est retiré du site, le
              fichier correspondant sur Cloudinary doit aussi être supprimé
              séparément. Les comptes webmaster sont conservés pendant la durée
              de leur habilitation.
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
              Le site n’intègre pas d’outil de mesure d’audience ni de
              publicité. L’espace webmaster utilise une authentification et un
              stockage technique nécessaires au maintien de la connexion. Les
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
              <a href={`mailto:${clubInformation.email}`}>
                {clubInformation.email}
              </a>{" "}
              ou
              par courrier au siège social indiqué dans les{" "}
              <Link to="/mentions-legales">mentions légales</Link>. Vous pouvez
              également adresser une réclamation à la{" "}
              <a
                href="https://www.cnil.fr/fr/plaintes"
                target="_blank"
                rel="noreferrer"
              >
                Commission nationale de l’informatique et des libertés (CNIL)
              </a>
              .
            </p>
          </section>
          <section>
            <h2>En savoir plus</h2>
            <p>
              <a
                href="https://www.cnil.fr/fr/les-droits-pour-maitriser-vos-donnees-personnelles"
                target="_blank"
                rel="noreferrer"
              >
                Vos droits sur les données personnelles — CNIL
              </a>
              {" · "}
              <a
                href="https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr"
                target="_blank"
                rel="noreferrer"
              >
                Règlement général sur la protection des données (RGPD)
              </a>
              {" · "}
              <a
                href="https://entreprendre.service-public.gouv.fr/vosdroits/F24270"
                target="_blank"
                rel="noreferrer"
              >
                Protection des données personnelles — Service-Public.fr
              </a>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function HorairesManager() {
  const {
    horaires: loadedHoraires,
    error: loadError,
    loading,
  } = useHorairesHebdomadaires();
  const [horaires, setHoraires] = useState<HorairesHebdomadaires>(
    defaultHorairesHebdomadaires,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (loadedHoraires) setHoraires(loadedHoraires);
  }, [loadedHoraires]);

  function updateHoraires<K extends keyof HorairesHebdomadaires>(
    key: K,
    value: HorairesHebdomadaires[K],
  ) {
    setHoraires((current) => ({ ...current, [key]: value }));
  }

  function updateSlot(
    group: "adultSlots" | "youthSlots",
    index: number,
    key: keyof HorairesSlot,
    value: string,
  ) {
    setHoraires((current) => ({
      ...current,
      [group]: current[group].map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [key]: value } : slot,
      ),
    }));
  }

  function addSlot(group: "adultSlots" | "youthSlots") {
    setHoraires((current) => ({
      ...current,
      [group]: [...current[group], { day: "", time: "", activity: "" }],
    }));
  }

  function removeSlot(group: "adultSlots" | "youthSlots", index: number) {
    setHoraires((current) => ({
      ...current,
      [group]: current[group].filter((_, slotIndex) => slotIndex !== index),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await setDoc(doc(db, "siteContent", "horaires"), {
        ...horaires,
        updatedAt: serverTimestamp(),
      });
      setNotice("Les horaires ont été enregistrés.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Firestore a refusé l’enregistrement. Publiez firestore.rules et vérifiez votre rôle webmaster."
          : "Impossible d’enregistrer les horaires. Vérifiez votre connexion et les règles Firestore.",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderSlots(group: "adultSlots" | "youthSlots", label: string) {
    return (
      <fieldset className="horaires-editor-group">
        <legend>{label}</legend>
        {horaires[group].map((slot, index) => (
          <div className="horaires-editor-row" key={`${group}-${index}`}>
            <label>
              Jour
              <input
                value={slot.day}
                onChange={(event) =>
                  updateSlot(group, index, "day", event.target.value)
                }
                maxLength={30}
                required
              />
            </label>
            <label>
              Horaires
              <input
                value={slot.time}
                onChange={(event) =>
                  updateSlot(group, index, "time", event.target.value)
                }
                maxLength={50}
                required
              />
            </label>
            <label>
              {group === "adultSlots" ? "Séance" : "Âge / séance"}
              <input
                value={slot.activity}
                onChange={(event) =>
                  updateSlot(group, index, "activity", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
            <button
              type="button"
              className="delete-action"
              aria-label={`Supprimer l’horaire ${slot.day || index + 1}`}
              onClick={() => removeSlot(group, index)}
            >
              Supprimer
            </button>
          </div>
        ))}
        <button
          className="button button-outline horaires-add-slot"
          type="button"
          onClick={() => addSlot(group)}
          disabled={horaires[group].length >= 30}
        >
          Ajouter un horaire <ArrowRight size={16} />
        </button>
      </fieldset>
    );
  }

  return (
    <section className="horaires-admin">
      <p className="board-order-help">
        Modifiez les lieux et les horaires ci-dessous. Les changements seront
        visibles sur la page publique après enregistrement.
      </p>
      {loadError && (
        <p className="form-error" role="alert">
          {loadError}
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
      {loading ? (
        <p className="admin-empty" role="status">
          Chargement des horaires…
        </p>
      ) : (
        <form className="admin-editor" onSubmit={save}>
          <h3>Horaires adultes</h3>
          <div className="form-row">
            <label>
              Titre du lieu
              <input
                value={horaires.adultVenue}
                onChange={(event) =>
                  updateHoraires("adultVenue", event.target.value)
                }
                maxLength={120}
                required
              />
            </label>
            <label>
              Adresse
              <input
                value={horaires.adultAddress}
                onChange={(event) =>
                  updateHoraires("adultAddress", event.target.value)
                }
                maxLength={200}
                required
              />
            </label>
          </div>
          {renderSlots("adultSlots", "Horaires adultes")}
          <h3>Horaires jeunes</h3>
          <div className="form-row">
            <label>
              Titre du lieu
              <input
                value={horaires.youthVenue}
                onChange={(event) =>
                  updateHoraires("youthVenue", event.target.value)
                }
                maxLength={120}
                required
              />
            </label>
            <label>
              Adresse et informations
              <input
                value={horaires.youthAddress}
                onChange={(event) =>
                  updateHoraires("youthAddress", event.target.value)
                }
                maxLength={200}
                required
              />
            </label>
          </div>
          {renderSlots("youthSlots", "Horaires jeunes")}
          <label>
            Note sous les horaires jeunes (facultatif)
            <input
              value={horaires.youthNote}
              onChange={(event) =>
                updateHoraires("youthNote", event.target.value)
              }
              maxLength={300}
            />
          </label>
          <button
            className="button button-copper"
            type="submit"
            disabled={saving || loading || Boolean(loadError)}
          >
            {saving ? "Enregistrement…" : "Enregistrer les horaires"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function ClubInformationManager() {
  const { clubInformation, clubError, loading } = useSiteContent();
  const [draft, setDraft] = useState(clubInformation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading) setDraft(clubInformation);
  }, [clubInformation, loading]);

  function updateField<K extends keyof ClubInformation>(
    key: K,
    value: ClubInformation[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    for (const [label, value] of [
      ["Facebook", draft.facebookUrl],
      ["Instagram", draft.instagramUrl],
    ]) {
      if (!value) continue;
      try {
        if (new URL(value).protocol !== "https:") throw new Error();
      } catch {
        setError(`L’adresse ${label} doit être une URL HTTPS valide.`);
        return;
      }
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await setDoc(doc(db, "siteContent", "clubInformation"), {
        ...draft,
        updatedAt: serverTimestamp(),
      });
      setNotice("Les informations du club ont été enregistrées.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Enregistrement refusé. Vérifiez les règles Firestore et votre rôle webmaster."
          : "Impossible d’enregistrer les informations du club.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="site-settings-admin">
      <p className="board-order-help">
        Ces coordonnées sont partagées entre le pied de page, la page Contact
        et les pages légales. Les gymnases et leurs adresses se modifient dans
        l’onglet « Horaires ».
      </p>
      {clubError && (
        <p className="form-error" role="alert">
          {clubError}
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
      {loading ? (
        <p className="admin-empty" role="status">
          Chargement des informations du club…
        </p>
      ) : (
        <form className="admin-editor" onSubmit={save}>
          <h3>Coordonnées publiques</h3>
          <label>
            Adresse e-mail du club
            <input
              type="email"
              value={draft.email}
              onChange={(event) => updateField("email", event.target.value)}
              maxLength={254}
              required
            />
          </label>
          <label>
            Adresse du siège social (sans ville ni département)
            <input
              value={draft.postalAddress}
              onChange={(event) =>
                updateField("postalAddress", event.target.value)
              }
              maxLength={200}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Ville
              <input
                value={draft.city}
                onChange={(event) => updateField("city", event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label>
              Département
              <input
                value={draft.department}
                onChange={(event) =>
                  updateField("department", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
          </div>
          <h3>Réseaux sociaux</h3>
          <label>
            Page Facebook (facultatif)
            <input
              type="url"
              value={draft.facebookUrl}
              onChange={(event) =>
                updateField("facebookUrl", event.target.value)
              }
              maxLength={2000}
              placeholder="https://…"
            />
          </label>
          <label>
            Profil Instagram (facultatif)
            <input
              type="url"
              value={draft.instagramUrl}
              onChange={(event) =>
                updateField("instagramUrl", event.target.value)
              }
              maxLength={2000}
              placeholder="https://…"
            />
          </label>
          <button className="button button-copper" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les informations"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function HomePageManager() {
  const { homePageContent, homePageError, loading } = useSiteContent();
  const [draft, setDraft] = useState(homePageContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading) setDraft(homePageContent);
  }, [homePageContent, loading]);

  function updateField<K extends keyof HomePageContent>(
    key: K,
    value: HomePageContent[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const valueFields = [
    ["value1Title", "value1Description", "Première valeur"],
    ["value2Title", "value2Description", "Deuxième valeur"],
    ["value3Title", "value3Description", "Troisième valeur"],
  ] as const;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) {
      setError("Firebase Firestore n’est pas configuré.");
      return;
    }
    const imageUrls = [...draft.heroImages, draft.storyImage];
    if (
      imageUrls.some((imageUrl) => {
        try {
          return new URL(imageUrl).protocol !== "https:";
        } catch {
          return true;
        }
      })
    ) {
      setError("Les photos doivent utiliser des adresses HTTPS valides.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await setDoc(doc(db, "siteContent", "homePage"), {
        ...draft,
        updatedAt: serverTimestamp(),
      });
      setNotice("Le contenu de la page d’accueil a été enregistré.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Enregistrement refusé. Vérifiez les règles Firestore et votre rôle webmaster."
          : "Impossible d’enregistrer le contenu de l’accueil.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="site-settings-admin">
      <p className="board-order-help">
        Modifiez les textes et les liens des photos de la page d’accueil. Les
        photos doivent être accessibles publiquement en HTTPS ; vérifiez que le
        club dispose des droits nécessaires avant publication.
      </p>
      {homePageError && (
        <p className="form-error" role="alert">
          {homePageError}
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
      {loading ? (
        <p className="admin-empty" role="status">
          Chargement du contenu de l’accueil…
        </p>
      ) : (
        <form className="admin-editor" onSubmit={save}>
          <h3>Photos du carrousel</h3>
          {draft.heroImages.map((image, index) => (
            <label key={`hero-image-${index}`}>
              Adresse HTTPS de la photo {index + 1}
              <input
                type="url"
                value={image}
                onChange={(event) =>
                  updateField(
                    "heroImages",
                    draft.heroImages.map((currentImage, imageIndex) =>
                      imageIndex === index ? event.target.value : currentImage,
                    ),
                  )
                }
                maxLength={2000}
                required
              />
              <img
                className="site-content-image-preview"
                src={image}
                alt={`Aperçu de la photo ${index + 1} du carrousel`}
                loading="lazy"
              />
            </label>
          ))}
          <h3>Accroche</h3>
          <label>
            Ligne de présentation au-dessus du titre
            <input
              value={draft.heroEyebrow}
              onChange={(event) =>
                updateField("heroEyebrow", event.target.value)
              }
              maxLength={120}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Mot mis en évidence dans le titre
              <input
                value={draft.heroTitleAccent}
                onChange={(event) =>
                  updateField("heroTitleAccent", event.target.value)
                }
                maxLength={80}
                required
              />
            </label>
            <label>
              Suite du titre
              <input
                value={draft.heroTitle}
                onChange={(event) => updateField("heroTitle", event.target.value)}
                maxLength={100}
                required
              />
            </label>
          </div>
          <label>
            Première phrase (entourez un passage avec &lt;em&gt; et &lt;/em&gt;
            pour le mettre en évidence)
            <input
              value={draft.heroPitch}
              onChange={(event) => updateField("heroPitch", event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            Deuxième phrase (entourez un passage avec &lt;em&gt; et &lt;/em&gt;
            pour le mettre en évidence)
            <input
              value={draft.heroLine}
              onChange={(event) => updateField("heroLine", event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            Phrase finale mise en évidence
            <input
              value={draft.heroSlogan}
              onChange={(event) => updateField("heroSlogan", event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <h3>Présentation du club</h3>
          <label>
            Titre de la section d’introduction
            <input
              value={draft.introEyebrow}
              onChange={(event) =>
                updateField("introEyebrow", event.target.value)
              }
              maxLength={100}
              required
            />
          </label>
          <label>
            Texte d’introduction
            <textarea
              value={draft.introText}
              onChange={(event) => updateField("introText", event.target.value)}
              maxLength={1000}
              rows={3}
              required
            />
          </label>
          <label>
            Titre de la présentation
            <input
              value={draft.storyEyebrow}
              onChange={(event) =>
                updateField("storyEyebrow", event.target.value)
              }
              maxLength={100}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Première partie du titre
              <input
                value={draft.storyTitle}
                onChange={(event) =>
                  updateField("storyTitle", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
            <label>
              Deuxième partie du titre
              <input
                value={draft.storyAccent}
                onChange={(event) =>
                  updateField("storyAccent", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
          </div>
          <label>
            Premier paragraphe
            <textarea
              value={draft.storyParagraph1}
              onChange={(event) =>
                updateField("storyParagraph1", event.target.value)
              }
              maxLength={1500}
              rows={4}
              required
            />
          </label>
          <label>
            Second paragraphe
            <textarea
              value={draft.storyParagraph2}
              onChange={(event) =>
                updateField("storyParagraph2", event.target.value)
              }
              maxLength={1500}
              rows={4}
              required
            />
          </label>
          <label>
            Adresse HTTPS de la photo de présentation
            <input
              type="url"
              value={draft.storyImage}
              onChange={(event) =>
                updateField("storyImage", event.target.value)
              }
              maxLength={2000}
              required
            />
            <img
              className="site-content-image-preview"
              src={draft.storyImage}
              alt="Aperçu de la photo de présentation"
              loading="lazy"
            />
          </label>
          <label>
            Description de la photo (accessibilité)
            <input
              value={draft.storyImageAlt}
              onChange={(event) =>
                updateField("storyImageAlt", event.target.value)
              }
              maxLength={250}
              required
            />
          </label>
          <label>
            Légende de la photo
            <input
              value={draft.storyCaption}
              onChange={(event) =>
                updateField("storyCaption", event.target.value)
              }
              maxLength={120}
              required
            />
          </label>
          <h3>Valeurs du club</h3>
          <label>
            Petit titre de section
            <input
              value={draft.valuesEyebrow}
              onChange={(event) =>
                updateField("valuesEyebrow", event.target.value)
              }
              maxLength={100}
              required
            />
          </label>
          <div className="form-row">
            <label>
              Première partie du titre
              <input
                value={draft.valuesTitle}
                onChange={(event) =>
                  updateField("valuesTitle", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
            <label>
              Deuxième partie du titre
              <input
                value={draft.valuesAccent}
                onChange={(event) =>
                  updateField("valuesAccent", event.target.value)
                }
                maxLength={100}
                required
              />
            </label>
          </div>
          {valueFields.map(([titleKey, descriptionKey, label]) => (
            <fieldset className="horaires-editor-group" key={titleKey}>
              <legend>{label}</legend>
              <label>
                Titre
                <input
                  value={draft[titleKey]}
                  onChange={(event) =>
                    updateField(titleKey, event.target.value)
                  }
                  maxLength={80}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={draft[descriptionKey]}
                  onChange={(event) =>
                    updateField(descriptionKey, event.target.value)
                  }
                  maxLength={300}
                  rows={2}
                  required
                />
              </label>
            </fieldset>
          ))}
          <button className="button button-copper" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la page d’accueil"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </section>
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
  const [articlePhotoFile, setArticlePhotoFile] = useState<File | null>(null);
  const [articleCropSource, setArticleCropSource] = useState<File | null>(null);
  const [articlePhotoPreview, setArticlePhotoPreview] = useState("");
  const [removeArticleImage, setRemoveArticleImage] = useState(false);
  const articlePhotoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!articlePhotoFile) {
      setArticlePhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(articlePhotoFile);
    setArticlePhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [articlePhotoFile]);

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
    if (articleCropSource) {
      setError("Validez ou annulez le recadrage avant d’enregistrer.");
      return;
    }
    setError("");
    setNotice("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const article = {
      title: String(form.get("title")),
      date: String(form.get("date")),
      author: String(form.get("author")),
      excerpt: String(form.get("excerpt")),
      image: articlePhotoFile
        ? ""
        : removeArticleImage
          ? ""
          : (editing?.image ?? ""),
      content: String(form.get("content")),
    };
    try {
      if (articlePhotoFile)
        article.image = await uploadClubImage(articlePhotoFile);
      if (editing)
        await updateDoc(doc(db, "articles", editing.id), {
          ...article,
          category: deleteField(),
        });
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
      setArticlePhotoFile(null);
      setArticleCropSource(null);
      setRemoveArticleImage(false);
      if (articlePhotoInputRef.current) articlePhotoInputRef.current.value = "";
      setNotice("Article enregistré.");
    } catch (saveError) {
      setError(
        isFirestorePermissionDenied(saveError)
          ? "Enregistrement refusé. Vérifiez les droits de votre compte webmaster."
          : saveError instanceof Error
            ? saveError.message
            : "Impossible d’enregistrer l’article.",
      );
    } finally {
      setSaving(false);
    }
  }
  function chooseArticlePhoto(file: File | undefined) {
    setError("");
    if (!file) {
      setArticleCropSource(null);
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
    setRemoveArticleImage(false);
    setArticleCropSource(file);
  }
  function clearArticlePhoto() {
    setArticlePhotoFile(null);
    setArticleCropSource(null);
    setRemoveArticleImage(true);
    if (articlePhotoInputRef.current) articlePhotoInputRef.current.value = "";
  }
  function resetArticlePhoto() {
    setArticlePhotoFile(null);
    setArticleCropSource(null);
    setRemoveArticleImage(false);
    if (articlePhotoInputRef.current) articlePhotoInputRef.current.value = "";
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
        ? ["homepage", "articles", "events", "horaires", "teams", "board", "club"]
        : ["articles", "events", "horaires", "board"];
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
    if (
      role !== "admin" &&
      ["teams", "club", "homepage"].includes(activeTab)
    )
      setActiveTab("articles");
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
                {role === "admin" && (
                  <button
                    id="webmaster-tab-homepage"
                    className="webmaster-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "homepage"}
                    aria-controls="webmaster-homepage-panel"
                    tabIndex={activeTab === "homepage" ? 0 : -1}
                    onClick={() => setActiveTab("homepage")}
                  >
                    Page d’accueil
                  </button>
                )}
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
                <button
                  id="webmaster-tab-horaires"
                  className="webmaster-tab"
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "horaires"}
                  aria-controls="webmaster-horaires-panel"
                  tabIndex={activeTab === "horaires" ? 0 : -1}
                  onClick={() => setActiveTab("horaires")}
                >
                  Horaires
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
                  Bureau
                </button>
                {role === "admin" && (
                  <button
                    id="webmaster-tab-club"
                    className="webmaster-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "club"}
                    aria-controls="webmaster-club-panel"
                    tabIndex={activeTab === "club" ? 0 : -1}
                    onClick={() => setActiveTab("club")}
                  >
                    Informations du club
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
                            <span>{item.date}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              resetArticlePhoto();
                              scrollToPageTop();
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
                    <label>
                      Titre
                      <input
                        name="title"
                        defaultValue={editing?.title}
                        required
                      />
                    </label>
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
                      Photo (facultative · JPG, PNG ou WebP, 5 Mo maximum)
                      <input
                        ref={articlePhotoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          chooseArticlePhoto(event.currentTarget.files?.[0])
                        }
                      />
                    </label>
                    {(!cloudinaryCloudName || !cloudinaryUploadPreset) && (
                      <p className="board-upload-notice" role="status">
                        Le téléversement de photos est désactivé faute de
                        configuration Cloudinary ; vous pouvez publier une
                        actualité sans photo.
                      </p>
                    )}
                    {articleCropSource && (
                      <ImageCropper
                        file={articleCropSource}
                        onCancel={() => {
                          setArticleCropSource(null);
                          if (articlePhotoInputRef.current)
                            articlePhotoInputRef.current.value = "";
                        }}
                        onComplete={(file) => {
                          setArticlePhotoFile(file);
                          setArticleCropSource(null);
                        }}
                      />
                    )}
                    <img
                      className={`article-photo-preview${!removeArticleImage && (articlePhotoPreview || editing?.image) ? "" : " board-photo-placeholder"}`}
                      src={
                        (removeArticleImage ? "" : articlePhotoPreview) ||
                        (removeArticleImage ? "" : editing?.image) ||
                        `${import.meta.env.BASE_URL}logo.png`
                      }
                      alt={
                        !removeArticleImage &&
                        (articlePhotoPreview || editing?.image)
                          ? "Aperçu de la photo de l’actualité"
                          : "Logo Cognac Badminton utilisé sans photo"
                      }
                    />
                    {(articlePhotoFile ||
                      articleCropSource ||
                      editing?.image) && (
                      <div className="photo-form-actions photo-form-actions-single">
                        <button
                          className="button button-outline photo-remove-button"
                          type="button"
                          onClick={clearArticlePhoto}
                          disabled={saving}
                        >
                          Supprimer la photo
                        </button>
                      </div>
                    )}
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
                      disabled={
                        saving ||
                        loadingItems ||
                        Boolean(articleCropSource) ||
                        (Boolean(articlePhotoFile) &&
                          (!cloudinaryCloudName || !cloudinaryUploadPreset))
                      }
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
                        onClick={() => {
                          setEditing(null);
                          resetArticlePhoto();
                          setError("");
                        }}
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
              ) : activeTab === "horaires" ? (
                <section
                  id="webmaster-horaires-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-horaires"
                  className="webmaster-panel"
                >
                  <HorairesManager />
                </section>
              ) : activeTab === "club" ? (
                <section
                  id="webmaster-club-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-club"
                  className="webmaster-panel"
                >
                  <ClubInformationManager />
                </section>
              ) : activeTab === "homepage" ? (
                <section
                  id="webmaster-homepage-panel"
                  role="tabpanel"
                  aria-labelledby="webmaster-tab-homepage"
                  className="webmaster-panel"
                >
                  <HomePageManager />
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

function NotFound() {
  const navigate = useNavigate();
  const [redirectEnabled, setRedirectEnabled] = useState(true);

  useEffect(() => {
    if (!redirectEnabled) return;
    const timeout = window.setTimeout(
      () => navigate("/", { replace: true }),
      5000,
    );
    return () => window.clearTimeout(timeout);
  }, [navigate, redirectEnabled]);

  return (
    <section className="not-found">
      <h1>Cette page n’existe pas.</h1>
      <div className="not-found-redirect" role="status" aria-live="polite">
        {redirectEnabled && (
          <span className="not-found-loader" aria-hidden="true" />
        )}
        <p>
          {redirectEnabled
            ? "Redirection vers l’accueil dans 5 secondes…"
            : "Vous restez sur cette page."}
        </p>
      </div>
      {redirectEnabled && (
        <button
          className="button button-outline not-found-cancel"
          type="button"
          onClick={() => setRedirectEnabled(false)}
        >
          Désactiver la redirection automatique
        </button>
      )}
      <Link className="text-link" to="/">
        Retourner à l’accueil maintenant <ArrowRight />
      </Link>
    </section>
  );
}

export default function App() {
  return (
    <SiteContentProvider>
      <PageFrame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bureau" element={<Club />} />
          <Route path="/club" element={<Navigate to="/bureau" replace />} />
          <Route path="/horaires" element={<HorairesPage />} />
          <Route
            path="/creneaux"
            element={<Navigate to="/horaires" replace />}
          />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageFrame>
    </SiteContentProvider>
  );
}
