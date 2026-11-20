import { API_BASE_URL, API_FALLBACK_URLS } from '../config/api';
import { createFailoverFetch, type TransportInit } from './failover';
const transport=createFailoverFetch({primary:API_BASE_URL,fallbacks:API_FALLBACK_URLS});
export function apiFetch(path:string,init:TransportInit={},timeoutMs=10000) {return transport(path,init,timeoutMs);}
