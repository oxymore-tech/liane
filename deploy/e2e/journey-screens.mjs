// Parcours « mise en service » : tronçons communs sur la carte, recherche publique, modification d'une
// liane, profil et suppression de compte. Lancé par run.sh après seed-lianes.mjs.
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "/captures";
const problems = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });
async function newPage(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR" });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`[${label}] console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`[${label}] requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`[${label}] http ${r.status()} ${r.request().method()} ${r.url()}`); });
  return page;
}
const shot = async (page, name) => { await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/screens-${name}.png` }); log("capture", name); };
const fullShot = async (page, name) => { await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/screens-${name}.png`, fullPage: true }); log("capture", name); };
async function smsCode(phone) {
  rmSync("/work/code.txt", { force: true });
  writeFileSync("/work/need-code.txt", phone);
  for (let i = 0; i < 60; i++) { if (existsSync("/work/code.txt")) return readFileSync("/work/code.txt", "utf8").trim(); await new Promise((r) => setTimeout(r, 500)); }
  throw new Error("pas de code");
}
async function login(page, phone, code) {
  await page.getByLabel("Votre numéro de téléphone").fill(phone);
  await page.getByRole("button", { name: "Recevoir un code par SMS" }).click();
  await page.getByLabel("Code reçu par SMS").waitFor();
  await page.getByLabel("Code reçu par SMS").fill(code ?? (await smsCode(phone)));
  await page.getByRole("button", { name: "Se connecter" }).click();
}

// 1. carte : un seul trait là où deux lianes partagent la route
const visitor = await newPage("visiteur");
await visitor.goto(BASE + "/");
await visitor.getByText(/lianes – touchez/).waitFor();
await visitor.waitForTimeout(3500);
await shot(visitor, "01-carte-troncons-communs");

// 2. toucher le tronçon commun : la liste des lianes qui y passent
const box = await visitor.locator(".maplibregl-canvas").boundingBox();
const choice = visitor.getByLabel("Lianes qui passent ici");
let touched = null;
// Le tronçon Florac – Balsièges descend vers le sud-est au centre de la carte. Les touchers sont espacés :
// deux touchers rapprochés seraient pris pour un double toucher, qui zoome.
outer: for (let fy = 0.56; fy <= 0.7; fy += 0.02) for (let fx = 0.36; fx <= 0.52; fx += 0.03) {
  await visitor.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
  await visitor.waitForTimeout(900);
  if (await choice.count()) { touched = [fx, fy]; break outer; }
}
if (!touched) problems.push("aucun toucher n'a proposé de choisir entre plusieurs lianes");
else {
  log(`tronçon commun touché en ${touched[0].toFixed(2)},${touched[1].toFixed(2)} :`, (await choice.innerText()).replace(/\n+/g, " | "));
  await shot(visitor, "02-choix-entre-lianes");
  await choice.getByRole("button", { name: /Florac – Marvejols/ }).click();
  await visitor.getByLabel("Fiche de la liane").getByRole("heading", { name: "Florac – Marvejols" }).waitFor();
  await shot(visitor, "03-liane-choisie");
  await visitor.getByRole("button", { name: "Fermer" }).click();
}
if (process.env.ONLY === "carte") { await browser.close(); log("PROBLEMES:", problems.length, problems); process.exit(0); }

