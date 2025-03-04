import axios from 'axios';

// Create axios instance with default config
export const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle token expiration
        if (error.response && error.response.status === 401) {
            // Redirect to login or refresh token
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);