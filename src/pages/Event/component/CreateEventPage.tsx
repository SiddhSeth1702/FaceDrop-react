import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Formik, Form, Field } from "formik";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { AuthField } from "@/components/brand/AuthLayout";
import { useState, useEffect } from "react";
import { validationSchema } from "../helper/validation";
import useRequestToServer from "@/service/httpService";
import { createEventUrl } from "@/service/requestUrls.service";
import { toast } from "@/hooks/use-toast";
import { useLoader } from "@/contexts/LoaderContext";
import { ROUTES } from "@/lib/routes";
import { billingUrls, formatRupees, Order, usePlans } from "@/pages/Billing/helper/billing";
import { defaultPlanCode, PlanPicker } from "@/pages/Billing/component/PlanPicker";
import { MockCheckout } from "@/pages/Billing/component/MockCheckout";

const CreateEventPage = () => {
  const navigate = useNavigate();
  const { requestToServer } = useRequestToServer();
  const { showLoader, hideLoader } = useLoader();

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  // How the event goes live: free trial, Studio allowance or an Event Pass (paid in the mock checkout)
  const { data: plans } = usePlans();
  const [searchParams] = useSearchParams();
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  useEffect(() => {
    if (plans && !planCode) {
      const requested = searchParams.get("plan");
      const known = requested && plans.plans.some((p) => p.code === requested && p.kind === "pass");
      setPlanCode(known ? requested : defaultPlanCode(plans));
    }
  }, [plans, planCode, searchParams]);
  const selectedPass = plans?.plans.find((p) => p.code === planCode && p.kind === "pass");
  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear previous error
      setThumbnailError(null);

      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setThumbnailError("File size must be less than 10MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setThumbnailError("Please select a valid image file");
        return;
      }

      setThumbnail(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const removeThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnail(null);
    setThumbnailPreview(null);
    setThumbnailError(null);
  };

  const handleSubmit = async (
    values: { title: string; location: string; date: string; description: string },
    { resetForm }: { resetForm: () => void }
  ) => {
    // Check for thumbnail errors before submitting
    if (thumbnailError) {
      return; // Don't submit if there's a thumbnail error
    }

    showLoader();
    try {
      const formData = new FormData();
      formData.append("eventTitle", values.title);
      formData.append("eventLocation", values.location);
      formData.append("eventDate", values.date);
      formData.append("eventDescription", values.description);
      formData.append("planCode", planCode ?? "");

      if (thumbnail) {
        formData.append("file", thumbnail);
      }

      const response = await requestToServer(createEventUrl, formData, "POST");

      const data = response.data?.data;
      if (response.status >= 400 || !data?.event_id) {
        toast({
          title: "Couldn't create the event",
          description: response.data?.message || "Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      resetForm();
      removeThumbnail();

      // Event Pass: pay first, then the event goes live
      if (data.order_id) {
        setCreatedEventId(data.event_id);
        const orderResponse = await requestToServer(billingUrls.order(data.order_id), {}, "GET");
        setCheckoutOrder(orderResponse.data?.data ?? null);
        if (!orderResponse.data?.data) navigate(ROUTES.event(data.event_id));
        return;
      }

      toast({ title: "Your event is live", description: "Upload the photos now. Guests can search each one as soon as it's ready." });
      // Straight to the event so the photographer can start uploading
      navigate(ROUTES.event(data.event_id));
    } catch (err) {
      console.error("Error creating event:", err);
      toast({
        title: "Error",
        description: "Something went wrong!",
        variant: "destructive",
      });
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <MockCheckout
          order={checkoutOrder}
          onPaid={() => {
            toast({ title: "Paid. Your event is live", description: "Upload the photos now. Guests can search each one as soon as it's ready." });
            navigate(ROUTES.event(createdEventId!));
          }}
          onClose={() => {
            // The event waits on its page with a "Pay now" button
            navigate(ROUTES.event(createdEventId!));
          }}
        />
        <Link
          to={ROUTES.dashboard}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All events
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold leading-tight sm:text-[30px]">Create an event</h1>
          <p className="-rotate-2 font-hand text-xl font-semibold text-primary">photos come right after</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Add the basics now. You'll upload the shoot on the next screen.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <Formik
              initialValues={{
                title: "",
                location: "",
                date: "",
                description: "",
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]" noValidate>
                  <div className="grid grid-cols-1 content-start gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <AuthField label="Event name" htmlFor="title" error={touched.title && errors.title}>
                      <Field
                        as={Input}
                        id="title"
                        name="title"
                        placeholder="e.g. Ananya & Rohan's Wedding"
                        aria-invalid={!!(touched.title && errors.title)}
                      />
                    </AuthField>
                  </div>

                  <AuthField label="Date" htmlFor="date" error={touched.date && errors.date}>
                    <Field
                      as={Input}
                      id="date"
                      name="date"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      aria-invalid={!!(touched.date && errors.date)}
                    />
                  </AuthField>

                  <AuthField label="Location" htmlFor="location" error={touched.location && errors.location}>
                    <Field
                      as={Input}
                      id="location"
                      name="location"
                      placeholder="e.g. Rambagh Palace, Jaipur"
                      aria-invalid={!!(touched.location && errors.location)}
                    />
                  </AuthField>

                  <div className="sm:col-span-2">
                    <AuthField label="Description" htmlFor="description" error={touched.description && errors.description}>
                      <Field
                        as={Textarea}
                        id="description"
                        name="description"
                        rows={4}
                        placeholder="A line or two for guests, like which functions you covered."
                        aria-invalid={!!(touched.description && errors.description)}
                        className="min-h-[112px] rounded-xl border-input bg-card text-[15px] shadow-sm placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/15 aria-[invalid=true]:border-destructive"
                      />
                    </AuthField>
                  </div>

                  </div>

                  {/* Thumbnail */}
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-[13px] font-semibold">
                      Cover photo <span className="font-normal text-muted-foreground">(optional)</span>
                    </p>
                    <label
                      htmlFor="thumbnail"
                      className="relative flex min-h-[160px] w-full flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-primary/50 bg-accent/50 p-5 text-center transition-colors hover:bg-accent"
                    >
                      {thumbnailPreview ? (
                        <div className="relative w-full">
                          <img
                            src={thumbnailPreview}
                            alt="Cover preview"
                            className="aspect-[4/3] w-full rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeThumbnail}
                            aria-label="Remove cover photo"
                            className="absolute right-2 top-2 rounded-full bg-card p-1.5 text-muted-foreground shadow-sm hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                            <ImagePlus className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold">
                            Drop an image here or <span className="text-primary">browse</span>
                          </p>
                          <p className="mt-1 text-[12.5px] text-muted-foreground">
                            Any image up to 10 MB. It shows on your events list.
                          </p>
                        </>
                      )}
                      <input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                    {thumbnailError && (
                      <p className="text-[12.5px] text-destructive">{thumbnailError}</p>
                    )}
                  </div>

                  {/* Plan */}
                  <div className="border-t pt-5 2xl:col-span-2">
                    <p className="font-semibold">How will this event go live?</p>
                    <p className="mb-4 mt-0.5 text-sm text-muted-foreground">You see the price before uploading a single photo.</p>
                    {plans && planCode ? (
                      <PlanPicker data={plans} value={planCode} onChange={setPlanCode} />
                    ) : (
                      <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end 2xl:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        removeThumbnail();
                        navigate(ROUTES.dashboard);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={!planCode}>
                      {selectedPass ? `Continue to payment · ${formatRupees(selectedPass.total_paise)}` : "Create event"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>

          {/* What happens next */}
          <aside className="h-fit rounded-2xl bg-inverse p-6 text-inverse-foreground xl:sticky xl:top-6">
            <p className="font-semibold">What happens next</p>
            <ol className="mt-4 space-y-4">
              {[
                ["Pick how it goes live", "Free trial, your Studio allowance or an Event Pass. Passes are paid before upload."],
                ["Upload the shoot", "Faces are matched photo by photo while you upload, so you can keep adding more."],
                ["Guests find themselves", "They scan the QR, take a selfie and get every photo they're in."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-500 font-mono text-xs font-bold text-ink-950">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-white/60">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
    </div>
  );
};

export default CreateEventPage;
