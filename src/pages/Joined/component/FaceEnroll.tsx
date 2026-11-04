import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, ScanFace, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import CameraCapture from "@/components/brand/CameraCapture";
import useRequestToServer from "@/service/httpService";
import { cn } from "@/lib/utils";
import { joinedUrls } from "../helper/joined";

/**
 * One-time selfie with explicit consent (DPDP Act). The selfie is kept privately and reused for every
 * event the person joins; they can delete it from their profile at any time.
 */
export const FaceEnroll = ({ onEnrolled, retake, className }: { onEnrolled: () => void; retake?: boolean; className?: string }) => {
  const { requestToServer } = useRequestToServer();
  const [agreed, setAgreed] = useState(false);
  const [adult, setAdult] = useState(false);
  const [camera, setCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const canStart = agreed && adult && !busy;
  // Stable, so the camera doesn't restart on every render
  const closeCamera = useCallback(() => setCamera(false), []);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const save = async (file: File) => {
    setCamera(false);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("consent", "true");
      const response = await requestToServer(joinedUrls.face, form, "PUT");
      if (response.status >= 400) throw new Error(response.data?.message);
      onEnrolled();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save your selfie. Please try again.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void save(file);
  };

  return (
    <section className={cn("mx-auto max-w-xl rounded-3xl border bg-card p-6 sm:p-8", className)}>
      <div className="flex items-start gap-4">
        <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent text-primary">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ScanFace className="h-8 w-8" />}
          {busy && <span className="absolute inset-0 grid place-items-center bg-ink-950/50"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>}
        </span>
        <div>
          <p className="mb-2.5 -rotate-2 font-hand text-xl font-semibold leading-tight text-primary">{retake ? "new selfie" : "one selfie, that's it"}</p>
          <h2 className="text-xl font-bold leading-tight">{retake ? "Retake your selfie" : "Find every photo you're in"}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            We use one selfie to find you in this event and every event you join later. No retakes needed.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl bg-secondary/60 p-4 text-sm">
        <label className="flex cursor-pointer gap-3">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
          <span>
            I agree that FaceDrop can use my selfie to find photos of me in events I join. My selfie is stored privately and never shown to
            anyone. Other guests of the same event can see which of its photos I'm in (I can turn that off), and I can delete my face data any
            time from my profile.
          </span>
        </label>
        <label className="flex cursor-pointer gap-3">
          <Checkbox checked={adult} onCheckedChange={(v) => setAdult(v === true)} className="mt-0.5" />
          <span>I'm 18 or older, or a parent or guardian is doing this with me.</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger-foreground">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => setCamera(true)} disabled={!canStart}>
          <Camera />
          Take a selfie
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={!canStart}>
          <ImageUp />
          Upload a photo
        </Button>
        <input ref={fileInput} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Face the camera in good light, just you in the picture.
      </p>

      {camera && <CameraCapture onCapture={save} onClose={closeCamera} />}
    </section>
  );
};
