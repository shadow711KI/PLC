import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMotorCommand, queryMotorStatus, checkBackendHealth } from './motorApi'
import { MotorCommand, MotorStatusQuery } from '../types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Motor API', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Suppress console.error for error test cases
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendMotorCommand', () => {
    it('should send motor command successfully', async () => {
      const command: MotorCommand = {
        motor: 'wohnen_ost',
        action: 'hoch',
        sps: 'SPS1',
        port: 1001,
      }

      const mockResponse = {
        success: true,
        message: 'Motor command sent successfully',
        motorStatus: { wohnen_ost: '1' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await sendMotorCommand(command)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/motor/control'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })
      )

      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should handle HTTP errors', async () => {
      const command: MotorCommand = {
        motor: 'arbeiten',
        action: 'runter',
        sps: 'SPS2',
        port: 1002,
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await sendMotorCommand(command)

      expect(result.success).toBe(false)
      expect(result.message).toContain('HTTP error')
    })

    it('should handle network errors', async () => {
      const command: MotorCommand = {
        motor: 'test',
        action: 'stop',
        sps: 'SPS1',
        port: 1001,
      }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await sendMotorCommand(command)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Network error')
    })

    it('should handle all action types', async () => {
      const actions: MotorCommand['action'][] = [
        'hoch',
        'runter',
        'stop',
        'lamellen_oeffnen',
        'lamellen_schliessen',
      ]

      for (const action of actions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'OK' }),
        })

        const command: MotorCommand = {
          motor: 'test',
          action,
          sps: 'SPS1',
          port: 1001,
        }

        const result = await sendMotorCommand(command)

        expect(result.success).toBe(true)
      }

      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('should handle unknown errors', async () => {
      const command: MotorCommand = {
        motor: 'test',
        action: 'hoch',
        sps: 'SPS1',
        port: 1001,
      }

      mockFetch.mockRejectedValueOnce('Unknown error string')

      const result = await sendMotorCommand(command)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Unknown error')
    })
  })

  describe('queryMotorStatus', () => {
    it('should query motor status successfully', async () => {
      const query: MotorStatusQuery = {
        motorId: 1,
        host: '192.168.178.234',
        port: 1001,
      }

      const mockResponse = {
        status: '0',
        dataSize: 36,
        raw: '00000000000000000000000000000000',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await queryMotorStatus(query)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/motor/status'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(query),
        })
      )

      expect(result).toEqual(mockResponse)
      expect(result?.status).toBe('0')
      expect(result?.dataSize).toBe(36)
    })

    it('should handle HTTP errors and return null', async () => {
      const query: MotorStatusQuery = {
        motorId: 2,
        host: '192.168.178.234',
        port: 1002,
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await queryMotorStatus(query)

      expect(result).toBeNull()
    })

    it('should handle network errors and return null', async () => {
      const query: MotorStatusQuery = {
        motorId: 3,
        host: '192.168.178.234',
        port: 1003,
      }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await queryMotorStatus(query)

      expect(result).toBeNull()
    })

    it('should handle different motor IDs', async () => {
      const motorIds = [1, 2, 3, 4, 5, 6]

      for (const motorId of motorIds) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: String(motorId),
            dataSize: 36,
            raw: 'data',
          }),
        })

        const query: MotorStatusQuery = {
          motorId,
          host: '192.168.178.234',
          port: 1001,
        }

        const result = await queryMotorStatus(query)

        expect(result?.status).toBe(String(motorId))
      }

      expect(mockFetch).toHaveBeenCalledTimes(6)
    })
  })

  describe('checkBackendHealth', () => {
    it('should return true when backend is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await checkBackendHealth()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
        })
      )

      expect(result).toBe(true)
    })

    it('should return false when backend returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await checkBackendHealth()

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await checkBackendHealth()

      expect(result).toBe(false)
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      const result = await checkBackendHealth()

      expect(result).toBe(false)
    })
  })

  describe('API Base URL', () => {
    it('should use correct API endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      // Test motor control endpoint
      await sendMotorCommand({
        motor: 'test',
        action: 'hoch',
        sps: 'SPS1',
        port: 1001,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/motor\/control$/),
        expect.any(Object)
      )

      mockFetch.mockClear()

      // Test motor status endpoint
      await queryMotorStatus({
        motorId: 1,
        host: '192.168.178.234',
        port: 1001,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/motor\/status$/),
        expect.any(Object)
      )

      mockFetch.mockClear()

      // Test health endpoint
      await checkBackendHealth()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/health$/),
        expect.any(Object)
      )
    })
  })

  describe('Response Handling', () => {
    it('should properly parse JSON responses', async () => {
      const mockData = {
        success: true,
        message: 'Test message',
        motorStatus: {
          motor1: '0',
          motor2: '1',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await sendMotorCommand({
        motor: 'test',
        action: 'hoch',
        sps: 'SPS1',
        port: 1001,
      })

      expect(result).toEqual(mockData)
      expect(result.motorStatus).toBeDefined()
      expect(result.motorStatus?.motor1).toBe('0')
    })

    it('should handle responses without motor status', async () => {
      const mockData = {
        success: true,
        message: 'Command sent',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await sendMotorCommand({
        motor: 'test',
        action: 'stop',
        sps: 'SPS1',
        port: 1001,
      })

      expect(result.success).toBe(true)
      expect(result.motorStatus).toBeUndefined()
    })
  })
})
