// Parcours « trajets, messages » dans un navigateur sans tête. Lancé par run.sh avec JOURNEY=journey-trips.mjs
//, après seed-lianes.mjs et seed-trips.mjs. Un conducteur et deux passagers, chacun dans
// son navigateur : géolocalisation simulée et accordée pour le conducteur et la première passagère,
// refusée pour le second passager. Les captures sont préfixées « trips- ».
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const BASE = "http://localhost:3000";
const API = "http://liane-dev-api:5000/api";
const OUT = "/captures";
const problems = [];
const log = (...a) => console.log(...a);

// run.sh fait partager au navigateur le réseau du conteneur web : http://localhost:3000 est une origine « sûre »,
// condition de la géolocalisation et du service worker.
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });
async function newPage(label, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", timezoneId: "Europe/Paris", ...options });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`[${label}] console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`[${label}] requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`[${label}] http ${r.status()} ${r.request().method()} ${r.url()}`); });
  return page;
}
const shot = async (page, name) => { await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/trips-${name}.png` }); log("capture", `trips-${name}`); };
const fullShot = async (page, name) => { await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/trips-${name}.png`, fullPage: true }); log("capture", `trips-${name}`); };
const top = (page) => page.evaluate(() => document.querySelector("main")?.scrollTo(0, 0));
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
const randomPhone = () => "06" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
async function joinLiane(page, firstName, lastName, from, to, canDrive) {
  await page.goto(BASE + "/l/florac-mende?rejoindre=1");
  await page.waitForURL(/\/connexion/);
  await login(page, randomPhone());
  await page.waitForURL(/\/l\/florac-mende/);
  await page.getByLabel("Votre prénom", { exact: true }).fill(firstName);
  await page.getByLabel(/^Votre nom/).fill(lastName);
  await choose(page, "Je monte à", labelOf(from));
  await choose(page, "Je descends à", labelOf(to));
  if (canDrive) await page.getByLabel("Je peux conduire").check();
  await page.getByRole("button", { name: "Rejoindre la liane" }).click();
  await page.getByText("Vous êtes membre de cette liane").waitFor();
}
/** Jour et heure à Paris, dans `minutes` minutes, pour les champs du formulaire. */
function parisDateTime(minutes) {
  const text = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(Date.now() + minutes * 60_000));
  const [date, time] = text.split(" ");
  return { date, time };
}
async function proposeTrip(page, minutes) {
  await page.goto(BASE + "/l/florac-mende");
  await page.getByRole("button", { name: "Proposer un trajet" }).click();
  const { date, time } = parisDateTime(minutes);
  await page.getByLabel("Jour").fill(date);
  await page.getByLabel("Heure de départ").fill(time);
  return time;
}

const liane = await (await fetch(`${API}/liane/florac-mende`)).json();
const labelOf = (city) => liane.stops.find((s) => s.city === city).label;
const position = (city) => { const stop = liane.stops.find((s) => s.city === city); return { latitude: stop.lat, longitude: stop.lng, accuracy: 20 }; };
const located = (city) => ({ geolocation: position(city), permissions: ["geolocation"] });

// 1. Denis (conducteur, position accordée) rejoint la liane et y voit les trajets à venir
const driver = await newPage("conducteur", located("Florac-Trois-Rivières"));
await joinLiane(driver, "Denis", "Roux", "Florac-Trois-Rivières", "Mende", true);
await driver.getByRole("heading", { name: "Prochains trajets" }).waitFor();
await driver.getByRole("heading", { name: "Prochains trajets" }).scrollIntoViewIfNeeded();
await shot(driver, "01-liane-prochains-trajets");
await fullShot(driver, "01b-liane-membre-entiere");

