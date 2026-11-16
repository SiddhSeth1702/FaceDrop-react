import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Eye, Heart, ImagePlus, Loader2, Monitor, Plus, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber } from "@/lib/locale";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import {
  ABOUT_MAX,
  clearLocalDraft,
  emptyDraft,
  MAX_HIGHLIGHTS,
  newServiceId,
  publishProblems,
  refKey,
  sameRef,
  slugify,
  SPECIALTY_OPTIONS,
  StudioDraft,
  StudioPhotoRef,
  studioUrls,
  TAGLINE_MAX,
  takeLocalDraft,
  toSaveBody,
} from "../helper/studio";
import { useStudioSource } from "../helper/useStudioSource";
import { PhotoPicker } from "./PhotoPicker";
import { StudioLayout, StudioView } from "./StudioView";

type SaveState = { kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string };

/** The Studio builder: edit on the left, see the page on the right. Saved to the account as they type. */
const StudioEditorPage = () => {
  const { userDetail, name } = useAuth();
  const { toast } = useToast();
  const source = useStudioSource();
  const [draft, setDraft] = useState<StudioDraft | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  /** The body last sent to the server, so unchanged drafts aren't saved again. */
  const lastSent = useRef<string | null>(null);
  const [picker, setPicker] = useState<"highlights" | "cover" | null>(null);
  const [layout, setLayout] = useState<StudioLayout>("wide");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  /** Save now. Returns false (and says why) if the server refused it. */
  const saveNow = useCallback(async (d: StudioDraft) => {
    const body = toSaveBody(d);
    const json = JSON.stringify(body);
    if (json === lastSent.current) return true;
    setSave({ kind: "saving" });
    try {
      const response = await requestRef.current(studioUrls.mine, body, "PUT");
      if (response.status >= 400) {
        setSave({ kind: "error", message: response.data?.message ?? "Couldn't save" });
        return false;
      }
      lastSent.current = json;
      setSave({ kind: "saved" });
      return true;
    } catch {
      setSave({ kind: "error", message: "Couldn't reach FaceDrop. Your changes will save when you're back online." });
      return false;
    }
  }, []);

  // First open: the saved page, a draft left in this browser from before, or a fresh one
  const started = useRef(false);
  useEffect(() => {
    if (started.current || source.loading) return;
    started.current = true;
    void (async () => {
      const response = await requestRef.current(studioUrls.mine, {}, "GET").catch(() => null);
      if (!response || response.status >= 400) {
        setSave({ kind: "error", message: "Couldn't load your Studio page. Refresh to try again." });
        return;
      }
      const saved = response.data?.data as StudioDraft | undefined;
      if (saved) {
        lastSent.current = JSON.stringify(toSaveBody(saved));
        setDraft(saved);
        return;
      }
      const local = takeLocalDraft(userDetail);
      const start: StudioDraft = local
        ? { ...emptyDraft(name ?? ""), ...local, publishedAt: null }
        : { ...emptyDraft(name ?? ""), listedEventIds: source.events.slice(0, 6).map((e) => e.event_id) };
      setDraft(start);
      if (local && (await saveNow(start))) clearLocalDraft(userDetail);
    })();
  }, [source.loading, source.events, userDetail, name, saveNow]);

  // Save as they type, once they pause
  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => void saveNow(draft), 800);
    return () => clearTimeout(timer);
  }, [draft, saveNow]);

  // Picked photos from events not loaded yet still need their URLs
  useEffect(() => {
    if (!draft) return;
    const missing = new Set([draft.cover, ...draft.highlights].filter((r): r is StudioPhotoRef => !!r && !source.urlFor(r)).map((r) => r.event_id));
    missing.forEach((eventId) => void source.loadEventPhotos(eventId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once per draft change
  }, [draft?.cover, draft?.highlights, source.urlFor]);

  const set = useCallback((patch: Partial<StudioDraft>) => setDraft((d) => (d ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)), []);
  const hearts = useMemo(() => new Map(source.loved.map((p) => [refKey(p), p.hearts])), [source.loved]);
  const heartsFor = useCallback((ref: StudioPhotoRef) => hearts.get(refKey(ref)) ?? 0, [hearts]);

  if (!draft) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-muted-foreground">
        {source.error ? <p>{source.error}</p> : save.kind === "error" ? <p>{save.message}</p> : <Loader2 className="h-6 w-6 animate-spin" />}
      </div>
    );
  }

  const problems = publishProblems(draft);
  const pageUrl = `${window.location.origin}${ROUTES.studioPublic(draft.slug)}`;

  const publish = async () => {
    if (problems.length) {
      setShowProblems(true);
      toast({ title: "Not quite ready", description: problems[0], variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (!(await saveNow(draft))) {
        toast({ title: "Couldn't save your page", description: save.kind === "error" ? save.message : undefined, variant: "destructive" });
        return;
      }
      const response = await requestToServer(studioUrls.publish, {}, "POST");
      if (response.status >= 400) {
        toast({ title: "Not quite ready", description: response.data?.message, variant: "destructive" });
        return;
      }
      // Only the publish time: anything typed meanwhile stays
      setDraft((d) => (d ? { ...d, publishedAt: response.data.data.publishedAt } : d));
      toast({ title: draft.publishedAt ? "Page updated" : "Your Studio page is live", description: pageUrl });
    } catch {
      toast({ title: "Couldn't reach FaceDrop", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      const response = await requestToServer(studioUrls.unpublish, {}, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      setDraft((d) => (d ? { ...d, publishedAt: null } : d));
      toast({ title: "Your page is hidden", description: "It's saved as a draft. Publish again whenever you like." });
    } catch {
      toast({ title: "Couldn't hide the page", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast({ title: "Link copied", description: "Put it in your Instagram bio and on your visiting cards." });
    } catch {
      toast({ title: "Couldn't copy", description: pageUrl });
    }
  };

  const view = (l: StudioLayout) => (
    <StudioView draft={draft} totals={source.totals} events={source.events} reviews={source.reviews} heartsFor={heartsFor} urlFor={source.urlFor} layout={l} preview />
  );

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Studio page</h1>
            <p className="-rotate-2 font-hand text-xl font-semibold text-primary">your shop window</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.publishedAt ? (
              <>
                <span className="font-semibold text-success">Published</span> {formatDate(draft.publishedAt)} · changes show straight away
              </>
            ) : (
              "Draft · only you can see it"
            )}
            {save.kind === "saving" && <span> · saving…</span>}
            {save.kind === "saved" && <span> · saved</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="xl:hidden" onClick={() => setMobilePreview(true)}>
            <Eye />
            Preview
          </Button>
          {draft.publishedAt && (
            <>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy />
                Copy link
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={ROUTES.studioPublic(draft.slug)} target="_blank">
                  <ExternalLink />
                  Open page
                </Link>
              </Button>
            </>
          )}
          {draft.publishedAt && (
            <Button variant="ghost" size="sm" onClick={unpublish} disabled={busy}>
              Unpublish
            </Button>
          )}
          <Button size="sm" variant="signal" onClick={publish} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {draft.publishedAt ? "Update page" : "Publish"}
          </Button>
        </div>
      </div>

      {save.kind === "error" && (
        <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {save.message}
        </p>
      )}

      {showProblems && problems.length > 0 && (
        <div role="alert" className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <ul className="grid gap-0.5">
            {problems.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setShowProblems(false)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        {/* ---------------- Editor ---------------- */}
        <div className="grid gap-5">
          <Card title="Basics" hint="How guests will know you.">
            <Field label="Studio name" htmlFor="st-name">
              <Input
                id="st-name"
                value={draft.name}
                maxLength={60}
                onChange={(e) => {
                  const value = e.target.value;
                  // Keep the link in step until they've chosen one themselves
                  set({ name: value, ...(draft.slug === slugify(draft.name) ? { slug: slugify(value) } : {}) });
                }}
                placeholder="Siddh Seth Studio"
              />
            </Field>
            <Field label="Page link" htmlFor="st-slug" hint="Letters, numbers and dashes.">
              <div className="flex items-center overflow-hidden rounded-md border bg-secondary/50 focus-within:ring-2 focus-within:ring-ring">
                <span className="shrink-0 pl-3 text-sm text-muted-foreground">facedrop.in/s/</span>
                <input
                  id="st-slug"
                  value={draft.slug}
                  maxLength={40}
                  onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
                />
              </div>
            </Field>
            <Field label="City" htmlFor="st-city">
              <Input id="st-city" value={draft.city} maxLength={40} onChange={(e) => set({ city: e.target.value })} placeholder="City" />
            </Field>
            <Field label="Tagline" htmlFor="st-tagline" hint={`${draft.tagline.length}/${TAGLINE_MAX}`}>
              <Input
                id="st-tagline"
                value={draft.tagline}
                maxLength={TAGLINE_MAX}
                onChange={(e) => set({ tagline: e.target.value })}
                placeholder="Candid weddings and sangeets across Rajasthan."
              />
            </Field>
            <Field label="About you" htmlFor="st-about" hint={`Optional · ${draft.about.length}/${ABOUT_MAX}`}>
              <Textarea
                id="st-about"
                value={draft.about}
                maxLength={ABOUT_MAX}
                onChange={(e) => set({ about: e.target.value })}
                placeholder="How you work, how long you've been shooting, what couples can expect."
                className="min-h-[88px]"
              />
            </Field>
            <div className="grid gap-2">
              <span className="text-sm font-semibold">What you shoot</span>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTY_OPTIONS.map((s) => {
                  const on = draft.specialties.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ specialties: on ? draft.specialties.filter((x) => x !== s) : [...draft.specialties, s] })}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram" htmlFor="st-ig">
                <Input id="st-ig" value={draft.instagram} maxLength={40} onChange={(e) => set({ instagram: e.target.value })} placeholder="@siddhsethstudio" />
              </Field>
              <Field label="WhatsApp" htmlFor="st-wa">
                <Input id="st-wa" value={draft.whatsapp} inputMode="tel" maxLength={20} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="+91 98xxx xxxxx" />
              </Field>
            </div>
          </Card>

          <Card title="Page theme" hint="How your page looks to guests. Your photos and notes look good on both.">
            <div role="radiogroup" aria-label="Page theme" className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "light", label: "Light", bg: "#FBFBF8", fg: "#0B0B12", band: "#0B0B12" },
                  { value: "dark", label: "Dark", bg: "#0B0B12", fg: "#F1F0F7", band: "#1A1830" },
                ] as const
              ).map((t) => {
                const on = (draft.theme ?? "light") === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set({ theme: t.value })}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30"
                    )}
                  >
                    {/* A tiny sketch of the page in this theme */}
                    <span className="block p-3" style={{ background: t.bg }}>
                      <span className="block h-2 w-16 rounded-full" style={{ background: t.fg, opacity: 0.85 }} />
                      <span className="mt-1.5 block h-1.5 w-24 rounded-full" style={{ background: t.fg, opacity: 0.35 }} />
                      <span className="mt-2.5 flex gap-1.5">
                        <span className="block h-7 w-6 rotate-[-4deg] bg-white shadow-sm" />
                        <span className="block h-7 w-6 rotate-3 bg-white shadow-sm" />
                        <span className="block h-7 w-6 bg-[#F8EFC7] shadow-sm" />
                      </span>
                      <span className="mt-2.5 block h-2.5 w-full rounded" style={{ background: t.band }} />
                    </span>
                    <span className="flex items-center justify-between border-t px-3 py-2 text-sm font-semibold">
                      {t.label}
                      {on && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Highlights" hint={`The photos guests see first. Up to ${MAX_HIGHLIGHTS}, in this order.`}>
            {draft.highlights.length > 0 ? (
              <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {draft.highlights.map((h, i) => (
                  <li key={refKey(h)} className="group relative aspect-square overflow-hidden rounded-lg bg-secondary">
                    {source.urlFor(h) && <img src={source.urlFor(h)!} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-950/75 text-[11px] font-bold text-white">{i + 1}</span>
                    {sameRef(h, draft.cover) && <span className="absolute right-1.5 top-1.5 rounded-full bg-lime-500 px-1.5 text-[10px] font-bold text-ink-950">cover</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink-950/80 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <span className="flex gap-1">
                        <TinyButton label="Move earlier" disabled={i === 0} onClick={() => set({ highlights: move(draft.highlights, i, -1) })}>
                          <ArrowLeft className="h-3 w-3" />
                        </TinyButton>
                        <TinyButton label="Move later" disabled={i === draft.highlights.length - 1} onClick={() => set({ highlights: move(draft.highlights, i, 1) })}>
                          <ArrowRight className="h-3 w-3" />
                        </TinyButton>
                      </span>
                      <TinyButton label="Remove" onClick={() => set({ highlights: draft.highlights.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-3 w-3" />
                      </TinyButton>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No highlights yet. Start with the photos guests hearted most.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPicker("highlights")} disabled={!source.events.length}>
                <ImagePlus />
                Choose photos
              </Button>
              {source.loved.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => set({ highlights: source.loved.slice(0, MAX_HIGHLIGHTS).map(({ file_id, event_id }) => ({ file_id, event_id })) })}
                >
                  <Heart />
                  Use my most-loved {Math.min(MAX_HIGHLIGHTS, source.loved.length)}
                </Button>
              )}
            </div>
          </Card>

          <Card title="Cover photo" hint="The big photo at the top of your page.">
            <div className="flex items-center gap-4">
              <span className="block h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {source.urlFor(draft.cover) ? <img src={source.urlFor(draft.cover)!} alt="" className="h-full w-full object-cover" /> : <span className="film film-2 block h-full w-full" />}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPicker("cover")} disabled={!source.events.length}>
                  {draft.cover ? "Change cover" : "Choose cover"}
                </Button>
                {draft.cover && (
                  <Button size="sm" variant="ghost" onClick={() => set({ cover: null })}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card title="Events to show" hint="Only the name, month and guest count. No photos from inside the event.">
            {source.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your events appear here once they've gone live.</p>
            ) : (
              <ul className="divide-y">
                {source.events.map((e) => {
                  const on = draft.listedEventIds.includes(e.event_id);
                  return (
                    <li key={e.event_id}>
                      <label className="flex cursor-pointer items-center gap-3 py-2.5">
                        <span className={cn("block h-10 w-10 shrink-0 overflow-hidden rounded-md", !e.cover_url && `film film-${(e.event_id % 6) + 1}`)}>
                          {e.cover_url && <img src={e.cover_url} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{e.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDate(e.event_date)} · {formatNumber(e.guests)} {e.guests === 1 ? "guest" : "guests"}
                          </span>
                        </span>
                        <Switch
                          checked={on}
                          onCheckedChange={(v) => set({ listedEventIds: v ? [...draft.listedEventIds, e.event_id] : draft.listedEventIds.filter((id) => id !== e.event_id) })}
                          aria-label={`Show ${e.title}`}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Reviews" hint="Only reviews you approved can appear. Guests are shown by first name.">
            {source.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved reviews yet.{" "}
                <Link to={ROUTES.reviews} className="font-semibold text-primary hover:underline">
                  Approve some in Reviews
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {source.reviews.map((r) => {
                  const shown = !draft.hiddenReviewIds.includes(r.review_id);
                  return (
                    <li key={r.review_id}>
                      <label className="flex cursor-pointer items-start gap-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">
                            <span className="text-amber-500">{"★".repeat(r.rating)}</span> <b className="font-semibold">{r.guest_name.split(" ")[0]}</b>
                            <span className="text-muted-foreground"> · {r.event_title}</span>
                          </span>
                          {r.comment && <span className="line-clamp-2 block text-sm text-muted-foreground">"{r.comment}"</span>}
                        </span>
                        <Switch
                          checked={shown}
                          onCheckedChange={(v) =>
                            set({ hiddenReviewIds: v ? draft.hiddenReviewIds.filter((id) => id !== r.review_id) : [...draft.hiddenReviewIds, r.review_id] })
                          }
                          aria-label={`Show ${r.guest_name}'s review`}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Services" hint="What couples can book you for.">
            <ul className="grid gap-2">
              {draft.services.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Input
                    value={s.name}
                    maxLength={40}
                    aria-label="Service"
                    placeholder="Wedding (2 days)"
                    onChange={(e) => set({ services: draft.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  />
                  {draft.showPrices && (
                    <div className="flex w-36 shrink-0 items-center overflow-hidden rounded-md border focus-within:ring-2 focus-within:ring-ring">
                      <span className="pl-2.5 text-sm text-muted-foreground">from ₹</span>
                      <input
                        value={s.price}
                        inputMode="numeric"
                        aria-label="Starting price"
                        placeholder="1,20,000"
                        maxLength={12}
                        onChange={(e) => set({ services: draft.services.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d,]/g, "") } : x)) })}
                        className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-sm outline-none"
                      />
                    </div>
                  )}
                  <Button size="icon" variant="ghost" aria-label="Remove service" onClick={() => set({ services: draft.services.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={draft.services.length >= 8}
                onClick={() => set({ services: [...draft.services, { id: newServiceId(), name: "", price: "" }] })}
              >
                <Plus />
                Add service
              </Button>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch checked={draft.showPrices} onCheckedChange={(v) => set({ showPrices: v })} />
                Show starting prices
              </label>
            </div>
          </Card>

          <Card title="Before you publish">
            <label className="flex cursor-pointer gap-3 text-sm">
              <Checkbox checked={draft.permission} onCheckedChange={(v) => set({ permission: v === true })} className="mt-0.5" />
              <span>
                I have my clients' permission to show these photos publicly. Guests who turned off sharing are never suggested.
              </span>
            </label>
            {problems.length > 0 ? (
              <p className="text-sm text-muted-foreground">Still to do: {problems.join(" · ")}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <Sparkles className="h-4 w-4" />
                Ready to publish
              </p>
            )}
          </Card>
        </div>

        {/* ---------------- Live preview ---------------- */}
        <aside className="sticky top-6 hidden xl:grid xl:gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Live preview <span className="font-normal text-muted-foreground">· what guests will see</span>
            </p>
            <div role="radiogroup" aria-label="Preview size" className="inline-flex rounded-full bg-secondary p-0.5">
              {(
                [
                  { value: "wide", label: "Desktop", icon: Monitor },
                  { value: "narrow", label: "Phone", icon: Smartphone },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={layout === value}
                  onClick={() => setLayout(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    layout === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ScaledFrame width={layout === "wide" ? 1200 : 390} phone={layout === "narrow"} url={`facedrop.in/s/${draft.slug}`}>
            {view(layout)}
          </ScaledFrame>
        </aside>
      </div>

      {/* Phone and tablet: preview in a dialog */}
      <Dialog open={mobilePreview} onOpenChange={setMobilePreview}>
        <DialogContent className="max-h-[92vh] max-w-[440px] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Preview of your Studio page</DialogTitle>
          {view("narrow")}
        </DialogContent>
      </Dialog>

      <PhotoPicker
        open={picker === "highlights"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Choose highlight photos"
        description={`Pick up to ${MAX_HIGHLIGHTS}. They appear in the order you pick them.`}
        mode="multi"
        max={MAX_HIGHLIGHTS}
        initial={draft.highlights}
        loved={source.loved}
        events={source.events}
        loadEventPhotos={source.loadEventPhotos}
        onDone={(picked) => set({ highlights: picked })}
      />
      <PhotoPicker
        open={picker === "cover"}
        onOpenChange={(open) => !open && setPicker(null)}
        title="Choose a cover photo"
        description="One photo that says what you do. It's the first thing guests see."
        mode="single"
        initial={draft.cover ? [draft.cover] : []}
        loved={source.loved}
        events={source.events}
        loadEventPhotos={source.loadEventPhotos}
        onDone={(picked) => set({ cover: picked[0] ?? null })}
      />
    </div>
  );
};

const move = <T,>(list: T[], index: number, by: number) => {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
};

const Card = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="grid gap-4 rounded-2xl border bg-card p-5">
    <div>
      <h2 className="text-base font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </section>
);

const Field = ({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) => (
  <div className="grid gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

const TinyButton = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-ink-950 transition-opacity hover:bg-white disabled:opacity-30"
  >
    {children}
  </button>
);

/**
 * Shows the page at its real width (1200px desktop or 390px phone) shrunk to fit the pane,
 * inside a browser or phone frame.
 */
const ScaledFrame = ({ width, phone, url, children }: { width: number; phone: boolean; url: string; children: ReactNode }) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / width);
      setScale(s);
      setHeight(inner.current.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div className={cn("overflow-hidden border bg-[#ECEBF2] shadow-lift", phone ? "mx-auto w-full max-w-[420px] rounded-[30px] border-[10px] border-ink-950" : "rounded-2xl")}>
      {!phone && (
        <div className="flex items-center gap-2.5 border-b border-black/5 px-3 py-2">
          <span className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <i key={i} className="block h-2.5 w-2.5 rounded-full bg-black/15" />
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-ink-600">{url}</span>
        </div>
      )}
      <div ref={outer} className="max-h-[calc(100vh-170px)] overflow-y-auto overflow-x-hidden">
        <div style={{ height }}>
          <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioEditorPage;
