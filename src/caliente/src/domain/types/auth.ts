import type { User } from '@/domain/models/User';

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface AuthResult {
    user: User;
    tokens: AuthTokens;
}