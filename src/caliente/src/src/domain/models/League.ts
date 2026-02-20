export class League {
    constructor(
        public readonly id: number,
        public readonly uuid: string,
        public name: string,
        public sport: string,
        public country: string,
        public isActive: boolean,
        public basePriority: number,
    ) {}

    get displayName(): string {
        const status = this.isActive ? '' : ' (Inactiva)';
        return `${this.name}${status}`;
    }

    get priorityLabel(): string {
        if (this.basePriority >= 1 && this.basePriority <= 3) return 'Alta';
        if (this.basePriority >= 4 && this.basePriority <= 6) return 'Media';
        return 'Baja';
    }

    get location(): string {
        return [this.sport, this.country].filter(Boolean).join(' — ');
    }
}
