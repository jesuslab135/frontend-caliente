import type { IHttpClient } from '../interfaces/IHttpClient';
import type {
    SportEventDTO,
    SportEventWriteDTO,
    SportEventFilterParams,
    CalendarMonthResponse,
    CalendarDayResponse,
} from '../dtos/SportEventDTO';
import { API_ROUTES } from '../constants/endpoints';

export class SportEventRepository {
    private base = API_ROUTES.SPORT_EVENTS.BASE;

    constructor(private http: IHttpClient) {}

    async getAll(filters?: SportEventFilterParams): Promise<SportEventDTO[]> {
        return this.http.get<SportEventDTO[]>(this.base, {
            params: filters as Record<string, any>,
        });
    }

    async create(payload: SportEventWriteDTO): Promise<SportEventDTO> {
        return this.http.post<SportEventDTO>(this.base, payload);
    }

    async update(uuid: string, payload: Partial<SportEventWriteDTO>): Promise<SportEventDTO> {
        return this.http.patch<SportEventDTO>(`${this.base}${uuid}/`, payload);
    }

    async remove(uuid: string): Promise<void> {
        await this.http.delete(`${this.base}${uuid}/`);
    }

    async importFile(formData: FormData): Promise<{ imported: number; errors: string[] }> {
        return this.http.post(API_ROUTES.SPORT_EVENTS.IMPORT, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }

    async scrapeFlashscore(options?: { days?: number; sports?: string[] }): Promise<{ imported: number; errors: string[] }> {
        return this.http.post(API_ROUTES.SPORT_EVENTS.SCRAPE, options ?? {});
    }

    async getCalendarMonth(year: number, month: number, filters?: { sport?: string; league?: string }): Promise<CalendarMonthResponse> {
        return this.http.get<CalendarMonthResponse>(API_ROUTES.SPORT_EVENTS.CALENDAR_MONTH, {
            params: { year, month, ...filters },
        });
    }

    async getCalendarDay(date: string, filters?: { sport?: string; league?: string }): Promise<CalendarDayResponse> {
        return this.http.get<CalendarDayResponse>(API_ROUTES.SPORT_EVENTS.CALENDAR_DAY, {
            params: { date, ...filters },
        });
    }

    async getAvailableSports(): Promise<string[]> {
        return this.http.get<string[]>(API_ROUTES.SPORT_EVENTS.SPORTS);
    }
}
