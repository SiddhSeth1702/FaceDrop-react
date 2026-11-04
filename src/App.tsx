import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
import ToasterProvider from "./contexts/ToasterProvider";
import { LogoMark } from "./components/brand/Logo";
import { ErrorBoundary } from "./components/brand/ErrorBoundary";
import { AppShell } from "./components/brand/AppShell";
import { PublicLayout } from "./components/brand/PublicLayout";
import { ROUTES, safeNext } from "./lib/routes";

// Each page loads on demand, so guests opening a shared link don't download the photographer app.
const LandingPage = lazy(() => import("./pages/Marketing/LandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignUpPage = lazy(() => import("./pages/Auth/component/SignUpPage"));
const LoginPage = lazy(() => import("./pages/Auth/component/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/Auth/component/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/Auth/component/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/Auth/component/VerifyEmailPage"));
const PlansPage = lazy(() => import("./pages/Billing/component/PlansPage"));
const BillingPage = lazy(() => import("./pages/Billing/component/BillingPage"));
const InsightsPage = lazy(() => import("./pages/Insights/component/InsightsPage"));
const JoinPage = lazy(() => import("./pages/Joined/component/JoinPage"));
const JoinedListPage = lazy(() => import("./pages/Joined/component/JoinedListPage"));
const JoinedEventPage = lazy(() => import("./pages/Joined/component/JoinedEventPage"));
const ReviewsPage = lazy(() => import("./pages/Insights/component/ReviewsPage"));
const Dashboard = lazy(() => import("./pages/Profile/component/Dashboard"));
const ProfilePage = lazy(() => import("./pages/Profile/component/ProfilePage"));
const CreateEventPage = lazy(() => import("./pages/Event/component/CreateEventPage"));
const EventDetailPage = lazy(() => import("./pages/Event/component/EventDetailPage"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <LogoMark size={40} className="animate-pulse" />
  </div>
);

const AuthCheck = ({ children, isAuth = false }: { children: React.ReactNode; isAuth?: boolean }) => {
  const { token, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="w-full h-full" />;

  if (isAuth) {
    // Public routes (login/signup/etc.); a signed-in visitor goes where they were headed
    return token ? <Navigate to={safeNext(new URLSearchParams(location.search).get("next"))} replace /> : children;
  }

  // Protected routes: come back here after signing in
  return token ? children : <Navigate to={`${ROUTES.login}?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

/** Old paths (bookmarks, emails, the payment callback) forward to their new homes. */
const LegacyGuestRedirect = () => <Navigate to={ROUTES.join(useParams().eventCode ?? "")} replace />;
const LegacyEventRedirect = () => <Navigate to={ROUTES.event(useParams().eventId ?? "")} replace />;

const App = () => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToasterProvider />
        <Sonner position="top-right" />
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/signup" element={<AuthCheck isAuth><SignUpPage /></AuthCheck>} />
            <Route path="/login" element={<AuthCheck isAuth><LoginPage /></AuthCheck>} />
            <Route path="/forgot-password" element={<AuthCheck isAuth><ForgotPasswordPage /></AuthCheck>} />
            <Route path="/reset-password/:userId/:token" element={<AuthCheck isAuth><ResetPasswordPage /></AuthCheck>} />
            {/* <Route path="/verify-email/:userId/:token" element={<AuthCheck isAuth><VerifyEmailPage /></AuthCheck>} />
            //  */}
            <Route path="/verify-email/:userId/:token" element={<VerifyEmailPage />} />

            {/* The QR target: sign in (if needed), join, land in the event */}
            <Route path="/join/:code" element={<AuthCheck><JoinPage /></AuthCheck>} />
            {/* Old guest links (printed QR cards) still work */}
            <Route path="/shared-event/:eventCode" element={<LegacyGuestRedirect />} />
            <Route path="/shared-event" element={<Navigate to={ROUTES.joined} replace />} />
            <Route path="/selfie-results" element={<Navigate to={ROUTES.joined} replace />} />

            {/* Public website */}
            <Route element={<PublicLayout />}>
              <Route path={ROUTES.home} element={<LandingPage />} />
            </Route>

            {/* Photographer app: protected routes share the sidebar shell */}
            <Route path={ROUTES.dashboard} element={<AuthCheck><AppShell /></AuthCheck>}>
              <Route index element={<Dashboard />} />
              <Route path="events/new" element={<CreateEventPage />} />
              <Route path="events/:eventId" element={<EventDetailPage />} />
              <Route path="settings" element={<ProfilePage />} />
              <Route path="profile" element={<Navigate to={ROUTES.settings} replace />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="insights" element={<InsightsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="joined" element={<JoinedListPage />} />
              <Route path="joined/:eventId" element={<JoinedEventPage />} />
            </Route>

            <Route path="/create-event" element={<Navigate to={ROUTES.createEvent} replace />} />
            <Route path="/event/:eventId" element={<LegacyEventRedirect />} />
            <Route path="/profile" element={<Navigate to={ROUTES.settings} replace />} />
            <Route path="/subscription" element={<Navigate to={ROUTES.plans} replace />} />
            <Route path="/subscription-manage" element={<Navigate to={ROUTES.billing} replace />} />
            <Route path="/subscription-success/:order_id" element={<Navigate to={ROUTES.billing} replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};


export default App;
