import type { IHttpClient } from '../interfaces/IHttpClient';
import type { SystemSettingsDTO, SystemSettingsWriteDTO } from '../dtos/SystemSettingsDTO';
import { API_ROUTES } from '../constants/endpoints';

export class SystemSettingsRepository {
    private base = API_ROUTES.SYSTEM_SETTINGS.BASE;

    constructor(private http: IHttpClient) {}

    /** Fetch the singleton system settings object */
    async get(): Promise<SystemSettingsDTO> {
        const list = await this.http.get<SystemSettingsDTO[]>(this.base);
        return list[0];
    }

    /** Update system settings (partial update) */
    async update(payload: SystemSettingsWriteDTO): Promise<SystemSettingsDTO> {
        const current = await this.get();
        return this.http.patch<SystemSettingsDTO>(`${this.base}${current.id}/`, payload);
    }
}
