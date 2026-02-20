export class Team {
    constructor(
        public readonly uuid: string,
        public name: string,
        public description: string,
        public isActive: boolean,
        public managerUuid: string | null = null,
        public managerName: string | null = null,
    ) {}

    get displayName(): string {
        const status = this.isActive ? '' : ' (Inactivo)';
        return `${this.name}${status}`;
    }
}
