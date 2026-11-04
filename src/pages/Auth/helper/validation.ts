// utils/validation.ts
import * as Yup from "yup";
export const isStrongPassword = (password: string) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
};
export const getInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
        .trim()
        .split(/\s+/)
        .map(word => word[0]?.toUpperCase())
        .join("");
};
export const ProfileSchema = Yup.object().shape({
    name: Yup.string()
        .transform((value) => value?.trim())
        .matches(/^[A-Za-z\s'-]+$/, "Full Name should only contain letters")
        .max(10, "Full Name must be 10 characters or less")
        .required("Full Name is required"),
    email: Yup.string()
        .transform((value) => value?.trim())
        .email("Invalid email")
        .required("Email is required"),
});

export const PasswordSchema = Yup.object().shape({
    currentPassword: Yup.string().required("Current password is required"),
    newPassword: Yup.string()
        .required("New password is required")
        .test("strong-password", "Password must be at least 8 chars with uppercase, lowercase, number, special character", (val) =>
            val ? isStrongPassword(val) : false
        ),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Confirm your new password"),
});
export const SignUpSchema = Yup.object().shape({
    fullName: Yup.string()
        .transform((value) => value?.trim())
        .matches(/^[A-Za-z\s'-]+$/, "Full Name should only contain letters")
        .max(10, "Full Name must be 10 characters or less")
        .required("Full name is required"),
    email: Yup.string()
        .transform((value) => value?.trim())
        .email("Invalid email")
        .required("Email is required"),
    password: Yup.string()
        .required("Password is required")
        .test("strong-password", "Password must be at least 8 chars with uppercase, lowercase, number, special character", (val) =>
            val ? isStrongPassword(val) : false
        ),
});
export const ResetPasswordSchema = Yup.object().shape({
    newPassword: Yup.string()
        .required("New password is required")
        .test("strong-password", "Password must be at least 8 chars with uppercase, lowercase, number, special character", (val) =>
            val ? isStrongPassword(val) : false
        ),
    confirmPassword: Yup.string()
        .required("Please confirm your password")
        .oneOf([Yup.ref("newPassword")], "Passwords do not match"),
});
