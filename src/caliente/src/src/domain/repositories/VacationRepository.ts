import type { IHttpClient } from '../interfaces/IHttpClient';
import type { VacationDTO, VacationWriteDTO } from '../dtos/VacationDTO';
import { API_ROUTES } from '../constants/endpoints';

export class VacationRepository {
    private base = API_ROUTES.VACATIONS.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(filters?: Record<string, any>): Promise<VacationDTO[]> {
        return this.http.get<VacationDTO[]>(this.base, { params: filters });
    }

    async create(payload: VacationWriteDTO): Promise<VacationDTO> {
        return this.http.post<VacationDTO>(this.base, payload);
    }

    /** Admin approve/reject a vacation request */
    async approve(uuid: string, payload: { action: 'approve' | 'reject'; rejection_reason?: string }): Promise<VacationDTO> {
        return this.http.put<VacationDTO>(`${this.base}${uuid}/approve/`, payload);
    }
}
