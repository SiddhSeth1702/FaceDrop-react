import axios from "axios";
import i18n from "@/i18n/i18n";
import { isTokenExpired, useAuth } from "../contexts/AuthContext";
import {
    forgetPasswordUrl,
    loginUrl,
    resendVerificationEmailUrl,
    resetPasswordUrl,
    signUpUrl,
    verifyEmailUrl,
    emailCodeUrl
} from "./requestUrls.service";

const statusCode = [401, 403, 422, 400, 500, 404, 409, 406];

interface ApiResponse {
    status: number;
    message?: string;
    // API payloads are untyped JSON; each page narrows what it reads.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

const PUBLIC_ENDPOINTS = [
    emailCodeUrl,
    signUpUrl,
    loginUrl,
    forgetPasswordUrl,
    resetPasswordUrl,
    resendVerificationEmailUrl,
    verifyEmailUrl,
    // Published Studio pages are open to anyone with the link
    "user/studio-pages/"
];

// Interceptor for global error handling
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error && error.response && statusCode.includes(error?.response?.status)) {
            return Promise.resolve(error.response);
        } else {
            return Promise.reject(error);
        }
    }
);

const getHeaders = (
    token: string | null,
    isFormData: boolean = false
): Record<string, string> => {
    const headers: Record<string, string> = {
        "app-source": import.meta.env.VITE_APP_SOURCE,
        "ngrok-skip-browser-warning": 'true',
        // API messages (toasts, errors) come back in the user's language
        "Accept-Language": i18n.language
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["ngrok-skip-browser-warning"] = 'true';
    }

    // ✅ Handle content type automatically
    if (!isFormData) {
        headers["Accept"] = "application/json";
        headers["Content-Type"] = "application/json";
    }
    // If FormData, let Axios set Content-Type + boundary automatically

    return headers;
};

const useRequestToServer = () => {
    const { logout, token } = useAuth();

    const requestToServer = async (
        url: string,
        data: unknown,
        method: string,
        responseType: "json" | "blob" = "json"
    ): Promise<ApiResponse> => {
        const requestUrl = `${import.meta.env.VITE_API_URL}/${url}`;

        const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
            url.startsWith(endpoint)
        );

        if (!isPublicEndpoint) {
            if (!token || isTokenExpired(token)) {
                logout();
                throw new Error("Session expired. Please login again.");
            }
        }

        const isFormData = data instanceof FormData;
        const headers = getHeaders(isPublicEndpoint ? null : token, isFormData);

        return new Promise((resolve, reject) => {
            axios({ method, url: requestUrl, headers, data, responseType })
                .then((response) => {
                    if (response && response.status === 401) {
                        logout();
                        window.location.reload();
                    }
                    resolve(response as unknown as ApiResponse);
                })
                .catch((error) => {
                    if (!navigator.onLine) {
                        reject(new Error("OfflineError"));
                    }
                    reject(error);
                });
        });
    };

    return { requestToServer };
};

export default useRequestToServer;
