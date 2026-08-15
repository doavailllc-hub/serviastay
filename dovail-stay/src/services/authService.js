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
export async function saveStoredUser(user) {
  await saveSessionUser(user);
}
export const logoutUser = async () => {
  await clearSession();
};
