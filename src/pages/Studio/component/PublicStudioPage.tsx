import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import useRequestToServer from "@/service/httpService";
import { EventRow, Review } from "@/pages/Insights/helper/insights";
import { EnquiryForm, leadsUrls } from "../helper/leads";
import { PublicStudio, refKey, StudioPhotoRef, studioUrls } from "../helper/studio";
import { StudioView } from "./StudioView";

/** Wide layout from this width up. */
const WIDE_FROM = 900;

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error" } | { kind: "ready"; data: PublicStudio };

/** facedrop.in/s/:slug, open to anyone. Only published pages come back from the server. */
const PublicStudioPage = () => {
  const { slug = "" } = useParams();
  const { requestToServer } = useRequestToServer();
  const requestRef = useRef(requestToServer);
  requestRef.current = requestToServer;
  const [state, setState] = useState<State>({ kind: "loading" });
  const [wide, setWide] = useState(() => window.innerWidth >= WIDE_FROM);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= WIDE_FROM);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    requestRef
      .current(studioUrls.publicPage(slug), {}, "GET")
      .then((response) => {
        if (cancelled) return;
        if (response.status === 404) setState({ kind: "missing" });
        else if (response.status >= 400) setState({ kind: "error" });
        else setState({ kind: "ready", data: response.data.data as PublicStudio });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // The shapes StudioView already reads in the builder
  const view = useMemo(() => {
    if (state.kind !== "ready") return null;
    const { events, reviews, photos } = state.data;
    return {
      events: events.map((e): EventRow => ({ ...e, status: 1, downloads: 0, hearts: 0, reviews: 0, average_rating: null })),
      reviews: reviews.map((r): Review => ({ ...r, event_id: null, status: "approved", created_at: "" })),
      urlFor: (ref: StudioPhotoRef | null | undefined) => (ref ? photos[refKey(ref)]?.url ?? null : null),
      heartsFor: (ref: StudioPhotoRef) => photos[refKey(ref)]?.hearts ?? 0,
    };
  }, [state]);

  /** null when the enquiry is saved, otherwise what to tell the visitor. */
  const sendEnquiry = async (form: EnquiryForm): Promise<string | null> => {
    try {
      const response = await requestRef.current(leadsUrls.send(slug), form, "POST");
      if (response.status < 400) return null;
      return response.data?.message ?? "Couldn't send that. Please try again.";
    } catch {
      return "Couldn't reach FaceDrop. Check your connection and try again.";
    }
  };

  if (state.kind === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FBFBF8]">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
      </div>
    );
  }

  if (state.kind !== "ready" || !view) {
    const missing = state.kind === "missing";
    return (
      <div className="grid min-h-screen place-items-center bg-[#FBFBF8] px-6 text-center text-ink-950">
        <div className="max-w-sm">
          <p className="-rotate-2 font-hand text-3xl font-bold text-iris-500">{missing ? "nothing here yet" : "hmm, that didn't load"}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{missing ? "We couldn't find this Studio page" : "Something went wrong"}</h1>
          <p className="mt-2 text-sm text-ink-600">
            {missing ? "The link may be wrong, or the photographer hasn't published their page." : "Check your connection and refresh the page."}
          </p>
          <Button asChild className="mt-6">
            <Link to={ROUTES.home}>Go to FaceDrop</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { page, stats } = state.data;
  return (
    // The margins beside the page match its theme
    <div className={page.theme === "dark" ? "min-h-screen bg-[#0B0B12]" : "min-h-screen bg-[#FBFBF8]"}>
      <div className="mx-auto max-w-[1200px]">
        <StudioView
          draft={page}
          totals={{ guests_found: stats.guests_found }}
          proof={{ delivered: stats.events_delivered, rating: stats.rating, reviewCount: stats.reviews }}
          events={view.events}
          reviews={view.reviews}
          heartsFor={view.heartsFor}
          urlFor={view.urlFor}
          layout={wide ? "wide" : "narrow"}
          onEnquire={sendEnquiry}
        />
      </div>
    </div>
  );
};

export default PublicStudioPage;
