import { ChangeEvent, CSSProperties, FormEvent, ReactNode, useState } from "react";
import { Instagram, Loader2, MapPin, MessageCircle, Star } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PenCircled } from "@/components/brand/Doodles";
import { formatDate, formatNumber } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { EventRow, Review, Totals } from "@/pages/Insights/helper/insights";
import { EnquiryForm } from "../helper/leads";
import { StudioDraft, StudioPhotoRef } from "../helper/studio";

export type StudioLayout = "wide" | "narrow";

export interface StudioViewProps {
  draft: StudioDraft;
  totals: Pick<Totals, "guests_found"> | null;
  /** Counts from the server for the public page, which only gets the events and reviews it shows. */
  proof?: { delivered: number; rating: number | null; reviewCount: number };
  events: EventRow[];
  reviews: Review[];
  /** Hearts per photo, for the highlight badges. */
  heartsFor: (ref: StudioPhotoRef) => number;
  urlFor: (ref: StudioPhotoRef | null | undefined) => string | null;
  /** Set by the caller (not the screen width), so the builder can preview both. */
  layout: StudioLayout;
  /** In the builder: links and the form don't act. */
  preview?: boolean;
  /** Sends the enquiry form. Resolves to null when it's saved, or a message to show. */
  onEnquire?: (form: EnquiryForm) => Promise<string | null>;
}

/** Polaroid with tape and a handwritten caption. Always paper-white, like a real print. */
const Polaroid = ({ src, caption, className, tape = true }: { src: string | null; caption: string; className?: string; tape?: boolean }) => (
  <figure className={cn("absolute m-0 bg-white px-2.5 pb-9 pt-2.5 shadow-[0_1px_1px_rgba(0,0,0,.08),0_22px_36px_-18px_rgba(0,0,0,.5)]", className)}>
    {tape && <span className="tape" />}
    <span className={cn("block aspect-[4/5] overflow-hidden", !src && "film film-2")}>
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
    </span>
    <figcaption className="absolute inset-x-0 bottom-2 text-center font-hand text-lg font-semibold text-ink-800">{caption}</figcaption>
  </figure>
);

const NOTE_COLOURS = ["bg-[#F8EFC7]", "bg-[#DDEEF8]", "bg-[#F9DDE6]", "bg-[#E2F1DC]"];

/**
 * Page colours for the photographer's chosen theme. Printed things (polaroids, taped notes,
 * event prints) stay paper with ink text in both.
 */
const STUDIO_THEMES = {
  light: {
    "--st-bg": "#FBFBF8",
    "--st-fg": "#0B0B12",
    "--st-muted": "#5C5D6E",
    "--st-line": "rgba(11,11,18,.12)",
    "--st-chip": "#FFFFFF",
    "--st-band": "#0B0B12",
    "--st-enquiry": "#EEECFF",
    "--st-form": "#FFFFFF",
    "--st-field": "#FBFBF8",
  },
  dark: {
    "--st-bg": "#0B0B12",
    "--st-fg": "#F1F0F7",
    "--st-muted": "#A2A2B5",
    "--st-line": "rgba(255,255,255,.12)",
    "--st-chip": "#15151F",
    "--st-band": "#1A1830",
    "--st-enquiry": "#1E1B3D",
    "--st-form": "#15151F",
    "--st-field": "#0B0B12",
  },
} as const;

/** Columns that fit the content: one event shouldn't sit in a three-column grid. */
const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

