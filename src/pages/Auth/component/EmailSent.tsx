import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { AuthHeader, StatusIcon } from "@/components/brand/AuthLayout";

interface EmailSentProps {
    email: string;
    onTryAgain: () => void;
    isFromSignUp?: boolean;
}

/** Content shown inside AuthLayout once a verification or reset email has gone out. */
const EmailSent: React.FC<EmailSentProps> = ({ email, onTryAgain, isFromSignUp }) => {
    return (
        <div>
            <StatusIcon status="mail" />
            <AuthHeader
                note="check your inbox"
                title={isFromSignUp ? "Verify your email" : "Reset link sent"}
                description={
                    <>
                        We sent {isFromSignUp ? "a verification link" : "password reset instructions"} to{" "}
                        <span className="font-semibold text-foreground">{email}</span>.
                        {isFromSignUp && " Open it to activate your account."}
                    </>
                }
            />

            {!isFromSignUp && (
                <p className="mb-8 text-sm text-muted-foreground">
                    Didn't get it? Check your spam folder or{" "}
                    <button onClick={onTryAgain} className="font-semibold text-primary hover:underline">
                        try again
                    </button>
                    .
                </p>
            )}

            <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
            </Link>
        </div>
    );
};

export default EmailSent;
