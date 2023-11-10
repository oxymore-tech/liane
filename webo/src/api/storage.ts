export async function getStoredToken() {
  try {
    return localStorage.getItem("token");
  } catch (e) {
    return null;
  }
}

export async function setStoredToken(token?: string) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}
