import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { describeError } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { emailCodeUrl } from "@/service/requestUrls.service";
import { AuthField } from "./AuthLayout";

const RESEND_SECONDS = 30;

/**
 * Passwordless sign-in: email a 6-digit code, then type it in. Signs up new people too.
 * askName shows an optional name field (for the sign-up page).
 */
export const EmailCodeSignIn = ({ askName, onSignedIn }: { askName?: boolean; onSignedIn: () => void }) => {
  const { requestToServer } = useRequestToServer();
  const { loginWithEmailCode } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email.");
    setBusy(true);
    setError("");
    try {
      const response = await requestToServer(emailCodeUrl, { email: email.trim() }, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      setStep("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(describeError(err).message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    setError("");
    try {
      await loginWithEmailCode(email.trim(), code, name.trim() || undefined);
      onSignedIn();
    } catch (err) {
      setError(describeError(err).message || "That code didn't work. Please try again.");
      setBusy(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-5" noValidate>
        {askName && (
          <AuthField label="Your name" htmlFor="code-name" hint="Optional. Hosts see it on your reviews.">
            <Input id="code-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" maxLength={80} />
          </AuthField>
        )}
        <AuthField label="Email" htmlFor="code-email" error={error}>
          <Input
            id="code-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!error}
            required
          />
        </AuthField>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Mail />}
          Email me a code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5" noValidate>
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-semibold text-foreground">{email.trim()}</span>. It works for 10 minutes.
      </p>
      <AuthField label="Code" htmlFor="code-input" error={error}>
        <Input
          id="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          aria-invalid={!!error}
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
      </AuthField>
      <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="w-full">
        {busy && <Loader2 className="animate-spin" />}
        Continue
      </Button>
      <div className="flex items-center justify-between text-[13px]">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError("");
          }}
          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Different email
        </button>
        <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || busy} className="font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
        </button>
      </div>
    </form>
  );
};
