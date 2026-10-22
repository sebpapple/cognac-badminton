const SOURCE_ORIGIN = "https://icbad.ffbad.org";
const CLUB_INSTANCE_URL = `${SOURCE_ORIGIN}/instance/CB16`;
const CLUB_TEAM_CODE = "16-CB";

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textContent(html) {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
    (match) => match[1],
  );
}

function extractTable(html, predicate) {
  const tables = [...html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)];
  const table = tables.find((match) => predicate(match[1], match[2]));
  if (!table) throw new Error("Le tableau attendu est introuvable sur ICBaD.");
  return table[2];
}

export function parseTeamRoster(html) {
  const table = extractTable(html, (attributes) =>
    /\buk-table-striped\b/.test(attributes),
  );
  const players = [];
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const nameMatch = row[1].match(
      /<a\b[^>]*href=["'][^"']*\/joueur\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!nameMatch) continue;
    const genderIcon = row[1].match(
      /<i\b[^>]*class=["'][^"']*\bfa-(female|male)\b[^"']*["']/i,
    );
    const role = [
      ...row[1].matchAll(
        /class=["'][^"']*ic-match-clsmt[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      ),
    ]
      .map((match) => textContent(match[1]))
      .filter(Boolean)
      .join(" · ");
    players.push({
      name: textContent(nameMatch[1]),
      role,
      gender: genderIcon?.[1]?.toLowerCase() ?? "unknown",
    });
  }
  if (players.length === 0)
    throw new Error("La fiche ICBaD ne contient aucun joueur exploitable.");
  return players;
}

export function findDivisionLinks(instanceHtml) {
  const sections = [
    ...instanceHtml.matchAll(
      /<h2\b[^>]*id=["']tableau\d+["'][^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b[^>]*id=["']tableau\d+["']|$)/gi,
    ),
  ];
  const found = [];
  for (const section of sections) {
    const sectionTitle = textContent(section[1]);
    const standingsTable = [
      ...section[2].matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi),
    ].find((table) => /\bclassement-poule\b/i.test(table[1]))?.[2];
    if (!standingsTable) continue;
    const clubTeamRows = [
      ...standingsTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi),
    ].filter((row) =>
      new RegExp(`\\b${CLUB_TEAM_CODE}-\\d+\\b`, "i").test(textContent(row[1])),
    );
    if (clubTeamRows.length === 0) continue;

    const competitionUrl = section[2].match(
      /href=["'](https:\/\/icbad\.ffbad\.org\/competition\/\d+\/tableau\/\d+)["']/i,
    )?.[1];
    if (!competitionUrl)
      throw new Error(`Le calendrier de « ${sectionTitle} » est introuvable.`);

    for (const row of clubTeamRows) {
      const teamLink = row[1].match(
        /<a\b[^>]*href=["'](https:\/\/icbad\.ffbad\.org\/equipe\/(\d+))["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!teamLink)
        throw new Error(
          `La fiche d’équipe est introuvable dans « ${sectionTitle} ».`,
        );
      const code = textContent(teamLink[3]).match(
        new RegExp(`\\b${CLUB_TEAM_CODE}-(\\d+)\\b`, "i"),
      )?.[0];
      const teamNumber = code?.match(/-(\d+)$/)?.[1];
      const divisionMatch = sectionTitle.match(
        /\b(N(?:ational(?:e|es)?)?|R(?:égional(?:e|es)?)?|D(?:épartemental(?:e|es))?)\s*(\d+)\b/i,
      );
      const divisionType = divisionMatch?.[1][0].toUpperCase() ?? null;
      const divisionCode = divisionMatch?.[2];
      if (!code || !teamNumber)
        throw new Error(
          `Le code FFBaD de l’équipe dans « ${sectionTitle} » est illisible.`,
        );
      if (!divisionType || !divisionCode)
        throw new Error(`La division FFBaD de l’équipe ${code} est illisible.`);
      const shortName = `${divisionType}${divisionCode}`;
      const divisionName =
        divisionType === "N"
          ? `Nationale ${divisionCode}`
          : divisionType === "R"
            ? `Régionale ${divisionCode}`
            : `Départementale ${divisionCode}`;
      found.push({
        id: teamLink[2],
        teamCode: code,
        baseName: divisionName,
        baseShortName: shortName,
        teamNumber,
        teamUrl: teamLink[1],
        competitionUrl,
        standings: parseStandings(standingsTable),
      });
    }
  }
  if (found.length === 0)
    throw new Error(
      "Aucune équipe Cognac Badminton n’a été trouvée sur ICBaD.",
    );
  const shortNameCounts = new Map();
  for (const team of found)
    shortNameCounts.set(
      team.baseShortName,
      (shortNameCounts.get(team.baseShortName) ?? 0) + 1,
    );
  const uniqueTeamIds = new Set();
  return found.map((team) => {
    if (uniqueTeamIds.has(team.id))
      throw new Error(
        `La fiche FFBaD ${team.teamUrl} est listée plusieurs fois.`,
      );
    uniqueTeamIds.add(team.id);
    const multipleInDivision = shortNameCounts.get(team.baseShortName) > 1;
    const suffix = multipleInDivision ? ` · Équipe ${team.teamNumber}` : "";
    return {
      ...team,
      name: `${team.baseName}${suffix}`,
      shortName: `${team.baseShortName}${suffix}`,
    };
  });
}

function parseStandings(table) {
  const rows = [];
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const teamMatch = row[1].match(
      /<td\b[^>]*class=["'][^"']*nom-equipe[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
    );
    if (!teamMatch) continue;
    const cells = extractCells(row[1]).map(textContent);
    if (cells.length < 11)
      throw new Error(
        "Le classement ICBaD ne présente pas les colonnes attendues.",
      );
    rows.push({
      position: cells[0],
      team: textContent(teamMatch[1]),
      played: cells[3],
      won: cells[4],
      drawn: cells[5],
      lost: cells[6],
      points: cells[10],
    });
  }
  if (rows.length === 0)
    throw new Error(
      "Le classement ICBaD ne contient aucune équipe exploitable.",
    );
  return rows;
}

function seasonStartYear(now = new Date()) {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function parseMatchDate(value, startYear) {
  const match = value.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3] ?? (month < 7 ? startYear + 1 : startYear));
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseCompetition(html, clubCode, standings, now = new Date()) {
  const matchesHeading = html
    .match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)
    ?.find((heading) => /Toutes les rencontres/i.test(textContent(heading)));
  if (!matchesHeading)
    throw new Error(
      "Le calendrier des rencontres est absent de la page ICBaD.",
    );
  const headingIndex = html.indexOf(matchesHeading);
  const scheduleHtml = html.slice(headingIndex);
  const matches = [];
  for (const row of scheduleHtml.matchAll(
    /<tr\b[^>]*class=["'][^"']*uk-visible@m clickable-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi,
  )) {
    const cells = extractCells(row[1]);
    if (cells.length < 5) continue;
    const homeTeam = textContent(cells[2]);
    const awayTeam = textContent(cells[4]);
    const clubIsHome = homeTeam.includes(clubCode);
    const clubIsAway = awayTeam.includes(clubCode);
    if (!clubIsHome && !clubIsAway) continue;
    const date = parseMatchDate(textContent(cells[0]), seasonStartYear(now));
    if (!date) throw new Error("Une date de rencontre ICBaD est illisible.");
    const listedScore = textContent(cells[3]);
    matches.push({
      date,
      opponent: clubIsHome ? awayTeam : homeTeam,
      location: textContent(cells[1]),
      home: clubIsHome,
      score:
        date > now.toISOString().slice(0, 10)
          ? "À venir"
          : listedScore || "À venir",
    });
  }
  return { standings, matches };
}

async function fetchHtml(url) {
  const parsed = new URL(url);
  if (
    parsed.origin !== SOURCE_ORIGIN ||
    !/^\/(instance|equipe|competition)\//.test(parsed.pathname)
  )
    throw new Error("URL de source ICBaD non autorisée.");
  const response = await fetch(parsed, {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(`ICBaD répond avec le statut ${response.status}.`);
  if (response.url && new URL(response.url).origin !== SOURCE_ORIGIN)
    throw new Error("ICBaD a redirigé vers une origine non autorisée.");
  const html = await response.text();
  if (!html.includes("<html") || html.length > 5_000_000)
    throw new Error("La réponse ICBaD n’est pas une page HTML valide.");
  return html;
}

async function requireAdmin(request, env) {
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error("Connectez-vous avec un compte administrateur.");
  const payloadPart = token.split(".")[1];
  if (!payloadPart) throw new Error("Le jeton Firebase est invalide.");
  let claims;
  try {
    claims = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    );
  } catch {
    throw new Error("Le jeton Firebase est invalide.");
  }
  const uid = claims.user_id ?? claims.sub;
  if (
    !uid ||
    claims.aud !== env.FIREBASE_PROJECT_ID ||
    claims.iss !==
      `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` ||
    typeof claims.exp !== "number" ||
    claims.exp * 1000 <= Date.now()
  )
    throw new Error("La session Firebase a expiré ou n’est pas valide.");

  const roleResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/userRoles/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (roleResponse.status === 404 && claims.admin === true) return;
  if (!roleResponse.ok)
    throw new Error(
      "Impossible de vérifier le rôle administrateur dans Firebase.",
    );
  const roleDocument = await roleResponse.json();
  if (roleDocument.fields?.role?.stringValue !== "admin")
    throw new Error("L’actualisation est réservée aux administrateurs.");
}

function base64UrlEncode(value) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createServiceAccountToken(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON)
    throw new Error("Le secret du compte de service Firebase est manquant.");
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("Le secret du compte de service Firebase est invalide.");
  }
  if (
    serviceAccount.project_id !== env.FIREBASE_PROJECT_ID ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  )
    throw new Error(
      "Le compte de service ne correspond pas au projet Firebase.",
    );

  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64UrlEncode(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join(".");
  const privateKey = serviceAccount.private_key.replace(
    /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
    "",
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(privateKey), (character) => character.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok)
    throw new Error(
      `Google OAuth a refusé le compte de service (${response.status}).`,
    );
  const tokenResponse = await response.json();
  if (typeof tokenResponse.access_token !== "string")
    throw new Error("Google OAuth n’a pas fourni de jeton d’accès.");
  return tokenResponse.access_token;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: "NULL_VALUE" };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object")
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, field]) => [
            key,
            toFirestoreValue(field),
          ]),
        ),
      },
    };
  throw new Error("Type de donnée non pris en charge pour Firestore.");
}

