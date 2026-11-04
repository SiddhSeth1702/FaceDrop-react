import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField } from "@/components/brand/AuthLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MailWarning, Save, SlidersHorizontal, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import useRequestToServer from "@/service/httpService";
import {
  profileUpdateUrl,
  profileUrl,
  resendVerificationEmailUrl,
} from "@/service/requestUrls.service";
import {
  profileResponse,
  ProfileUpdateResponse,
} from "@/pages/Auth/helper/response";
import { getInitials, ProfileSchema } from "@/pages/Auth/helper/validation";
import { useToast } from "@/hooks/use-toast";
import { useLoader } from "@/contexts/LoaderContext";
import { Formik, Form, Field, FormikHelpers } from "formik";
import { FaceSection } from "./FaceSection";
import { ThemeSwitch } from "@/components/brand/ThemeSwitch";
import { LanguageSwitch } from "@/components/brand/LanguageSwitch";

type RequestError = {
  status?: number;
  message?: string;
  response?: { status?: number; data?: { message?: string } };
};

const ProfilePage = () => {
  const { name, email, setName, setEmail, token, logout } = useAuth();
  const { requestToServer } = useRequestToServer();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({ name: name || "", email: email || "" });
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isEmailSentForVerification, setIsEmailSentForVerification] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ----- Utility to update both global & local state -----
  const updateGlobalProfile = (user: profileResponse) => {
    setName(user.name);
    setEmail(user.email);
    setProfileData({ name: user.name, email: user.email });
  };

  // ----- Fetch profile on page load or token change -----
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        showLoader();
        const fresh = await requestToServer(profileUrl, {}, "GET");
        if (fresh?.data?.data) {
          updateGlobalProfile(fresh.data.data);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch profile:", err);
        toast({
          title: "Error",
          description: "Failed to load profile.",
          variant: "destructive",
        });
      } finally {
        hideLoader();
      }
    };

    fetchProfile();
  }, [token]);

  // ----- Cooldown timer for resend email button -----
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // ----- Profile update -----
  const handleProfileSubmit = async (
    values: { name: string; email: string },
    { setSubmitting, setErrors }: FormikHelpers<{ name: string; email: string }>
  ) => {
    try {
      showLoader();

      // Trim whitespace from values
      const trimmedValues = {
        name: values.name?.trim(),
        email: values.email?.trim()
      };

      // Send update request
      const response = await requestToServer(profileUpdateUrl, { new_name: trimmedValues.name, new_email: trimmedValues.email }, "PATCH");

      const httpStatus: number | undefined =
        typeof response?.status === "number"
          ? response.status
          : typeof response?.data?.statusCode === "number"
            ? response.data.statusCode
            : undefined;

      const bodyStatus = response?.data?.status;
      const succeeded =
        (typeof httpStatus === "number" && httpStatus >= 200 && httpStatus < 300) ||
        bodyStatus === "success" ||
        bodyStatus === true;

      if (!succeeded) {
        const serverMessage = response?.data?.message || response?.message || "Profile update failed.";
        if (httpStatus === 409) {
          setErrors({ email: "This email is already registered. Please use another." });
        } else {
          setErrors({ email: serverMessage });
        }
        return;
      }

      const data: ProfileUpdateResponse | undefined = response?.data?.data;
      if (!data) {
        setErrors({ email: "Unexpected server response. Please try again." });
        return;
      }

      // Update state directly from response
      if (data.updatedUser) {
        updateGlobalProfile(data.updatedUser);
      }

      // Handle email verification flow
      if (data.isEmailUpdate) {
        setVerifiedEmail(values.email);
        setIsEmailSentForVerification(true);
      }

      toast({ title: "Success", description: "Profile updated successfully!", duration: 5000 });
    } catch (caught: unknown) {
      const err = caught as RequestError;
      const status = err?.response?.status ?? err?.status;
      if (status === 401 || status === 403) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
        logout();
      } else if (status === 409) {
        setErrors({ email: "This email is already registered. Please try another." });
      } else {
        setErrors({ email: err?.response?.data?.message || err?.message || "Profile update failed." });
      }
    } finally {
      hideLoader();
      setSubmitting(false);
    }
  };

  // ----- Resend verification email -----
  const handleResendVerification = async () => {
    try {
      const response = await requestToServer(resendVerificationEmailUrl, { email: verifiedEmail }, "POST");
      if (response?.data?.statusCode === 200) {
        toast({ title: "Verification Email Sent", description: "Check your inbox.", duration: 5000 });
        setCooldown(30);
      }
    } catch {
      toast({ title: "Error", description: "Failed to send verification email.", variant: "destructive" });
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Settings</h1>
          <p className="-rotate-2 font-hand text-xl font-semibold text-primary">your account, your face</p>
        </div>

        {/* Who you are */}
        <header className="mb-8 flex items-center gap-5">
          <Avatar className="h-16 w-16 -rotate-3 rounded-2xl sm:h-20 sm:w-20">
            <AvatarFallback className="rounded-2xl bg-iris-500 font-display text-xl font-bold text-white sm:text-2xl">
              {getInitials(profileData.name || name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="mb-1 inline-block -rotate-2 font-hand text-2xl font-semibold leading-tight text-primary">that's you</p>
            <h2 className="truncate text-[26px] font-bold leading-tight sm:text-[30px]">{profileData.name || "Your account"}</h2>
            <p className="truncate text-sm text-muted-foreground">{profileData.email}</p>
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
        {/* Profile Form */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <SectionTitle icon={<User />} title="Profile information" description="Your name shows on reviews you write and in Group members." />
          <Formik initialValues={profileData} validationSchema={ProfileSchema} onSubmit={handleProfileSubmit} enableReinitialize>
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-5" noValidate>
                <AuthField label="Full name" htmlFor="name" error={touched.name && errors.name}>
                  <Field as={Input} id="name" name="name" autoComplete="name" aria-invalid={!!(touched.name && errors.name)} />
                </AuthField>

                <AuthField
                  label="Email"
                  htmlFor="email"
                  error={touched.email && errors.email}
                  hint="Changing it? We'll send a verification link to the new address."
                >
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!(touched.email && errors.email)}
                  />
                </AuthField>

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={isSubmitting}>
                    <Save />
                    {isSubmitting ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </section>

        {/* Email Verification Section */}
        {isEmailSentForVerification && (
          <section className="rounded-2xl border border-warning/40 bg-warning/10 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-warn-foreground" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Please verify your new email</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  We've sent a verification email to <span className="font-semibold text-foreground">{verifiedEmail}</span>.
                  Didn't get it? Resend below.
                </p>
                <Button
                  variant="ink"
                  onClick={handleResendVerification}
                  disabled={cooldown > 0}
                  className="mt-4 w-full sm:w-auto"
                >
                  {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Preferences: how the app looks and which language it speaks */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <SectionTitle icon={<SlidersHorizontal />} title="Preferences" description="Saved in this browser." />
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold">Theme</span>
              <ThemeSwitch />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold">Language</span>
              <LanguageSwitch />
            </div>
          </div>
        </section>
        </div>

        <FaceSection />
        </div>
    </div>
  );
};

const SectionTitle = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="mb-6 flex items-start gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
      {icon}
    </span>
    <div>
      <h2 className="text-lg font-bold leading-tight">{title}</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default ProfilePage;
