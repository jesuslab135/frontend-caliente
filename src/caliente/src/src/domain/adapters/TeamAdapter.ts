import { Team } from '../models/Team';
import type { TeamDTO } from '../dtos/TeamDTO';

export class TeamAdapter {
    static fromDTO(dto: TeamDTO): Team {
        return new Team(
            dto.uuid,
            dto.name,
            dto.description,
            dto.is_active,
            dto.manager?.uuid ?? null,
            dto.manager?.full_name ?? null,
        );
    }

    static fromDTOList(dtos: TeamDTO[]): Team[] {
        return dtos.map(dto => TeamAdapter.fromDTO(dto));
    }
}
