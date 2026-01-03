import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MotorProvider, useMotors } from './MotorContext'
import { Motor } from '../types'

// Test wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MotorProvider>{children}</MotorProvider>
)

describe('MotorContext', () => {
  describe('useMotors Hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = () => {}

      expect(() => {
        renderHook(() => useMotors())
      }).toThrow('useMotors must be used within a MotorProvider')

      console.error = originalError
    })

    it('should provide initial state values', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      expect(result.current.motors).toEqual([])
      expect(result.current.roomIcons).toEqual({})
      expect(result.current.roomOrder).toEqual([])
      expect(result.current.groups).toEqual({})
      expect(result.current.groupOrder).toEqual([])
    })

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      expect(typeof result.current.setMotors).toBe('function')
      expect(typeof result.current.setRoomIcons).toBe('function')
      expect(typeof result.current.setRoomOrder).toBe('function')
      expect(typeof result.current.updateRoomOrder).toBe('function')
      expect(typeof result.current.setGroups).toBe('function')
      expect(typeof result.current.setGroupOrder).toBe('function')
      expect(typeof result.current.updateGroupOrder).toBe('function')
      expect(typeof result.current.updateMotorStatus).toBe('function')
    })
  })

  describe('Motor State Management', () => {
    it('should update motors state', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const testMotors: Motor[] = [
        {
          id: 1,
          name: 'wohnen_ost',
          technicalName: 'wohnen_ost',
          displayName: 'Wohnen Ost',
          sps: 'SPS1',
          status: '0',
        },
      ]

      act(() => {
        result.current.setMotors(testMotors)
      })

      expect(result.current.motors).toEqual(testMotors)
      expect(result.current.motors).toHaveLength(1)
    })

    it('should update motor status by name', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const testMotors: Motor[] = [
        {
          id: 1,
          name: 'wohnen_ost',
          technicalName: 'wohnen_ost',
          displayName: 'Wohnen Ost',
          sps: 'SPS1',
          status: '0',
        },
        {
          id: 2,
          name: 'arbeiten',
          technicalName: 'arbeiten',
          displayName: 'Arbeiten',
          sps: 'SPS2',
          status: '0',
        },
      ]

      act(() => {
        result.current.setMotors(testMotors)
      })

      act(() => {
        result.current.updateMotorStatus('wohnen_ost', '1')
      })

      expect(result.current.motors[0].status).toBe('1')
      expect(result.current.motors[1].status).toBe('0')
    })

    it('should not modify other motors when updating status', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const testMotors: Motor[] = [
        {
          id: 1,
          name: 'motor1',
          technicalName: 'motor1',
          displayName: 'Motor 1',
          sps: 'SPS1',
          status: '0',
        },
        {
          id: 2,
          name: 'motor2',
          technicalName: 'motor2',
          displayName: 'Motor 2',
          sps: 'SPS1',
          status: '0',
        },
      ]

      act(() => {
        result.current.setMotors(testMotors)
      })

      act(() => {
        result.current.updateMotorStatus('motor2', '2')
      })

      expect(result.current.motors[0].status).toBe('0')
      expect(result.current.motors[1].status).toBe('2')
    })
  })

  describe('Room Configuration Management', () => {
    it('should update room icons', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const icons = {
        'Wohnzimmer': '🛋️',
        'Schlafzimmer': '🛏️',
      }

      act(() => {
        result.current.setRoomIcons(icons)
      })

      expect(result.current.roomIcons).toEqual(icons)
      expect(result.current.roomIcons['Wohnzimmer']).toBe('🛋️')
    })

    it('should update room order directly', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const order = ['Wohnzimmer', 'Schlafzimmer', 'Küche']

      act(() => {
        result.current.setRoomOrder(order)
      })

      expect(result.current.roomOrder).toEqual(order)
      expect(result.current.roomOrder).toHaveLength(3)
    })

    it('should update room order via updateRoomOrder function', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const initialOrder = ['Room1', 'Room2', 'Room3']
      const newOrder = ['Room3', 'Room1', 'Room2']

      act(() => {
        result.current.setRoomOrder(initialOrder)
      })

      act(() => {
        result.current.updateRoomOrder(newOrder)
      })

      expect(result.current.roomOrder).toEqual(newOrder)
    })
  })

  describe('Group Configuration Management', () => {
    it('should update groups', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const testGroups = {
        'Alle': ['wohnen_ost', 'arbeiten'],
        'Wohnen': ['wohnen_ost', 'wohnen_sued_links'],
      }

      act(() => {
        result.current.setGroups(testGroups)
      })

      expect(result.current.groups).toEqual(testGroups)
      expect(result.current.groups['Alle']).toContain('wohnen_ost')
    })

    it('should update group order directly', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const order = ['Alle', 'Wohnen', 'Arbeiten']

      act(() => {
        result.current.setGroupOrder(order)
      })

      expect(result.current.groupOrder).toEqual(order)
      expect(result.current.groupOrder).toHaveLength(3)
    })

    it('should update group order via updateGroupOrder function', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const initialOrder = ['Group1', 'Group2']
      const newOrder = ['Group2', 'Group1']

      act(() => {
        result.current.setGroupOrder(initialOrder)
      })

      act(() => {
        result.current.updateGroupOrder(newOrder)
      })

      expect(result.current.groupOrder).toEqual(newOrder)
    })
  })

  describe('State Persistence', () => {
    it('should maintain state across multiple operations', () => {
      const { result } = renderHook(() => useMotors(), { wrapper })

      const motors: Motor[] = [{
        id: 1,
        name: 'test',
        technicalName: 'test',
        displayName: 'Test',
        sps: 'SPS1',
        status: '0',
      }]

      const icons = { 'Room': '🏠' }
      const roomOrder = ['Room']
      const groups = { 'Group': ['test'] }
      const groupOrder = ['Group']

      act(() => {
        result.current.setMotors(motors)
        result.current.setRoomIcons(icons)
        result.current.setRoomOrder(roomOrder)
        result.current.setGroups(groups)
        result.current.setGroupOrder(groupOrder)
      })

      expect(result.current.motors).toEqual(motors)
      expect(result.current.roomIcons).toEqual(icons)
      expect(result.current.roomOrder).toEqual(roomOrder)
      expect(result.current.groups).toEqual(groups)
      expect(result.current.groupOrder).toEqual(groupOrder)
    })
  })

  describe('Function Stability', () => {
    it('should have stable function references', () => {
      const { result, rerender } = renderHook(() => useMotors(), { wrapper })

      const firstUpdateRoomOrder = result.current.updateRoomOrder
      const firstUpdateGroupOrder = result.current.updateGroupOrder
      const firstUpdateMotorStatus = result.current.updateMotorStatus

      // Trigger re-render
      rerender()

      expect(result.current.updateRoomOrder).toBe(firstUpdateRoomOrder)
      expect(result.current.updateGroupOrder).toBe(firstUpdateGroupOrder)
      expect(result.current.updateMotorStatus).toBe(firstUpdateMotorStatus)
    })
  })
})
