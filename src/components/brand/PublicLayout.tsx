import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/theme";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { LanguageSwitch } from "./LanguageSwitch";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

/** Website chrome for signed-out visitors: top nav, page, footer. */
export const PublicLayout = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-40 transition-colors",
          scrolled || menuOpen ? "border-b border-border bg-background/90 backdrop-blur" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
          <Link to={ROUTES.home} aria-label="FaceDrop home">
            <Logo size={30} />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Website">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitch />
            <ThemeToggle />
            <AccountActions />
          </div>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-2 hover:bg-secondary md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border px-5 pb-5 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Website">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="py-3 text-[15px] font-medium">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-2">
              <LanguageSwitch />
              <ThemeToggle />
              <AccountActions stretch />
            </div>
          </div>
        )}
      </header>

      <Outlet />

      <SiteFooter />
    </div>
  );
};

/** Signed-in visitors get a way back to their dashboard instead of sign-up buttons. */
const AccountActions = ({ stretch = false }: { stretch?: boolean }) => {
  const { token } = useAuth();

  if (token) {
    return (
      <Button asChild size="sm" className={cn(stretch && "flex-1")}>
        <Link to={ROUTES.dashboard}>Go to dashboard</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild size="sm" variant="ghost" className={cn(stretch && "flex-1")}>
        <Link to={ROUTES.login}>Log in</Link>
      </Button>
      <Button asChild size="sm" variant="ink" className={cn(stretch && "flex-1")}>
        <Link to={ROUTES.signup}>Start free</Link>
      </Button>
    </>
  );
};

const ThemeToggle = () => {
  const { resolved, setPreference } = useTheme();
  const dark = resolved === "dark";

  return (
    <button
      onClick={() => setPreference(dark ? "light" : "dark")}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
};

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: ROUTES.login },
      { label: "Create an account", to: ROUTES.signup },
      { label: "Find my photos", to: ROUTES.joined },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#privacy" },
      { label: "Terms (coming soon)" },
      { label: "Refunds (coming soon)" },
    ],
  },
];

const SiteFooter = () => (
  <footer className="border-t border-border">
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
      <div className="max-w-xs">
        <Logo size={28} />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Event photos, delivered by face. Made in India for wedding and event photographers.
        </p>
      </div>
      {FOOTER_COLUMNS.map((column) => (
        <div key={column.title}>
          <p className="text-sm font-semibold">{column.title}</p>
          <ul className="mt-3 space-y-2.5">
            {column.links.map((link) => (
              <li key={link.label} className="text-sm text-muted-foreground">
                {"to" in link && link.to ? (
                  <Link to={link.to} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                ) : "href" in link && link.href ? (
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                ) : (
                  <span className="opacity-70">{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} FaceDrop. Prices exclude 18% GST.</p>
        <p>
          designed &amp; built by <span className="font-hand text-lg font-semibold text-foreground">Siddh</span>
        </p>
      </div>
    </div>
  </footer>
);
