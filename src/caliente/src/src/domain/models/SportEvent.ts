export class SportEvent {
    constructor(
        public readonly id: number,
        public readonly uuid: string,
        public name: string,
        public leagueId: number | null,
        public leagueName: string | null,
        public sport: string,
        public dateStart: string,
        public dateEnd: string | null,
        public priority: number,
        public description: string,
        public externalId: string | null,
        public homeTeam: string,
        public awayTeam: string,
    ) {}

    get priorityLabel(): string {
        if (this.priority >= 1 && this.priority <= 3) return 'Alta';
        if (this.priority >= 4 && this.priority <= 6) return 'Media';
        return 'Baja';
    }

    get isHighPriority(): boolean {
        return this.priority >= 1 && this.priority <= 3;
    }

    get displayName(): string {
        if (this.homeTeam && this.awayTeam) {
            return `${this.homeTeam} vs ${this.awayTeam}`;
        }
        return this.name;
    }

    get label(): string {
        return this.leagueName ? `${this.displayName} (${this.leagueName})` : this.displayName;
    }
}
