import React, { useEffect, useState } from "react";
import { describeError } from "@/lib/utils";
import { useParams, Link, useNavigate } from "react-router-dom";
import { verifyEmailUrl } from "@/service/requestUrls.service";
import { toast } from "@/hooks/use-toast";
import useRequestToServer from "@/service/httpService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthHeader, AuthLayout, StatusIcon } from "@/components/brand/AuthLayout";
import { ROUTES } from "@/lib/routes";

const VerifyEmailPage = () => {
    const { userId, token } = useParams<{ userId: string; token: string }>();
    const { token: authToken, logout } = useAuth();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const navigate = useNavigate();
    const { requestToServer } = useRequestToServer();


    useEffect(() => {
        const verify = async () => {
            setStatus("loading");
            try {
                const response = await requestToServer(
                    verifyEmailUrl,
                    { token, user_id: userId },
                    "POST"
                );

                if (response.data.statusCode === 200) {
                    setStatus("success");
                    toast({
                        title: "Success",
                        description: "Email verified successfully.",
                        duration: 5000,
                    });

                    setTimeout(() => {
                        if (authToken) {
                            // User is logged in → go to dashboard
                            navigate(ROUTES.dashboard, { replace: true });
                        } else {
                            // Not logged in → go to login
                            navigate("/login", { replace: true });
                        }
                    }, 2000);
                } else {
                    setStatus("error");
                    toast({
                        title: "Verification Failed",
                        description: response.data.message || "Something went wrong.",
                        variant: "destructive",
                    });
                }
            } catch (err) {
                setStatus("error");
                toast({
                    title: "Error",
                    description: describeError(err).message || "Verification failed. Please try again.",
                    variant: "destructive",
                });
            }
        };

        if (userId && token) {
            verify();
        }
        // Runs once per link; requestToServer is recreated every render, so it can't be a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, token, navigate]);
    return (
        <AuthLayout>
            {status === "loading" && (
                <>
                    <StatusIcon status="loading" />
                    <AuthHeader title="Verifying your email..." description="This only takes a second." />
                </>
            )}

            {status === "success" && (
                <>
                    <StatusIcon status="success" />
                    <AuthHeader
                        note="you're in"
                        title="Email verified"
                        description={authToken ? "Taking you to your events..." : "Taking you to sign in..."}
                    />
                </>
            )}

            {status === "error" && (
                <>
                    <StatusIcon status="error" />
                    <AuthHeader
                        title="This link didn't work"
                        description="It may have expired or already been used. Sign in and we'll help you send a new one."
                    />
                    <Button asChild size="lg" className="w-full">
                        <Link to="/login">Go to sign in</Link>
                    </Button>
                </>
            )}
        </AuthLayout>
    );
};

export default VerifyEmailPage;
