import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCheck,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import {
  formatEventDay,
  Lead,
  LEAD_STATUS_LABEL,
  LeadStats,
  LeadStatus,
  leadsUrls,
  notifyLeadsChanged,
  whatsappWithText,
} from "../helper/leads";
import { StudioDraft, studioUrls } from "../helper/studio";

type Tab = "all" | "unread" | LeadStatus;
type Sort = "received" | "event_date";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "new", label: "Needs reply" },
  { value: "replied", label: "Replied" },
  { value: "booked", label: "Booked" },
  { value: "not_a_fit", label: "Not a fit" },
];
const STATUSES: LeadStatus[] = ["new", "replied", "booked", "not_a_fit"];
const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary",
  replied: "bg-secondary text-foreground",
  booked: "bg-lime-500 text-ink-950",
  not_a_fit: "bg-secondary text-muted-foreground",
};
const PAGE_SIZE = 25;
const EMPTY_STATS: LeadStats = {
  total: 0,
  this_week: 0,
  unread: 0,
  needs_reply: 0,
  booked: 0,
  conversion: 0,
  upcoming: 0,
};
const EMPTY_COUNTS: Record<Tab, number> = {
  all: 0,
  unread: 0,
  new: 0,
  replied: 0,
  booked: 0,
  not_a_fit: 0,
};

