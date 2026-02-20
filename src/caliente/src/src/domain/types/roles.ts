/**
 * Roles disponibles para empleados del sistema.
 * Mapea a Employee.Role en el backend Django.
 */
export type EmployeeRole =
    | 'MONITOR_TRADER'
    | 'INPLAY_TRADER'
    | 'PREMATCH_TRADER'
    | 'MANAGER'
    | 'ADMIN';

/** Roles que corresponden a traders operativos */
export type TraderRole = Extract<EmployeeRole, 'MONITOR_TRADER' | 'INPLAY_TRADER' | 'PREMATCH_TRADER'>;

/** Roles con permisos de supervisión */
export type SupervisorRole = Extract<EmployeeRole, 'MANAGER' | 'ADMIN'>;
