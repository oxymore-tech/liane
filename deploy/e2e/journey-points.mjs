// Parcours « points de ralliement » : un administrateur ajoute un point, le modifie, déplace un arrêt de
// Florac – Mende (le tracé de la liane change) et se voit refuser sa désactivation. Lancé par run.sh après
// seed-lianes.mjs. L'arrêt déplacé est remis à sa place à la fin, le point ajouté est désactivé.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT = "/captures";
const problems = [];
const log = (...a) => console.log(...a);
const expectedRefusal = (text) => /409/.test(text);

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"] });
async function newPage(label, viewport, mobile) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: "fr-FR" });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !expectedRefusal(m.text())) problems.push(`[${label}] console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`[${label}] requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400 && r.status() !== 409) problems.push(`[${label}] http ${r.status()} ${r.request().method()} ${r.url()}`); });
  await page.goto(BASE + "/connexion?retour=%2Fadmin%2Fpoint");
  await page.getByLabel("Votre numéro de téléphone").fill("+33600000000");
  await page.getByRole("button", { name: "Recevoir un code par SMS" }).click();
  await page.getByLabel("Code reçu par SMS").fill("000000");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/admin\/point$/);
  return page;
}
const shot = async (page, name) => { await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}/points-${name}.png`, fullPage: true }); log("capture", name); };
const cardOf = (page, name) => page.locator("section", { has: page.getByRole("heading", { name, exact: true }) });
const search = async (page, text) => { await page.getByLabel("Chercher un point").fill(text); await page.waitForTimeout(800); };
// Touche la carte à une fraction de sa largeur et de sa hauteur.
async function touchMap(page, fx, fy) {
  const canvas = page.locator(".maplibregl-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const box = await canvas.boundingBox();
  const [x, y] = [box.x + box.width * fx, box.y + box.height * fy];
  if (page.viewportSize().width < 600) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
const api = (page, method, path, body) => page.evaluate(async ([method, path, body]) => {
  const response = await fetch(`/api${path}`, { method, headers: { Authorization: `Bearer ${localStorage.getItem("liane.token")}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return response.json();
}, [method, path, body]);
const routeOf = async (page) => { const liane = await api(page, "GET", "/liane/florac-mende"); return { distance: liane.distance_meters, source: liane.route_source, line: JSON.stringify(liane.route.coordinates) }; };

const admin = await newPage("mobile", { width: 390, height: 844 }, true);
const label = `Aire du Parcours ${Date.now() % 100000}`;

// 1. liste et recherche
await admin.getByRole("link", { name: "Points" }).waitFor();
await search(admin, "Mende");
await cardOf(admin, "Mairie de Mende").waitFor();
log("recherche Mende :", (await cardOf(admin, "Mairie de Mende").innerText()).replace(/\n+/g, " | "));
await shot(admin, "01-liste");

// 2. ajouter un point : libellé oublié, puis création
await admin.getByRole("link", { name: "Ajouter un point" }).click();
await admin.getByRole("heading", { name: "Nouveau point" }).waitFor();
await admin.getByLabel("Centrer la carte sur une commune").fill("Mende");
await admin.getByRole("option", { name: /Mairie de Mende/ }).click();
await touchMap(admin, 0.3, 0.3);
await admin.getByText(/^Position :/).waitFor();
await admin.getByRole("button", { name: "Créer le point" }).click();
await admin.getByRole("alert").filter({ hasText: "Donnez un libellé" }).waitFor();
await shot(admin, "02-nouveau-libelle-manquant");
await admin.getByLabel("Libellé").fill(label);
await admin.getByLabel("Type").click();
await admin.getByRole("option", { name: "Parking relais", exact: true }).click();
await admin.getByLabel("Adresse").fill("2 avenue du Parcours");
await admin.getByLabel("Nombre de places (facultatif)").fill("-3");
await admin.getByRole("button", { name: "Créer le point" }).click();
await admin.getByRole("alert").filter({ hasText: "positif ou nul" }).waitFor();
await admin.getByLabel("Nombre de places (facultatif)").fill("15");
await shot(admin, "03-nouveau-rempli");
await admin.getByRole("button", { name: "Créer le point" }).click();
await admin.waitForURL(/\/admin\/point$/);
await search(admin, label);
await cardOf(admin, label).getByText("Créé à la main").waitFor();
log("point créé :", (await cardOf(admin, label).innerText()).replace(/\n+/g, " | "));
await shot(admin, "04-point-cree");
const found = await api(admin, "GET", `/rallying_point?search=${encodeURIComponent(label)}&lat=44.5&lng=3.5`);
if (found.length !== 1) problems.push("le point créé n'est pas dans la recherche publique");

