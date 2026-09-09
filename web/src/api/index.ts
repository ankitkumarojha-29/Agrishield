import axios from 'axios';

const getNormalizedBaseUrl = () => {
  let url = (import.meta.env.VITE_API_BASE_URL || '/api/v1').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

const API_BASE_URL = getNormalizedBaseUrl();
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Envelope<T> = {
  success: boolean;
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
  };
  error: null | {
    code: string;
    message: string;
    details: any;
  };
};

export type GeoPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type Farm = {
  id: string;
  user_id: string;
  name: string;
  crop: string | null;
  sowing_date: string | null;
  area_m2: number;
  status: 'PENDING' | 'VERIFIED' | 'UNAVAILABLE';
  // New fields returned by backend after Phase 2 fix
  boundary: GeoPolygon | null;
  centroid: { lat: number; lon: number } | null;
};

export type Claim = {
  id: string;
  policy_id: string;
  incident_date: string;
  event_type: string;
  description: string;
  evidence_ids?: string[];
  status: 'SUBMITTED' | 'AI_ASSESSED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  damage_pct: number | null;
  ai_confidence: number | null;
};

// Mock Data
const MOCK_FARMS: Farm[] = [
  { id: '1', user_id: '1', name: 'North Field', crop: 'Wheat', sowing_date: '2026-06-01', area_m2: 25000, status: 'VERIFIED',
    centroid: { lat: 28.6139, lon: 77.2090 }, boundary: null },
  { id: '2', user_id: '1', name: 'East Plot', crop: 'Corn', sowing_date: '2026-05-15', area_m2: 12000, status: 'PENDING',
    centroid: { lat: 18.9220, lon: 72.8347 }, boundary: null },
];

const MOCK_CLAIMS: Claim[] = [
  { id: '1', policy_id: 'p1', incident_date: '2026-08-10', event_type: 'flood', description: 'Heavy rains flooded the north field', status: 'AI_ASSESSED', damage_pct: 85, ai_confidence: 0.92 },
  { id: '2', policy_id: 'p2', incident_date: '2026-08-12', event_type: 'pest', description: 'Locust swarm', status: 'SUBMITTED', damage_pct: null, ai_confidence: null },
];

export type Policy = {
  id: string;
  farm_id: string;
  premium_amount: number;
  coverage_amount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';  // Matches DB enum — no PENDING
  start_date: string;
  end_date: string;
  canonical_hash?: string;
  tx_hash?: string;
};

export type PolicyVerification = {
  // Shape matches VerificationResponse in backend/schemas/insurance.py
  canonical_hash: string | null;
  tx_hash: string | null;
  status: string;
};

const MOCK_POLICIES: Policy[] = [
  { id: 'p1', farm_id: '1', premium_amount: 1500, coverage_amount: 25000, status: 'ACTIVE', start_date: '2026-01-01', end_date: '2026-12-31' },
  { id: 'p2', farm_id: '2', premium_amount: 800, coverage_amount: 12000, status: 'CANCELLED', start_date: '2026-06-01', end_date: '2027-05-31' },
];

function createMockResponse<T>(data: T): Envelope<T> {
  return {
    success: true,
    data,
    meta: { request_id: 'mock-uuid', timestamp: new Date().toISOString() },
    error: null,
  };
}

export type User = {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'ADMIN' | 'INSURER' | 'FARMER';
  is_active?: boolean;
};

