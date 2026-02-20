import type { IHttpClient } from '@/domain/interfaces/IHttpClient';
import type { ShiftTypeDTO, ShiftCategoryDTO, ShiftCycleConfigDTO } from '@/domain/dtos/ShiftDTO';
import { ShiftTypeAdapter, ShiftCategoryAdapter } from '@/domain/adapters/ShiftAdapter';
import { ShiftType } from '@/domain/models/ShiftType';
import { ShiftCategory } from '@/domain/models/ShiftCategory';
import { API_ROUTES } from '@/domain/constants/endpoints';

export class ShiftRepository {
    constructor(private http: IHttpClient) {}

    async getCategories(): Promise<ShiftCategory[]> {
        const dtos = await this.http.get<ShiftCategoryDTO[]>(API_ROUTES.SHIFT_CATEGORIES.BASE);
        return ShiftCategoryAdapter.fromDTOList(dtos);
    }

    async getTypes(): Promise<ShiftType[]> {
        const dtos = await this.http.get<ShiftTypeDTO[]>(API_ROUTES.SHIFT_TYPES.BASE);
        return ShiftTypeAdapter.fromDTOList(dtos);
    }

    async getCycleConfigs(): Promise<ShiftCycleConfigDTO[]> {
        return this.http.get<ShiftCycleConfigDTO[]>(API_ROUTES.SHIFT_CYCLE_CONFIGS.BASE);
    }
}
