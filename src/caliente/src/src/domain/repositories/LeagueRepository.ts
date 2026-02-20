import type { IHttpClient } from '../interfaces/IHttpClient';
import type { LeagueDTO, LeagueWriteDTO } from '../dtos/LeagueDTO';
import { API_ROUTES } from '../constants/endpoints';

export class LeagueRepository {
    private base = API_ROUTES.LEAGUES.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(): Promise<LeagueDTO[]> {
        return this.http.get<LeagueDTO[]>(this.base);
    }

    async create(payload: LeagueWriteDTO): Promise<LeagueDTO> {
        return this.http.post<LeagueDTO>(this.base, payload);
    }

    async update(uuid: string, payload: Partial<LeagueWriteDTO>): Promise<LeagueDTO> {
        return this.http.patch<LeagueDTO>(`${this.base}${uuid}/`, payload);
    }

    async remove(uuid: string): Promise<void> {
        await this.http.delete(`${this.base}${uuid}/`);
    }

    async importFile(formData: FormData): Promise<{ imported: number; errors: string[] }> {
        return this.http.post<{ imported: number; errors: string[] }>(
            API_ROUTES.LEAGUES.IMPORT, formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
    }
}
