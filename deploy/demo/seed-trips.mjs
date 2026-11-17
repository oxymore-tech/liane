// Jeu de démonstration, suite de seed-lianes.mjs (« liane seed » lance les deux).
// Sur la liane Florac – Mende : trois membres, quelques messages, un trajet terminé et prouvé
// (une passagère avec position, un passager qui la refuse), un trajet annulé, deux trajets à venir.
// Rejouable : si la liane a déjà des trajets à venir, rien n'est ajouté.
import { execFileSync } from "node:child_process";

const API = process.env.API ?? "http://localhost:5000/api";
// Les comptes de démonstration se connectent par le parcours réel : leur code est lu dans la base.
const PSQL = (process.env.PSQL ?? "docker exec liane-local-postgres-1 psql -h 127.0.0.1 -U liane -d liane").split(" ");
const SLUG = "florac-mende";
const MEMBERS = {
  camille: { phone: "+33600000101", first: "Camille", last: "Durand", from: "Florac-Trois-Rivières", to: "Mende", canDrive: true },
  louise: { phone: "+33600000102", first: "Louise", last: "Martin", from: "Ispagnac", to: "Mende", canDrive: false },
  nadir: { phone: "+33600000103", first: "Nadir", last: "Benali", from: "Florac-Trois-Rivières", to: "Balsièges", canDrive: true },
};

async function call(token, method, path, body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}

function smsCode(phone) {
  const query = `SELECT code FROM sms_code WHERE phone = '${phone}' ORDER BY expires_at DESC LIMIT 1`;
  const code = execFileSync(PSQL[0], [...PSQL.slice(1), "-At", "-c", query], { encoding: "utf8" }).trim();
  if (!code) throw new Error(`Pas de code pour ${phone}`);
  return code;
}

async function login({ phone, first, last }) {
  await call(null, "POST", `/auth/sms?phone=${encodeURIComponent(phone)}`);
  const { token } = await call(null, "POST", "/auth/login", { phone, code: smsCode(phone) });
  await call(token.access_token, "PUT", "/user/me", {
    first_name: first,
    last_name: last,
    gender: "Unspecified",
    picture_url: null,
  });
  return token.access_token;
}

const liane = await call(null, "GET", `/liane/${SLUG}`);
const stop = (city) => {
  const found = liane.stops.find((candidate) => candidate.city === city);
  if (!found) throw new Error(`Arrêt introuvable sur ${liane.name} : ${city}`);
  return found;
};
const at = (city) => ({ lat: stop(city).lat, lng: stop(city).lng, accuracy_meters: 12 });

const tokens = {};
for (const [name, member] of Object.entries(MEMBERS)) {
  tokens[name] = await login(member);
  const detail = await call(tokens[name], "GET", `/liane/${SLUG}`);
  if (!detail.membership) {
    await call(tokens[name], "POST", `/liane/${liane.id}/membership`, {
      board_stop_id: stop(member.from).id,
      alight_stop_id: stop(member.to).id,
      week_days: "1111100",
      direction: "Both",
      can_drive: member.canDrive,
      outbound_time: "07:30:00",
      return_time: "17:30:00",
    });
    console.log(`${member.first} rejoint ${liane.name} (${member.from} → ${member.to})`);
  }
}

const upcoming = await call(tokens.camille, "GET", `/liane/${liane.id}/trip`);
if (upcoming.length > 0) {
  console.log("déjà présents : trajets de démonstration");
  process.exit(0);
}

const propose = (who, departure, direction, seats) =>
  call(tokens[who], "POST", `/liane/${liane.id}/trip`, {
    departure_time: departure.toISOString(),
    direction,
    seat_count: seats,
  });
const book = (who, trip) => call(tokens[who], "POST", `/trip/${trip.id}/passenger`, {});
const gesture = (who, trip, kind, position) =>
  call(tokens[who], "POST", `/trip/${trip.id}/gesture`, position ? { kind, position } : { kind, position_status: "Denied" });
const say = (who, text) => call(tokens[who], "POST", `/liane/${liane.id}/message`, { text });
const inDays = (days, hourUtc, minute) => {
  const date = new Date(Date.now() + days * 864e5);
  date.setUTCHours(hourUtc, minute, 0, 0);
  return date;
};

await say("camille", "Bonjour à tous ! Je monte à Mende presque tous les matins.");
await say("louise", "Super, je cherche justement pour le marché du samedi.");

// Un trajet qui a eu lieu : Louise donne sa position (trajet attesté), Nadir la refuse en montant.
const done = await propose("camille", new Date(Date.now() + 2 * 60_000), "Outbound", 3);
await book("louise", done);
await book("nadir", done);
await gesture("camille", done, "Start", at("Florac-Trois-Rivières"));
await gesture("nadir", done, "Start", null);
await gesture("louise", done, "Start", at("Ispagnac"));
await gesture("nadir", done, "End", at("Balsièges"));
await gesture("camille", done, "End", at("Mende"));
await gesture("louise", done, "End", at("Mende"));
console.log(`trajet terminé : ${done.id}`);

const canceled = await propose("nadir", inDays(2, 16, 30), "Return", 2);
await call(tokens.nadir, "DELETE", `/trip/${canceled.id}`);
console.log(`trajet annulé : ${canceled.id}`);

const tomorrow = await propose("camille", inDays(1, 6, 30), "Outbound", 3);
await book("louise", tomorrow);
console.log(`trajet à venir : ${tomorrow.id} (Camille, Louise inscrite)`);
const later = await propose("nadir", inDays(3, 16, 30), "Return", 2);
console.log(`trajet à venir : ${later.id} (Nadir, retour)`);

await say("nadir", "Je redescends jeudi en fin de journée, il reste deux places.");
