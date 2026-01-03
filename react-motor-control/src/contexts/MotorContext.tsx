import { createContext, useContext, useState, useCallback, useMemo, ReactNode, Dispatch, SetStateAction } from 'react'
import { Motor } from '../types'

// ============================================================================
// MOTOR CONTEXT
// Manages all motor-related state: motors, rooms, and groups
// ============================================================================

interface MotorContextState {
  // Motor data
  motors: Motor[]
  setMotors: Dispatch<SetStateAction<Motor[]>>

  // Room configuration
  roomIcons: Record<string, string>
  roomOrder: string[]
  setRoomIcons: Dispatch<SetStateAction<Record<string, string>>>
  setRoomOrder: Dispatch<SetStateAction<string[]>>
  updateRoomOrder: (order: string[]) => void

  // Group configuration
  groups: Record<string, string[]>
  groupOrder: string[]
  setGroups: Dispatch<SetStateAction<Record<string, string[]>>>
  setGroupOrder: Dispatch<SetStateAction<string[]>>
  updateGroupOrder: (order: string[]) => void

  // Motor operations
  updateMotorStatus: (motorName: string, status: string) => void
}

const MotorContext = createContext<MotorContextState | undefined>(undefined)

interface MotorProviderProps {
  children: ReactNode
}

export function MotorProvider({ children }: MotorProviderProps) {
  const [motors, setMotors] = useState<Motor[]>([])
  const [roomIcons, setRoomIcons] = useState<Record<string, string>>({})
  const [roomOrder, setRoomOrder] = useState<string[]>([])
  const [groups, setGroups] = useState<Record<string, string[]>>({})
  const [groupOrder, setGroupOrder] = useState<string[]>([])

  // Update room order - memoized to prevent unnecessary re-renders
  const updateRoomOrder = useCallback((order: string[]) => {
    setRoomOrder(order)
  }, [])

  // Update group order - memoized to prevent unnecessary re-renders
  const updateGroupOrder = useCallback((order: string[]) => {
    setGroupOrder(order)
  }, [])

  // Update motor status - memoized to prevent unnecessary re-renders
  const updateMotorStatus = useCallback((motorName: string, status: string) => {
    setMotors(prevMotors =>
      prevMotors.map(motor =>
        motor.name === motorName ? { ...motor, status } : motor
      )
    )
  }, [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<MotorContextState>(() => ({
    motors,
    setMotors,
    roomIcons,
    roomOrder,
    setRoomIcons,
    setRoomOrder,
    updateRoomOrder,
    groups,
    groupOrder,
    setGroups,
    setGroupOrder,
    updateGroupOrder,
    updateMotorStatus,
  }), [motors, roomIcons, roomOrder, groups, groupOrder, updateRoomOrder, updateGroupOrder, updateMotorStatus])

  return <MotorContext.Provider value={value}>{children}</MotorContext.Provider>
}

// Custom hook to use the MotorContext
export function useMotors() {
  const context = useContext(MotorContext)
  if (context === undefined) {
    throw new Error('useMotors must be used within a MotorProvider')
  }
  return context
}
