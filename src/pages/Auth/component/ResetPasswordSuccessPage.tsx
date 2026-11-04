import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthHeader, StatusIcon } from "@/components/brand/AuthLayout";

/** Content shown inside AuthLayout after a successful password reset. */
const ResetPasswordSuccessPage = () => {
  return (
    <div>
      <StatusIcon status="success" />
      <AuthHeader
        note="all set"
        title="Password updated"
        description="Your new password is ready. Sign in with it to get back to your events."
      />
      <Button asChild size="lg" className="w-full">
        <Link to="/login">Sign in</Link>
      </Button>
    </div>
  );
};

export default ResetPasswordSuccessPage;
