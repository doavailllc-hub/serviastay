import api from "../api/api";

export const getProperties = async () => {
  const response = await api.get("/properties");
  return response.data;
};