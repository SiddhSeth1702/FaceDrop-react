import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Plus,
  Rows3,
  Search,
} from "lucide-react";
import useRequestToServer from "@/service/httpService";
import { getEventsUrl } from "@/service/requestUrls.service";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  status: number;
  photos: string[];
  code: string | null;
  expiresAt: string | null;
}

interface ApiEvent {
  event_id: number | string;
  title: string;
  location: string;
  event_date: string;
  description: string;
  status: number;
  event_thumbnail?: string | null;
  event_code?: string | null;
  expires_at?: string | null;
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  prev: number | null;
  next: number | null;
}

type ViewMode = "grid" | "list";

// 20 fills whole rows at 2, 4 and 5 columns.
const PAGE_SIZE = 20;
const VIEW_STORAGE_KEY = "facedrop-events-view";

const readView = (): ViewMode => (localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid");

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const { requestToServer } = useRequestToServer();
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>(readView);
  const { name } = useAuth();

  const changeView = (next: ViewMode) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  // Debounce effect (trigger after 500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearch(searchTerm);
        setPage(1); // reset page on new search
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await requestToServer(
          `${getEventsUrl}?page=${page}&limit=${PAGE_SIZE}&orderDir=${sortOrder}&search=${debouncedSearch}`,
          {},
          "GET"
        );

        const apiEvents = response.data.data.result;
        const apiPagination = response.data.data.pagination;

        const mappedEvents: Event[] = apiEvents.map((e: ApiEvent) => ({
          id: String(e.event_id),
          title: e.title,
          location: e.location,
          date: e.event_date,
          description: e.description,
          photos: e.event_thumbnail ? [e.event_thumbnail] : [],
          status: e.status,
          code: e.event_code ?? null,
          expiresAt: e.expires_at ?? null,
        }));

        setEvents(mappedEvents);
        setPagination(apiPagination);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // requestToServer is recreated every render, so listing it would refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortOrder, debouncedSearch]);

  const firstName = name?.trim().split(/\s+/)[0];
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.perPage)) : 1;
  const isSearching = debouncedSearch.length > 0;
  const rangeStart = pagination ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const rangeEnd = pagination ? rangeStart + events.length - 1 : 0;

  return (
    <div className="mx-auto w-full max-w-[1680px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      {/* Header: title on the left, tools on the right */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="inline-block -rotate-2 font-hand text-xl font-semibold text-primary">{greeting()}</p>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">
              {firstName ? `${firstName}'s events` : "Your events"}
            </h1>
            {pagination && pagination.total > 0 && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                {pagination.total}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events"
              aria-label="Search events"
              className="h-10 rounded-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title="Sort by date created"
          >
            <ArrowDownUp />
            <span className="hidden sm:inline">{sortOrder === "desc" ? "Newest first" : "Oldest first"}</span>
          </Button>
          <div className="flex rounded-full border border-input bg-card p-1" role="radiogroup" aria-label="View">
            {([
              { value: "grid", label: "Grid view", icon: LayoutGrid },
              { value: "list", label: "List view", icon: Rows3 },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={view === value}
                aria-label={label}
                title={label}
                onClick={() => changeView(value)}
                className={cn(
                  "flex h-8 w-9 items-center justify-center rounded-full transition-colors",
                  view === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6">
        {events.length === 0 && loading ? (
          view === "grid" ? <GridSkeleton /> : <ListSkeleton />
        ) : events.length === 0 ? (
          isSearching ? (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
              <h3 className="text-xl font-bold">No events match "{debouncedSearch}"</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try a different name, or clear the search.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSearchTerm("")}>
                Clear search
              </Button>
            </div>
          ) : (
            <EmptyState canCreate onCreate={() => navigate(ROUTES.createEvent)} />
          )
        ) : (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/60 pt-24">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
              </div>
            )}

            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            ) : (
              <EventList events={events} />
            )}

            {/* Pagination Controls */}
            {pagination && (
              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-mono text-foreground">{rangeStart}–{rangeEnd}</span> of{" "}
                  <span className="font-mono text-foreground">{pagination.total}</span>
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.prev}
                      onClick={() => setPage(pagination.prev!)}
                    >
                      <ChevronLeft />
                      Previous
                    </Button>
                    <span className="px-2 font-mono text-sm text-muted-foreground">
                      {pagination.page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.next}
                      onClick={() => setPage(pagination.next!)}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "good morning";
  if (hour < 17) return "good afternoon";
  return "good evening";
};

// Written out in full so Tailwind keeps every variant in the build.
const FILM_TONES = ["film-1", "film-2", "film-3", "film-4", "film-5", "film-6"];

const STATUS: Record<number, { label: string; className: string }> = {
  0: { label: "Not live yet", className: "bg-secondary text-muted-foreground" },
  1: { label: "Live", className: "bg-live text-live-foreground" },
  2: { label: "Not live yet", className: "bg-secondary text-muted-foreground" },
  3: { label: "Expired", className: "bg-danger text-danger-foreground" },
  4: { label: "Expired", className: "bg-danger text-danger-foreground" },
  5: { label: "Payment pending", className: "bg-warn text-warn-foreground" },
};

const StatusChip = ({ status, className }: { status: number; className?: string }) => {
  const meta = STATUS[status] ?? STATUS[0];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
};

const formatDate = (value: string, withWeekday = false) =>
  new Date(value).toLocaleDateString("en-IN", {
    ...(withWeekday && { weekday: "short" }),
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Cover = ({ event, index, className }: { event: Event; index: number; className?: string }) => {
  const cover = event.photos[0] ? decodeURIComponent(event.photos[0]) : null;
  return (
    <div className={cn("film relative overflow-hidden", FILM_TONES[index % FILM_TONES.length], className)}>
      {cover && (
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
};

const EventCard = ({ event, index }: { event: Event; index: number }) => (
  <Link
    to={ROUTES.event(event.id)}
    className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div className="relative">
      <Cover event={event} index={index} className="aspect-[4/3]" />
      <StatusChip status={event.status} className="absolute left-2.5 top-2.5 shadow-sm" />
      {event.code && (
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-ink-950/60 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-white backdrop-blur-sm">
          {event.code}
        </span>
      )}
    </div>

    <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
      <h3 className="truncate font-display text-sm font-bold leading-snug sm:text-[15px]" title={event.title}>
        {event.title}
      </h3>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {formatDate(event.date, true)}
        </span>
        {event.location && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        )}
      </div>
      {event.status === 1 && event.expiresAt && (
        <p className="mt-auto pt-1 text-xs font-medium text-live-foreground">
          Open to guests until {formatDate(event.expiresAt)}
        </p>
      )}
    </div>
  </Link>
);

const LIST_COLUMNS = "grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[64px_minmax(0,2fr)_minmax(0,1.2fr)_110px_120px] lg:grid-cols-[64px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_110px_120px]";

const EventList = ({ events }: { events: Event[] }) => (
  <div className="overflow-hidden rounded-2xl border bg-card">
    <div className={cn(LIST_COLUMNS, "hidden border-b px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground md:grid")}>
      <span />
      <span>Event</span>
      <span>Date &amp; place</span>
      <span className="hidden lg:block">Guest access</span>
      <span>Code</span>
      <span className="text-right">Status</span>
    </div>
    <ul className="divide-y">
      {events.map((event, index) => (
        <li key={event.id}>
          <Link
            to={ROUTES.event(event.id)}
            className={cn(
              LIST_COLUMNS,
              "group px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none"
            )}
          >
            <Cover event={event} index={index} className="h-12 w-14 rounded-lg md:w-16" />
            <div className="min-w-0">
              <p className="truncate font-semibold" title={event.title}>{event.title}</p>
              <p className="truncate text-xs text-muted-foreground md:hidden">
                {formatDate(event.date)}
                {event.location && ` · ${event.location}`}
              </p>
              {event.description && (
                <p className="hidden truncate text-xs text-muted-foreground md:block">{event.description}</p>
              )}
            </div>
            <div className="hidden min-w-0 text-sm md:block">
              <p className="truncate">{formatDate(event.date, true)}</p>
              {event.location && <p className="truncate text-xs text-muted-foreground">{event.location}</p>}
            </div>
            <p className="hidden truncate text-sm text-muted-foreground lg:block">
              {event.status === 1 && event.expiresAt
                ? `Until ${formatDate(event.expiresAt)}`
                : event.status === 3
                  ? "Closed"
                  : "Not live yet"}
            </p>
            <span className="hidden font-mono text-sm font-bold tracking-wider md:block">{event.code ?? "—"}</span>
            <div className="flex justify-end">
              <StatusChip status={event.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const GridSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {Array.from({ length: 8 }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-2xl border bg-card">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="space-y-2 p-3.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="divide-y overflow-hidden rounded-2xl border bg-card">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3">
        <Skeleton className="h-12 w-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) => (
  <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed bg-card px-6 py-14 text-center sm:flex-row sm:gap-12 sm:px-12 sm:text-left">
    <figure className="polaroid relative w-40 shrink-0 -rotate-3">
      <span className="tape" />
      <div className="relative aspect-[4/5] rounded-[3px] bg-ink-100">
        <span className="finder [--c:hsl(var(--ink-400))]" />
      </div>
      <figcaption className="px-1 pb-3 pt-2.5 text-center font-hand text-lg font-semibold text-ink-800">
        your first event goes here
      </figcaption>
    </figure>
    <div className="max-w-md">
      <h3 className="text-2xl font-bold">No events yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Create an event, upload the shoot, and share the code with guests. They'll take it from there.
      </p>
      <div className="mt-6">
        {canCreate ? (
          <Button size="lg" onClick={onCreate}>
            <Plus />
            Create your first event
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to={ROUTES.plans}>Choose a plan to start</Link>
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default Dashboard;