// 2. il propose un trajet qui part dans trois minutes
const departureTime = await proposeTrip(driver, 3);
await driver.getByRole("heading", { name: "Proposer un trajet" }).scrollIntoViewIfNeeded();
await shot(driver, "02-proposer-un-trajet");
await driver.getByRole("button", { name: "Proposer ce trajet" }).click();
await driver.waitForURL(/\/trajet\//);
const tripUrl = driver.url();
await driver.getByRole("button", { name: "Je démarre" }).waitFor();
await shot(driver, "03-trajet-conducteur-avant-depart");

// 3. Paule (passagère, position accordée) s'inscrit
const paule = await newPage("passagère", located("Ispagnac"));
await joinLiane(paule, "Paule", "Vidal", "Ispagnac", "Mende", false);
await paule.getByRole("link", { name: /Conduit par Denis R\./ }).scrollIntoViewIfNeeded();
await shot(paule, "04-liane-trajet-propose");
await paule.getByRole("link", { name: /Conduit par Denis R\./ }).click();
await paule.getByRole("button", { name: "M'inscrire à ce trajet" }).waitFor();
log("inscription proposée:", (await paule.getByLabel("Je monte à").innerText()).trim() === liane.stops[1].label ? "montée à Ispagnac par défaut" : "montée par défaut inattendue");
await shot(paule, "05-trajet-inscription");
await paule.getByRole("button", { name: "M'inscrire à ce trajet" }).click();
await paule.getByRole("button", { name: "Je monte", exact: true }).waitFor();
await shot(paule, "06-trajet-passagere-inscrite");

// 4. Quentin (passager, position refusée) s'inscrit aussi
const quentin = await newPage("passager sans position");
await joinLiane(quentin, "Quentin", "Faure", "Florac-Trois-Rivières", "Balsièges", false);
await quentin.goto(tripUrl);
await quentin.getByRole("button", { name: "M'inscrire à ce trajet" }).click();
await quentin.getByRole("button", { name: "Je monte", exact: true }).waitFor();

// 5. messages : Paule a le fil ouvert, Denis écrit, le message arrive sans recharger
await paule.goto(BASE + "/l/florac-mende/messages");
await paule.getByText(/Denis R\. propose un trajet/).first().waitFor();
await shot(paule, "07-messages-fil");
await driver.goto(BASE + "/l/florac-mende/messages");
await driver.getByLabel("Votre message").fill("Je pars dans trois minutes, rendez-vous devant la mairie.");
await driver.getByRole("button", { name: "Envoyer" }).click();
await driver.getByText("rendez-vous devant la mairie").waitFor();
await shot(driver, "08-messages-envoye");
try {
  await paule.getByText("rendez-vous devant la mairie").waitFor({ timeout: 8000 });
  log("message reçu en direct par Paule");
} catch {
  problems.push("le message de Denis n'est pas arrivé en direct chez Paule");
}
await shot(paule, "09-messages-recu-en-direct");
await quentin.goto(BASE + "/mes-lianes");
await quentin.getByRole("heading", { name: "Florac – Mende" }).waitFor();
const unread = await quentin.getByText(/messages? non lus?/).count();
if (unread === 0) problems.push("pas de pastille de non-lus dans « Mes lianes »");
await fullShot(quentin, "10-mes-lianes-non-lus");
await quentin.getByRole("link", { name: /Messages/ }).click();
await quentin.getByText("rendez-vous devant la mairie").waitFor();
await quentin.goto(BASE + "/mes-lianes");
await quentin.getByRole("heading", { name: "Florac – Mende" }).waitFor();
await quentin.waitForTimeout(800);
if ((await quentin.getByText(/messages? non lus?/).count()) !== 0) problems.push("la pastille de non-lus reste après lecture");

// 6. « Je démarre » : heure et position relevées
await driver.goto(tripUrl);
await paule.goto(tripUrl);
await paule.getByRole("button", { name: "Je monte", exact: true }).waitFor();
await driver.getByRole("button", { name: "Je démarre" }).click();
await driver.getByText(/Départ déclaré à/).waitFor();
await driver.getByText("Position enregistrée.").waitFor();
await driver.getByRole("button", { name: "J'arrive" }).waitFor();
await shot(driver, "11-trajet-conducteur-parti");
try {
  await paule.getByText(/départ à/).waitFor({ timeout: 8000 });
  log("départ du conducteur vu en direct par Paule");
} catch {
  problems.push("le départ du conducteur n'apparaît pas en direct chez la passagère");
}

// 7. les passagers montent : avec position pour Paule, sans pour Quentin
await paule.getByRole("button", { name: "Je monte", exact: true }).click();
await paule.getByText(/Montée déclarée à/).waitFor();
await paule.getByText("Position enregistrée.").waitFor();
await shot(paule, "12-trajet-passagere-montee");
await quentin.goto(tripUrl);
await quentin.getByRole("button", { name: "Je monte", exact: true }).click();
await quentin.getByText(/Montée déclarée à/).waitFor();
await quentin.getByText("Enregistré sans position.").waitFor();
await shot(quentin, "13-trajet-passager-sans-position");

// 8. arrivée : le conducteur à Mende, Quentin descend à Balsièges, Paule à Mende
await quentin.getByRole("button", { name: "Je descends" }).click();
await quentin.getByText(/Descente déclarée à/).waitFor();
await driver.context().setGeolocation(position("Mende"));
await driver.getByRole("button", { name: "J'arrive" }).click();
await driver.getByText(/Arrivée déclarée à/).waitFor();
await paule.context().setGeolocation(position("Mende"));
await paule.getByRole("button", { name: "Je descends" }).click();
await paule.getByText(/Descente déclarée à/).waitFor();
await paule.getByText("Trajet attesté", { exact: false }).first().waitFor();
await top(paule);
await fullShot(paule, "14-recap-passagere-atteste");
await quentin.reload();
await quentin.getByText("Trajet attesté en partie").waitFor();
await fullShot(quentin, "15-recap-passager-en-partie");
await driver.reload();
await driver.getByText(/Trajet attesté avec Paule V\./).waitFor();
await driver.getByText(/Trajet attesté en partie avec Quentin F\./).waitFor();
await fullShot(driver, "16-recap-conducteur");

// 9. un trajet pour demain : trop tôt pour partir, puis annulation
await proposeTrip(driver, 24 * 60);
await driver.getByRole("button", { name: "Proposer ce trajet" }).click();
await driver.waitForURL(/\/trajet\//);
await driver.getByText(/apparaîtra ici à partir de/).waitFor();
await shot(driver, "17-trajet-demain-trop-tot");
await driver.getByRole("button", { name: "Annuler ce trajet" }).click();
await confirmWith(driver, "Annuler le trajet");
await driver.getByText("Ce trajet a été annulé par son conducteur.").waitFor();
await shot(driver, "18-trajet-annule");

// 10. mes trajets
await driver.goto(BASE + "/mes-trajets");
await driver.getByRole("heading", { name: "Passés" }).waitFor();
await fullShot(driver, "19-mes-trajets-conducteur");
await paule.goto(BASE + "/mes-trajets");
await paule.getByRole("heading", { name: "Passés" }).waitFor();
await fullShot(paule, "20-mes-trajets-passagere");

// 11. administration : trajets, classes de preuve, export
const admin = await newPage("admin");
await admin.goto(BASE + "/admin/trajets");
await admin.getByRole("link", { name: "Se connecter" }).click();
await login(admin, "+33600000000", "000000");
await admin.waitForURL(/\/admin\/trajets/);
await admin.getByRole("button", { name: "Exporter les preuves (JSON)" }).waitFor();
await admin.getByText("Classe C").first().waitFor();
await admin.getByRole("button", { name: /voir le détail/ }).first().click();
await admin.getByText(/^Mise en relation : inscription/).first().waitFor();
await fullShot(admin, "21-admin-trajets");
const [download] = await Promise.all([
  admin.waitForEvent("download"),
  admin.getByRole("button", { name: "Exporter les preuves (JSON)" }).click(),
]);
await admin.getByText(/élément\(s\) exporté\(s\)/).waitFor();
const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
const mine = exported.filter((item) => tripUrl.endsWith(item.liane.trip_id));
log("export:", exported.length, "couples ; pour le trajet du parcours:", mine.map((item) => `${item.journey?.operator_class ?? "non exportable"} (départ passager ${item.liane.passenger.start?.lat ?? "sans position"}, envoyé ${item.journey?.start.lat})`).join(", "));
if (mine.map((item) => item.journey?.operator_class).sort().join("") !== "BC") problems.push("classes de preuve inattendues pour le trajet du parcours");
await top(admin);
await shot(admin, "22-admin-export");

await browser.close();
log("heure de départ saisie:", departureTime);
log("PROBLEMES:", problems.length);
for (const p of [...new Set(problems)]) log(" -", p);
