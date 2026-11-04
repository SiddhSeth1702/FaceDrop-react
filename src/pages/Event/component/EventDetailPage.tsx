import { ChangeEvent, DragEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, Clock, Copy, CreditCard, Download, Hourglass, Loader2, MapPin, Pencil, Ticket, Trash2, Upload, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn, describeError } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { deleteEventUrl, getEventsdetailsUrl, retryPhotosUrl, updateEventUrl } from "@/service/requestUrls.service";
import { getUploadManager, isPhotoFile } from "../helper/uploadManager";
import { PhotoCounts, useEventPhotos } from "../helper/useEventPhotos";
import { EditFormState, EventModals } from "./EventModals";
import { PhotoGrid } from "./PhotoGrid";
import { UploadTray } from "./UploadTray";
import { MockCheckout } from "@/pages/Billing/component/MockCheckout";
import { billingUrls, formatCount, formatRupees, Order, ReactivationQuote, StudioUsage } from "@/pages/Billing/helper/billing";
import { EventGuestsCard } from "@/pages/Insights/component/EventGuestsCard";

/** Backend event status: 1 live, 4 expired. 0 and 2 only exist on events made before photos were processed on upload. */
const LIVE = 1;
const EXPIRED = 4;
const PENDING_PAYMENT = 5;

interface EventPlan {
  source: "trial" | "pass" | "studio";
  code: string;
  name: string;
  status: "pending_payment" | "active";
  order_id: string | null;
  photo_limit: number | null;
  price_paise: number;
  studio_usage: StudioUsage | null;
}

interface EventDetails {
  event_id: number;
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_code: string;
  event_thumbnail: string | null;
  status: number;
  activated_at: string | null;
  expires_at: string | null;
}

interface EventDetailsResponse {
  event: EventDetails;
  maxPhotosAllowed: number;
  photoCounts: PhotoCounts;
  plan: EventPlan | null;
  /** Guests who asked for this event back after it expired. */
  reactivationRequests?: number;
  /** Price to bring it back, only while it's expired. */
  reactivation?: ReactivationQuote | null;
}

const toDateInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const errorText = (error: unknown) => describeError(error).message || "Please try again in a moment.";

const formatTimestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

/** Every file inside a dropped folder (recursively). */
const readEntry = (entry: FileSystemEntry): Promise<File[]> =>
  new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((file) => resolve([file]), () => resolve([]));
      return;
    }
    if (!entry.isDirectory) return resolve([]);
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries: FileSystemEntry[] = [];
    const readBatch = () =>
      reader.readEntries(async (batch) => {
        if (batch.length) {
          entries.push(...batch);
          readBatch();
        } else {
          resolve((await Promise.all(entries.map(readEntry))).flat());
        }
      });
    readBatch();
  });

