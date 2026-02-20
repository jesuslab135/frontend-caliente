import { League } from '../models/League';
import type { LeagueDTO } from '../dtos/LeagueDTO';

export class LeagueAdapter {
    static fromDTO(dto: LeagueDTO): League {
        return new League(
            dto.id,
            dto.uuid,
            dto.name,
            dto.sport,
            dto.country,
            dto.is_active,
            dto.base_priority,
        );
    }

    static fromDTOList(dtos: LeagueDTO[]): League[] {
        return dtos.map(dto => LeagueAdapter.fromDTO(dto));
    }
}
