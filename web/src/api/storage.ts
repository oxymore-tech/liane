export async function getStoredToken() {
  try {
    return localStorage?.getItem("token");
  } catch (e) {
    return null;
  }
}

export async function setStoredToken(token: string) {
  localStorage?.setItem("token", token);
}