export type Farmer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export const api = {
  _cache: {
    farms: null as Envelope<Farm[]> | null,
    claims: null as Envelope<Claim[]> | null,
    policies: null as Envelope<Policy[]> | null,
  },
  login: async (credentials: any): Promise<Envelope<{ access_token: string; refresh_token: string }>> => {
    if (IS_DEMO) return createMockResponse({ access_token: 'mock-token', refresh_token: 'mock-refresh' });
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: any): Promise<Envelope<{ user: User; access_token: string }>> => {
    if (IS_DEMO) return createMockResponse({ user: { id: '1', email: userData.email, name: userData.name, role: 'ADMIN' }, access_token: 'mock-token' });
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
  },
  getMe: async (): Promise<Envelope<User>> => {
    if (IS_DEMO) return createMockResponse({ id: '1', email: 'admin@agrishield.com', phone: '', name: 'Admin User', role: 'ADMIN' });
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  getFarmers: async (page: number = 1, page_size: number = 1000): Promise<Envelope<Farmer[]>> => {
    if (IS_DEMO) return createMockResponse([{ id: '2', email: 'rajesh@example.com', phone: '+919876543210', name: 'Rajesh Kumar' }]);
    const res = await apiClient.get(`/admin/farmers?page=${page}&page_size=${page_size}`);
    return res.data;
  },
  getNotifications: async (): Promise<Envelope<Notification[]>> => {
    if (IS_DEMO) return createMockResponse([
      { id: '1', user_id: '1', title: 'New Claim Filed', message: 'Farm #1 filed a flood claim.', is_read: false, created_at: new Date().toISOString() }
    ]);
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  getFarms: async (page: number = 1, page_size: number = 10000): Promise<Envelope<Farm[]>> => {
    if (api._cache.farms) return api._cache.farms;
    if (IS_DEMO) return createMockResponse(MOCK_FARMS);
    const res = await apiClient.get(`/farms?page=${page}&page_size=${page_size}`);
    api._cache.farms = res.data;
    return res.data;
  },
  getClaims: async (page: number = 1, page_size: number = 10000): Promise<Envelope<Claim[]>> => {
    if (api._cache.claims) return api._cache.claims;
    if (IS_DEMO) return createMockResponse(MOCK_CLAIMS);
    const res = await apiClient.get(`/claims?page=${page}&page_size=${page_size}`);
    api._cache.claims = res.data;
    return res.data;
  },
  reviewClaim: async (id: string, action: 'APPROVE' | 'REJECT'): Promise<Envelope<Claim>> => {
    if (IS_DEMO) {
      const claim = MOCK_CLAIMS.find(c => c.id === id);
      if (!claim) throw new Error('Claim not found');
      const updated: Claim = { ...claim, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' };
      return createMockResponse(updated);
    }
    const res = await apiClient.post(`/claims/${id}/review`, { action });
    return res.data;
  },
  getPolicies: async (): Promise<Envelope<Policy[]>> => {
    if (api._cache.policies) return api._cache.policies;
    if (IS_DEMO) return createMockResponse(MOCK_POLICIES);
    const res = await apiClient.get('/insurance/policies');
    api._cache.policies = res.data;
    return res.data;
  },
  verifyPolicy: async (id: string): Promise<Envelope<PolicyVerification>> => {
    if (IS_DEMO) {
      return createMockResponse({
        canonical_hash: `a3f${Math.random().toString(16).substring(2, 60)}`,
        tx_hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        status: 'VERIFIED',
      });
    }
    const res = await apiClient.get(`/insurance/policies/${id}/verification`);
    return res.data;
  },

  // ─── AI Proxy routes ───────────────────────────────────────────────────

  assessClaim: async (id: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      id, status: 'AI_ASSESSED', damage_pct: 0.28,
      ai_confidence: 0.87, model_version: 'mock-damage-v1', tx_hash: '0xabc123'
    });
    const res = await apiClient.post(`/claims/${id}/assess`);
    return res.data;
  },

  getFarmYield: async (farmId: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      yield_value: 3200, unit: 'kg/ha', confidence: 0.82,
      model_version: 'mock-v1', low_confidence: false
    });
    const res = await apiClient.post(`/farms/${farmId}/yield-predict`);
    return res.data;
  },

  getFarmRisk: async (farmId: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      risk_score: 0.35, risk_band: 'medium', factors: [],
      confidence: 0.88, model_version: 'mock-v1'
    });
    const res = await apiClient.post(`/farms/${farmId}/risk-score`);
    return res.data;
  },

  getFarmAdvisory: async (farmId: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      recommendations: ['Apply balanced NPK', 'Monitor crop weekly'],
      warnings: [], model_version: 'mock-v1'
    });
    const res = await apiClient.post(`/farms/${farmId}/advisory`);
    return res.data;
  },

  getFarmWeather: async (farmId: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      temperature_celsius: 28, wind_speed_kmh: 12,
      condition: 'Clear', timestamp: new Date().toISOString()
    });
    const res = await apiClient.get(`/farms/${farmId}/weather/current`);
    return res.data;
  },

  getFarmRevenue: async (farmId: string, crop?: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({
      farm_id: farmId, crop: crop || 'Wheat', yield_kg_per_ha: 3200,
      total_yield_quintals: 76.8, mandi_price_per_quintal: 2425, total_revenue: 186240,
      market: 'Bhopal Mandi (Benchmark)'
    });
    const query = crop ? `?crop=${encodeURIComponent(crop)}` : '';
    const res = await apiClient.get(`/farms/${farmId}/revenue${query}`);
    return res.data;
  },

  updateFarm: async (farmId: string, data: { crop?: string; sowing_date?: string; name?: string }): Promise<Envelope<any>> => {
    const res = await apiClient.patch(`/farms/${farmId}`, data);
    return res.data;
  },

  createClaim: async (claim: {
    policy_id: string;
    incident_date: string;
    event_type: string;
    description: string;
    evidence_ids: string[];
  }): Promise<Envelope<any>> => {
    const idempotencyKey = crypto.randomUUID();
    if (IS_DEMO) return createMockResponse({ id: idempotencyKey, status: 'SUBMITTED' });
    const res = await apiClient.post('/claims', claim, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    return res.data;
  },

  markNotificationRead: async (id: string): Promise<Envelope<any>> => {
    if (IS_DEMO) return createMockResponse({ id, is_read: true });
    const res = await apiClient.post(`/notifications/${id}/read`);
    return res.data;
  },

  // ─── Cache invalidation ────────────────────────────────────────────────

  invalidateCache: (key?: 'farms' | 'claims' | 'policies') => {
    if (key) {
      api._cache[key] = null;
    } else {
      api._cache.farms = null;
      api._cache.claims = null;
      api._cache.policies = null;
    }
  },
};
