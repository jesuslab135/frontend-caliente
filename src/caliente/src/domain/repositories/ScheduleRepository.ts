import type { IHttpClient } from '@/domain/interfaces/IHttpClient';
import type { ScheduleDTO, ScheduleWriteDTO, ScheduleFilterParams } from '@/domain/dtos/ScheduleDTO';
import { API_ROUTES } from '@/domain/constants/endpoints';

export class ScheduleRepository {
    private base = API_ROUTES.SCHEDULES.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(filters?: ScheduleFilterParams): Promise<ScheduleDTO[]> {
        return this.http.get<ScheduleDTO[]>(this.base, {
            params: filters as Record<string, any>,
        });
    }

    async getByUuid(uuid: string): Promise<ScheduleDTO> {
        return this.http.get<ScheduleDTO>(`${this.base}${uuid}/`);
    }

    async create(payload: ScheduleWriteDTO): Promise<ScheduleDTO> {
        return this.http.post<ScheduleDTO>(this.base, payload);
    }

    async update(uuid: string, payload: Partial<ScheduleWriteDTO>): Promise<ScheduleDTO> {
        return this.http.patch<ScheduleDTO>(`${this.base}${uuid}/`, payload);
    }

    async remove(uuid: string): Promise<void> {
        await this.http.delete(`${this.base}${uuid}/`);
    }
}
