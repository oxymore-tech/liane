// Jeu de démonstration : crée quelques lianes en Lozère à partir des points de ralliement de test.
// Usage : API=http://hote:5000/api node seed-lianes.mjs
// Le compte de test (AUTH_TEST_ACCOUNT / AUTH_TEST_CODE) doit être administrateur.
// Rejouable : les points ne sont générés que si la base est vide, les lianes déjà présentes sont conservées.

const API = process.env.API ?? "http://localhost:5000/api";
const PHONE = process.env.AUTH_TEST_ACCOUNT ?? "+33600000000";
const CODE = process.env.AUTH_TEST_CODE ?? "000000";
const LOZERE = { lat: 44.45, lng: 3.5 };

const LIANES = [
  { name: "Florac – Mende", stops: ["Florac", "Ispagnac", "Balsièges", "Mende"] },
  { name: "Mende – Marvejols", stops: ["Mende", "Barjac", "Chanac", "Marvejols"] },
  { name: "Mende – Langogne", stops: ["Mende", "Badaroux", "Châteauneuf-de-Randon", "Langogne"] },
];

let token;

async function call(method, path, body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : undefined;
}

async function findPoint(city) {
  const query = new URLSearchParams({ search: city, ...LOZERE, limit: 1 });
  const [point] = await call("GET", `/rallying_point?${query}`);
  if (!point) throw new Error(`Point de ralliement introuvable : ${city}`);
  return point;
}

const login = await call("POST", "/auth/login", { phone: PHONE, code: CODE });
token = login.token.access_token;

const anyPoint = await call("GET", `/rallying_point?lat=${LOZERE.lat}&lng=${LOZERE.lng}&limit=1`);
if (anyPoint.length === 0) {
  const { count } = await call("POST", "/rallying_point/generate?source=test");
  console.log(`${count} points de ralliement générés`);
}

const existing = new Set((await call("GET", "/liane/admin")).map((liane) => liane.name));
for (const { name, stops } of LIANES) {
  if (existing.has(name)) {
    console.log(`déjà présente : ${name}`);
    continue;
  }
  const points = [];
  for (const city of stops) points.push(await findPoint(city));
  const liane = await call("POST", "/liane", { name, stop_ids: points.map((point) => point.id) });
  console.log(`créée : ${liane.name} -> /l/${liane.slug} (${points.map((point) => point.city).join(", ")})`);
}
