import { ShiftCycleConfig } from '../models/ShiftCycleConfig';
import type { ShiftCycleConfigDTO } from '../dtos/ShiftDTO';

export class ShiftCycleConfigAdapter {
    static fromDTO(dto: ShiftCycleConfigDTO): ShiftCycleConfig {
        return new ShiftCycleConfig(
            dto.id,
            dto.name,
            dto.trader_role,
            dto.shift_order,
            dto.is_default,
            dto.include_off,
            dto.include_vac,
        );
    }

    static fromDTOList(dtos: ShiftCycleConfigDTO[]): ShiftCycleConfig[] {
        return dtos.map(dto => ShiftCycleConfigAdapter.fromDTO(dto));
    }
}
