//auth / public urls
export const signUpUrl = "user/auth/signup";
export const loginUrl = "user/auth/login";
export const googleLoginUrl = "user/auth/google";
export const emailCodeUrl = "user/auth/email-code";
export const emailCodeVerifyUrl = "user/auth/email-code/verify";
export const forgetPasswordUrl = "user/auth/forgot-password";
export const resetPasswordUrl = "user/auth/reset-password";
export const verifyEmailUrl = "user/auth/verify-email";
export const resendVerificationEmailUrl = "user/auth/resend-verification-email";

// user urls
export const profileUrl = "user/profile/getUserProfile";
export const profileUpdateUrl = "user/profile/updateProfile";
export const passwordUpdateUrl = "user/profile/changePassword";

//Event Url
export const createEventUrl = "user/events/create"
export const getEventsUrl = "user/events/getEvents"
export const getEventsdetailsUrl = "user/events/details"
export const eventPhotosUrl = (eventId: string | number) => `user/events/${eventId}/photos`;
export const retryPhotosUrl = (eventId: string | number) => `user/events/${eventId}/photos/retry`;
export const updateEventUrl = "user/events/update"
export const deleteEventUrl = "user/events/delete"
// file upload url
export const initateUploadUrl = "user/upload/initiate";
export const partCompletetUploadUrl = "user/upload/partComplete";
export const completeUploadUrl = "user/upload/complete";
export const cancelUploadUrl = "user/upload/abort";
export const getStatusUploadUrl = "user/upload/status";
export const deleteFileUrl = "user/upload/delete";
