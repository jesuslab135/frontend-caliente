import { SportEvent } from '../models/SportEvent';
import type { SportEventDTO } from '../dtos/SportEventDTO';

export class SportEventAdapter {
    static fromDTO(dto: SportEventDTO): SportEvent {
        let leagueId: number | null = null;
        let leagueName: string | null = null;

        if (typeof dto.league === 'object' && dto.league !== null) {
            leagueId = dto.league.id;
            leagueName = dto.league.name;
        } else if (typeof dto.league === 'number') {
            leagueId = dto.league;
        }

        return new SportEvent(
            dto.id,
            dto.uuid,
            dto.name,
            leagueId,
            leagueName,
            dto.date_start,
            dto.date_end,
            dto.priority,
            dto.description,
            dto.external_id,
        );
    }

    static fromDTOList(dtos: SportEventDTO[]): SportEvent[] {
        return dtos.map(dto => SportEventAdapter.fromDTO(dto));
    }
}
