import { ShiftType } from '../models/ShiftType';
import { ShiftCategory } from '../models/ShiftCategory';
import type { ShiftTypeDTO, ShiftCategoryDTO } from '../dtos/ShiftDTO';

export class ShiftCategoryAdapter {
    static fromDTO(dto: ShiftCategoryDTO): ShiftCategory {
        return new ShiftCategory(
            dto.id,
            dto.code,
            dto.name,
            dto.min_traders,
            dto.description,
            dto.typical_start_time,
            dto.typical_end_time,
            dto.display_order,
        );
    }

    static fromDTOList(dtos: ShiftCategoryDTO[]): ShiftCategory[] {
        return dtos.map(dto => ShiftCategoryAdapter.fromDTO(dto));
    }
}

export class ShiftTypeAdapter {
    static fromDTO(dto: ShiftTypeDTO): ShiftType {
        let categoryCode: string | null = null;
        let rawCategoryId: number | null = null;

        if (typeof dto.category === 'object' && dto.category !== null) {
            categoryCode = dto.category.code;
            rawCategoryId = dto.category.id;
        } else if (typeof dto.category === 'number') {
            rawCategoryId = dto.category;
        }

        return new ShiftType(
            dto.id,
            dto.code,
            dto.name,
            categoryCode,
            dto.start_time,
            dto.end_time,
            dto.is_working_shift,
            dto.color_code,
            dto.applicable_to_monitor,
            dto.applicable_to_inplay,
            dto.is_active,
            rawCategoryId,
        );
    }

    static fromDTOList(dtos: ShiftTypeDTO[]): ShiftType[] {
        return dtos.map(dto => ShiftTypeAdapter.fromDTO(dto));
    }
}
