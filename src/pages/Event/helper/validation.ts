import * as Yup from "yup";
export const validationSchema = Yup.object({
    title: Yup.string()
        .required("Event title is required")
        .min(3, "Event title must be at least 3 characters")
        .max(50, "Event title must be at most 50 characters"),
    location: Yup.string().required("Location is required"),
    date: Yup.date()
        .required("Date is required")
        .max(new Date(), "Event date cannot be in the future"),
    description: Yup.string().optional()
        .max(100, "Description must be at most 100 characters"),
});
