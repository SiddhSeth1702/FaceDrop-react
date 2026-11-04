import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Star, Check, CheckSquare, ChevronLeft, ChevronRight, Clock, Download, Grid3x3, LayoutDashboard, Loader2, LogOut, MapPin, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { Folder, formatEventDate, JoinedEvent, joinedUrls, Member, MemberPhoto, MyReview, startDownload } from "../helper/joined";
import { MembersList } from "./MembersList";
import { FaceEnroll } from "./FaceEnroll";
import { HeartButton, ReviewDialog } from "./MemberFeedback";
import { ToastAction } from "@/components/ui/toast";

const PAGE_SIZE = 40;

const FOLDERS: { value: Folder; label: string; empty: string }[] = [
  { value: "all", label: "All photos", empty: "No photos yet. They'll show up here as the photographer uploads them." },
  { value: "with_you", label: "Photos you're in", empty: "We haven't spotted you in a group photo yet. New photos are checked each time you come back." },
  { value: "just_you", label: "Just you", empty: "No solo shots of you yet. New photos are checked each time you come back." },
];

type View = "gallery" | "grid";
const VIEW_KEY = "facedrop-photos-view";
const savedView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "gallery";
  } catch {
    return "gallery";
  }
};

/** Open on the guest's own photos when there are some. */
const defaultFolder = (event: JoinedEvent): Folder =>
  event.folders?.with_you ? "with_you" : event.folders?.just_you ? "just_you" : "all";

