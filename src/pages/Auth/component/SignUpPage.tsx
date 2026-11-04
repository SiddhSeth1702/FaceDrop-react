import { useCallback, useState } from "react";
import { describeError } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthField, AuthHeader, AuthLayout } from "@/components/brand/AuthLayout";
import { AuthDivider, GoogleSignInButton, isGoogleSignInEnabled } from "@/components/brand/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES, safeNext } from "@/lib/routes";
import { EmailCodeSignIn } from "@/components/brand/EmailCodeSignIn";
import { useToast } from "@/hooks/use-toast";
import useRequestToServer from "@/service/httpService";
import { signUpUrl } from "@/service/requestUrls.service";
import { isStrongPassword, SignUpSchema } from "../helper/validation";
import EmailSent from "./EmailSent";
import { Field, Form, Formik } from "formik";
const SignUpPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const { requestToServer } = useRequestToServer();
  const { loginWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");
  // After signing up: the chosen plan, or where they were headed (e.g. an event they're joining)
  const afterSignUp = plan ? `${ROUTES.createEvent}?plan=${encodeURIComponent(plan)}` : safeNext(searchParams.get("next"));
  const nextQuery = searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : "";
  const [usePassword, setUsePassword] = useState(false);

  // Google accounts are already verified, so go straight in (to the chosen plan, if any).
  const handleGoogle = useCallback(
    async (credential: string) => {
      setIsLoading(true);
      try {
        await loginWithGoogle(credential);
        toast({ title: "You're in", description: "Your FaceDrop account is ready.", duration: 5000 });
        navigate(afterSignUp);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Google sign-up failed",
          description: describeError(err).message || "Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithGoogle, navigate, afterSignUp, toast]
  );
  const handleSubmit = async (values: { fullName: string; email: string; password: string }) => {
    // Trim whitespace from values
    const trimmedValues = {
      fullName: values.fullName?.trim(),
      email: values.email?.trim(),
      password: values.password?.trim()
    };

    setEmail(trimmedValues.email);
    if (!isStrongPassword(trimmedValues.password)) {
      toast({
        title: "Weak Password",
        description:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    // Simulate API call
    try {
      const response = await requestToServer(
        `${signUpUrl}`,
        {
          name: trimmedValues.fullName,
          email: trimmedValues.email,
          password: trimmedValues.password,
        },
        "POST"
      );
      if (response.data.statusCode === 200) {
        setIsSubmitted(true);
        toast({
          title: "Success",
          description: "Account created successfully! Please check your email to verify.",
          duration: 5000,
        });
        // navigate("/login");
      } else {
        toast({
          title: "Signup failed",
          description: response.data.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: describeError(err).message || "Signup failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthLayout>
      {isSubmitted ? (
        <EmailSent email={email} onTryAgain={() => setIsSubmitted(false)} isFromSignUp />
      ) : (
        <>
          <AuthHeader
            note="hello there"
            title="Create your account"
            description="Find every photo you're in, or share your own events with a QR code. One account for both."
          />

          {isGoogleSignInEnabled && (
            <>
              <GoogleSignInButton onCredential={handleGoogle} text="signup_with" />
              <AuthDivider />
            </>
          )}

          {!usePassword ? (
            <>
              <EmailCodeSignIn askName onSignedIn={() => navigate(afterSignUp)} />
              <p className="mt-5 text-center text-[13px] text-muted-foreground">
                Prefer a password?{" "}
                <button type="button" onClick={() => setUsePassword(true)} className="font-semibold text-primary hover:underline">
                  Sign up with one
                </button>
              </p>
            </>
          ) : (
          <>
          <Formik
            initialValues={{ fullName: "", email: "", password: "" }}
            validationSchema={SignUpSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched }) => (
              <Form className="space-y-5" noValidate>
                <AuthField label="Full name" htmlFor="fullName" error={touched.fullName && errors.fullName}>
                  <Field
                    as={Input}
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    aria-invalid={!!(touched.fullName && errors.fullName)}
                  />
                </AuthField>

                <AuthField label="Email" htmlFor="email" error={touched.email && errors.email}>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@studio.in"
                    aria-invalid={!!(touched.email && errors.email)}
                  />
                </AuthField>

                <AuthField
                  label="Password"
                  htmlFor="password"
                  error={touched.password && errors.password}
                  hint="8+ characters with upper and lower case, a number and a symbol."
                >
                  <Field
                    as={PasswordInput}
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    aria-invalid={!!(touched.password && errors.password)}
                  />
                </AuthField>

                <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                  {isLoading ? "Creating your account..." : "Create account"}
                </Button>
              </Form>
            )}
          </Formik>
          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            <button type="button" onClick={() => setUsePassword(false)} className="font-semibold text-primary hover:underline">
              Email me a code instead
            </button>
          </p>
          </>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            By signing up you agree to our{" "}
            <button type="button" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </button>{" "}
            and{" "}
            <button type="button" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </button>
            .
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={`/login${nextQuery}`} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
};
export default SignUpPage;