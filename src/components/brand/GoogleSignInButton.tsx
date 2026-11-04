import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/theme";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let scriptPromise: Promise<GoogleIdentity> | null = null;

/** Loads Google Identity Services once per page. */
const loadGoogleIdentity = () => {
  scriptPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google sign-in unavailable")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

// GIS keeps a single callback per page, so route it to whichever button is mounted.
let activeHandler: ((credential: string) => void) | null = null;
let initialized = false;

export const isGoogleSignInEnabled = Boolean(CLIENT_ID);

interface GoogleSignInButtonProps {
  /** Receives the Google ID token to send to the API. */
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

/** Google's own button (required by their branding rules), sized to its container. Renders nothing until a client ID is configured. */
export const GoogleSignInButton = ({ onCredential, text = "continue_with" }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    activeHandler = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        if (!initialized) {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (response: GoogleCredentialResponse) => activeHandler?.(response.credential),
            ux_mode: "popup",
          });
          initialized = true;
        }
        containerRef.current.innerHTML = "";
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: resolved === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: Math.min(400, Math.max(200, containerRef.current.offsetWidth)),
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [resolved, text]);

  if (!CLIENT_ID) return null;
  if (failed) {
    return <p className="text-center text-[12.5px] text-muted-foreground">Google sign-in couldn't load. Use your email instead.</p>;
  }
  return <div ref={containerRef} className="flex h-11 w-full justify-center [color-scheme:normal]" />;
};

/** "or" rule between the Google button and the email form. */
export const AuthDivider = () => (
  <div className="my-6 flex items-center gap-3 text-[12.5px] text-muted-foreground" role="separator">
    <span className="h-px flex-1 bg-border" />
    or use your email
    <span className="h-px flex-1 bg-border" />
  </div>
);
