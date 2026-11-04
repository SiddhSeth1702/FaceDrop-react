import { ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Check, Clock, ImageUp, Lock, QrCode, ScanFace, Share2, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const LandingPage = () => {
  useEffect(() => {
    document.title = "FaceDrop · Take a selfie. Your photos drop in.";
  }, []);

  return (
    <main>
      <Hero />
      <Occasions />
      <HowItWorks />
      <TwoSides />
      <Privacy />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
};

export default LandingPage;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const Hero = () => (
  <section className="overflow-hidden">
    <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
      <div>
        <p className="mb-4 inline-block -rotate-2 font-hand text-[26px] font-semibold text-primary">
          for wedding &amp; event photographers
        </p>
        <h1 className="text-[44px] font-extrabold leading-[1.02] sm:text-[60px] lg:text-[68px]">
          Take one selfie. Your photos <span className="marker">drop in.</span>
        </h1>
        <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
          Upload the whole shoot once. Every guest scans a QR code, takes a selfie and gets only the photos they're in.
          No WhatsApp dumps, no "bhaiya, mera wala bhejo".
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="ink">
            <Link to={ROUTES.signup}>
              Start free <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted-foreground">
          {["First event free, up to 200 photos", "No card needed", "Guests don't install anything"].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" strokeWidth={2.6} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <HeroVisual />
    </div>
  </section>
);

const HERO_PHOTOS = [
  { src: "/photos/baraat.jpg", caption: "the baraat ♡", className: "left-0 top-0 w-[40%] -rotate-6" },
  { src: "/photos/mehendi.jpg", caption: "mehendi, round two", className: "bottom-0 left-[12%] w-[31%] rotate-3" },
];

/** Polaroids around a phone that has just matched the guest. */
const HeroVisual = () => (
  <div className="relative mx-auto h-[500px] w-full max-w-[520px] sm:h-[560px]" aria-hidden="true">
    {HERO_PHOTOS.map((photo) => (
      <figure key={photo.caption} className={cn("polaroid absolute", photo.className)}>
        <img src={photo.src} alt="" className="aspect-[4/5] w-full rounded-[3px] object-cover" />
        <figcaption className="px-1 pb-3 pt-2 text-center font-hand text-lg font-semibold text-ink-800">{photo.caption}</figcaption>
      </figure>
    ))}

    {/* Phone */}
    <div className="absolute right-[4%] top-[8%] z-10 w-[50%] rotate-[-2deg] rounded-[30px] bg-ink-950 p-2 shadow-lift ring-1 ring-white/10">
      <div className="overflow-hidden rounded-[24px] bg-[hsl(var(--paper))]">
        <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3 text-ink-950">
          <span className="truncate text-[11px] font-bold">Ananya &amp; Rohan</span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-lime-500 px-2 py-0.5 text-[9.5px] font-bold text-ink-950">38 found</span>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5">
          {/* Nine moments of the same guest, the one the phone just matched */}
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-[4px] bg-secondary">
              <img src={`/photos/guest/${i + 1}.jpg`} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="finder inset-1 [--c:hsl(var(--lime-500))]" />}
            </div>
          ))}
        </div>
        <div className="px-3 pb-3.5 pt-1.5">
          <div className="rounded-full bg-iris-500 py-2 text-center text-[11px] font-semibold text-white">Download all</div>
        </div>
      </div>
    </div>

    <div className="absolute bottom-6 right-0 z-20 text-primary">
      <svg width="90" height="54" viewBox="0 0 90 54" className="ml-2 overflow-visible">
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M80 50 C 62 50, 40 40, 26 18 C 23 13, 20 9, 17 5" />
          <path d="M28 7 L 16 4 L 15 17" />
        </g>
      </svg>
      <span className="block rotate-[-4deg] font-hand text-2xl font-semibold">only your photos!</span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Occasions strip                                                     */
/* ------------------------------------------------------------------ */

