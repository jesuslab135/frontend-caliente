import type { IHttpClient } from '../interfaces/IHttpClient';
import type { SportEventDTO, SportEventWriteDTO, SportEventFilterParams } from '../dtos/SportEventDTO';
import { API_ROUTES } from '../constants/endpoints';

export class SportEventRepository {
    private base = API_ROUTES.SPORT_EVENTS.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(filters?: SportEventFilterParams): Promise<SportEventDTO[]> {
        return this.http.get<SportEventDTO[]>(this.base, {
            params: filters as Record<string, any>,
        });
    }

    async create(payload: SportEventWriteDTO): Promise<SportEventDTO> {
        return this.http.post<SportEventDTO>(this.base, payload);
    }

    async update(uuid: string, payload: Partial<SportEventWriteDTO>): Promise<SportEventDTO> {
        return this.http.patch<SportEventDTO>(`${this.base}${uuid}/`, payload);
    }

    async remove(uuid: string): Promise<void> {
        await this.http.delete(`${this.base}${uuid}/`);
    }

    /** Import events from an Excel/CSV file */
    async importFile(formData: FormData): Promise<{ imported: number; errors: string[] }> {
        return this.http.post(`${this.base}import/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }
}