const EventDetailPage = () => {
  const { eventId: eventIdParam } = useParams();
  const eventId = Number(eventIdParam) || undefined;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestToServer } = useRequestToServer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [maxPhotos, setMaxPhotos] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [reactivationRequests, setReactivationRequests] = useState(0);
  const [reactivation, setReactivation] = useState<ReactivationQuote | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);

  // Edit + delete dialogs
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ title: "", location: "", description: "", date: "" });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const photos = useEventPhotos(eventId);
  const { addUploaded } = photos;

  // Uploads live outside React so they survive navigating to other pages
  const uploads = useMemo(() => (eventId ? getUploadManager(eventId, requestToServer) : null), [eventId, requestToServer]);
  const uploadSnapshot = useSyncExternalStore(
    useCallback((onChange) => (uploads ? uploads.subscribe(onChange) : () => undefined), [uploads]),
    () => uploads?.getSnapshot() ?? null
  );

  // The sidebar's upload indicator shows which event a batch belongs to
  useEffect(() => {
    if (uploads && event?.title) uploads.label = event.title;
  }, [uploads, event?.title]);

  // Finished uploads appear in the grid straight away as "processing"
  useEffect(() => {
    if (!uploads) return;
    return uploads.onUploaded((fileIds) => {
      const byId = new Map(uploads.getSnapshot().tasks.map((t) => [t.fileId, t.file]));
      addUploaded(
        fileIds.map((fileId) => ({ fileId, name: byId.get(fileId)?.name ?? "photo", size: byId.get(fileId)?.size ?? 0 }))
      );
    });
  }, [uploads, addUploaded]);

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      const response = await requestToServer(`${getEventsdetailsUrl}/${eventId}`, {}, "GET");
      if (response.status >= 400) throw new Error(response.data?.message);
      const data: EventDetailsResponse = response.data.data;
      setEvent(data.event);
      setMaxPhotos(data.maxPhotosAllowed);
      setPlan(data.plan);
      setReactivationRequests(data.reactivationRequests ?? 0);
      setReactivation(data.reactivation ?? null);
      setEditForm({
        title: data.event.title || "",
        location: data.event.location || "",
        description: data.event.description || "",
        date: toDateInput(data.event.event_date),
      });
    } catch (error) {
      toast({ title: "Couldn't load this event", description: errorText(error), variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, [eventId]);

  useEffect(() => {
    void fetchEventDetails();
  }, [fetchEventDetails]);

  const expired = event?.status === EXPIRED;
  const awaitingPayment = event?.status === PENDING_PAYMENT;
  const isLegacyDraft = !!event && event.status !== LIVE && !expired && !awaitingPayment;
  const canUpload = !!event && !expired && !isLegacyDraft && !awaitingPayment;
  // Guests sign in, join and find their photos from here
  const shareableLink = event ? `${window.location.origin}${ROUTES.join(event.event_code)}` : "";
  const uploadsInFlight = !!uploadSnapshot && uploadSnapshot.active + uploadSnapshot.queued > 0;

  /* ---------------------------------------------------------------- */
  /* Uploading                                                         */
  /* ---------------------------------------------------------------- */

  const startUpload = (files: File[]) => {
    if (!uploads || !canUpload) return;
    const accepted = files.filter(isPhotoFile);
    const skipped = files.length - accepted.length;
    if (skipped > 0) {
      toast({ title: `${skipped} ${skipped === 1 ? "file was" : "files were"} skipped`, description: "Only JPG, PNG, WebP and HEIC photos can be uploaded." });
    }

    let batch = accepted;
    if (maxPhotos) {
      const room = maxPhotos - photos.counts.total - (uploadSnapshot ? uploadSnapshot.active + uploadSnapshot.queued : 0);
      if (room <= 0) {
        toast({ title: "This event is full", description: `Your plan allows ${maxPhotos.toLocaleString("en-IN")} photos per event.`, variant: "destructive" });
        return;
      }
      if (batch.length > room) {
        toast({
          title: `Only ${room.toLocaleString("en-IN")} more ${room === 1 ? "photo fits" : "photos fit"}`,
          description: `The first ${room.toLocaleString("en-IN")} will upload. Your plan allows ${maxPhotos.toLocaleString("en-IN")} per event.`,
        });
        batch = batch.slice(0, room);
      }
    }
    if (batch.length) uploads.add(batch);
  };

  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) startUpload(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canUpload) return;
    const entries = Array.from(e.dataTransfer.items)
      .map((item) => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => !!entry);
    const files = entries.length ? (await Promise.all(entries.map(readEntry))).flat() : Array.from(e.dataTransfer.files);
    startUpload(files);
  };

  const dropHandlers = canUpload
    ? {
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragOver(true);
        },
        onDragLeave: (e: DragEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
        },
        onDrop: handleDrop,
      }
    : {};

  /** Events made before live-on-create: process their photos now and open them to guests. */
  const handleGoLive = async () => {
    if (!eventId) return;
    setGoingLive(true);
    try {
      const response = await requestToServer(retryPhotosUrl(eventId), {}, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      await fetchEventDetails();
      photos.setFilter("all");
      toast({ title: "Your event is live", description: "Photos are being matched now. Guests can search as soon as each one is ready." });
    } catch (error) {
      toast({ title: "Couldn't take the event live", description: errorText(error), variant: "destructive" });
    } finally {
      setGoingLive(false);
    }
  };

  /** Reopen the checkout for an Event Pass that hasn't been paid yet. */
  const handlePayNow = async () => {
    if (!eventId || !plan) return;
    setOpeningCheckout(true);
    try {
      let response = plan.order_id ? await requestToServer(billingUrls.order(plan.order_id), {}, "GET") : null;
      if (!response || response.status >= 400) {
        response = await requestToServer(billingUrls.orders, { planCode: plan.code, eventId }, "POST");
      }
      if (response.status >= 400) throw new Error(response.data?.message);
      setCheckoutOrder(response.data.data);
    } catch (error) {
      toast({ title: "Couldn't open the checkout", description: errorText(error), variant: "destructive" });
    } finally {
      setOpeningCheckout(false);
    }
  };

  /** Open the checkout to bring an expired event back. */
  const handleReactivate = async () => {
    if (!eventId) return;
    setOpeningCheckout(true);
    try {
      const response = await requestToServer(billingUrls.reactivation(eventId), {}, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      setCheckoutOrder(response.data.data);
    } catch (error) {
      toast({ title: "Couldn't open the checkout", description: errorText(error), variant: "destructive" });
    } finally {
      setOpeningCheckout(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Edit and delete                                                   */
  /* ---------------------------------------------------------------- */

  const resetThumbnailSelection = () => {
    setThumbnailFile(null);
    setThumbnailPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleEditModalChange = (open: boolean) => {
    if (!open && isSavingEdit) return;
    if (!open) {
      resetThumbnailSelection();
      if (event) {
        setEditForm({ title: event.title || "", location: event.location || "", description: event.description || "", date: toDateInput(event.event_date) });
      }
    }
    setIsEditModalOpen(open);
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = "";
  };

  const handleSaveEdit = async () => {
    if (!eventId) return;
    if (!editForm.title.trim() || !editForm.location.trim() || !editForm.date) {
      toast({ title: "Missing details", description: "Title, location and date are required.", variant: "destructive" });
      return;
    }
    setIsSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append("eventTitle", editForm.title.trim());
      formData.append("eventLocation", editForm.location.trim());
      formData.append("eventDate", editForm.date);
      formData.append("eventDescription", editForm.description.trim());
      if (thumbnailFile) formData.append("file", thumbnailFile);

      const response = await requestToServer(`${updateEventUrl}/${eventId}`, formData, "PATCH");
      if (response.status >= 400) throw new Error(response.data?.message);
      toast({ title: "Event updated", description: "Your changes are saved." });
      setIsEditModalOpen(false);
      resetThumbnailSelection();
      await fetchEventDetails();
    } catch (error) {
      toast({ title: "Update failed", description: errorText(error), variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    setIsDeletingEvent(true);
    try {
      uploads?.cancelAll();
      const response = await requestToServer(`${deleteEventUrl}/${eventId}`, {}, "DELETE");
      if (response.status >= 400) throw new Error(response.data?.message);
      toast({ title: "Event deleted", description: "The event, its photos and matched faces are gone." });
      setIsDeleteDialogOpen(false);
      navigate(ROUTES.dashboard);
    } catch (error) {
      toast({ title: "Delete failed", description: errorText(error), variant: "destructive" });
    } finally {
      setIsDeletingEvent(false);
    }
  };

  useEffect(
    () => () => {
      if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    },
    [thumbnailPreview]
  );

  /* ---------------------------------------------------------------- */

  const statusChip = expired
    ? { label: "Expired", className: "bg-danger text-danger-foreground" }
    : awaitingPayment
      ? { label: "Payment pending", className: "bg-warn text-warn-foreground" }
      : isLegacyDraft
      ? { label: "Not live yet", className: "bg-secondary text-muted-foreground" }
      : { label: "Live", className: "bg-lime-500 text-ink-950" };
  const eventDate = event?.event_date ? new Date(event.event_date) : null;
  const showDropzone = canUpload && photos.loaded && photos.counts.total === 0 && photos.filter === "all" && !uploadSnapshot?.total;

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8" {...dropHandlers}>
      {/* Drop anywhere on the page */}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-primary/10 backdrop-blur-[2px]">
          <div className="rounded-3xl border-2 border-dashed border-primary bg-card px-10 py-8 text-center shadow-lift">
            <Upload className="mx-auto h-7 w-7 text-primary" />
            <p className="mt-3 font-semibold">Drop photos or folders to upload</p>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All events
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 break-words text-2xl font-bold leading-tight sm:text-[30px]">{event?.title || " "}</h1>
            {event && (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusChip.className)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                {statusChip.label}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {eventDate && !Number.isNaN(eventDate.getTime()) && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {eventDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {event?.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="break-words">{event.location}</span>
              </span>
            )}
            {plan && (
              <span className="inline-flex items-center gap-1.5">
                <Ticket className="h-4 w-4" />
                {plan.source === "studio"
                  ? `Studio ${plan.name}${plan.studio_usage ? ` · ${formatCount(plan.studio_usage.remaining)} photos left this month` : ""}`
                  : plan.source === "trial"
                    ? `Free trial · ${formatCount(plan.photo_limit ?? 0)} photos`
                    : `${plan.name} pass · ${formatCount(plan.photo_limit ?? 0)} photos`}
              </span>
            )}
            {event?.description && (
              <span className="min-w-0 max-w-xl truncate" title={event.description}>
                {event.description}
              </span>
            )}
          </div>
        </div>

        {event && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!expired && (
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Pencil />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
              Delete
            </Button>
            {canUpload && (
              <Button variant="ink" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Upload photos
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {awaitingPayment && plan && (
            <StatusStrip
              tone="primary"
              icon={<CreditCard className="h-4 w-4" />}
              title={`Pay for the ${plan.name} pass to go live.`}
              text={`${formatRupees(plan.price_paise)} + GST · up to ${formatCount(plan.photo_limit ?? 0)} photos for 30 days. You get the guest QR as soon as it's paid.`}
            >
              <Button size="sm" onClick={handlePayNow} disabled={openingCheckout} className="shrink-0">
                <CreditCard />
                {openingCheckout ? "Opening..." : "Pay now"}
              </Button>
            </StatusStrip>
          )}
          {isLegacyDraft && (
            <StatusStrip
              tone="primary"
              icon={<Zap className="h-4 w-4" />}
              title="This event isn't live yet."
              text="Take it live to match faces in the photos you've uploaded and open it to guests."
            >
              <Button size="sm" onClick={handleGoLive} disabled={goingLive} className="shrink-0">
                <Zap />
                {goingLive ? "Going live..." : "Go live"}
              </Button>
            </StatusStrip>
          )}
          {expired && (
            <StatusStrip
              tone="danger"
              icon={<Clock className="h-4 w-4" />}
              title="This event has expired."
              text={
                reactivationRequests > 0
                  ? `${reactivationRequests} ${reactivationRequests === 1 ? "guest has" : "guests have"} asked for it back. Guests can't see or download its photos right now.`
                  : "Guests can no longer find or download photos from it."
              }
            >
              {reactivation && (
                <div className="flex flex-col items-end gap-0.5">
                  <Button size="sm" onClick={handleReactivate} disabled={openingCheckout}>
                    {openingCheckout && <Loader2 className="animate-spin" />}
                    Reactivate for {reactivation.gallery_days} days · {formatRupees(reactivation.amount_paise)}
                  </Button>
                  <span className="text-[11.5px] text-muted-foreground">
                    + GST{reactivation.studio_discount && " · half price with Studio"}
                  </span>
                </div>
              )}
            </StatusStrip>
          )}
          {!expired && !isLegacyDraft && photos.counts.processing > 0 && !uploadsInFlight && (
            <StatusStrip
              tone="warn"
              icon={<Hourglass className="h-4 w-4 animate-pulse" />}
              title={`Matching faces in ${photos.counts.processing.toLocaleString("en-IN")} ${photos.counts.processing === 1 ? "photo" : "photos"}.`}
              text="Guests can already search the ready ones. This keeps going even if you close the page."
            />
          )}

          {uploadSnapshot && uploads && (
            <UploadTray
              snapshot={uploadSnapshot}
              onRetryFailed={() => uploads.retryFailed()}
              onCancelAll={() => uploads.cancelAll()}
              onDismiss={() => uploads.clearFinished()}
            />
          )}

          {showDropzone ? (
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-center rounded-2xl border-[1.5px] border-dashed px-6 py-14 text-center transition-colors",
                "border-primary/35 bg-accent/40 hover:border-primary/60"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                <Upload className="h-5 w-5" />
              </span>
              <span className="mt-4 font-semibold">
                Drop photos or folders here, or <span className="text-primary">browse</span>
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                JPG, PNG or HEIC{maxPhotos ? ` · up to ${maxPhotos.toLocaleString("en-IN")} photos` : ""}. Guests can search each photo as soon as it's ready.
              </span>
            </button>
          ) : (
            (photos.counts.total > 0 || photos.filter !== "all" || !photos.loaded) && (
              <PhotoGrid
                photos={photos.photos}
                counts={photos.counts}
                filter={photos.filter}
                onFilterChange={photos.setFilter}
                loading={photos.loading}
                hasMore={photos.hasMore}
                onLoadMore={photos.loadMore}
                editable={!expired}
                maxPhotos={maxPhotos}
                onAddMore={canUpload ? () => fileInputRef.current?.click() : undefined}
                onDelete={async (ids) => {
                  try {
                    await photos.deletePhotos(ids);
                    toast({ title: `${ids.length} ${ids.length === 1 ? "photo" : "photos"} deleted`, description: "They're gone from guest results too." });
                  } catch (error) {
                    toast({ title: "Delete failed", description: errorText(error), variant: "destructive" });
                  }
                }}
                onRetry={async (ids) => {
                  try {
                    const queued = await photos.retryFailed(ids);
                    toast({ title: queued ? `Retrying ${queued} ${queued === 1 ? "photo" : "photos"}` : "Nothing to retry" });
                  } catch (error) {
                    toast({ title: "Retry failed", description: errorText(error), variant: "destructive" });
                  }
                }}
              />
            )
          )}

          <input type="file" multiple accept=".heic,.HEIC,.heif,image/*" className="hidden" onChange={handleFileSelection} ref={fileInputRef} />
        </div>

        {event && (
          <aside className="grid content-start gap-4 sm:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1 xl:self-start">
            <GuestCard event={event} live={event.status === LIVE} shareableLink={shareableLink} />
            <EventGuestsCard eventId={event.event_id} />
            <figure className="polaroid relative mx-auto w-full max-w-[240px] rotate-1 self-start">
              <span className="tape" />
              <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-secondary">
                {event.event_thumbnail ? (
                  <img
                    src={event.event_thumbnail}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="finder [--c:hsl(var(--ink-400))]" />
                )}
              </div>
              <figcaption className="truncate px-1 pb-2.5 pt-2 text-center font-hand text-lg font-semibold text-ink-800">
                {event.event_thumbnail ? "cover photo" : "no cover photo yet"}
              </figcaption>
            </figure>
          </aside>
        )}
      </div>

      <MockCheckout
        order={checkoutOrder}
        onClose={() => setCheckoutOrder(null)}
        onPaid={async (paid) => {
          setCheckoutOrder(null);
          await fetchEventDetails();
          toast(
            paid.purpose === "reactivation"
              ? { title: "Your event is back", description: `Guests can see and download its photos again for ${paid.plan.gallery_days} days.` }
              : { title: "Paid. Your event is live", description: "Upload the photos now. Guests can search each one as soon as it's ready." }
          );
        }}
      />

      <EventModals
        isEditModalOpen={isEditModalOpen}
        onEditModalChange={handleEditModalChange}
        editForm={editForm}
        onFieldChange={(field, value) => setEditForm((prev) => ({ ...prev, [field]: value }))}
        isEditFormValid={Boolean(editForm.title.trim() && editForm.location.trim() && editForm.date)}
        isSavingEdit={isSavingEdit}
        onSaveEdit={handleSaveEdit}
        onThumbnailChange={handleThumbnailChange}
        thumbnailPreview={thumbnailPreview}
        onResetThumbnail={resetThumbnailSelection}
        isDeleteDialogOpen={isDeleteDialogOpen}
        onDeleteDialogChange={(open) => (open || !isDeletingEvent) && setIsDeleteDialogOpen(open)}
        onDeleteEvent={handleDeleteEvent}
        isDeletingEvent={isDeletingEvent}
      />
    </div>
  );
};

/* -------------------------------------------------------------------- */

const GuestCard = ({ event, live, shareableLink }: { event: EventDetails; live: boolean; shareableLink: string }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast({ title: "Guest link copied", description: "Paste it in WhatsApp, email or on your table cards.", duration: 5000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  /** Saves the guest-link QR as a print-ready PNG (falls back to SVG). */
  const handleDownloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const fileBase = `facedrop-${event.event_code || "event"}-qr`;
    const svgText = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
    const saveBlob = (blob: Blob, name: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const saveSvg = () => saveBlob(new Blob([svgText], { type: "image/svg+xml" }), `${fileBase}.svg`);

    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const margin = 96; // white quiet zone so printed codes scan reliably
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size + margin * 2;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(svgUrl);
      if (!ctx) return saveSvg();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, margin, margin, size, size);
      canvas.toBlob((blob) => (blob ? saveBlob(blob, `${fileBase}.png`) : saveSvg()), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      saveSvg();
    };
    img.src = svgUrl;
  };

  return (
    <div className="rounded-2xl bg-inverse p-5 text-inverse-foreground">
      <div className="flex items-baseline justify-between gap-3">
        <p className="inline-block -rotate-2 font-hand text-xl font-semibold text-lime-500">guest code</p>
        {live && <span className="text-xs text-white/50">until {formatTimestamp(event.expires_at)}</span>}
      </div>
      <p className={cn("mt-1.5 break-all font-mono text-[28px] font-bold leading-none tracking-[0.12em]", !live && "text-white/40")}>
        {event.event_code || "------"}
      </p>

      {live ? (
        <>
          <div className="mt-4 flex items-start gap-4">
            <div ref={qrRef} className="shrink-0 rounded-xl bg-white p-2.5 shadow-sm">
              <QRCodeSVG value={shareableLink} size={104} level="M" bgColor="#ffffff" fgColor="#0B0B12" title={`QR code for ${event.title || "this event"}`} />
            </div>
            <p className="text-[13px] leading-relaxed text-white/60">
              Share it now. Guests take a selfie and see every photo that's ready, and new ones appear as you upload.
            </p>
          </div>
          <div className="mt-4 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-white/70">
            {shareableLink}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="signal" size="sm" onClick={handleCopyLink}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              title="Download QR for table cards"
            >
              <Download />
              QR for print
            </Button>
          </div>
          <p className="mt-3 text-xs text-white/50">Live since {formatTimestamp(event.activated_at)}</p>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-white/60">
          {event.status === EXPIRED ? "This code no longer works because the event has expired." : "This code starts working once the event goes live."}
        </p>
      )}
    </div>
  );
};

type StripTone = "primary" | "warn" | "danger";

const STRIP_TONES: Record<StripTone, { box: string; icon: string }> = {
  primary: { box: "border-primary/25 bg-accent/60", icon: "bg-primary text-primary-foreground" },
  warn: { box: "border-border bg-card", icon: "bg-warn text-warn-foreground" },
  danger: { box: "border-destructive/20 bg-danger/60", icon: "bg-danger text-danger-foreground" },
};

/** One-line status message above the gallery, with an optional action on the right. */
const StatusStrip = ({ tone, icon, title, text, children }: { tone: StripTone; icon: ReactNode; title: string; text: string; children?: ReactNode }) => (
  <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3", STRIP_TONES[tone].box)}>
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", STRIP_TONES[tone].icon)}>{icon}</div>
    <p className="min-w-[200px] flex-1 text-sm">
      <span className="font-semibold">{title}</span> <span className="text-muted-foreground">{text}</span>
    </p>
    {children}
  </div>
);

export default EventDetailPage;
