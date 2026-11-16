// Faux service de push et faux navigateur, pour vérifier l'envoi Web Push de l'API sans rien appeler
// d'extérieur. Indépendant du code Rust : la signature VAPID (RFC 8292) est vérifiée avec le module
// crypto de Node, le contenu (RFC 8291, aes128gcm) est déchiffré deux fois, par le paquet npm
// « http_ece » s'il est installé et par une implémentation directe de la RFC ci-dessous.
//
//   GET  /subscription  -> l'abonnement d'un navigateur fictif (clés générées au démarrage)
//   POST /push/<id>     -> reçoit la notification, contrôle les en-têtes, déchiffre
//   GET  /result        -> ce qui a été reçu et vérifié
import crypto from "node:crypto";
import http from "node:http";

const port = Number(process.env.PORT ?? 8080);
const browser = crypto.createECDH("prime256v1");
browser.generateKeys();
const authSecret = crypto.randomBytes(16);
const b64 = (buffer) => Buffer.from(buffer).toString("base64url");

let httpEce = null;
try {
  httpEce = (await import("http_ece")).default;
} catch {
  console.log("http_ece absent : déchiffrement par l'implémentation directe seulement");
}

const hkdf = (salt, ikm, info, length) =>
  Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, length));

// RFC 8188 (en-tête : sel 16, taille d'enregistrement 4, longueur de l'identifiant de clé 1, identifiant)
// et RFC 8291 section 3.4 (dérivation des clés). Un seul enregistrement, terminé par l'octet 0x02.
function decryptAes128gcm(body) {
  const salt = body.subarray(0, 16);
  const keyIdLength = body.readUInt8(20);
  const serverPublicKey = body.subarray(21, 21 + keyIdLength);
  const record = body.subarray(21 + keyIdLength);
  const sharedSecret = browser.computeSecret(serverPublicKey);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    browser.getPublicKey(),
    serverPublicKey,
  ]);
  const inputKey = hkdf(authSecret, sharedSecret, keyInfo, 32);
  const contentKey = hkdf(salt, inputKey, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, inputKey, Buffer.from("Content-Encoding: nonce\0"), 12);
  const decipher = crypto.createDecipheriv("aes-128-gcm", contentKey, nonce);
  decipher.setAuthTag(record.subarray(record.length - 16));
  const padded = Buffer.concat([
    decipher.update(record.subarray(0, record.length - 16)),
    decipher.final(),
  ]);
  const delimiter = padded.lastIndexOf(2);
  if (delimiter < 0) throw new Error("délimiteur 0x02 absent");
  return padded.subarray(0, delimiter).toString("utf8");
}

function verifyVapid(authorization, expectedAudience) {
  const match = /^vapid t=([^,\s]+),\s*k=([^,\s]+)$/.exec(authorization ?? "");
  if (!match) throw new Error(`en-tête Authorization inattendu : ${authorization}`);
  const [, token, publicKey] = match;
  const [header, payload, signature] = token.split(".");
  const point = Buffer.from(publicKey, "base64url");
  if (point.length !== 65 || point[0] !== 4) throw new Error("clé publique VAPID invalide");
  const key = crypto.createPublicKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", x: b64(point.subarray(1, 33)), y: b64(point.subarray(33)) },
  });
  const isSigned = crypto.verify(
    "sha256",
    Buffer.from(`${header}.${payload}`),
    { key, dsaEncoding: "ieee-p1363" },
    Buffer.from(signature, "base64url"),
  );
  if (!isSigned) throw new Error("signature du jeton VAPID invalide");
  const algorithm = JSON.parse(Buffer.from(header, "base64url")).alg;
  if (algorithm !== "ES256") throw new Error(`algorithme ${algorithm}`);
  const claims = JSON.parse(Buffer.from(payload, "base64url"));
  const now = Date.now() / 1000;
  if (claims.aud !== expectedAudience) throw new Error(`aud ${claims.aud} au lieu de ${expectedAudience}`);
  if (!(claims.exp > now && claims.exp <= now + 24 * 3600)) throw new Error(`exp ${claims.exp} hors de 24 h`);
  if (!/^(mailto:|https:\/\/)/.test(claims.sub ?? "")) throw new Error(`sub ${claims.sub}`);
  return { claims, publicKey };
}

let result = { received: false };

const server = http.createServer((request, response) => {
  const origin = `http://${request.headers.host}`;
  const reply = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method === "GET" && request.url === "/subscription") {
    return reply(200, {
      endpoint: `${origin}/push/navigateur-fictif`,
      keys: { p256dh: b64(browser.getPublicKey()), auth: b64(authSecret) },
    });
  }
  if (request.method === "GET" && request.url === "/result") return reply(200, result);
  if (request.method === "POST" && request.url.startsWith("/push/")) {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const errors = [];
      const attempt = (name, check) => {
        try {
          return check();
        } catch (error) {
          errors.push(`${name} : ${error.message}`);
          return null;
        }
      };
      const vapid = attempt("VAPID", () => verifyVapid(request.headers.authorization, origin));
      if (request.headers["content-encoding"] !== "aes128gcm") errors.push("Content-Encoding n'est pas aes128gcm");
      if (!/^\d+$/.test(request.headers.ttl ?? "")) errors.push("en-tête TTL absent");
      const direct = attempt("déchiffrement direct", () => decryptAes128gcm(body));
      const library = httpEce
        ? attempt("déchiffrement http_ece", () =>
            httpEce.decrypt(body, { version: "aes128gcm", privateKey: browser, authSecret: b64(authSecret) }).toString("utf8"))
        : null;
      if (httpEce && library !== direct) errors.push("les deux déchiffrements diffèrent");
      result = {
        received: true,
        errors,
        decrypted: direct,
        decrypted_by_http_ece: library,
        http_ece_used: Boolean(httpEce),
        vapid_claims: vapid?.claims ?? null,
        vapid_public_key: vapid?.publicKey ?? null,
        ttl: request.headers.ttl ?? null,
        urgency: request.headers.urgency ?? null,
        body_bytes: body.length,
      };
      console.log(JSON.stringify(result));
      reply(errors.length ? 400 : 201, {});
    });
    return;
  }
  reply(404, {});
});

server.listen(port, () => console.log(`faux service de push sur le port ${port}`));
