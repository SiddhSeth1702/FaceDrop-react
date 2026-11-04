import { loginResponse } from "@/pages/Auth/helper/response";
import { emailCodeVerifyUrl, googleLoginUrl, loginUrl } from "@/service/requestUrls.service";
import i18n from "@/i18n/i18n";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  userDetail: number | null;
  name: string | null;
  email: string | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<loginResponse["data"] | undefined>;
  loginWithGoogle: (credential: string) => Promise<loginResponse["data"] | undefined>;
  loginWithEmailCode: (email: string, code: string, name?: string) => Promise<loginResponse["data"] | undefined>;
  logout: () => void;
  setEmail: React.Dispatch<React.SetStateAction<string | null>>;
  setName: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isTokenExpired = (token: string): boolean => {
  try {
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(atob(payloadBase64));
    if (!payload.exp) return true;
    const expiry = payload.exp * 1000;
    return Date.now() > expiry;
  } catch {
    return true;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<number | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist on change
  useEffect(() => {
    if (token) {
      localStorage.setItem("auth", JSON.stringify({
        token,
        userId: userDetail,
        name,
        email
      }));
    }
  }, [token, userDetail, name, email]);

  const login = (email: string, password: string) => signIn(loginUrl, { email, password });
  const loginWithGoogle = (credential: string) => signIn(googleLoginUrl, { credential });
  const loginWithEmailCode = (email: string, code: string, name?: string) =>
    signIn(emailCodeVerifyUrl, { email, code, ...(name ? { name } : {}) });

  /** Posts credentials to an auth endpoint and stores the session it returns. */
  const signIn = async (url: string, body: Record<string, string>) => {
    try {
      const backendResponse = await fetch(`${import.meta.env.VITE_API_URL}/${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": i18n.language },
        body: JSON.stringify(body),
      });

      const responseJson: loginResponse = await backendResponse.json();
      if (!backendResponse.ok) {
        throw {
          status: backendResponse.status,
          message: responseJson.message
        }
      }

      const data = responseJson.data;
      if (data && data.token && data?.user.is_email_verified) {
        setToken(data.token);
        setUserDetail(data.user.user_id || null);
        setName(data.user.name || null);
        setEmail(data.user.email || null);
        localStorage.setItem("auth", JSON.stringify({
          token: data.token,
          userId: data.user.user_id || null,
          name: data.user.name || null,
          email: data.user.email || null,
        }));
      }
      return data;
    } catch (err) {
      logout();
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUserDetail(null);
    setName(null);
    setEmail(null);
    localStorage.removeItem("auth");
  };

  // Rehydrate on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.token || isTokenExpired(parsed.token)) {
        logout();
      } else {
        setToken(parsed.token);
        setUserDetail(parsed.userId);
        setName(parsed.name);
        setEmail(parsed.email);
      }
    }
    setLoading(false); //  done initializing
  }, []);

  return (
    <AuthContext.Provider value={{ userDetail, name, email, token, loading, login, loginWithGoogle, loginWithEmailCode, logout, setEmail, setName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
