import type { IHttpClient } from '@/domain/interfaces/IHttpClient';
import type { TeamDTO } from '@/domain/dtos/TeamDTO';
import { TeamAdapter } from '@/domain/adapters/TeamAdapter';
import { Team } from '@/domain/models/Team';
import { API_ROUTES } from '@/domain/constants/endpoints';

export class TeamRepository {
    private base = API_ROUTES.TEAMS.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(): Promise<Team[]> {
        const dtos = await this.http.get<TeamDTO[]>(this.base);
        return TeamAdapter.fromDTOList(dtos);
    }

    async getByUuid(uuid: string): Promise<Team> {
        const dto = await this.http.get<TeamDTO>(`${this.base}${uuid}/`);
        return TeamAdapter.fromDTO(dto);
    }
}