// 3. le modifier
await cardOf(admin, label).getByRole("link", { name: "Modifier" }).click();
await admin.getByRole("heading", { name: "Modifier le point" }).waitFor();
await admin.getByLabel("Libellé").fill(`${label} bis`);
await admin.getByLabel("Nombre de places (facultatif)").fill("20");
await admin.getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForURL(/\/admin\/point$/);
await search(admin, `${label} bis`);
await cardOf(admin, `${label} bis`).waitFor();
const created = (await api(admin, "GET", `/rallying_point/admin?search=${encodeURIComponent(`${label} bis`)}`))[0];
if (created.place_count !== 20) problems.push("la modification du point n'est pas enregistrée");

// 4. déplacer un arrêt de Florac – Mende : le tracé change
const before = await routeOf(admin);
await search(admin, "Ispagnac");
const stop = (await api(admin, "GET", "/rallying_point/admin?search=Ispagnac")).find((point) => point.lianes.includes("Florac – Mende"));
await cardOf(admin, stop.label).getByText(/Arrêt de 2 lianes/).waitFor();
await shot(admin, "05-arret-de-lianes");
await cardOf(admin, stop.label).getByRole("link", { name: "Modifier" }).click();
await admin.getByRole("heading", { name: "Modifier le point" }).waitFor();
await touchMap(admin, 0.85, 0.15);
await admin.getByText(/sera recalculé à l'enregistrement/).waitFor();
await shot(admin, "06-arret-deplace-avertissement");
await admin.getByRole("button", { name: "Enregistrer" }).click();
const moveDialog = admin.getByRole("dialog", { name: "Ce point est déplacé" });
await moveDialog.waitFor();
log("confirmation :", (await moveDialog.innerText()).replace(/\n+/g, " | "));
await shot(admin, "06b-arret-deplace-confirmation");
await moveDialog.getByRole("button", { name: "Enregistrer le déplacement" }).click();
await admin.waitForURL(/\/admin\/point$/);
const after = await routeOf(admin);
log(`tracé de Florac – Mende : ${before.distance} m -> ${after.distance} m (${after.source})`);
if (after.line === before.line) problems.push("le tracé de Florac – Mende n'a pas changé après le déplacement de l'arrêt");
await search(admin, "Ispagnac");
await cardOf(admin, stop.label).getByText("Modifié à la main").waitFor();

// 5. désactiver cet arrêt : refusé
await cardOf(admin, stop.label).getByRole("link", { name: "Modifier" }).click();
await admin.getByLabel(/^Actif/).uncheck();
await admin.getByRole("button", { name: "Enregistrer" }).click();
const refusal = admin.getByRole("alert").filter({ hasText: "ne peut pas être désactivé" });
await refusal.waitFor();
log("refus :", await refusal.innerText());
await shot(admin, "07-desactivation-refusee");
if (!(await api(admin, "GET", `/rallying_point/${stop.id}`)).is_active) problems.push("l'arrêt a été désactivé malgré le refus");

// 6. grand écran
const wide = await newPage("grand écran", { width: 1280, height: 800 }, false);
await search(wide, "Mende");
await cardOf(wide, "Mairie de Mende").waitFor();
await shot(wide, "08-liste-1280");
await search(wide, "Ispagnac");
await cardOf(wide, stop.label).getByRole("link", { name: "Modifier" }).click();
await wide.getByRole("heading", { name: "Modifier le point" }).waitFor();
await touchMap(wide, 0.2, 0.8);
await wide.getByText(/sera recalculé à l'enregistrement/).waitFor();
await shot(wide, "09-modifier-1280");

// remise en état
const { id: stopId, source, edited_at, lianes, ...original } = stop;
await api(admin, "PUT", `/rallying_point/${stopId}`, original);
const restored = await routeOf(admin);
if (restored.line !== before.line) problems.push("le tracé de Florac – Mende n'est pas revenu à son état initial");
const { id, source: _s, edited_at: _e, lianes: _l, ...point } = created;
await api(admin, "PUT", `/rallying_point/${id}`, { ...point, is_active: false });

await browser.close();
log("PROBLEMES:", problems.length, problems);
process.exit(problems.length ? 1 : 0);