/** The public Studio page in FaceDrop's hand-made look, light or dark as the photographer chose. */
export const StudioView = ({ draft, totals, proof, events, reviews, heartsFor, urlFor, layout, preview, onEnquire }: StudioViewProps) => {
  const wide = layout === "wide";
  const listedEvents = events.filter((e) => draft.listedEventIds.includes(e.event_id)).slice(0, 6);
  const shownReviews = reviews.filter((r) => !draft.hiddenReviewIds.includes(r.review_id)).slice(0, wide ? 6 : 3);
  const allShown = reviews.filter((r) => !draft.hiddenReviewIds.includes(r.review_id));
  const rating = proof ? proof.rating : allShown.length ? Math.round((allShown.reduce((s, r) => s + r.rating, 0) / allShown.length) * 10) / 10 : null;
  const ratingCount = proof ? proof.reviewCount : allShown.length;
  // Cover in the middle when there is one; highlights fill the other prints (and the middle without a cover)
  const others = draft.highlights.filter((h) => !(draft.cover && h.file_id === draft.cover.file_id && h.event_id === draft.cover.event_id));
  const collage = draft.cover ? [draft.cover, ...others].slice(0, 3) : others.slice(0, 3);
  const pad = wide ? "px-10" : "px-4";
  const igHandle = draft.instagram.replace(/^@/, "").trim();
  const waDigits = draft.whatsapp.replace(/\D/g, "");
  const delivered = proof ? proof.delivered : events.length;
  const services = draft.services.filter((s) => s.name.trim());
  const reelCols = wide ? (draft.highlights.length >= 4 ? "columns-4" : draft.highlights.length === 3 ? "columns-3" : "columns-2") : "columns-2";
  const gridCols = (count: number, max: number) => COLS[Math.max(1, Math.min(count, max))];
  const theme = draft.theme === "dark" ? "dark" : "light";

  const Btn = ({ children, href, variant = "primary" }: { children: ReactNode; href?: string; variant?: "primary" | "ghost" }) => {
    const cls = cn(
      "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
      variant === "primary" ? "bg-iris-500 text-white hover:bg-iris-500/90" : "border border-[var(--st-line)] text-[var(--st-fg)] hover:bg-[var(--st-line)]"
    );
    return href && !preview ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    ) : (
      <span className={cls}>{children}</span>
    );
  };

  return (
    <div className="bg-[var(--st-bg)] text-[var(--st-fg)]" style={{ ...STUDIO_THEMES[theme], colorScheme: theme } as CSSProperties}>
      {/* Nav: just the brand; the enquire button lives in the hero */}
      <div className={cn("flex items-center py-3", pad)}>
        <span className="flex items-center gap-2">
          <Logo size={26} variant={theme === "dark" ? "inverse" : "light"} />
          <span className="text-xs font-medium text-[var(--st-muted)]">Studio</span>
        </span>
      </div>

      {/* Hero */}
      <div className={cn("grid items-center gap-6 pb-8 pt-2", pad, wide ? "grid-cols-[1.05fr_1fr]" : "grid-cols-1")}>
        <div className="min-w-0">
          <span className="inline-block -rotate-3 font-hand text-2xl font-bold text-iris-500">photos by</span>
          <h1 className={cn("mt-1 font-display font-extrabold leading-none tracking-[-0.03em]", wide ? "text-[54px]" : "text-[38px]")}>
            {draft.name || "Your studio name"}
          </h1>
          <p className={cn("mt-3 max-w-[46ch] text-[var(--st-muted)]", !draft.tagline && "italic")}>{draft.tagline || "Your tagline goes here."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.city && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--st-line)] bg-[var(--st-chip)] px-3 py-1 text-[13px]">
                <MapPin className="h-3.5 w-3.5" />
                {draft.city}
              </span>
            )}
            {draft.specialties.map((s) => (
              <span key={s} className="rounded-full border border-[var(--st-line)] bg-[var(--st-chip)] px-3 py-1 text-[13px]">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Btn href="#enquire">Enquire for your date</Btn>
            {igHandle && (
              <Btn href={`https://instagram.com/${igHandle}`} variant="ghost">
                <Instagram className="h-4 w-4" />
                Instagram
              </Btn>
            )}
            {waDigits && (
              <Btn href={`https://wa.me/${waDigits}`} variant="ghost">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Btn>
            )}
          </div>
        </div>
        <div className={cn("relative", wide ? "h-[310px]" : "h-[270px]")} aria-hidden="true">
          {/* Only prints that have a photo; three blank ones until anything is picked */}
          {(collage.length === 0 || collage[1]) && (
            <Polaroid src={urlFor(collage[1])} caption="guests loved this" className="left-[2%] top-6 w-[44%] -rotate-[5deg]" />
          )}
          <Polaroid src={urlFor(collage[0])} caption={draft.city ? `${draft.city.toLowerCase()}, lately` : "lately"} className="left-[29%] top-0 z-10 w-[44%] rotate-3" />
          {(collage.length === 0 || collage[2]) && (
            <Polaroid src={urlFor(collage[2])} caption="the candids" tape={false} className="right-0 top-20 w-[38%] -rotate-1" />
          )}
        </div>
      </div>

      {/* Proof, as one sentence */}
      {delivered > 0 && (
        <div className={cn("bg-[var(--st-band)] py-6 text-white", pad)}>
          <p className={cn("max-w-[52ch] font-display font-semibold leading-[1.6]", wide ? "text-[24px]" : "text-[18px]")}>
            <Num n={delivered} /> {delivered === 1 ? "event" : "events"} delivered on FaceDrop
            {totals && totals.guests_found > 0 ? (
              <>
                , and <Num n={totals.guests_found} /> {totals.guests_found === 1 ? "guest" : "guests"} found themselves in the photos
              </>
            ) : null}
            {rating !== null ? (
              <>
                . Rated <Num n={rating} /> by {ratingCount} {ratingCount === 1 ? "guest" : "guests"}.
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      )}

      {/* Highlights */}
      <Section pad={pad} title="Guests loved these" note={draft.highlights.some((h) => heartsFor(h) > 0) ? "picked by the hearts" : undefined}>
        {draft.highlights.length === 0 ? (
          <Empty>Your highlight photos appear here.</Empty>
        ) : (
          <div className={cn(reelCols, "gap-2")}>
            {draft.highlights.map((h) => {
              const src = urlFor(h);
              const hearts = heartsFor(h);
              return (
                <figure key={`${h.event_id}-${h.file_id}`} className="relative mb-2 break-inside-avoid overflow-hidden rounded-xl bg-[var(--st-line)]">
                  {src ? <img src={src} alt="" loading="lazy" className="block w-full" /> : <span className="film film-1 block aspect-[4/5]" />}
                  {hearts > 0 && (
                    <figcaption className="absolute bottom-2 right-2 rounded-full bg-ink-950/75 px-2 py-0.5 text-xs font-semibold text-white">
                      <span className="text-[#FF6B8E]">♥</span> {formatNumber(hearts)}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        )}
      </Section>

      {/* About and reviews side by side on wide screens, so neither leaves an empty half */}
      {(draft.about.trim() || shownReviews.length > 0) && (
        <div className={cn("grid gap-8 py-6", pad, wide && draft.about.trim() && shownReviews.length > 0 ? "grid-cols-[1fr_1.6fr]" : "grid-cols-1")}>
          {draft.about.trim() && (
            <div className="min-w-0">
              <SectionTitle title={`About ${draft.name.split(" ")[0] || "us"}`} />
              <p className="mt-3 max-w-[62ch] whitespace-pre-line text-[16px] leading-relaxed text-[var(--st-fg)] opacity-90">{draft.about.trim()}</p>
            </div>
          )}
          {shownReviews.length > 0 && (
            <div className="min-w-0">
              <SectionTitle title="What guests said" note="verified: they were there" />
              <ul
                className={cn(
                  "mt-5 grid gap-5",
                  wide ? gridCols(shownReviews.length, draft.about.trim() ? 2 : 3) : "grid-cols-1"
                )}
              >
                {shownReviews.map((r, i) => (
                  <li
                    key={r.review_id}
                    className={cn(
                      "relative px-5 pb-4 pt-6 text-ink-950 shadow-[0_1px_1px_rgba(0,0,0,.08),0_14px_26px_-14px_rgba(0,0,0,.45)]",
                      NOTE_COLOURS[i % NOTE_COLOURS.length],
                      i % 2 ? "rotate-1" : "-rotate-1"
                    )}
                  >
                    <span className="tape !w-16" />
                    <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("h-3.5 w-3.5", n <= r.rating ? "fill-amber-500 text-amber-500" : "text-ink-950/20")} />
                      ))}
                    </span>
                    <p className="mt-2 font-hand text-[21px] font-semibold leading-[1.15]">{r.comment ? `"${r.comment}"` : "no words, just stars"}</p>
                    <p className="mt-3 font-hand text-lg leading-none">— {r.guest_name.split(" ")[0]}</p>
                    <p className="mt-1 text-[11.5px] font-semibold text-[#1F7A50]">✓ Guest at {r.event_title}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Events and services side by side on wide screens */}
      {(listedEvents.length > 0 || services.length > 0) && (
        <div
          className={cn(
            "grid gap-8 py-6",
            pad,
            wide && listedEvents.length > 0 && services.length > 0 ? (listedEvents.length >= 3 ? "grid-cols-1" : "grid-cols-[1.2fr_1fr]") : "grid-cols-1"
          )}
        >
          {listedEvents.length > 0 && (
            <div className="min-w-0">
              <SectionTitle title="Recent events" />
              {/* At least two columns, so a single event stays a normal-sized print */}
              <ul className={cn("mt-5 grid gap-5", wide ? COLS[Math.max(2, Math.min(listedEvents.length, 3))] : "grid-cols-2")}>
                {listedEvents.map((e, i) => (
                  <li
                    key={e.event_id}
                    className={cn("bg-white p-2.5 pb-3.5 text-ink-950 shadow-[0_1px_1px_rgba(0,0,0,.06),0_16px_28px_-18px_rgba(0,0,0,.45)]", i % 2 ? "rotate-1" : "-rotate-1")}
                  >
                    <span className={cn("block aspect-[4/3] overflow-hidden", !e.cover_url && `film film-${(e.event_id % 6) + 1}`)}>
                      {e.cover_url && <img src={e.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <b className="mt-2.5 block truncate text-sm font-semibold">{e.title}</b>
                    <span className="block truncate text-xs text-ink-600">
                      {formatDate(e.event_date, { month: "short", year: "numeric" })}
                      {e.guests > 0 && ` · ${formatNumber(e.guests)} guests`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {services.length > 0 && (
            <div className="min-w-0">
              <SectionTitle title="Services" />
              <div className={cn("mt-3 grid gap-x-8", wide && listedEvents.length >= 3 ? "grid-cols-2" : "grid-cols-1")}>
                {services.map((s) => (
                  <div key={s.id} className="flex justify-between gap-3 border-b border-dashed border-[var(--st-line)] py-3">
                    <b className="font-semibold">{s.name}</b>
                    <span className="whitespace-nowrap text-sm text-[var(--st-muted)]">
                      {draft.showPrices && s.price.trim() ? (
                        <>
                          from <b className="font-semibold text-[var(--st-fg)]">₹{s.price.trim()}</b>
                        </>
                      ) : (
                        "on request"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enquire */}
      <div id="enquire" className={cn("pb-8 pt-4", pad)}>
        <EnquiryCard draft={draft} wide={wide} preview={preview} onEnquire={onEnquire} />
      </div>

      <div className={cn("flex flex-wrap justify-between gap-2 border-t border-[var(--st-line)] py-4 text-[13px] text-[var(--st-muted)]", pad)}>
        <span>© {draft.name || "Your studio"}</span>
        <span>
          Made with <b className="text-[var(--st-fg)]">facedrop.</b> · find your photos with one selfie
        </span>
      </div>
    </div>
  );
};

const Num = ({ n }: { n: number }) => (
  <span className="mx-1 inline-block">
    <PenCircled className="text-lime-500/70">
      <span className="inline-block min-w-[1.2em] text-center font-hand text-[1.4em] font-bold leading-none text-lime-500">{formatNumber(n)}</span>
    </PenCircled>
  </span>
);

const SectionTitle = ({ title, note }: { title: string; note?: string }) => (
  <h2 className="flex flex-wrap items-baseline gap-3 font-display text-[26px] font-extrabold tracking-[-0.01em]">
    {title}
    {note && <span className="inline-block -rotate-2 font-hand text-xl font-bold text-iris-500">{note}</span>}
  </h2>
);

const Section = ({ pad, title, note, children }: { pad: string; title: string; note?: string; children: ReactNode }) => (
  <section className={cn("grid gap-4 py-6", pad)}>
    <SectionTitle title={title} note={note} />
    {children}
  </section>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-[var(--st-line)] px-6 py-8 text-center text-sm text-[var(--st-muted)]">{children}</p>
);

const EMPTY_ENQUIRY: EnquiryForm = { name: "", phone: "", event_date: "", city: "", message: "", website: "" };

/** Today as YYYY-MM-DD in the visitor's own timezone, for the date picker's minimum. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EnquiryCard = ({ draft, wide, preview, onEnquire }: { draft: StudioDraft; wide: boolean; preview?: boolean; onEnquire?: StudioViewProps["onEnquire"] }) => {
  const [form, setForm] = useState<EnquiryForm>(EMPTY_ENQUIRY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const firstName = draft.name.split(" ")[0] || "the photographer";
  const waDigits = draft.whatsapp.replace(/\D/g, "");
  const update = (key: keyof EnquiryForm) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (preview || !onEnquire || sending) return;
    setSending(true);
    setError(null);
    const problem = await onEnquire(form);
    setSending(false);
    if (problem) setError(problem);
    else setSent(true);
  };

  const field = "w-full rounded-xl border border-[var(--st-line)] bg-[var(--st-field)] px-3 py-2.5 text-sm text-[var(--st-fg)] placeholder:text-[var(--st-muted)] focus:outline-none focus:ring-2 focus:ring-iris-500";
  return (
    <div className={cn("grid items-start gap-6 rounded-[22px] bg-[var(--st-enquiry)] p-5 sm:p-7", wide ? "grid-cols-[.9fr_1.1fr]" : "grid-cols-1")}>
      <div>
        <h2 className="font-display text-3xl font-extrabold">Is your date free?</h2>
        <p className="mt-2 text-[var(--st-muted)]">Tell {firstName} about your event. Your message goes straight to them; FaceDrop doesn't share your account details.</p>
        <span className="mt-3 inline-block -rotate-2 font-hand text-xl font-bold text-iris-500">usually replies within a day</span>
      </div>
      {sent ? (
        <div className="rounded-2xl bg-[var(--st-form)] p-6 text-center" role="status">
          <p className="font-hand text-3xl font-bold text-iris-500">sent!</p>
          <p className="mt-1 text-sm text-[var(--st-muted)]">{firstName} has your details and will get back to you soon.</p>
        </div>
      ) : (
        <form onSubmit={submit} className={cn("grid gap-3 rounded-2xl bg-[var(--st-form)] p-4", wide ? "grid-cols-2" : "grid-cols-1")} aria-label="Enquiry form">
          <label className="grid gap-1 text-[12.5px] font-semibold">
            Your name
            <input className={field} placeholder="Neha Kapoor" required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={update("name")} disabled={preview} />
          </label>
          <label className="grid gap-1 text-[12.5px] font-semibold">
            Phone (WhatsApp)
            <input className={field} placeholder="+91 98xxx xxxxx" inputMode="tel" type="tel" required maxLength={20} autoComplete="tel" value={form.phone} onChange={update("phone")} disabled={preview} />
          </label>
          <label className="grid gap-1 text-[12.5px] font-semibold">
            Event date
            <input className={field} type="date" min={todayIso()} value={form.event_date} onChange={update("event_date")} disabled={preview} />
          </label>
          <label className="grid gap-1 text-[12.5px] font-semibold">
            City
            <input className={field} placeholder="City" maxLength={60} value={form.city} onChange={update("city")} disabled={preview} />
          </label>
          <label className={cn("grid gap-1 text-[12.5px] font-semibold", wide && "col-span-2")}>
            What's the event?
            <input className={field} placeholder="Wedding, about 300 guests" maxLength={300} value={form.message} onChange={update("message")} disabled={preview} />
          </label>
          {/* Hidden from people; bots fill it in and get ignored */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={form.website} onChange={update("website")} />
          {error && (
            <p role="alert" className={cn("text-sm font-medium text-red-500", wide && "col-span-2")}>
              {error}
              {waDigits && (
                <>
                  {" "}
                  Or message {firstName} on{" "}
                  <a href={`https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}`} target="_blank" rel="noreferrer" className="underline">
                    WhatsApp
                  </a>
                  .
                </>
              )}
            </p>
          )}
          <button
            type="submit"
            disabled={preview || sending}
            className={cn("inline-flex items-center gap-2 justify-self-start rounded-full bg-iris-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70", wide && "col-span-2")}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "Sending…" : "Send enquiry"}
          </button>
        </form>
      )}
    </div>
  );
};
