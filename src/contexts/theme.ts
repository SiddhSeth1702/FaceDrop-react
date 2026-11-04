import { createContext, useContext } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "facedrop-theme";

interface ThemeContextValue {
  /** What the user picked. */
  preference: ThemePreference;
  /** What is actually showing after resolving "system". */
  resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