/** One joined event: its cover, and its photos while it's live. */
const JoinedEventPage = () => {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;

  const [event, setEvent] = useState<JoinedEvent | null>(null);
  // A photo folder, or the group members tab
  const [folder, setFolder] = useState<Folder | "members" | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  // A group member whose photos are open (from the members tab)
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  // Drops a page that arrives after the guest has switched folders
  const folderRef = useRef<string | null>(null);
  folderRef.current = viewingMember ? `member:${viewingMember.member_id}` : folder;
  const [notFound, setNotFound] = useState(false);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // undefined while loading; null = hasn't reviewed yet
  const [myReview, setMyReview] = useState<MyReview | null | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Gallery keeps each photo's shape; grid shows more at once as even squares
  const [view, setViewState] = useState<View>(savedView);
  const setView = (next: View) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode: the choice lasts for this visit
    }
  };
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [zipping, setZipping] = useState<"selected" | "all" | null>(null);

  // Opening the event also refreshes the guest's matches on the server if new photos arrived
  const loadEvent = useCallback(async (keepFolder: boolean) => {
    const response = await requestRef.current(joinedUrls.event(eventId), {}, "GET").catch(() => null);
    if (!response || response.status >= 400) return setNotFound(true);
    const data: JoinedEvent = response.data.data;
    setEvent(data);
    if (!keepFolder) setFolder(defaultFolder(data));
    const list = await requestRef.current(joinedUrls.members(eventId), {}, "GET").catch(() => null);
    if (list && list.status < 400) setMembers(list.data.data);
    const review = await requestRef.current(joinedUrls.review(eventId), {}, "GET").catch(() => null);
    if (review && review.status < 400) setMyReview(review.data?.data ?? null);
  }, [eventId]);

  useEffect(() => {
    void loadEvent(false);
  }, [loadEvent]);

  // A new folder starts from its first page, with nothing selected
  useEffect(() => {
    setPhotos([]);
    setNextPage(1);
    setOpen(null);
    setSelected(new Set());
  }, [folder, viewingMember?.member_id]);

  const toggleSelected = (fileId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  /** Download picked photos, or the whole folder, as one zip. */
  const downloadZip = async (which: "selected" | "all") => {
    setZipping(which);
    try {
      const body =
        which === "selected"
          ? { file_ids: [...selected] }
          : viewingMember
            ? { member_id: viewingMember.member_id }
            : { folder };
      const response = await requestRef.current(joinedUrls.downloadLink(eventId), body, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      const { url, count } = response.data.data as { url: string; count: number };
      startDownload(url);
      toast({
        title: count === 1 ? "Downloading 1 photo" : `Downloading ${count.toLocaleString("en-IN")} photos`,
        description: "They come as one zip file. Big folders can take a minute to start.",
      });
      if (which === "selected") stopSelecting();
    } catch (error) {
      toast({ title: "Couldn't start the download", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setZipping(null);
    }
  };

  const loadMore = useCallback(async () => {
    if (!nextPage || loadingPhotos || !folder) return;
    setLoadingPhotos(true);
    const requested = folderRef.current;
    const source = viewingMember ? joinedUrls.memberPhotos(eventId, viewingMember.member_id) : `${joinedUrls.photos(eventId)}?folder=${folder}`;
    const response = await requestRef.current(`${source}${source.includes("?") ? "&" : "?"}page=${nextPage}&limit=${PAGE_SIZE}`, {}, "GET").catch(() => null);
    if (folderRef.current !== requested) return setLoadingPhotos(false);
    if (response && response.status < 400) {
      // The list's count can be stale until a member's photos are opened (matching is lazy)
      if (viewingMember) {
        const total = response.data.data.pagination.total;
        setViewingMember((prev) => (prev ? { ...prev, photo_count: total } : prev));
        setMembers((prev) => prev?.map((m) => (m.member_id === viewingMember.member_id ? { ...m, photo_count: total } : m)) ?? prev);
      }
      setPhotos((prev) => [...prev, ...response.data.data.result]);
      setNextPage(response.data.data.pagination.next);
    } else {
      setNextPage(null);
    }
    setLoadingPhotos(false);
    // Keyed on the member's id: their photo count updates while their photos load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, folder, viewingMember?.member_id, nextPage, loadingPhotos]);

  // First page once we know the event is live, then more as the bottom comes into view
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (event?.state !== "live" || !sentinel.current) return;
    if ((folder === "with_you" || folder === "just_you") && event.face !== "ready") return;
    if (folder === "members" && !viewingMember) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
    // Keyed on the member's id: their photo count updates while their photos load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.state, event?.face, folder, viewingMember?.member_id, loadMore]);

  const setHearted = (fileId: number, hearted: boolean) =>
    setPhotos((prev) => prev.map((p) => (p.file_id === fileId ? { ...p, hearted } : p)));

  /** Heart straight away; undo it if the server says no. */
  const toggleHeart = async (photo: MemberPhoto) => {
    const hearted = !photo.hearted;
    setHearted(photo.file_id, hearted);
    const response = await requestRef.current(joinedUrls.hearts(eventId), { file_id: photo.file_id, hearted }, "POST").catch(() => null);
    if (!response || response.status >= 400) return setHearted(photo.file_id, !hearted);
    if (hearted) nudgeReview();
  };

  /** After their first heart, suggest a review once per event, if they haven't written one. */
  const nudgeReview = () => {
    if (myReview !== null) return;
    const key = `facedrop-review-nudge-${eventId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Private mode: may nudge again next visit
    }
    toast({
      title: "Loving the photos?",
      description: `Tell ${event?.host_name ?? "the photographer"} how they did. It takes 10 seconds.`,
      action: (
        <ToastAction altText="Write a review" onClick={() => setReviewOpen(true)}>
          Write a review
        </ToastAction>
      ),
    });
  };

  /** Downloads go straight to S3; tell the host's insights. Best effort. */
  const recordDownload = () => void requestRef.current(joinedUrls.downloads(eventId), { count: 1 }, "POST").catch(() => undefined);

  const requestReactivation = async () => {
    const response = await requestRef.current(joinedUrls.reactivation(eventId), {}, "POST").catch(() => null);
    if (response && response.status < 400) {
      setEvent((prev) => (prev ? { ...prev, reactivation_requested: true } : prev));
      toast({ title: "Request sent", description: `We've let ${event?.host_name ?? "the photographer"} know you'd like the photos back.` });
    } else {
      toast({ title: "Couldn't send the request", variant: "destructive" });
    }
  };

  /** Photos in what's on screen: a folder, or the open group member's matches. */
  const currentCount = viewingMember ? (viewingMember.photo_count ?? 0) : folder && folder !== "members" ? (event?.folders?.[folder] ?? 0) : 0;

  const leave = async () => {
    const response = await requestToServer(joinedUrls.event(eventId), {}, "DELETE").catch(() => null);
    if (response && response.status < 400) {
      toast({ title: "You've left the event", description: "You can join again any time with its code." });
      navigate(ROUTES.joined);
    } else {
      toast({ title: "Couldn't leave the event", variant: "destructive" });
    }
  };

  if (notFound) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="-rotate-2 font-hand text-3xl font-semibold text-primary">can't find that one</p>
          <p className="mt-1 text-muted-foreground">You may have left this event, or the link is wrong.</p>
          <Button asChild className="mt-5">
            <Link to={ROUTES.joined}>Back to events I'm in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link to={ROUTES.joined} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Events I'm in
        </Link>
        {event && (
          <div className="flex items-center gap-1">
            {event.state === "live" && event.photo_count > 0 && myReview !== undefined && (
              <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
                <Star className={cn(myReview && "fill-amber-400 text-amber-400")} />
                {myReview ? "Your review" : "Rate the photos"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
              <LogOut />
              Leave
            </Button>
          </div>
        )}
      </div>

      {!event ? (
        <div className="mt-5 h-56 animate-pulse rounded-3xl bg-secondary" />
      ) : (
        <>
          <EventHeader event={event} />

          {event.state === "live" ? (
            <section className="mt-8">
              <div role="tablist" aria-label="Folders" className="flex flex-wrap gap-x-6 gap-y-2 border-b">
                {FOLDERS.map(({ value, label }) => {
                  const count = event.folders?.[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={folder === value}
                      onClick={() => setFolder(value)}
                      className={cn(
                        "-mb-px flex items-baseline gap-2 border-b-2 pb-2.5 text-[15px] font-semibold transition-colors",
                        folder === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                      {(value === "all" || event.face === "ready") && (
                        <span className="font-hand text-lg leading-none">{(count ?? 0).toLocaleString("en-IN")}</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="tab"
                  aria-selected={folder === "members"}
                  onClick={() => {
                    setFolder("members");
                    setViewingMember(null);
                  }}
                  className={cn(
                    "-mb-px flex items-baseline gap-2 border-b-2 pb-2.5 text-[15px] font-semibold transition-colors",
                    folder === "members" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Group members
                  {members && <span className="font-hand text-lg leading-none">{members.length.toLocaleString("en-IN")}</span>}
                </button>
              </div>

              {folder === "members" && !viewingMember ? (
                members ? (
                  <MembersList
                    members={members}
                    // Tapping yourself goes to your own tab; other people open inside Group members
                    onOpen={(member) => (member.is_you ? setFolder("with_you") : setViewingMember(member))}
                    onAddSelfie={() => setFolder("with_you")}
                  />
                ) : (
                  <div className="mt-6 h-24 animate-pulse rounded-3xl bg-secondary" />
                )
              ) : (folder === "with_you" || folder === "just_you") && event.face === "needs_selfie" ? (
                <FaceEnroll className="mt-8" onEnrolled={() => void loadEvent(false)} />
              ) : currentCount === 0 ? (
                <p className="mt-6 rounded-3xl border border-dashed px-6 py-12 text-center text-muted-foreground">
                  {viewingMember
                    ? `We haven't spotted ${viewingMember.is_you ? "you" : viewingMember.name} in any photo yet.`
                    : FOLDERS.find((f) => f.value === folder)?.empty}
                </p>
              ) : (
                <>
                  {viewingMember && (
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setViewingMember(null)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Group members
                      </button>
                      <h3 className="text-lg font-bold">
                        {viewingMember.is_you ? "Photos you're in" : `Photos ${viewingMember.name} is in`}
                        <span className="ml-2 font-hand text-xl font-semibold text-muted-foreground">{currentCount.toLocaleString("en-IN")}</span>
                      </h3>
                    </div>
                  )}
                  {/* View, select and download all */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div role="radiogroup" aria-label="View" className="inline-flex rounded-full bg-secondary p-0.5">
                      {(
                        [
                          { value: "gallery", label: "Gallery", icon: LayoutDashboard },
                          { value: "grid", label: "Grid", icon: Grid3x3 },
                        ] as const
                      ).map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={view === value}
                          onClick={() => setView(value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                            view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant={selecting ? "secondary" : "outline"} size="sm" onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                        <CheckSquare />
                        {selecting ? "Cancel" : "Select"}
                      </Button>
                      <Button size="sm" variant="signal" onClick={() => downloadZip("all")} disabled={zipping !== null}>
                        {zipping === "all" ? <Loader2 className="animate-spin" /> : <Download />}
                        Download all ({currentCount.toLocaleString("en-IN")})
                      </Button>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-4",
                      view === "grid"
                        ? "grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-6 2xl:grid-cols-8"
                        : "columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4 2xl:columns-5"
                    )}
                  >
                    {photos.map((photo, i) => {
                      const isSelected = selected.has(photo.file_id);
                      return (
                        <div
                          key={photo.file_id}
                          className={cn(
                            "group relative overflow-hidden bg-secondary",
                            view === "grid" ? "aspect-square rounded-md" : "mb-2 break-inside-avoid rounded-xl sm:mb-3",
                            isSelected && "ring-[3px] ring-primary ring-offset-2 ring-offset-background"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => (selecting ? toggleSelected(photo.file_id) : setOpen(i))}
                            aria-label={selecting ? `${isSelected ? "Unselect" : "Select"} photo ${i + 1}` : `Open photo ${i + 1}`}
                            aria-pressed={selecting ? isSelected : undefined}
                            className={cn(
                              "block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                              view === "grid" && "h-full"
                            )}
                          >
                            <img
                              src={photo.thumb_url ?? photo.display_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={cn(
                                "block w-full transition-transform duration-300",
                                view === "grid" ? "h-full object-cover" : "h-auto",
                                selecting ? (isSelected ? "scale-[0.94]" : "") : "group-hover:scale-[1.03]"
                              )}
                            />
                          </button>
                          {selecting ? (
                            <span
                              aria-hidden="true"
                              className={cn(
                                "pointer-events-none absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 shadow-sm",
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-white bg-ink-950/30"
                              )}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                          ) : (
                            <HeartButton
                              hearted={photo.hearted}
                              onToggle={() => toggleHeart(photo)}
                              className={cn(
                                "absolute",
                                view === "grid" ? "bottom-1.5 right-1.5 h-8 w-8" : "bottom-2.5 right-2.5",
                                !photo.hearted && "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {folder === "all" && event.face === "needs_selfie" && (event.folders?.all ?? 0) > 0 && (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Looking for yourself?{" "}
                  <button type="button" onClick={() => setFolder("with_you")} className="font-semibold text-primary hover:underline">
                    Add a selfie to find the photos you're in
                  </button>
                </p>
              )}
              <div ref={sentinel} className="h-px" />
              {loadingPhotos && <p className="py-6 text-center text-sm text-muted-foreground">Loading more photos…</p>}
            </section>
          ) : (
            <StateNotice event={event} onRequest={requestReactivation} />
          )}
        </>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div role="toolbar" aria-label="Selected photos" className="flex flex-wrap items-center gap-2 rounded-full bg-inverse py-2 pl-5 pr-2 text-inverse-foreground shadow-lift">
            <span className="mr-1 text-sm font-semibold">
              {selected.size === 0 ? "Tap photos to select" : `${selected.size.toLocaleString("en-IN")} selected`}
            </span>
            {photos.length > 0 && selected.size < photos.length && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setSelected(new Set(photos.map((p) => p.file_id)))}
              >
                Select all {photos.length.toLocaleString("en-IN")} shown
              </Button>
            )}
            <Button size="sm" variant="signal" disabled={selected.size === 0 || zipping !== null} onClick={() => downloadZip("selected")}>
              {zipping === "selected" ? <Loader2 className="animate-spin" /> : <Download />}
              Download
            </Button>
            <button
              type="button"
              onClick={stopSelecting}
              aria-label="Stop selecting"
              className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {open !== null && photos[open] && (
        <Lightbox
          photo={photos[open]}
          position={`${open + 1} / ${currentCount || photos.length}`}
          onClose={() => setOpen(null)}
          onPrev={open > 0 ? () => setOpen(open - 1) : undefined}
          onNext={open < photos.length - 1 ? () => setOpen(open + 1) : nextPage ? () => void loadMore() : undefined}
          onHeart={() => toggleHeart(photos[open])}
          onDownload={recordDownload}
        />
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        eventId={eventId}
        hostName={event?.host_name}
        review={myReview ?? null}
        onSaved={setMyReview}
      />

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {event?.title}?</AlertDialogTitle>
            <AlertDialogDescription>It disappears from Events I'm in. You can join again any time with its code.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={leave}>Leave event</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EventHeader = ({ event }: { event: JoinedEvent }) => {
  const faded = event.state === "expired" || event.state === "removed";
  return (
    <header className="relative mt-5 overflow-hidden rounded-3xl bg-inverse text-white">
      {event.cover_url ? (
        <img src={event.cover_url} alt="" className={cn("absolute inset-0 h-full w-full object-cover", faded && "grayscale")} />
      ) : (
        <span className={`film film-${(event.event_id % 6) + 1} absolute inset-0`} />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent" />
      <div className="relative flex min-h-[220px] flex-col justify-end p-6 sm:min-h-[260px] sm:p-8">
        {event.host_name && <p className="mb-7 -rotate-2 font-hand text-xl font-semibold leading-tight text-lime-500">photos by {event.host_name}</p>}
        <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">{event.title}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatEventDate(event.event_date)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
        </p>
        {event.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">{event.description}</p>}
      </div>
    </header>
  );
};

const StateNotice = ({ event, onRequest }: { event: JoinedEvent; onRequest: () => void }) => {
  const host = event.host_name ?? "the photographer";
  const copy =
    event.state === "expired"
      ? {
          note: "this one's expired",
          title: "The photos aren't on show any more",
          body: `${event.title} has passed its gallery date. Ask ${host} to reactivate it, and the photos will be back here.`,
        }
      : event.state === "removed"
        ? { note: "all gone", title: "The host removed this event", body: "Its photos have been deleted. You can leave it to tidy up your list." }
        : { note: "almost there", title: "The host is still setting up", body: "Photos will show up here as soon as the event goes live." };
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-dashed bg-card px-6 py-10 text-center">
      <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mb-1.5 mt-3 -rotate-2 font-hand text-2xl font-semibold leading-tight text-primary">{copy.note}</p>
      <h2 className="mt-1 text-xl font-bold">{copy.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      {event.state === "expired" &&
        (event.reactivation_requested ? (
          <p className="mt-5 font-hand text-xl font-semibold text-primary">asked ✓ we'll let you know</p>
        ) : (
          <Button className="mt-5" onClick={onRequest}>
            Ask {host} to bring it back
          </Button>
        ))}
    </div>
  );
};

const Lightbox = ({
  photo,
  position,
  onClose,
  onPrev,
  onNext,
  onHeart,
  onDownload,
}: {
  photo: MemberPhoto;
  position: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onHeart: () => void;
  onDownload: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-mono text-sm text-white/60">{position}</span>
        <div className="flex items-center gap-2">
          <HeartButton hearted={photo.hearted} onToggle={onHeart} />
          <Button asChild variant="signal" size="sm">
            <a href={photo.download_url} download onClick={onDownload}>
              <Download />
              Download
            </a>
          </Button>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <img src={photo.display_url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        {onPrev && (
          <button type="button" onClick={onPrev} aria-label="Previous photo" className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft />
          </button>
        )}
        {onNext && (
          <button type="button" onClick={onNext} aria-label="Next photo" className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default JoinedEventPage;
