import type { IHttpClient } from "@/domain/interfaces/IHttpClient";
import type { LoginCredentials, LoginResponseDTO, UserDTO } from '@/domain/dtos/AuthDTO';
import { AuthResult, AuthTokens } from '@/domain/types/auth';
import { UserAdapter } from '@/domain/adapters/UserAdapter';
import { API_ROUTES } from "@/domain/constants/endpoints";
import { User } from "../models/User";

export class AuthRepository {
    constructor(private http: IHttpClient) {}

    async login(credentials: LoginCredentials): Promise<AuthResult> {
        const url = `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.LOGIN}`;

        const response = await this.http.post<LoginResponseDTO>(url, credentials);

        return {
            user: UserAdapter.fromDTO(response.user),
            tokens: {
                access: response.access,
                refresh: response.refresh
            }
        };
    }

    async logout(refreshToken: string): Promise<void> {
        const url = `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.LOGOUT}`;

        await this.http.post(url, { refresh: refreshToken });
    }

    async fetchCurrentUser(): Promise<User> {
        const url = `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.ME}`;

        const response = await this.http.get<UserDTO>(url);
        return UserAdapter.fromDTO(response);
    }

    async refreshToken(token: string): Promise<AuthTokens> {
        const url = `${API_ROUTES.AUTH.BASE}${API_ROUTES.AUTH.REFRESH}`;

        const response = await this.http.post<any>(url, { refresh: token });

        return {
            access: response.access,
            refresh: response.refresh
        }
    }
}