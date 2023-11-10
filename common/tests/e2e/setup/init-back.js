async function post(url, data, token) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer${token}` : undefined
    },
    body: data ? JSON.stringify(data) : undefined
  });
  if (response.status !== 200 && response.status !== 204) throw new Error(`Status ${response.status}`);
  const res = await response.text();
  if (res.length > 0) return JSON.parse(res);
  return undefined;
}

const apiUrl = process.argv[2];
async function login() {
  const res = await post(`${apiUrl}/api/auth/login`, { phone: "0000111111", code: "333333" });
  if (!res.user || !res.user.isAdmin) {
    console.error("Test account is not admin", res);
    process.exit(1);
  }
  return res.token.accessToken;
}

async function generateRallyingPoints(token) {
  await post(`${apiUrl}/api/rallying_point/generate?source=test`, undefined, token);
}
login().then(token => generateRallyingPoints(token));
