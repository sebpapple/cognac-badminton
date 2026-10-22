import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [action, email] = process.argv.slice(2);

if (!["grant", "revoke"].includes(action) || !email) {
  console.error("Usage: npm run webmaster:claim -- <grant|revoke> <email>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("FIREBASE_PROJECT_ID est absent de .env.local.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });

try {
  const user = await getAuth().getUserByEmail(email);
  const claims = { ...user.customClaims };

  if (action === "grant") claims.admin = true;
  else delete claims.admin;

  await getAuth().setCustomUserClaims(user.uid, claims);
  console.log(
    `Claim admin ${action === "grant" ? "attribué à" : "retiré de"} ${email}.`,
  );
  console.log(
    "Déconnectez puis reconnectez ce compte pour actualiser son jeton.",
  );
} catch (error) {
  console.error(`Impossible de modifier le rôle de ${email}: ${error.message}`);
  process.exitCode = 1;
}
