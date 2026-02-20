/** Contrato del modelo de dominio Team */
export interface ITeam {
    readonly uuid: string;
    name: string;
    description: string;
    isActive: boolean;
    managerUuid: string | null;
    managerName: string | null;
}
