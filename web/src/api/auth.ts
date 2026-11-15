import { api } from "./index";
import type { User } from "./types";

type LoginResponse = { token: { access_token: string } };

export const sendCode = (phone: string) =>
  api.post("/auth/sms", { params: { phone } });

export const login = async (phone: string, code: string) => {
  const response = await api.postAs<LoginResponse>("/auth/login", {
    body: { phone, code },
  });
  api.setToken(response.token.access_token);
};

export const getMe = () => api.get<User>("/user/me");

export const updateMe = (firstName: string, lastName: string) =>
  api.putAs<User>("/user/me", {
    body: {
      first_name: firstName,
      last_name: lastName,
      gender: "Unspecified",
      picture_url: null,
    },
  });
