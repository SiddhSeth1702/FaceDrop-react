import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, CreditCard, LayoutGrid, MessageSquareQuote, Ticket, Loader2, ChevronsUpDown, LogOut, Menu, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLoader } from "@/contexts/LoaderContext";
import { getInitials } from "@/pages/Auth/helper/validation";
import { cn } from "@/lib/utils";
import { getAllUploads, subscribeToAllUploads } from "@/pages/Event/helper/uploadManager";
import { formatCount, formatDay, PlansResponse, usePlans } from "@/pages/Billing/helper/billing";
import { usePendingReviewCount } from "@/pages/Insights/helper/insights";
import { Logo, LogoMark } from "./Logo";
import { ROUTES } from "@/lib/routes";

/** The sidebar in two groups: what you host, and what you've been invited to. Billing lives in the account menu. */
const NAV_GROUPS = [
  {
    title: "Hosting",
    items: [
      { to: ROUTES.dashboard, label: "My events", icon: LayoutGrid, match: (path: string) => path === ROUTES.dashboard || path.startsWith("/dashboard/events") },
      { to: ROUTES.insights, label: "Insights", icon: BarChart3, match: (path: string) => path.startsWith(ROUTES.insights) },
      { to: ROUTES.reviews, label: "Reviews", icon: MessageSquareQuote, match: (path: string) => path.startsWith(ROUTES.reviews) },
    ],
  },
  {
    title: "Attending",
    items: [{ to: ROUTES.joined, label: "Events I'm in", icon: Ticket, match: (path: string) => path.startsWith(ROUTES.joined) }],
  },
];


/** Signed-in photographer layout: ink sidebar on desktop, top bar + drawer on mobile. */
export const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <Link to={ROUTES.dashboard} aria-label="FaceDrop home">
          <Logo variant="inverse" size={28} />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-full p-2 text-white hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-white">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="lg:pl-[248px]">
        {/* Page-level fallback keeps the sidebar on screen while a page chunk loads */}
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <LogoMark size={36} className="animate-pulse" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

const SidebarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, name, email } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { data: plans } = usePlans();
  const pendingReviews = usePendingReviewCount();

  const handleLogout = () => {
    showLoader();
    logout();
    hideLoader();
    toast.success("Signed out. See you at the next event!", { duration: 2000 });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-4 text-sidebar-foreground">
      <Link to={ROUTES.dashboard} aria-label="FaceDrop home" className="px-2 pt-2">
        <Logo variant="inverse" size={30} />
      </Link>

      <Button
        variant="signal"
        className="w-full justify-start"
        onClick={() => navigate(ROUTES.createEvent)}
      >
        <Plus />
        New event
      </Button>

      <nav className="space-y-5" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-xs font-semibold text-ink-400/80">{group.title}</p>
            <div className="space-y-1">
        {group.items.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-lime-500")} />
              {label}
              {to === ROUTES.reviews && pendingReviews > 0 && (
                <span className="ml-auto rounded-full bg-lime-500 px-1.5 py-px font-mono text-[11px] font-bold text-ink-950" aria-label={`${pendingReviews} new`}>
                  {pendingReviews}
                </span>
              )}
            </NavLink>
          );
        })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <UploadIndicator />
      <PlanWidget plans={plans} />

      {/* Your account: settings and sign out */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 data-[state=open]:bg-white/10",
              [ROUTES.settings, ROUTES.billing, ROUTES.plans].some((path) => location.pathname.startsWith(path)) && "bg-white/10"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-iris-500 text-xs font-semibold text-white">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{name}</span>
              <span className="block truncate text-xs text-ink-400">{email}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]">
          <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)} className="gap-2.5">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(ROUTES.billing)} className="gap-2.5">
            <CreditCard className="h-4 w-4" />
            Plans & billing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} className="gap-2.5 text-danger-foreground focus:text-danger-foreground">
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/** The photographer's balance at a glance: Studio usage, the free trial, or pay-per-event. */
const PlanWidget = ({ plans }: { plans: PlansResponse | null }) => {
  if (!plans) return null;
  const studio = plans.studio;

  if (studio) {
    const { allowance, used, remaining } = studio.usage;
    const percent = allowance ? Math.min(100, (used / allowance) * 100) : 0;
    return (
      <Link to={ROUTES.billing} className="block rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-white">Studio {studio.plan.name}</p>
          <p className="font-mono text-xs text-ink-400">
            {formatCount(used)} / {formatCount(allowance)}
          </p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2.5 text-xs text-ink-400">
          {formatCount(remaining)} photos left · {studio.cancel_at_period_end ? "ends" : "renews"} {formatDay(studio.period_end)}
        </p>
      </Link>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{plans.trial_available ? "Free trial ready" : "Pay per event"}</p>
      <p className="mt-0.5 text-xs text-ink-400">
        {plans.trial_available ? "Your first event is free, up to 200 photos." : "Pick an Event Pass when you create an event."}
      </p>
      <Link to={ROUTES.plans} className="mt-3 inline-block text-sm font-semibold text-lime-500 hover:underline">
        See plans
      </Link>
    </div>
  );
};

/** Uploads keep running on every page; this shows their progress and links back to the event. */
const UploadIndicator = () => {
  const uploads = useSyncExternalStore(subscribeToAllUploads, getAllUploads);
  const location = useLocation();
  // The event page has its own detailed progress
  const visible = uploads.filter((u) => location.pathname !== ROUTES.event(u.eventId));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((upload) => (
        <Link
          key={upload.eventId}
          to={ROUTES.event(upload.eventId)}
          className="block rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {upload.inFlight ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-lime-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <span className="truncate">
              {upload.inFlight
                ? `Uploading ${upload.done.toLocaleString("en-IN")} of ${upload.total.toLocaleString("en-IN")}`
                : `${upload.failed.toLocaleString("en-IN")} ${upload.failed === 1 ? "upload" : "uploads"} failed`}
            </span>
          </div>
          {upload.label && <p className="mt-0.5 truncate pl-[22px] text-xs text-ink-400">{upload.label}</p>}
          {upload.inFlight && (
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime-500 transition-[width] duration-300" style={{ width: `${upload.percent}%` }} />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
};

