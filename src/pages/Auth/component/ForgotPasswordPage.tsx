import { useState } from "react";
import { describeError } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField, AuthHeader, AuthLayout } from "@/components/brand/AuthLayout";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { forgetPasswordUrl } from "@/service/requestUrls.service";
import useRequestToServer from "@/service/httpService";
import EmailSent from "./EmailSent";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { requestToServer } = useRequestToServer();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    // Simulate API call
    setTimeout(async () => {
      try {
        const response = await requestToServer(
          `${forgetPasswordUrl}`,
          {
            email,
          },
          "POST"
        );
        if (response.data.statusCode === 200) {
          setIsSubmitted(true);
          toast({
            title: "Email Sent",
            description: "Password reset instructions have been sent to your email.",
            duration: 5000,
          });

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
          description: describeError(err).message || "Couldn't send the reset link. Please try again.",
          variant: "destructive",
        });
      }
      finally {
        setIsLoading(false);
      }
    }
      , 1500);
  };
  return (
    <AuthLayout>
      {isSubmitted ? (
        <EmailSent email={email} onTryAgain={() => setIsSubmitted(false)} />
      ) : (
        <>
          <AuthHeader
            note="happens to the best of us"
            title="Forgot your password?"
            description="Enter the email you signed up with and we'll send you a link to set a new one."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.in"
                required
              />
            </AuthField>

            <Button type="submit" size="lg" disabled={isLoading} className="w-full">
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;