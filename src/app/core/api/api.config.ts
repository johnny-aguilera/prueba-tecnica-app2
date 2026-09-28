import { InjectionToken } from '@angular/core';

/**
 * Basic config for the API.
 *
 */
export interface ApiConfig {
  readonly baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