async function writeTeamsToFirestore(env, teams) {
  const token = await createServiceAccountToken(env);
  const teamIds = Object.keys(teams);
  if (teamIds.length === 0 || teamIds.length > 100)
    throw new Error(
      "La liste récupérée ne contient pas un nombre d’équipes valide.",
    );
  for (const [id, team] of Object.entries(teams)) {
    if (
      !/^\d+$/.test(id) ||
      !team ||
      !team.name ||
      !team.shortName ||
      !Array.isArray(team.players) ||
      team.players.length === 0 ||
      !Array.isArray(team.matches) ||
      !Array.isArray(team.standings) ||
      !/^https:\/\/icbad\.ffbad\.org\/equipe\/\d+$/.test(team.sourceUrl) ||
      team.sourceUrl.split("/").pop() !== id
    )
      throw new Error(
        `Les données FFBaD de l’équipe ${id} ne sont pas valides.`,
      );
  }
  const existingIds = await listTeamDocumentIds(env.FIREBASE_PROJECT_ID, token);
  const writes = Object.entries(teams).map(([id, team]) => ({
    update: {
      name: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/teams/${id}`,
      fields: Object.fromEntries(
        Object.entries({
          ...team,
          updatedAt: new Date(),
        }).map(([key, value]) => [key, toFirestoreValue(value)]),
      ),
    },
  }));
  for (const id of existingIds) {
    if (!Object.hasOwn(teams, id))
      writes.push({
        delete: `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/teams/${id}`,
      });
  }
  if (writes.length > 500)
    throw new Error(
      "La synchronisation dépasse la limite atomique de Firestore.",
    );
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Firestore a refusé la synchronisation (${response.status}).`,
    );
}

async function listTeamDocumentIds(projectId, token) {
  const ids = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/teams`,
    );
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok)
      throw new Error(
        `Firestore n’a pas pu lire la liste des équipes (${response.status}).`,
      );
    const result = await response.json();
    for (const document of result.documents ?? [])
      ids.push(document.name.split("/").pop());
    pageToken = result.nextPageToken ?? "";
  } while (pageToken);
  return ids;
}

async function collectTeamData() {
  const instanceHtml = await fetchHtml(CLUB_INSTANCE_URL);
  const teams = findDivisionLinks(instanceHtml);
  const results = await Promise.all(
    teams.map(async (team) => {
      const [teamHtml, competitionHtml] = await Promise.all([
        fetchHtml(team.teamUrl),
        fetchHtml(team.competitionUrl),
      ]);
      return [
        team.id,
        {
          name: team.name,
          shortName: team.shortName,
          players: parseTeamRoster(teamHtml),
          ...parseCompetition(competitionHtml, team.teamCode, team.standings),
          sourceUrl: team.teamUrl,
          season: textContent(
            instanceHtml.match(/<a[^>]*>\s*\d{4}\/\d{4}\s*<\/a>/i)?.[0] ?? "",
          ),
        },
      ];
    }),
  );
  return Object.fromEntries(results);
}

async function scheduledSync(env) {
  try {
    const teams = await collectTeamData();
    await writeTeamsToFirestore(env, teams);
    console.log("Synchronisation quotidienne des équipes terminée.");
  } catch (error) {
    console.error(
      "Échec de la synchronisation quotidienne des équipes:",
      error instanceof Error ? error.message : "Erreur inconnue.",
    );
    throw error;
  }
}

function corsHeaders(origin, env) {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export default {
  scheduled(controller, env, context) {
    console.log({
      event: "Daily team sync",
      cron: controller.cron,
      scheduledAt: new Date(controller.scheduledTime).toISOString(),
    });
    context.waitUntil(scheduledSync(env));
  },
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: Object.keys(cors).length ? 204 : 403,
        headers: cors,
      });
    if (request.method !== "POST")
      return jsonResponse({ error: "Méthode non autorisée." }, 405, cors);
    if (!Object.keys(cors).length)
      return jsonResponse({ error: "Origine non autorisée." }, 403, {});
    if (!env.FIREBASE_PROJECT_ID)
      return jsonResponse(
        { error: "Configuration Firebase manquante." },
        500,
        cors,
      );

    try {
      await requireAdmin(request, env);
      return jsonResponse({ teams: await collectTeamData() }, 200, cors);
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "La synchronisation des équipes a échoué.",
        },
        502,
        cors,
      );
    }
  },
};
