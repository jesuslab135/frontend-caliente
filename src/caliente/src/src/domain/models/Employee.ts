import type { UserRoleDTO } from '../dtos/AuthDTO';

export class Employee {
    constructor(
        public readonly uuid: string,
        public readonly employeeId: string,
        public readonly email: string,
        public firstName: string,
        public lastName: string,
        private _role: UserRoleDTO,
        public phone: string,
        public isActive: boolean,
        public hireDate: string | null,
        public teamUuid: string | null,
        public teamName: string | null,
        public preferredShiftCategory: number | null = null,
        public excludeFromGrid: boolean = false,
        public readonly dbId: number = 0,
    ) {}

    get role(): UserRoleDTO {
        return this._role;
    }

    get fullName(): string {
        const name = `${this.firstName} ${this.lastName}`.trim();
        return name || this.employeeId;
    }

    get initials(): string {
        const name = `${this.firstName} ${this.lastName}`.trim();
        if (name) {
            return name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
        }
        return this.employeeId.slice(0, 2).toUpperCase();
    }

    get roleLabel(): string {
        const labels: Record<UserRoleDTO, string> = {
            'MONITOR_TRADER': 'Monitor Trader',
            'INPLAY_TRADER': 'In-Play Trader',
            'MANAGER': 'Supervisor',
            'ADMIN': 'Administrador',
        };
        return labels[this._role] || this._role;
    }

    get roleShort(): string {
        const shorts: Record<UserRoleDTO, string> = {
            'MONITOR_TRADER': 'MON',
            'INPLAY_TRADER': 'IP',
            'MANAGER': 'MGR',
            'ADMIN': 'ADM',
        };
        return shorts[this._role] || this._role;
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
}
