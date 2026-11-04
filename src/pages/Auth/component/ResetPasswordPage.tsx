import { useState } from "react";
import { describeError } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthField, AuthHeader, AuthLayout } from "@/components/brand/AuthLayout";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { isStrongPassword } from "../helper/validation";
import { resetPasswordUrl } from "@/service/requestUrls.service";
import useRequestToServer from "@/service/httpService";
import ResetPasswordSuccessPage from "./ResetPasswordSuccessPage";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

const ResetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required("New password is required")
    .test(
      "is-strong",
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      (value) => !!value && isStrongPassword(value)
    ),
  confirmPassword: Yup.string()
    .required("Please confirm your password")
    .oneOf([Yup.ref("newPassword")], "Passwords do not match"),
});

const ResetPasswordPage = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { requestToServer } = useRequestToServer();
  const { userId, token } = useParams<{ userId: string; token: string }>();

  const handleSubmit = async (values: { newPassword: string; confirmPassword: string }) => {
    setIsLoading(true);
    try {
      const response = await requestToServer(
        `${resetPasswordUrl}/${userId}/${token}`,
        { password: values.newPassword },
        "PATCH"
      );
      if (response.data.statusCode === 200) {
        toast({
          title: "Success",
          description: "Password updated successfully.",
          duration: 5000,
        });
        setIsSuccess(true);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: describeError(err).message || "Operation failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {isSuccess ? (
        <ResetPasswordSuccessPage />
      ) : (
        <>
          <AuthHeader
            note="fresh start"
            title="Set a new password"
            description="Pick something different from the passwords you've used before."
          />

          <Formik
            initialValues={{ newPassword: "", confirmPassword: "" }}
            validationSchema={ResetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched }) => {
              const strong = isStrongPassword(values.newPassword);
              return (
                <Form className="space-y-5" noValidate>
                  <AuthField
                    label="New password"
                    htmlFor="newPassword"
                    error={touched.newPassword && errors.newPassword}
                  >
                    <Field
                      as={PasswordInput}
                      id="newPassword"
                      name="newPassword"
                      autoComplete="new-password"
                      placeholder="New password"
                      aria-invalid={!!(touched.newPassword && errors.newPassword)}
                    />
                    {/* Live password strength */}
                    {values.newPassword.length > 0 && !(touched.newPassword && errors.newPassword) && (
                      <div className="flex items-center gap-2 pt-1 text-[12.5px]">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-8 rounded-full ${strong ? "bg-success" : i === 0 ? "bg-warning" : "bg-secondary"}`}
                            />
                          ))}
                        </div>
                        <span className={strong ? "text-success" : "text-muted-foreground"}>
                          {strong ? "Strong password" : "Needs upper and lower case, a number and a symbol"}
                        </span>
                      </div>
                    )}
                  </AuthField>

                  <AuthField
                    label="Confirm password"
                    htmlFor="confirmPassword"
                    error={touched.confirmPassword && errors.confirmPassword}
                  >
                    <Field
                      as={PasswordInput}
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Type it once more"
                      aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}
                    />
                  </AuthField>

                  <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                    {isLoading ? "Updating..." : "Update password"}
                  </Button>
                </Form>
              );
            }}
          </Formik>

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
};

export default ResetPasswordPage;
