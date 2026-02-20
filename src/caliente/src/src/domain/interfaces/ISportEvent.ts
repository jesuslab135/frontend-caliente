/** Contrato del modelo de dominio SportEvent */
export interface ISportEvent {
    readonly uuid: string;
    name: string;
    leagueUuid: string;
    leagueName: string;
    dateStart: string;
    dateEnd: string | null;
    priority: number;
    description: string;
    externalId: string | null;
}