/** "just now", "3h ago", "2 days ago", then the date. */
const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Enquiries from the Studio page: headline numbers, then every enquiry in a table. */
const EnquiriesPage = () => {
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("status") as Tab) || "all";
  const sort = (params.get("sort") as Sort) || "received";

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(search);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [stats, setStats] = useState<LeadStats>(EMPTY_STATS);
  const [counts, setCounts] = useState<Record<Tab, number>>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [open, setOpen] = useState<Lead | null>(null);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  /** Their page, for the WhatsApp greeting and the empty state. Undefined while loading. */
  const [page, setPage] = useState<StudioDraft | null | undefined>(undefined);

  useEffect(() => {
    void requestRef.current(studioUrls.mine, {}, "GET").then(
      (response) =>
        setPage(response.status < 400 ? (response.data?.data ?? null) : null),
      () => setPage(null),
    );
  }, []);

  // Search once they stop typing
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (pageNumber = 1) => {
      const q = new URLSearchParams({
        status: tab,
        sort,
        page: String(pageNumber),
        limit: String(PAGE_SIZE),
      });
      if (query) q.set("q", query);
      const response = await requestRef.current(
        `${leadsUrls.list}?${q}`,
        {},
        "GET",
      );
      if (response.status >= 400) return;
      const { result, pagination, counts, stats } = response.data.data;
      setLeads((prev) =>
        pageNumber === 1 ? result : [...(prev ?? []), ...result],
      );
      setCounts(counts);
      setStats(stats);
      setTotal(pagination?.total ?? result.length);
      setNextPage(pagination?.next ?? null);
    },
    [tab, sort, query],
  );

  useEffect(() => {
    setLeads(null);
    void load(1);
  }, [load]);

  /** Change a lead on the server, then refresh the numbers. */
  const patch = async (
    lead: Lead,
    body: { status?: LeadStatus; read?: boolean },
    message?: string,
  ) => {
    setBusyId(lead.lead_id);
    try {
      const response = await requestToServer(
        leadsUrls.lead(lead.lead_id),
        body,
        "PATCH",
      );
      if (response.status >= 400) throw new Error(response.data?.message);
      const updated = response.data.data as Lead;
      setLeads((prev) =>
        (prev ?? []).map((l) => (l.lead_id === lead.lead_id ? updated : l)),
      );
      setOpen((o) => (o?.lead_id === lead.lead_id ? updated : o));
      notifyLeadsChanged();
      if (message) toast({ title: message });
      // Numbers and tab counts follow; the row stays put until the next load so it doesn't jump away
      void refreshNumbers();
    } catch (err) {
      toast({
        title: "Couldn't update the enquiry",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const refreshNumbers = async () => {
    const response = await requestRef
      .current(`${leadsUrls.list}?status=all&limit=1`, {}, "GET")
      .catch(() => null);
    if (response && response.status < 400) {
      setCounts(response.data.data.counts);
      setStats(response.data.data.stats);
    }
  };

  const openLead = (lead: Lead) => {
    setOpen(lead);
    if (!lead.read) void patch(lead, { read: true });
  };

  const setStatus = (lead: Lead, status: LeadStatus) => {
    if (lead.status === status) return;
    void patch(
      lead,
      { status },
      status === "booked"
        ? "Booked. Congratulations!"
        : `Marked ${LEAD_STATUS_LABEL[status].toLowerCase()}`,
    );
  };

  const markAllRead = async () => {
    const response = await requestToServer(leadsUrls.readAll, {}, "POST").catch(
      () => null,
    );
    if (!response || response.status >= 400) {
      toast({ title: "Couldn't mark them read", variant: "destructive" });
      return;
    }
    setLeads((prev) => (prev ?? []).map((l) => ({ ...l, read: true })));
    notifyLeadsChanged();
    void refreshNumbers();
  };

  const remove = async (lead: Lead) => {
    setBusyId(lead.lead_id);
    try {
      const response = await requestToServer(
        leadsUrls.lead(lead.lead_id),
        {},
        "DELETE",
      );
      if (response.status >= 400) throw new Error(response.data?.message);
      setLeads((prev) =>
        (prev ?? []).filter((l) => l.lead_id !== lead.lead_id),
      );
      setTotal((t) => t - 1);
      setOpen(null);
      notifyLeadsChanged();
      void refreshNumbers();
      toast({ title: "Enquiry deleted" });
    } catch (err) {
      toast({
        title: "Couldn't delete it",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const studioName = page?.name || "your photographer";
  const published = !!page?.publishedAt;
  const nothingYet = leads !== null && stats.total === 0;

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">
              Enquiries
            </h1>
            <p className="-rotate-2 font-hand text-xl font-semibold text-primary">
              is your date free?
            </p>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            From the form on your Studio page. We email you each one as it
            arrives.
          </p>
        </div>
        {stats.unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck />
            Mark all read
          </Button>
        )}
      </div>

      {/* Headline numbers */}
      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border bg-card sm:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Total enquiries"
          value={stats.total}
          note={
            stats.this_week ? `+${stats.this_week} this week` : "none this week"
          }
        />
        <Kpi
          label="Unread"
          value={stats.unread}
          note={stats.unread ? "not opened yet" : "all read"}
          tone={stats.unread ? "iris" : undefined}
        />
        <Kpi
          label="Needs a reply"
          value={stats.needs_reply}
          note={stats.needs_reply ? "still marked new" : "you're on top of it"}
        />
        <Kpi
          label="Booked"
          value={stats.booked}
          note={stats.total ? `${stats.conversion}% of enquiries` : "—"}
          tone={stats.booked ? "lime" : undefined}
        />
        <Kpi
          label="Coming up"
          value={stats.upcoming}
          note="dates in the next 60 days"
          className="col-span-2 border-b-0 sm:col-span-1"
        />
      </dl>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Filter enquiries"
          className="flex flex-wrap gap-1.5"
        >
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setParam("status", value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts[value] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, city"
              aria-label="Search enquiries"
              className="h-9 w-full pl-9 sm:w-60"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="h-9 w-[170px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received">Newest first</SelectItem>
              <SelectItem value="event_date">Event date, soonest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* The table */}
      <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
        {!leads ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="inline-block -rotate-2 font-hand text-3xl font-semibold text-primary">
              {nothingYet
                ? "no enquiries yet"
                : query
                  ? "no matches"
                  : "nothing here"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {!nothingYet
                ? query
                  ? `Nothing matches "${query}".`
                  : "No enquiries in this list."
                : page === undefined
                  ? ""
                  : published
                    ? "When someone fills in the form on your Studio page, it lands here. Share your link to get the first one."
                    : "They come from the form on your Studio page. Publish it and share the link to start getting them."}
            </p>
            {nothingYet && page !== undefined && (
              <Button asChild variant="outline" className="mt-5">
                {published && page ? (
                  <Link to={ROUTES.studioPublic(page.slug)} target="_blank">
                    Open your page
                  </Link>
                ) : (
                  <Link to={ROUTES.studio}>Set up your Studio page</Link>
                )}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="w-[26%] pl-5">Name</TableHead>
                <TableHead>Event date</TableHead>
                <TableHead className="hidden lg:table-cell">City</TableHead>
                <TableHead className="hidden md:table-cell">
                  The event
                </TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%] pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.lead_id}
                  onClick={() => openLead(lead)}
                  className={cn(
                    "cursor-pointer",
                    !lead.read && "bg-primary/[0.04]",
                  )}
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          lead.read ? "bg-transparent" : "bg-primary",
                        )}
                        aria-label={lead.read ? undefined : "Unread"}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate",
                            lead.read ? "font-medium" : "font-bold",
                          )}
                        >
                          {lead.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {lead.event_date ? (
                      formatEventDay(lead.event_date)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {lead.city || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[280px] md:table-cell">
                    <p className="truncate text-muted-foreground">
                      {lead.message || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(lead.created_at)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StatusSelect
                      value={lead.status}
                      disabled={busyId === lead.lead_id}
                      onChange={(s) => setStatus(lead, s)}
                    />
                  </TableCell>
                  <TableCell
                    className="pr-5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      {lead.whatsapp_link && (
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Reply on WhatsApp"
                        >
                          <a
                            href={whatsappWithText(
                              lead.whatsapp_link,
                              lead.name,
                              studioName,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Reply to ${lead.name} on WhatsApp`}
                            onClick={() =>
                              lead.status === "new" &&
                              void patch(lead, { status: "replied" })
                            }
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setToDelete(lead)}
                        aria-label={`Delete ${lead.name}'s enquiry`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {leads && leads.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {leads.length} of {total}
          </span>
          {nextPage && (
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                await load(nextPage);
                setLoadingMore(false);
              }}
            >
              {loadingMore && <Loader2 className="animate-spin" />}
              Show more
            </Button>
          )}
        </div>
      )}

      {/* One enquiry in full */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          {open && (
            <>
              <SheetTitle className="pr-8 text-2xl font-bold">
                {open.name}
              </SheetTitle>
              <SheetDescription>
                Enquired {timeAgo(open.created_at)}
              </SheetDescription>

              <dl className="mt-6 grid gap-4 text-sm">
                <Detail
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Event date"
                >
                  {open.event_date
                    ? formatEventDay(open.event_date)
                    : "Not given"}
                </Detail>
                <Detail icon={<MapPin className="h-4 w-4" />} label="City">
                  {open.city || "Not given"}
                </Detail>
                <Detail icon={<Phone className="h-4 w-4" />} label="Phone">
                  <a
                    href={`tel:${open.phone.replace(/[^\d+]/g, "")}`}
                    className="hover:underline"
                  >
                    {open.phone}
                  </a>
                </Detail>
              </dl>

              <div className="mt-6 rounded-2xl bg-secondary p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  The event
                </p>
                <p className="mt-1 whitespace-pre-wrap font-hand text-xl leading-snug">
                  {open.message || "No details given."}
                </p>
              </div>

              <div className="mt-6 grid gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(open, s)}
                      disabled={busyId !== null}
                      aria-pressed={open.status === s}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60",
                        open.status === s
                          ? STATUS_STYLE[s] + " ring-2 ring-foreground/15"
                          : "bg-transparent text-muted-foreground ring-1 ring-border hover:text-foreground",
                      )}
                    >
                      {LEAD_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">
                {open.whatsapp_link && (
                  <Button asChild variant="signal" className="flex-1">
                    <a
                      href={whatsappWithText(
                        open.whatsapp_link,
                        open.name,
                        studioName,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        open.status === "new" &&
                        void patch(open, { status: "replied" })
                      }
                    >
                      <MessageCircle />
                      Reply on WhatsApp
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    void patch(open, { read: false }, "Marked unread")
                  }
                  disabled={busyId !== null}
                >
                  Mark unread
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setToDelete(open)}
                  aria-label="Delete enquiry"
                  className="hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete {toDelete?.name.split(" ")[0]}'s enquiry?
          </AlertDialogTitle>
          <AlertDialogDescription>
            It's removed for good. For enquiries that didn't work out, "Not a
            fit" keeps a record.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && void remove(toDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** One headline number. The cells share borders so the row reads as one strip. */
const Kpi = ({
  label,
  value,
  note,
  tone,
  className,
}: {
  label: string;
  value: number;
  note: string;
  tone?: "iris" | "lime";
  className?: string;
}) => (
  <div
    className={cn(
      "border-b border-r px-5 py-4 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:[&:nth-child(5n)]:border-r-0",
      className,
    )}
  >
    <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
    <dd className="mt-1 flex items-baseline gap-2">
      <span
        className={cn(
          "font-display text-3xl font-extrabold tabular-nums",
          tone === "iris" && "text-primary",
          tone === "lime" && "rounded-md bg-lime-500 px-1.5 text-ink-950",
        )}
      >
        {value}
      </span>
    </dd>
    <dd className="mt-0.5 text-xs text-muted-foreground">{note}</dd>
  </div>
);

const StatusSelect = ({
  value,
  disabled,
  onChange,
}: {
  value: LeadStatus;
  disabled: boolean;
  onChange: (s: LeadStatus) => void;
}) => (
  <Select
    value={value}
    onValueChange={(v) => onChange(v as LeadStatus)}
    disabled={disabled}
  >
    <SelectTrigger
      className={cn(
        "h-8 w-[118px] rounded-full border-0 px-3 text-xs font-semibold",
        STATUS_STYLE[value],
      )}
      aria-label="Status"
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s}>
          {LEAD_STATUS_LABEL[s]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Detail = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-muted-foreground">{icon}</span>
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  </div>
);

export default EnquiriesPage;
