import { AxiosHttpClient } from "@/domain/services/AxiosHttpClient";

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) {
    throw new Error("Falta configurar la variable de entorno VITE_API_BASE_URL");
}

export const httpClient = new AxiosHttpClient(baseURL);