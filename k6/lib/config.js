// Load configuration from environment variables
export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';
export const SCENARIO = __ENV.K6_SCENARIO || 'load';
export const VUS = parseInt(__ENV.K6_VUS || '10000', 10);
