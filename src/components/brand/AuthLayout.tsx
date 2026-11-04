import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, MailCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ROUTES } from "@/lib/routes";
import { LanguageSwitch } from "./LanguageSwitch";

/* AI-generated stand-ins for a real event, kept in public/photos. */
const COLLAGE: { film: string; caption: string; className: string; src?: string; found?: boolean }[] = [
  { film: "film-2", caption: "the baraat ♡", className: "left-0 top-[12%] w-[42%] -rotate-6", src: "/photos/baraat.jpg" },
  { film: "film-1", caption: "sangeet, way too late", className: "left-[35%] top-0 z-10 w-[41%] rotate-3", src: "/photos/sangeet.jpg", found: true },
  { film: "film-4", caption: "Sharma uncle. again.", className: "right-[1%] top-[40%] w-[41%] rotate-[7deg]", src: "/photos/sharma-uncle.jpg" },
];

const PhotoCollage = () => (
  <div className="relative mx-auto h-[480px] w-full max-w-[560px] xl:h-[520px]" aria-hidden="true">
    {COLLAGE.map((photo) => (
      <figure key={photo.caption} className={cn("polaroid absolute", photo.className)}>
        {photo.found && <span className="tape" />}
        <div className="relative overflow-hidden rounded-[3px]">
          {photo.src ? (
            <img src={photo.src} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          ) : (
            <div className={cn("film aspect-[4/5] w-full", photo.film)} />
          )}
          {photo.found && <span className="finder" />}
        </div>
        <figcaption className="px-1 pb-3 pt-2.5 text-center font-hand text-xl font-semibold text-ink-800">
          {photo.caption}
        </figcaption>
      </figure>
    ))}
    <div className="absolute bottom-0 left-[6%] z-20 text-lime-500">
      <span className="block -rotate-6 font-hand text-[26px] font-semibold">that's you!</span>
      <svg width="120" height="60" viewBox="0 0 120 60" className="ml-16 overflow-visible">
        <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 52 C 30 54, 62 44, 84 22 C 90 16, 95 11, 101 6" />
          <path d="M88 7 L 102 5 L 99 19" />
        </g>
      </svg>
    </div>
  </div>
);

interface AuthLayoutProps {
  children: ReactNode;
}

/** Split screen used by every signed-out page: brand story on the left, form on the right. */
export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative hidden flex-col justify-between gap-8 overflow-hidden border-r border-sidebar-border bg-sidebar p-10 text-white lg:flex xl:p-12">
      <Link to={ROUTES.home} className="w-fit">
        <Logo variant="inverse" />
      </Link>
      <PhotoCollage />
      <div className="max-w-md">
        <p className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em]">
          One selfie. Every photo you're in.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-white/60">
          Upload the whole shoot. FaceDrop finds each guest in seconds and sends them straight to their photos.
        </p>
      </div>
    </aside>

    <main className="relative flex items-center justify-center px-5 py-10 sm:px-10">
      <LanguageSwitch className="absolute right-5 top-5" />
      <div className="w-full max-w-[420px]">
        <Link to={ROUTES.home} className="mb-10 inline-block lg:hidden">
          <Logo />
        </Link>
        {children}
      </div>
    </main>
  </div>
);

interface AuthHeaderProps {
  /** Short handwritten note above the title. */
  note?: string;
  title: string;
  description?: ReactNode;
}

export const AuthHeader = ({ note, title, description }: AuthHeaderProps) => (
  <div className="mb-8">
    {note && <p className="mb-2 inline-block -rotate-2 font-hand text-2xl font-semibold text-primary">{note}</p>}
    <h1 className="text-[34px] font-bold leading-[1.05] sm:text-[40px]">{title}</h1>
    {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
  </div>
);

const STATUS_STYLES = {
  success: { icon: Check, className: "bg-lime-100 text-live-foreground" },
  error: { icon: X, className: "bg-destructive/10 text-destructive" },
  mail: { icon: MailCheck, className: "bg-iris-100 text-iris-700" },
  loading: { icon: Loader2, className: "bg-secondary text-muted-foreground" },
};

export const StatusIcon = ({ status }: { status: keyof typeof STATUS_STYLES }) => {
  const { icon: Icon, className } = STATUS_STYLES[status];
  return (
    <div className={cn("mb-6 flex h-14 w-14 -rotate-3 items-center justify-center rounded-2xl", className)}>
      <Icon className={cn("h-7 w-7", status === "loading" && "animate-spin")} strokeWidth={2.4} />
    </div>
  );
};

interface AuthFieldProps {
  label: string;
  htmlFor: string;
  error?: string | false;
  hint?: string;
  /** Element shown at the right of the label, e.g. a "Forgot?" link. */
  aside?: ReactNode;
  children: ReactNode;
}

export const AuthField = ({ label, htmlFor, error, hint, aside, children }: AuthFieldProps) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      {aside}
    </div>
    {children}
    {error ? (
      <p className="text-[12.5px] text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-[12.5px] text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);
