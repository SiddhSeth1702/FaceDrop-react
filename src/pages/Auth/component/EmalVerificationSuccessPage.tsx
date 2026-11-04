import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthHeader, AuthLayout, StatusIcon } from "@/components/brand/AuthLayout";

const EmailVerificationSuccessPage = () => {
    return (
        <AuthLayout>
            <StatusIcon status="success" />
            <AuthHeader
                note="you're in"
                title="Email verified"
                description="Your account is active. Sign in to create your first event."
            />
            <Button asChild size="lg" className="w-full">
                <Link to="/login">Go to sign in</Link>
            </Button>
        </AuthLayout>
    );
};

export default EmailVerificationSuccessPage;
