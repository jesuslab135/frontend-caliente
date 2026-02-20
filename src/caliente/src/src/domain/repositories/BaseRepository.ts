import type { IHttpClient } from "@/domain/interfaces/IHttpClient";

export abstract class BaseRepository<T> {
    constructor(
        protected http: IHttpClient,
        protected resource: string
    ) {}

    async getAll(): Promise<T[]> {
        return this.http.get<T[]>(this.resource);
    }

    async getById(id: string): Promise<T> {
        const url = `${this.resource}${id}/`;
        return this.http.get<T>(url);
    }

    async create(body: any): Promise<T> {
        return this.http.post<T>(this.resource, body);
    }

    async update(id: string, body: any): Promise<T> {
        const url = `${this.resource}${id}/`;
        return this.http.put<T>(url, body);
    }

    async patch(id: string, body: any): Promise<T> {
        const url = `${this.resource}${id}/`;
        return this.http.patch<T>(url, body);
    }

    async delete(id: string): Promise<void> {
        const url = `${this.resource}${id}/`;
        return this.http.delete(url);
    }
} 