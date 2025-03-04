import { api } from './api';
import { User } from '../store/slices/authSlice';

interface AuthResponse {
    token: string;
    user: User;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
}

const authService = {
    // Login with email/password
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        // Store token
        localStorage.setItem('auth_token', response.data.token);
        return response.data;
    },

    // Register new user
    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await api.post<AuthResponse>('/auth/register', data);
        // Store token
        localStorage.setItem('auth_token', response.data.token);
        return response.data;
    },

    // Logout
    logout(): void {
        localStorage.removeItem('auth_token');
    },

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!localStorage.getItem('auth_token');
    },

    // Get current user info
    async getCurrentUser(): Promise<User | null> {
        try {
            if (!this.isAuthenticated()) {
                return null;
            }

            const response = await api.get<User>('/auth/me');
            return response.data;
        } catch (error) {
            this.logout();
            return null;
        }
    },

    // Handle OAuth redirect
    async handleOAuthRedirect(token: string): Promise<User> {
        localStorage.setItem('auth_token', token);
        const user = await this.getCurrentUser();
        if (!user) {
            throw new Error('Failed to get user after OAuth login');
        }
        return user;
    }
};

export default authService;