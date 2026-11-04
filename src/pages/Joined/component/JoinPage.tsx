import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import useRequestToServer from "@/service/httpService";
import { joinedUrls } from "../helper/joined";

/** /join/:code — the QR target. Signed-in visitors join and land in the event; others sign in first. */
const JoinPage = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { requestToServer } = useRequestToServer();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in development; join once
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const response = await requestToServer(joinedUrls.join, { code }, "POST");
        if (response.status >= 400) throw new Error(response.data?.message);
        const { event_id, role } = response.data.data;
        navigate(role === "host" ? ROUTES.event(event_id) : ROUTES.joinedEvent(event_id), { replace: true });
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Couldn't join this event.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestToServer changes identity every render
  }, [code]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      {error ? (
        <div className="max-w-sm">
          <p className="-rotate-2 font-hand text-3xl font-semibold text-primary">hmm, that didn't work</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link to={ROUTES.joined}>Enter a code instead</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <LogoMark size={44} />
          <p className="mt-5 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining the event…
          </p>
        </div>
      )}
    </div>
  );
};

export default JoinPage;