// 3. recherche publique
await visitor.getByRole("link", { name: "Rechercher" }).click();
await visitor.getByLabel("D'où partez-vous ?").fill("Ispa");
await visitor.getByRole("option", { name: /Mairie d'Ispagnac/ }).waitFor();
await shot(visitor, "04-recherche-saisie");
await visitor.getByRole("option", { name: /Mairie d'Ispagnac/ }).click();
await visitor.getByLabel("Où allez-vous ?").fill("Mende");
await visitor.getByRole("option", { name: /Mairie de Mende/ }).click();
await visitor.getByRole("heading", { name: "Florac – Mende" }).waitFor();
log("recherche Ispagnac → Mende :", (await visitor.locator("main").innerText()).replace(/\n+/g, " | ").slice(0, 600));
await fullShot(visitor, "05-recherche-resultats");
await visitor.getByLabel("Où allez-vous ?").fill("Saint-Chély-d'Ap");
await visitor.getByRole("option", { name: /Saint-Chély-d'Apcher/ }).first().click();
await visitor.getByText("Aucune liane ne passe par là pour l'instant.").waitFor();
await shot(visitor, "06-recherche-vide");
await visitor.getByLabel("Où allez-vous ?").fill("Florac");
await visitor.getByRole("option", { name: /Florac/ }).first().click();
await visitor.getByRole("heading", { name: "Florac – Mende" }).waitFor();
const back = await visitor.locator("main").innerText();
if (!/Montez à Mairie d'Ispagnac/.test(back) || !/Descendez à Mairie de Florac/.test(back)) problems.push("recherche dans le sens retour : arrêts inattendus");
await visitor.getByRole("link", { name: "Voir cette liane" }).first().click();
await visitor.waitForURL(/\/l\/florac-/);

// 4. administrateur : modifier une liane existante
const admin = await newPage("admin");
await admin.goto(BASE + "/connexion?retour=%2Fadmin%2Flianes");
await login(admin, "+33600000000", "000000");
await admin.waitForURL(/\/admin\/lianes/);
const cardOf = (name) => admin.locator("section", { has: admin.getByRole("link", { name, exact: true }) });
await cardOf("Mende – Langogne").getByRole("link", { name: "Modifier" }).click();
await admin.getByRole("heading", { name: "Modifier la liane" }).waitFor();
await admin.getByText(/Tracé par la route/).waitFor();
const before = (await admin.getByText(/Tracé par la route/).innerText()).replace(/\n+/g, " ");
await fullShot(admin, "07-admin-modifier-liane");
await admin.getByLabel("Nom de la liane").fill("Mende – Langogne par Laubert");
await admin.getByRole("button", { name: "Retirer Mairie de Badaroux" }).click();
await admin.getByLabel("Ajouter un arrêt").fill("Laubert");
await admin.getByRole("option", { name: /Mairie de Laubert/ }).click();
await admin.getByRole("button", { name: "Monter Mairie de Laubert" }).click();
await admin.getByRole("button", { name: "Monter Mairie de Laubert" }).click();
await admin.waitForTimeout(1500);
await admin.getByText(/Tracé par la route/).waitFor();
const after = (await admin.getByText(/Tracé par la route/).innerText()).replace(/\n+/g, " ");
log("aperçu avant :", before, "| après :", after);
await fullShot(admin, "08-admin-liane-modifiee-apercu");
await admin.getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForURL(/\/admin\/lianes$/);
await cardOf("Mende – Langogne par Laubert").getByText(/Laubert/).first().waitFor();
log("liane modifiée :", (await cardOf("Mende – Langogne par Laubert").innerText()).replace(/\n+/g, " | ").slice(0, 300));
await shot(admin, "09-admin-liane-enregistree");
// on la remet comme avant
await cardOf("Mende – Langogne par Laubert").getByRole("link", { name: "Modifier" }).click();
await admin.getByRole("heading", { name: "Modifier la liane" }).waitFor();
await admin.getByLabel("Nom de la liane").fill("Mende – Langogne");
await admin.getByRole("button", { name: "Retirer Mairie de Laubert" }).click();
await admin.getByLabel("Ajouter un arrêt").fill("Badaroux");
await admin.getByRole("option", { name: /Mairie de Badaroux/ }).click();
await admin.getByRole("button", { name: "Monter Mairie de Badaroux" }).click();
await admin.getByRole("button", { name: "Monter Mairie de Badaroux" }).click();
await admin.getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForURL(/\/admin\/lianes$/);
await cardOf("Mende – Langogne").getByText(/Badaroux/).first().waitFor();

// 5. profil : prénom, nom, puis suppression du compte
const member = await newPage("membre");
const phone = "06" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
await member.goto(BASE + "/connexion?retour=%2Fprofil");
await login(member, phone);
await member.waitForURL(/\/profil/);
await member.getByRole("heading", { name: "Mon nom" }).waitFor();
await shot(member, "10-profil-vide");
await member.getByLabel("Prénom", { exact: true }).fill("Dominique");
await member.getByLabel("Nom", { exact: true }).fill("Martin");
await member.getByRole("button", { name: "Enregistrer" }).click();
await member.getByText("C'est enregistré.").waitFor();
await member.getByText(/Dominique M\./).waitFor();
await fullShot(member, "11-profil-enregistre");
// une adhésion, pour vérifier qu'elle disparaît avec le compte
await member.goto(BASE + "/l/mende-marvejols?rejoindre=1");
await member.getByRole("button", { name: "Rejoindre la liane" }).click();
await member.getByText("Vous êtes membre de cette liane").waitFor();
await member.goto(BASE + "/mes-lianes");
await member.getByRole("link", { name: /Mon profil/ }).click();
await member.getByRole("button", { name: "Supprimer mon compte" }).click();
await member.getByRole("button", { name: "Oui, supprimer définitivement" }).waitFor();
await member.getByRole("button", { name: "Oui, supprimer définitivement" }).scrollIntoViewIfNeeded();
await shot(member, "12-profil-suppression-confirmation");
await member.getByRole("button", { name: "Oui, supprimer définitivement" }).click();
await member.getByRole("link", { name: "Connexion" }).waitFor();
await shot(member, "13-apres-suppression");
await member.goto(BASE + "/l/mende-marvejols");
await member.getByText("Aucun membre pour l'instant").waitFor();
// le même numéro retrouve un compte neuf, sans nom
await member.goto(BASE + "/connexion?retour=%2Fprofil");
await login(member, phone);
await member.waitForURL(/\/profil/);
await member.getByRole("heading", { name: "Mon nom" }).waitFor();
if ((await member.getByLabel("Prénom", { exact: true }).inputValue()) !== "") problems.push("le compte recréé a gardé le prénom");
await member.getByRole("button", { name: "Se déconnecter" }).click();
await member.waitForTimeout(800);

await browser.close();
log("PROBLEMES:", problems.length);
for (const p of [...new Set(problems)]) log(" -", p);
