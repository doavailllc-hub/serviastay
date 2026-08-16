import api from "../api/api";
import {
  clearSession,
  getSessionUser,
  saveSession,
  saveSessionUser,
} from "./sessionStorage";

export const loginUser = async (email, password) => {
  const res = await api.post("/login", { email, password });

  await saveSession(res.data.token, res.data.user);

  return res.data;
};

export const registerUser = async (fullname, email, password) => {
  const res = await api.post("/register", { fullname, email, password });
  return res.data;
};

export const getStoredUser = async () => {
  return getSessionUser();
};

export const loginWithGoogle = async ({
  code,
  codeVerifier,
  redirectUri,
}) => {
  const res = await api.post("/auth/google", {
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  if (!res.data?.token || !res.data?.user) {
    throw new Error("Google sign-in returned an invalid session.");
  }

  await saveSession(res.data.token, res.data.user);
  return res.data;
};
export async function saveStoredUser(user) {
  await saveSessionUser(user);
}
export const logoutUser = async () => {
  await clearSession();
};