const OCCASIONS = ["Weddings", "Sangeet nights", "Haldi & mehendi", "College fests", "Corporate offsites", "Marathons", "Birthdays", "Conferences"];

const Occasions = () => (
  <section className="border-y border-border bg-secondary/50">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6">
      <span className="font-hand text-xl font-semibold text-muted-foreground">made for</span>
      {OCCASIONS.map((occasion) => (
        <span key={occasion} className="font-display text-[15px] font-semibold">
          {occasion}
        </span>
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: ImageUp,
    title: "Upload the shoot",
    body: "Drop in thousands of photos straight from your laptop. FaceDrop sorts every face while you edit the next batch.",
    note: "JPG, PNG, even HEIC",
  },
  {
    icon: QrCode,
    title: "Share one QR code",
    body: "Print it on the table card, put it on the LED wall or send the link on the family group. One code for the whole event.",
    note: "print-ready poster included",
  },
  {
    icon: ScanFace,
    title: "Guests take a selfie",
    body: "Each guest opens the link, takes a selfie and sees only the photos they're in. Download one, or all of them.",
    note: "works on any phone",
  },
];

const HowItWorks = () => (
  <Section id="how-it-works" note="three steps, that's it" title="From memory card to every guest's phone">
    <ol className="grid gap-5 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="relative rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <step.icon className="h-6 w-6" />
            </span>
            <span className="font-display text-5xl font-extrabold text-ink-200 dark:text-ink-800">{index + 1}</span>
          </div>
          <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
          <p className="mt-4 -rotate-1 font-hand text-lg font-semibold text-primary">{step.note}</p>
        </li>
      ))}
    </ol>
  </Section>
);

/* ------------------------------------------------------------------ */
/* Photographers and guests                                            */
/* ------------------------------------------------------------------ */

const PHOTOGRAPHER_POINTS = [
  { icon: Clock, text: "Deliver the same night, not three weeks later" },
  { icon: Sparkles, text: "Look premium: every guest remembers who sent their photos" },
  { icon: Share2, text: "Stop answering \"can you send my pics?\" forty times" },
  { icon: ImageUp, text: "Keep uploading as you edit; new photos show up for guests too" },
];

const GUEST_POINTS = [
  { icon: Smartphone, text: "No app, no sign-up. Just a link and a selfie" },
  { icon: Camera, text: "Only the photos you're in, not 4,000 of everyone else" },
  { icon: Check, text: "Full quality downloads, one by one or all at once" },
  { icon: Lock, text: "Your selfie is used for this event only" },
];

const TwoSides = () => (
  <Section note="good for both of you" title="Built for the person behind the camera, and everyone in front of it">
    <div className="grid gap-5 lg:grid-cols-2">
      <SideCard title="For photographers" tone="ink" points={PHOTOGRAPHER_POINTS} />
      <SideCard title="For guests" tone="paper" points={GUEST_POINTS} />
    </div>
  </Section>
);

const SideCard = ({ title, tone, points }: { title: string; tone: "ink" | "paper"; points: typeof GUEST_POINTS }) => (
  <div className={cn("rounded-3xl p-7 sm:p-9", tone === "ink" ? "bg-inverse text-inverse-foreground" : "border border-border bg-card")}>
    <h3 className="text-2xl font-bold">{title}</h3>
    <ul className="mt-6 space-y-4">
      {points.map(({ icon: Icon, text }) => (
        <li key={text} className="flex gap-3.5">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              tone === "ink" ? "bg-white/10 text-lime-500" : "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className={cn("text-[15.5px] leading-relaxed", tone === "ink" ? "text-white/80" : "text-muted-foreground")}>{text}</span>
        </li>
      ))}
    </ul>
  </div>
);

/* ------------------------------------------------------------------ */
/* Privacy                                                             */
/* ------------------------------------------------------------------ */

