import React, { useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type CameraCaptureProps = {
    onCapture: (file: File) => void;
    onClose: () => void;
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const { t } = useTranslation("common");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    React.useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "user" },
                        width: { ideal: 1080 },
                        height: { ideal: 1080 },
                    },
                });
                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch {
                alert(t("cameraDenied"));
                onClose();
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };
    }, [onClose]);

    const handleCapture = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                    onCapture(file);
                }
            }, "image/jpeg");
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t("takeSelfie", "Take a selfie")}
            className="fixed inset-0 z-50 flex flex-col bg-sidebar text-white"
        >
            <div className="flex items-center justify-between px-5 py-4">
                <p className="font-display text-lg font-bold">{t("takeSelfie", "Take a selfie")}</p>
                <button
                    onClick={onClose}
                    aria-label={t("cancel", "Cancel")}
                    className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
                {/* Viewfinder: square frame with corner brackets */}
                <div className="relative aspect-square w-full max-w-[min(420px,60vh)]">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full scale-x-[-1] rounded-[2rem] bg-ink-900 object-cover"
                    />
                    <span className="finder -inset-3 [background-size:34px_4px,4px_34px,34px_4px,4px_34px,34px_4px,4px_34px,34px_4px,4px_34px]" />
                </div>
                <p className="max-w-xs text-center text-sm text-white/60">
                    {t("selfieTip", "Face the camera in good light. Just you in the frame works best.")}
                </p>
            </div>

            <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-4">
                <button
                    onClick={handleCapture}
                    aria-label={t("capture", "Capture")}
                    className="grid h-20 w-20 place-items-center rounded-full border-4 border-white/90 transition-transform active:scale-95"
                >
                    <span className="h-14 w-14 rounded-full bg-lime-500" />
                </button>
                <Button variant="ghost" onClick={onClose} className="text-white/70 hover:bg-white/10 hover:text-white">
                    {t("cancel", "Cancel")}
                </Button>
            </div>
        </div>
    );
};

export default CameraCapture;
