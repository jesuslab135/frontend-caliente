import type { UserRoleDTO } from '../dtos/AuthDTO';

export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public firstName: string,
        public lastName: string,
        public readonly employeeId: string,
        private _role: UserRoleDTO,
        public phone: string = '',
        public teamId: number | null = null,
        public isActive: boolean = true
    ) {}

    get role(): UserRoleDTO {
        return this._role;
    }

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`.trim() || this.email;
    }

    get roleLabel(): string {
        const labels: Record<UserRoleDTO, string> = {
            'MONITOR_TRADER': 'Monitor Trader',
            'INPLAY_TRADER': 'In-Play Trader',
            'MANAGER': 'Supervisor',
            'ADMIN': 'Administrador'
        };
        return labels[this._role] || this._role;
    }

    get isAdmin(): boolean {
        return this._role === 'ADMIN';
    }

    get isManager(): boolean {
        return this._role === 'MANAGER' || this._role === 'ADMIN';
    }

    get isTrader(): boolean {
        return this._role === 'MONITOR_TRADER' || this._role === 'INPLAY_TRADER';
    }

    get isMonitorTrader(): boolean {
        return this._role === 'MONITOR_TRADER';
    }

    get isInplayTrader(): boolean {
        return this._role === 'INPLAY_TRADER';
    }

    /** Custom serialization — ensures role survives JSON.stringify() */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            employeeId: this.employeeId,
            role: this._role,
            phone: this.phone,
            teamId: this.teamId,
            isActive: this.isActive,
        };
    }

    /** Reconstruct a User instance from a plain JSON object (localStorage hydration) */
    static hydrate(data: Record<string, any>): User {
        return new User(
            data.id,
            data.email,
            data.firstName,
            data.lastName,
            data.employeeId,
            data.role || data._role,
            data.phone ?? '',
            data.teamId ?? null,
            data.isActive ?? true
        );
    }
}