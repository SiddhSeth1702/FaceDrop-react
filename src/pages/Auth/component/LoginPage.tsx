import { useCallback, useEffect, useState } from "react";
import { describeError } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthField, AuthHeader, AuthLayout } from "@/components/brand/AuthLayout";
import { AuthDivider, GoogleSignInButton, isGoogleSignInEnabled } from "@/components/brand/GoogleSignInButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { loginUrl, resendVerificationEmailUrl } from "@/service/requestUrls.service";
import useRequestToServer from "@/service/httpService";
import { ROUTES, safeNext } from "@/lib/routes";
import { EmailCodeSignIn } from "@/components/brand/EmailCodeSignIn";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState(""); // new inline error state

  const { requestToServer } = useRequestToServer();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  // Back to where they were headed, e.g. the event they were joining
  const next = safeNext(searchParams.get("next"));
  const nextQuery = searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : "";
  const [usePassword, setUsePassword] = useState(false);

  // run countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMessage("Please fill in all fields."); // inline error
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const data = await login(email, password);

      if (!data) throw { status: 401, message: "Invalid credentials" };

      if (!data.user.is_email_verified) {
        setIsEmailVerified(false);
        toast({
          title: "Email Verification Required",
          description: "Please verify your email before logging in.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Welcome back",
          description: "Good to see you again.",
          variant: "default",
          duration: 5000,
        });
        navigate(next);
      }
    } catch (err) {
      const { status, message: errorText } = describeError(err);
      const message = errorText || "Login failed";

      if (status === 401) {
        setErrorMessage("Invalid credentials"); //  show inline under password
      } else if (status === 403) {
        setIsEmailVerified(false);
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = useCallback(
    async (credential: string) => {
      setErrorMessage("");
      setIsLoading(true);
      try {
        await loginWithGoogle(credential);
        toast({ title: "Welcome back", description: "Good to see you again.", duration: 5000 });
        navigate(next);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Google sign-in failed",
          description: describeError(err).message || "Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, navigate, next, toast]
  );

  const handleResendVerification = async () => {
    try {
      setResendStatus(null);
      const response = await requestToServer(resendVerificationEmailUrl, { email }, "POST");

      if (response.data.statusCode === 200) {
        toast({
          title: "Verification Email Sent",
          description: "Check your inbox for the verification link.",
          variant: "default",
          duration: 5000,
        });

        setResendStatus("success");
        setCooldown(30);
        setIsEmailVerified(true);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthLayout>
      <AuthHeader note="hey, welcome back" title="Sign in to FaceDrop" description="Pick up where you left off: your events and the ones you're in." />

      {isGoogleSignInEnabled && (
        <>
          <GoogleSignInButton onCredential={handleGoogle} text="signin_with" />
          <AuthDivider />
        </>
      )}

      {!usePassword ? (
        <>
          <EmailCodeSignIn onSignedIn={() => navigate(next)} />
          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            Have a password?{" "}
            <button type="button" onClick={() => setUsePassword(true)} className="font-semibold text-primary hover:underline">
              Sign in with it
            </button>
          </p>
        </>
      ) : (
      <>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.in"
            aria-invalid={!!errorMessage}
            required
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="password"
          error={errorMessage}
          aside={
            <Link to="/forgot-password" className="text-[13px] font-semibold text-primary hover:underline">
              Forgot?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            aria-invalid={!!errorMessage}
            required
          />
        </AuthField>

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Email verification box */}
      {!isEmailVerified && (
        <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-5">
          <p className="text-sm font-semibold">Almost there. Please verify your email first.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            We sent a link to {email || "your inbox"}. Can't find it? Check spam, or send a fresh one.
          </p>
          <Button
            type="button"
            variant="ink"
            onClick={handleResendVerification}
            disabled={cooldown > 0}
            className="mt-4 w-full"
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
          </Button>
          {resendStatus === "success" && (
            <p className="mt-2 text-[12.5px] text-success">Sent! Check your inbox.</p>
          )}
          {resendStatus === "error" && (
            <p className="mt-2 text-[12.5px] text-destructive">Couldn't send the email. Please try again.</p>
          )}
        </div>
      )}
      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        <button type="button" onClick={() => setUsePassword(false)} className="font-semibold text-primary hover:underline">
          Email me a code instead
        </button>
      </p>
      </>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to FaceDrop?{" "}
        <Link to={`/signup${nextQuery}`} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
};

export default LoginPage;