const PRIVACY_POINTS = [
  { icon: Trash2, title: "Selfies aren't kept", body: "Your selfie is matched against that one event and then deleted." },
  { icon: Lock, title: "One event at a time", body: "There's no global face search. You need the event's code or QR to look at all." },
  { icon: Clock, title: "Galleries expire", body: "Photos and face data are deleted automatically after the event's gallery period ends." },
  { icon: ScanFace, title: "You're in control", body: "Photographers decide whether face search is on for each event." },
];

const Privacy = () => (
  <section id="privacy" className="scroll-mt-20 px-5 py-20">
    <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-inverse px-6 py-14 text-inverse-foreground sm:px-12">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-3 -rotate-2 font-hand text-2xl font-semibold text-lime-500">faces are personal. we get it.</p>
          <h2 className="text-[34px] font-bold leading-tight sm:text-[42px]">Privacy isn't a setting here. It's the default.</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/65">
            FaceDrop is built for India's data protection law (DPDP Act, 2023). We only use a face to find that person's photos at
            that event, and nothing else.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRIVACY_POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-white/[0.06] p-5">
              <Icon className="h-5 w-5 text-lime-500" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

const PASSES = [
  { name: "Small", photos: "2,000", price: "699", fit: "Birthdays, haldi, small functions", plan: "small" },
  { name: "Medium", photos: "5,000", price: "1,299", fit: "Most weddings and sangeets", plan: "medium", popular: true },
  { name: "Large", photos: "10,000", price: "2,199", fit: "Multi-day weddings, college fests", plan: "large" },
];

const STUDIO_TIERS = [
  { name: "Starter", photos: "7,500", price: "1,499" },
  { name: "Growth", photos: "20,000", price: "2,999" },
  { name: "Pro", photos: "50,000", price: "5,999" },
];

const Pricing = () => (
  <Section
    id="pricing"
    note="pay per event, no surprises"
    title="Simple pricing. Pick a size, see the price, then upload."
    description="Every event gallery stays live for 30 days. You always see the price before you upload a single photo."
  >
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-dashed border-primary/40 bg-accent/60 p-5 sm:flex-row sm:items-center sm:px-7">
      <div>
        <p className="font-semibold text-accent-foreground">Free trial: your first event is on us</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Up to 200 photos, live for 7 days. No card needed.</p>
      </div>
      <Button asChild variant="default">
        <Link to={ROUTES.signup}>Try it free</Link>
      </Button>
    </div>

    <div className="grid gap-5 md:grid-cols-3">
      {PASSES.map((pass) => (
        <div
          key={pass.name}
          className={cn(
            "relative flex flex-col rounded-3xl border bg-card p-7",
            pass.popular ? "border-primary shadow-lift" : "border-border"
          )}
        >
          {pass.popular && (
            <span className="absolute -top-3.5 right-6 rotate-2 rounded-full bg-lime-500 px-3 py-1 font-hand text-lg font-bold leading-none text-ink-950">
              most picked
            </span>
          )}
          <p className="text-sm font-semibold text-muted-foreground">Event Pass</p>
          <h3 className="mt-1 text-2xl font-bold">{pass.name}</h3>
          <p className="mt-5 flex items-baseline gap-1.5">
            <span className="font-display text-[44px] font-extrabold leading-none">₹{pass.price}</span>
            <span className="text-sm text-muted-foreground">/ event</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">+ 18% GST</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[14.5px]">
            <PlanPoint>Up to {pass.photos} photos</PlanPoint>
            <PlanPoint>Unlimited guests &amp; selfie searches</PlanPoint>
            <PlanPoint>Gallery live for 30 days</PlanPoint>
            <PlanPoint>QR poster &amp; share link</PlanPoint>
          </ul>
          <p className="mt-5 font-hand text-lg font-semibold text-primary">{pass.fit}</p>
          <Button asChild className="mt-4 w-full" variant={pass.popular ? "default" : "outline"}>
            <Link to={`${ROUTES.signup}?plan=${pass.plan}`}>Choose {pass.name}</Link>
          </Button>
        </div>
      ))}
    </div>

    <div className="mt-5 rounded-3xl border border-border bg-card p-7 sm:p-9">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-muted-foreground">Studio plans</p>
          <h3 className="mt-1 text-2xl font-bold">Shooting every weekend?</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            A monthly photo allowance across as many events as you like. Pay yearly and get 2 months free.
          </p>
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-[560px]">
          {STUDIO_TIERS.map((tier) => (
            <div key={tier.name} className="rounded-2xl bg-secondary p-4">
              <p className="text-sm font-semibold">{tier.name}</p>
              <p className="mt-1 font-display text-2xl font-extrabold">
                ₹{tier.price}
                <span className="text-sm font-medium text-muted-foreground"> /mo</span>
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{tier.photos} photos a month</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Bigger studio or agency? Custom plans are on the way.</p>
    </div>
  </Section>
);

const PlanPoint = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2.5">
    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.6} />
    <span>{children}</span>
  </li>
);

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: "Do guests need to download an app or make an account?",
    a: "No. Guests open the event link or scan the QR code, take a selfie in the browser and see their photos. It works on any phone made in the last few years.",
  },
  {
    q: "How accurate is the face matching?",
    a: "Very good for well-lit, front-facing photos, and solid even for side angles and group shots. Guests can retake the selfie if a few photos are missing.",
  },
  {
    q: "When do I pay?",
    a: "You pick the event size when you create the event, so you see the price up front. Then you pay before the photos go live for guests. Your first event (up to 200 photos) is free.",
  },
  {
    q: "What happens when the 30 days are over?",
    a: "The gallery closes for guests. You get a short grace period to extend it; after that, the photos and face data are deleted for good.",
  },
  {
    q: "Do you give GST invoices?",
    a: "Yes. Every payment comes with a GST invoice, and you can add your GSTIN to claim input credit.",
  },
  {
    q: "Who owns the photos?",
    a: "You do. FaceDrop only stores and delivers them for the event. Guests can download their own photos for personal use.",
  },
];

