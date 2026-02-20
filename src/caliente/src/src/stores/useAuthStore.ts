import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { httpClient } from '@/di/http';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/models/User';
import type { LoginCredentials } from '@/domain/dtos/AuthDTO';
import type { AuthTokens } from '@/domain/types/auth';

export const useAuthStore = defineStore('auth', () => {
    // --- STATE ---
    const user = ref<User | null>(null);
    const tokens = ref<AuthTokens | null>(null);
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isInitialized = ref<boolean>(false);

    const repo = new AuthRepository(httpClient);

    // --- GETTERS ---
    const isAuthenticated = computed(() => !!tokens.value?.access && !!user.value);
    const fullName = computed(() => user.value?.fullName || 'Invitado');
    const isAdmin = computed(() => user.value?.isAdmin || false);
    const isManager = computed(() => user.value?.isManager || false);
    const isTrader = computed(() => user.value?.isTrader || false);
    const userRole = computed(() => user.value?.role || null);

    // --- ACTIONS ---

    /**
     * Initialises the session on app load.
     * Recovers tokens from storage, hydrates User, validates against API.
     */
    async function initializeAuth() {
        if (isInitialized.value) return;
        isLoading.value = true;

        const access = localStorage.getItem('accessToken');
        const refresh = localStorage.getItem('refreshToken');
        const userStored = localStorage.getItem('user');

        if (!access || !refresh) {
            _clearSession();
            isInitialized.value = true;
            isLoading.value = false;
            return;
        }

        // Optimistic restore — hydrate User class so getters work immediately
        tokens.value = { access, refresh };
        httpClient.setAuthToken(access);

        if (userStored) {
            try {
                const parsed = JSON.parse(userStored);
                user.value = User.hydrate(parsed);
            } catch (e) {
                console.warn('Error hydrating cached user', e);
            }
        }

        // Validate with backend
        try {
            const userProfile = await repo.fetchCurrentUser();
            user.value = userProfile;
            localStorage.setItem('user', JSON.stringify(userProfile));
        } catch (err) {
            console.warn('Token expired or invalid. Trying refresh...', err);

            try {
                const newTokens = await repo.refreshToken(refresh);
                _saveSession({ user: user.value, tokens: newTokens });

                const userRetry = await repo.fetchCurrentUser();
                user.value = userRetry;
                localStorage.setItem('user', JSON.stringify(userRetry));
            } catch (refreshErr) {
                console.error('Session expired. Forced logout.', refreshErr);
                await logout();
            }
        } finally {
            isLoading.value = false;
            isInitialized.value = true;
        }
    }

    async function login(credentials: LoginCredentials) {
        isLoading.value = true;
        error.value = null;
        try {
            const result = await repo.login(credentials);
            _saveSession(result);
            return true;
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail;
            error.value = Array.isArray(detail) ? detail[0] : detail || 'Error al iniciar sesión';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function logout() {
        isLoading.value = true;
        try {
            const refresh = tokens.value?.refresh || localStorage.getItem('refreshToken');
            if (refresh) {
                await repo.logout(refresh);
            }
        } catch (e) {
            console.warn('Logout offline or network error', e);
        } finally {
            _clearSession();
            isLoading.value = false;
        }
    }

    // --- PRIVATE HELPERS ---

    function _saveSession(data: { user: User | null; tokens: AuthTokens }) {
        tokens.value = data.tokens;
        if (data.user) user.value = data.user;

        httpClient.setAuthToken(data.tokens.access);

        localStorage.setItem('accessToken', data.tokens.access);
        localStorage.setItem('refreshToken', data.tokens.refresh);
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
    }

    function _clearSession() {
        user.value = null;
        tokens.value = null;
        error.value = null;
        httpClient.setAuthToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    return {
        // State
        user,
        tokens,
        isLoading,
        error,
        isInitialized,
        // Getters
        isAuthenticated,
        fullName,
        isAdmin,
        isManager,
        isTrader,
        userRole,
        // Actions
        initializeAuth,
        login,
        logout,
    };
});
