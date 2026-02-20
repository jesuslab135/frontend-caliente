/** Contrato del modelo de dominio League */
export interface ILeague {
    readonly uuid: string;
    name: string;
    sport: string;
    country: string;
    isActive: boolean;
    basePriority: number;
}