const Faq = () => (
  <Section id="faq" note="the usual questions" title="Questions photographers ask us">
    <Accordion type="single" collapsible className="mx-auto max-w-3xl">
      {FAQS.map((faq) => (
        <AccordionItem key={faq.q} value={faq.q}>
          <AccordionTrigger className="text-left text-[16px] font-semibold hover:no-underline">{faq.q}</AccordionTrigger>
          <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </Section>
);

/* ------------------------------------------------------------------ */
/* Final call to action                                                */
/* ------------------------------------------------------------------ */

const FinalCta = () => (
  <section className="px-5 pb-24">
    <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
      <p className="mb-2 -rotate-2 font-hand text-[26px] font-semibold leading-tight text-primary">your next event, sorted</p>
      <h2 className="mt-2 text-[36px] font-extrabold leading-tight sm:text-[48px]">
        Give every guest their photos <span className="marker">tonight.</span>
      </h2>
      <p className="mt-4 max-w-xl text-[16px] text-muted-foreground">Set up your first event in under five minutes. The first 200 photos are free.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" variant="ink">
          <Link to={ROUTES.signup}>
            Create your free account <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to={ROUTES.joined}>I'm a guest, find my photos</Link>
        </Button>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */

interface SectionProps {
  id?: string;
  note: string;
  title: string;
  description?: string;
  children: ReactNode;
}

const Section = ({ id, note, title, description, children }: SectionProps) => (
  <section id={id} className="scroll-mt-20 px-5 py-20">
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 max-w-2xl">
        <p className="mb-2 inline-block -rotate-2 font-hand text-2xl font-semibold text-primary">{note}</p>
        <h2 className="text-[32px] font-bold leading-[1.1] sm:text-[40px]">{title}</h2>
        {description && <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  </section>
);
