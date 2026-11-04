import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import useRequestToServer from "@/service/httpService";
import { formatEventDate, JoinedEvent, joinedUrls } from "../helper/joined";

/** Events this account has joined as a guest, plus a box to join another one with its code. */
const JoinedListPage = () => {
  const { requestToServer } = useRequestToServer();
  const navigate = useNavigate();
  const [events, setEvents] = useState<JoinedEvent[] | null>(null);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    (async () => {
      const response = await requestToServer(joinedUrls.list, {}, "GET").catch(() => null);
      setEvents(response && response.status < 400 ? response.data.data : []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, []);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return setJoinError("Enter the code from the invite or QR card.");
    setJoining(true);
    setJoinError("");
    try {
      const response = await requestToServer(joinedUrls.join, { code: code.trim() }, "POST");
      if (response.status >= 400) throw new Error(response.data?.message);
      const { event_id, role } = response.data.data;
      navigate(role === "host" ? ROUTES.event(event_id) : ROUTES.joinedEvent(event_id));
    } catch (err) {
      setJoinError(err instanceof Error && err.message ? err.message : "Couldn't join. Please check the code.");
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Events I'm in</h1>
        <p className="-rotate-2 font-hand text-xl font-semibold text-primary">weddings, parties, the lot</p>
      </div>

      <form onSubmit={join} className="mt-6 flex max-w-xl flex-col gap-2 rounded-3xl border bg-card p-5 sm:flex-row sm:items-start" noValidate>
        <div className="flex-1">
          <label htmlFor="join-code" className="flex items-center gap-1.5 text-sm font-semibold">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            Got an event code?
          </label>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. V4CIT7"
            maxLength={12}
            autoComplete="off"
            className="mt-2 font-mono tracking-[0.2em]"
            aria-invalid={!!joinError}
          />
          {joinError && (
            <p role="alert" className="mt-1.5 text-sm text-danger-foreground">
              {joinError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={joining} className="sm:mt-7">
          {joining && <Loader2 className="animate-spin" />}
          Join
        </Button>
      </form>

      {!events ? (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-sm bg-secondary" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="inline-block -rotate-2 font-hand text-3xl font-semibold text-primary">no events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Scan the QR at the venue or type the code above, and the event shows up here.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {events.map((event, i) => (
            <li key={event.event_id}>
              <EventPolaroid event={event} index={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const STATE_NOTE: Record<string, { text: string; className: string } | undefined> = {
  // Polaroids stay white in dark mode, so these use fixed ink colours
  expired: { text: "expired", className: "text-red-600" },
  removed: { text: "removed", className: "text-ink-950/50" },
  pending: { text: "coming soon", className: "text-iris-500" },
};

const EventPolaroid = ({ event, index }: { event: JoinedEvent; index: number }) => {
  const note = STATE_NOTE[event.state];
  const faded = event.state === "expired" || event.state === "removed";
  return (
    <Link
      to={ROUTES.joinedEvent(event.event_id)}
      className={cn(
        "polaroid group relative block pb-4 text-ink-950 transition-transform hover:-translate-y-1 hover:rotate-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        index % 2 ? "rotate-[1.5deg]" : "-rotate-[1.2deg]"
      )}
    >
      <span className="tape" />
      <span className={cn("relative block aspect-[4/3] overflow-hidden rounded-[2px]", !event.cover_url && `film film-${(event.event_id % 6) + 1}`)}>
        {event.cover_url && <img src={event.cover_url} alt="" loading="lazy" className={cn("h-full w-full object-cover", faded && "grayscale")} />}
        {faded && <span className="absolute inset-0 bg-white/30" />}
      </span>
      <span className="mt-3 block truncate px-1 font-semibold">{event.title}</span>
      <span className="block truncate px-1 text-xs text-ink-950/60">
        {formatEventDate(event.event_date)}
        {event.host_name && ` · by ${event.host_name}`}
      </span>
      <span className="mt-2 flex items-center justify-between px-1">
        <span className="font-hand text-lg font-semibold leading-none text-ink-950/70">
          {event.state === "live" ? `${event.photo_count.toLocaleString("en-IN")} photos` : " "}
        </span>
        {note && <span className={cn("rotate-[-4deg] font-hand text-xl font-bold leading-none", note.className)}>{note.text}</span>}
      </span>
    </Link>
  );
};

export default JoinedListPage;
