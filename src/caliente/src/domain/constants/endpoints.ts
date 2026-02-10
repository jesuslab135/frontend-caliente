export const API_ROUTES = {
    AUTH: {
        BASE: 'auth/',
        LOGIN: 'login/',
        LOGOUT: 'logout/',
        ME: 'me/',
        REFRESH: 'token/refresh/',
        REGISTER: 'register/',
        PASSWORD_CHANGE: 'password-change/',
        PASSWORD_RESET: 'password-reset/',
        PASSWORD_RESET_CONFIRM: 'password-reset/confirm/',
    },
    EMPLOYEES: {
        BASE: 'employees/',
    },
    LEAGUES: {
        BASE: 'leagues/',
    },
    SCHEDULE_GENERATIONS_LOGS: {
        BASE: 'schedulegenerationlogs/',
    },
    SCHEDULES: {
        BASE: 'schedules/',
    },
    SHIFT_CATEGORIES: {
        BASE: 'shiftcategories/',
    },
    SHIFT_CYCLE_CONFIGS: {
        BASE: 'shiftcycleconfigs/',
    },
    SHIFT_TYPES: {
        BASE: 'shifttypes/',
    },
    SPORT_EVENTS: {
        BASE: 'sportevents/',
    },
    SWAP_REQUESTS: {
        BASE: 'swaprequests/',
    },
    SYSTEM_SETTINGS: {
        BASE: 'systemsettingss/',
    },
    TEAMS: {
        BASE: 'teams/',
    },
    VACATIONS: {
        BASE: 'vacations/',
    },
} as const;