// Parcours « lianes » dans un navigateur sans tête. Lancé par run.sh.
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const BASE = "http://liane-dev-web:3000";
const OUT = "/captures";
const only = process.env.ONLY;
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
const shot = async (page, name) => { await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${name}.png` }); log("capture", name); };
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
}

// Répond à une boîte de confirmation de l'application par son bouton d'action.
async function confirmWith(page, name, role = "alertdialog") {
  const dialog = page.getByRole(role);
  await dialog.waitFor();
  await dialog.getByRole("button", { name, exact: true }).click();
}
// Choisit une option d'une liste déroulante désignée par son libellé.
async function choose(page, label, option) {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

// 1. visiteur anonyme : carte
const visitor = await newPage("visiteur");
await visitor.goto(BASE + "/");
await visitor.getByText(/lianes – touchez/).waitFor();
await visitor.waitForTimeout(2500);
await shot(visitor, "01-carte-publique");

// 2. toucher une liane sur la carte
const box = await visitor.locator(".maplibregl-canvas").boundingBox();
let opened = false;
outer: for (let fy = 0.2; fy <= 0.85; fy += 0.05) for (let fx = 0.1; fx <= 0.9; fx += 0.08) {
  await visitor.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
  await visitor.waitForTimeout(150);
  if (await visitor.getByLabel("Fiche de la liane").count()) { opened = true; log(`liane touchée en ${fx.toFixed(2)},${fy.toFixed(2)}`); break outer; }
}
if (!opened) problems.push("aucun toucher sur la carte n'a ouvert de fiche");
await visitor.getByRole("heading", { level: 2 }).first().waitFor();
await shot(visitor, "02-fiche-panneau");
await visitor.getByRole("button", { name: "Fermer" }).click();
await visitor.getByRole("button", { name: /Liste/ }).click();
await shot(visitor, "03-liste-des-lianes");
await visitor.getByRole("button", { name: /Florac – Mende/ }).click();
await visitor.getByRole("heading", { name: "Florac – Mende" }).waitFor();

// 3. rejoindre -> connexion -> retour au formulaire
await visitor.getByRole("link", { name: "Rejoindre" }).click();
await visitor.waitForURL(/\/connexion/);
await shot(visitor, "04-connexion");
const phone = "06" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
await login(visitor, phone);
await shot(visitor, "05-connexion-code");
await visitor.getByRole("button", { name: "Se connecter" }).click();
await visitor.waitForURL(/\/l\/florac-mende/);
await visitor.getByLabel("Votre prénom", { exact: true }).fill("Camille");
await visitor.getByLabel(/^Votre nom/).fill("Durand");
// la montée est choisie au clavier : Espace ouvre la liste, la flèche descend d'un arrêt, Entrée le retient
const boardField = visitor.getByLabel("Je monte à");
await boardField.focus();
await visitor.keyboard.press("Space");
await visitor.getByRole("option", { name: "Mairie de Florac-Trois-Rivières", exact: true }).waitFor();
if (!/Florac-Trois-Rivières/.test(await visitor.getByRole("option", { selected: true }).innerText())) problems.push("liste déroulante : l'arrêt retenu n'est pas marqué à l'ouverture");
await shot(visitor, "05b-liste-deroulante-ouverte");
await visitor.keyboard.press("ArrowDown");
await visitor.keyboard.press("Enter");
await visitor.getByRole("option").first().waitFor({ state: "detached" });
if (!/Mairie d'Ispagnac/.test(await boardField.innerText())) problems.push("liste déroulante : le clavier n'a pas retenu Ispagnac");
if (!(await boardField.evaluate((el) => el === document.activeElement))) problems.push("liste déroulante : le focus n'est pas revenu sur le champ");
await boardField.press("Space");
await visitor.getByRole("option").first().waitFor();
await visitor.keyboard.press("Escape");
await visitor.getByRole("option").first().waitFor({ state: "detached" });
if (!/Mairie d'Ispagnac/.test(await boardField.innerText())) problems.push("liste déroulante : Échap a changé le choix");
await choose(visitor, "Je descends à", "Mairie de Mende");
await visitor.getByRole("button", { name: "Sam" }).click();
await visitor.getByLabel("Je peux conduire").check();
await visitor.getByLabel("Départ vers (facultatif)").fill("07:30");
await visitor.getByRole("heading", { name: "Rejoindre la liane" }).scrollIntoViewIfNeeded();
await shot(visitor, "06-formulaire-rejoindre");
await visitor.screenshot({ path: `${OUT}/06b-formulaire-rejoindre-entier.png`, fullPage: true });
await visitor.getByRole("button", { name: "Rejoindre la liane" }).click();
await visitor.getByText("Vous êtes membre de cette liane").waitFor();
await visitor.evaluate(() => document.querySelector("main").scrollTo(0, 0));
await shot(visitor, "07-fiche-membre");
await visitor.goto(BASE + "/l/florac-mende");
await visitor.getByText("Vous êtes membre de cette liane").waitFor();
await visitor.waitForTimeout(1500);
const main = visitor.locator("main");
await visitor.screenshot({ path: `${OUT}/07b-page-liane-haut.png` });
await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
await shot(visitor, "07c-page-liane-bas");

// 4. mes lianes
await visitor.goto(BASE + "/liane");
await visitor.getByRole("heading", { name: "Florac – Mende" }).waitFor();
await shot(visitor, "08-mes-lianes");

// 5. administrateur : rejoint aussi, puis création d'une liane
const admin = await newPage("admin");
await admin.goto(BASE + "/admin/liane");
await shot(admin, "09-admin-sans-compte");
await admin.getByRole("link", { name: "Se connecter" }).click();
await login(admin, "+33600000000", "000000");
await admin.getByRole("button", { name: "Se connecter" }).click();
await admin.waitForURL(/\/admin\/liane/);
await admin.getByRole("link", { name: "Nouvelle liane" }).waitFor();
await shot(admin, "10-admin-lianes");

await admin.getByRole("link", { name: "Nouvelle liane" }).click();
await admin.getByLabel("Ajouter un arrêt").fill("Marvejols");
await admin.getByRole("option", { name: /Mairie de Marvejols/ }).click();
await admin.getByLabel("Ajouter un arrêt").fill("Chanac");
await admin.getByRole("option", { name: /Mairie de Chanac/ }).click();
await admin.getByLabel("Ajouter un arrêt").fill("Flor");
await admin.getByRole("option", { name: /Florac/ }).first().waitFor();
await shot(admin, "11-admin-recherche-arret");
await admin.getByRole("option", { name: /Florac/ }).first().click();
// sélection sur la carte : toucher des points jusqu'à obtenir un 4e arrêt
await admin.locator(".maplibregl-canvas").scrollIntoViewIfNeeded();
await admin.waitForTimeout(2500);
const abox = await admin.locator(".maplibregl-canvas").boundingBox();
let picked = false;
pick: for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7], [0.5, 0.2], [0.5, 0.8]]) {
  await admin.touchscreen.tap(abox.x + abox.width * fx, abox.y + abox.height * fy);
  await admin.waitForTimeout(900);
  if ((await admin.locator("ol > li").count()) >= 4) { picked = true; log(`arrêt ajouté par toucher en ${fx},${fy}`); break pick; }
}
if (!picked) problems.push("aucun toucher sur la carte d'administration n'a ajouté d'arrêt");
const routeNote = admin.getByText(/Tracé (par la route|approximatif)/);
await routeNote.waitFor();
log("aperçu du tracé:", (await routeNote.innerText()).replace(/\n+/g, " "));
await admin.waitForTimeout(800);
await admin.screenshot({ path: `${OUT}/12-admin-creation-entier.png`, fullPage: true });
await shot(admin, "12b-admin-creation-carte");
const stopsText = await admin.locator("ol > li").allInnerTexts();
log("arrêts choisis:", JSON.stringify(stopsText));
await admin.getByLabel("Nom de la liane").fill("Essai navigateur");
await admin.getByRole("button", { name: "Créer la liane" }).click();
await admin.waitForURL(/\/admin\/liane$/);
await admin.getByRole("link", { name: "Essai navigateur" }).waitFor();
await shot(admin, "13-admin-liane-creee");
const card = admin.locator("section", { has: admin.getByRole("link", { name: "Essai navigateur" }) });
await card.getByRole("button", { name: "Désactiver" }).click();
await card.getByText("Désactivée").waitFor();
await shot(admin, "14-admin-liane-desactivee");
await card.getByRole("button", { name: "Activer" }).click();
await card.getByText("Active", { exact: true }).waitFor();

// l'admin rejoint Florac – Mende pour être signalé
await admin.goto(BASE + "/l/florac-mende?rejoindre=1");
await admin.getByRole("heading", { name: "Rejoindre la liane" }).waitFor();
if (await admin.getByLabel("Votre prénom", { exact: true }).count()) {
  await admin.getByLabel("Votre prénom", { exact: true }).fill("Paul");
  await admin.getByLabel(/^Votre nom/).fill("Martin");
}
await admin.getByRole("button", { name: "Rejoindre la liane" }).click();
await admin.getByText("Vous êtes membre de cette liane").waitFor();

// 6. signalement par Camille
await visitor.goto(BASE + "/l/florac-mende");
await visitor.getByRole("button", { name: "Signaler" }).click();
await visitor.getByLabel("Que s'est-il passé ?").fill("Ne vient pas aux rendez-vous.");
await visitor.getByLabel("Que s'est-il passé ?").scrollIntoViewIfNeeded();
await shot(visitor, "15-signaler");
await visitor.getByRole("button", { name: "Envoyer" }).click();
await visitor.getByText("Signalement envoyé").waitFor();
await shot(visitor, "16-signalement-envoye");

// 7. carte avec 2 membres (épaisseur) vue par un nouvel anonyme
const anon = await newPage("anonyme");
await anon.goto(BASE + "/");
await anon.getByText(/lianes – touchez/).waitFor();
await anon.waitForTimeout(3000);
await shot(anon, "17-carte-avec-membres");
await anon.goto(BASE + "/l/florac-mende");
await anon.getByRole("heading", { name: "Qui roule quand" }).waitFor();
await anon.waitForTimeout(1500);
await anon.screenshot({ path: `${OUT}/18-page-publique-entiere.png`, fullPage: true });
const publicText = await anon.locator("main").innerText();
if (/Camille|Paul M/.test(publicText)) problems.push("la page publique montre un nom de membre");
log("page publique:", publicText.replace(/\n+/g, " | ").slice(0, 700));

// 8. traitement du signalement
await admin.goto(BASE + "/admin/signalement");
await admin.getByRole("button", { name: "Exclure de la liane" }).waitFor();
await shot(admin, "19-admin-signalements");
await admin.getByRole("button", { name: "Exclure de la liane" }).click();
await confirmWith(admin, "Exclure de la liane");
await admin.getByText("Aucun signalement à traiter.").waitFor();
await shot(admin, "20-admin-signalements-vide");
await visitor.goto(BASE + "/l/florac-mende");
await visitor.getByText("1 membre", { exact: true }).waitFor();

// 9. nettoyage par l'interface : Camille quitte, l'admin supprime la liane d'essai
// la boîte de confirmation au clavier : Entrée l'ouvre, le focus y reste, Échap la ferme et rend le focus
const leaveButton = visitor.getByRole("button", { name: "Quitter la liane" });
await leaveButton.focus();
await visitor.keyboard.press("Enter");
const leaveDialog = visitor.getByRole("alertdialog", { name: "Quitter la liane « Florac – Mende » ?" });
await leaveDialog.waitFor();
const focusInDialog = () => leaveDialog.evaluate((el) => el.contains(document.activeElement));
if (!(await focusInDialog())) problems.push("boîte de confirmation : le focus n'y entre pas à l'ouverture");
for (let i = 0; i < 4; i++) {
  await visitor.keyboard.press("Tab");
  if (!(await focusInDialog())) problems.push("boîte de confirmation : la tabulation sort de la boîte");
}
await shot(visitor, "20b-confirmation-quitter");
await visitor.keyboard.press("Escape");
await leaveDialog.waitFor({ state: "detached" });
if (!(await leaveButton.evaluate((el) => el === document.activeElement))) problems.push("boîte de confirmation : le focus n'est pas rendu au bouton d'origine");
await visitor.getByText("Vous êtes membre de cette liane").waitFor();
await leaveButton.click();
await confirmWith(visitor, "Quitter la liane");
await visitor.getByRole("button", { name: "Rejoindre" }).waitFor();
await shot(visitor, "21-apres-avoir-quitte");
await admin.goto(BASE + "/admin/liane");
const again = admin.locator("section", { has: admin.getByRole("link", { name: "Essai navigateur" }) });
await again.getByRole("button", { name: "Supprimer" }).click();
await confirmWith(admin, "Supprimer la liane");
await admin.getByRole("link", { name: "Essai navigateur" }).waitFor({ state: "detached" });

await browser.close();
log("PROBLEMES:", problems.length);
for (const p of [...new Set(problems)]) log(" -", p);
