import type { IHttpClient } from '@/domain/interfaces/IHttpClient';
import type { EmployeeDTO, EmployeeWriteDTO } from '@/domain/dtos/EmployeeDTO';
import { EmployeeAdapter } from '@/domain/adapters/EmployeeAdapter';
import { Employee } from '@/domain/models/Employee';
import { API_ROUTES } from '@/domain/constants/endpoints';

export class EmployeeRepository {
    private base = API_ROUTES.EMPLOYEES.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(): Promise<Employee[]> {
        const dtos = await this.http.get<EmployeeDTO[]>(this.base);
        return EmployeeAdapter.fromDTOList(dtos);
    }

    async getByUuid(uuid: string): Promise<Employee> {
        const dto = await this.http.get<EmployeeDTO>(`${this.base}${uuid}/`);
        return EmployeeAdapter.fromDTO(dto);
    }

    async create(payload: EmployeeWriteDTO): Promise<Employee> {
        const dto = await this.http.post<EmployeeDTO>(this.base, payload);
        return EmployeeAdapter.fromDTO(dto);
    }

    async update(uuid: string, payload: Partial<EmployeeWriteDTO>): Promise<Employee> {
        const dto = await this.http.patch<EmployeeDTO>(`${this.base}${uuid}/`, payload);
        return EmployeeAdapter.fromDTO(dto);
    }

    async remove(uuid: string): Promise<void> {
        await this.http.delete(`${this.base}${uuid}/`);
    }
}
