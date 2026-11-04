export interface loginResponse {
    success?: boolean;
    message?: string;
    data?: {
        token: string;
        user: {
            user_id: number;
            name: string;
            email: string;
            role: string;
            status: number;
            is_email_verified: boolean;
        }
        has_subscription: boolean
    };
}

export interface ProfileUpdateResponse {
    updatedUser: {
        user_id: number;
        name: string;
        email: string;
    }
    isEmailUpdate: boolean
}
export interface profileResponse {
    user_id: number;
    name: string;
    email: string;
}
export interface passwordUpdateResponse {
    data: number,
}