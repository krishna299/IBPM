import axios, { AxiosInstance } from "axios";
import prisma from "@/lib/db/prisma";

/**
 * Zoho Books API Client
 * Handles authentication (OAuth2 refresh token flow) and base HTTP methods.
 * One-way push from IBPM → Zoho Books.
 */

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  baseUrl: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getZohoConfig(): Promise<ZohoConfig> {
  return {
    clientId: process.env.ZOHO_CLIENT_ID || "",
    clientSecret: process.env.ZOHO_CLIENT_SECRET || "",
    refreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
    organizationId: process.env.ZOHO_ORGANIZATION_ID || "",
    baseUrl: process.env.ZOHO_API_BASE_URL || "https://www.zohoapis.in/books/v3",
  };
}

async function refreshAccessToken(): Promise<string> {
  const config = await getZohoConfig();

  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const response = await axios.post(
      "https://accounts.zoho.in/oauth/v2/token",
      null,
      {
        params: {
          refresh_token: config.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "refresh_token",
        },
      }
    );

    cachedAccessToken = response.data.access_token;
    // Token valid for ~55 minutes (expire buffer of 5 min)
    tokenExpiresAt = Date.now() + 55 * 60 * 1000;

    return cachedAccessToken!;
  } catch (error: any) {
    console.error("Zoho token refresh failed:", error.response?.data || error.message);
    throw new Error("Failed to refresh Zoho access token");
  }
}

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor: attach token + org ID
  instance.interceptors.request.use(async (config) => {
    const zohoConfig = await getZohoConfig();
    const token = await refreshAccessToken();

    config.headers.Authorization = `Zoho-oauthtoken ${token}`;
    // Add organization_id as query param
    config.params = {
      ...config.params,
      organization_id: zohoConfig.organizationId,
    };

    return config;
  });

  // Response interceptor: handle errors
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired, clear cache and retry once
        cachedAccessToken = null;
        tokenExpiresAt = 0;

        const token = await refreshAccessToken();
        error.config.headers.Authorization = `Zoho-oauthtoken ${token}`;
        return axios(error.config);
      }
      throw error;
    }
  );

  return instance;
}

const zohoClient = createAxiosInstance();

export async function zohoGet(endpoint: string, params?: Record<string, any>) {
  const config = await getZohoConfig();
  const url = `${config.baseUrl}${endpoint}`;
  return zohoClient.get(url, { params });
}

export async function zohoPost(endpoint: string, data: any) {
  const config = await getZohoConfig();
  const url = `${config.baseUrl}${endpoint}`;
  return zohoClient.post(url, data);
}

export async function zohoPut(endpoint: string, data: any) {
  const config = await getZohoConfig();
  const url = `${config.baseUrl}${endpoint}`;
  return zohoClient.put(url, data);
}

export async function zohoDelete(endpoint: string) {
  const config = await getZohoConfig();
  const url = `${config.baseUrl}${endpoint}`;
  return zohoClient.delete(url);
}

/**
 * Log a Zoho sync operation
 */
export async function logZohoSync(params: {
  entityType: string;
  entityId: string;
  zohoModule: string;
  zohoId?: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  requestPayload?: any;
  responseData?: any;
  errorMessage?: string;
}) {
  try {
    await prisma.zohoSyncLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        zohoId: params.zohoId || null,
        action: params.action,
        status: params.status,
        request: params.requestPayload ?? undefined,
        response: params.responseData ?? undefined,
        errorMessage: params.errorMessage || null,
        retryCount: 0,
      },
    });
  } catch (error) {
    console.error("Failed to log Zoho sync:", error);
  }
}

export default zohoClient;
