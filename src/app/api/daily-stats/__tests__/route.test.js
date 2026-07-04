/**
 * Example backend test for API routes
 * Tests for src/app/api/daily-stats/route.js
 */

import { GET } from '@/app/api/daily-stats/route'
import { createClient } from '@/lib/supabase/server'

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('GET /api/daily-stats', () => {
  let mockSupabase
  let mockRequest

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    createClient.mockResolvedValue(mockSupabase)
    mockRequest = new Request('http://localhost:3000/api/daily-stats')
  })

  it('should return 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const response = await GET()

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('should fetch daily stats for authenticated user', async () => {
    const mockUser = { id: 'user-123' }
    const mockStats = { date: '2024-01-01', calories: 2000 }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
    }

    mockSupabase.from.mockReturnValue(mockQuery)

    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual(mockStats)
  })

  it('should handle database errors gracefully', async () => {
    const mockUser = { id: 'user-123' }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      }),
    }

    mockSupabase.from.mockReturnValue(mockQuery)

    const response = await GET()

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json).toHaveProperty('error')
  })
})
