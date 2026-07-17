const BASE = '/v1'

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('lr_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'request failed')
  return body as T
}

export interface DirectoryEntry {
  slug: string
  name: string
  one_line_pitch: string
  categories: string[]
  logo_url?: string
  joined_at: string
  trust_score: number
  verified_traffic: boolean
  boost_level: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface DirectoryResponse {
  data: DirectoryEntry[]
  pagination: Pagination
}

export interface StartupProfile {
  slug: string
  name: string
  one_line_pitch: string
  url: string
  categories: string[]
  logo_url?: string
  joined_at: string
  trust_score: number
  verified_traffic: boolean
  boost_level: number
  stats: { impressions_30d: number; clicks_30d: number }
}

export interface DashboardData {
  startup_id: string
  overview: {
    impressions_7d: number
    clicks_7d: number
    ctr: number
    reciprocity_balance: number
    conversions_7d?: number
    conversion_rate?: number
    impressions_by_day?: { date: string; count: number }[]
    clicks_by_day?: { date: string; count: number }[]
  }
  reciprocity: {
    balance: number
    impressions_given: number
    impressions_received: number
  }
  recent_matches: {
    startup_id: string
    name: string
    impressions: number
    clicks: number
    conversions?: number
  }[]
  trust: {
    score: number
    last_verified_at?: string
    status: string
  }
  breakdowns?: {
    by_device: { device_type: string; impressions: number; percentage: number }[]
    by_referrer: { source: string; impressions: number }[]
    by_country: { country: string; impressions: number }[]
  }
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface StartupResponse {
  id: string
  name: string
  url: string
  slug: string
  one_line_pitch: string
  categories: string[]
  status: string
  embed_code: string
  created_at: string
}

export const api = {
  directory: {
    list(params?: { page?: number; limit?: number; category?: string }) {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.category) q.set('category', params.category)
      return request<DirectoryResponse>(`/directory?${q}`)
    },
    get(slug: string) {
      return request<StartupProfile>(`/directory/${slug}`)
    },
  },
  categories: {
    list() {
      return request<Category[]>('/categories')
    },
  },
  startups: {
    create(data: {
      name: string
      url: string
      one_line_pitch: string
      categories: string[]
      email: string
    }) {
      return request<StartupResponse>('/startups', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    get(id: string) {
      return request<StartupResponse>(`/startups/${id}`)
    },
  },
  dashboard: {
    get(startupId: string) {
      return request<DashboardData>(`/dashboard/${startupId}`)
    },
  },
  auth: {
    sendMagicLink(email: string) {
      return request<{ sent: boolean; debug?: string }>('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },
    verify(token: string) {
      return request<{
        token: string
        startup_id?: string
        email: string
      }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
    },
    logout() {
      return request<{ logged_out: boolean }>('/auth/logout', {
        method: 'POST',
      })
    },
  },
}
