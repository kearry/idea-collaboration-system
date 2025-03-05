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
    },

    // Initialize GitHub OAuth login
    initiateGitHubLogin(): void {
        // GitHub OAuth configuration
        const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
        const scope = encodeURIComponent('user:email');

        // Redirect to GitHub authorization URL
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${this.generateRandomState()}`;
        window.location.href = githubAuthUrl;
    },

    // Generate random state to prevent CSRF attacks
    generateRandomState(): string {
        const randomState = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('oauth_state', randomState);
        return randomState;
    },

    // Validate state parameter (for CSRF protection)
    validateOAuthState(state: string): boolean {
        const savedState = localStorage.getItem('oauth_state');
        localStorage.removeItem('oauth_state'); // Clear it immediately after checking
        return state === savedState;
    }
};

export default authService;