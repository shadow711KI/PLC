import { createContext, useContext, useState, useCallback, useMemo, ReactNode, Dispatch, SetStateAction } from 'react'
import { Motor, Screen } from '../types'

// ============================================================================
// UI CONTEXT
// Manages all UI-related state: screen navigation, selections, loading states
// ============================================================================

interface UIContextState {
  // Screen navigation
  currentScreen: Screen
  setCurrentScreen: Dispatch<SetStateAction<Screen>>

  // Motor selection
  selectedMotor: Motor | null
  setSelectedMotor: Dispatch<SetStateAction<Motor | null>>

  // Loading & error states
  isLoading: boolean
  setIsLoading: Dispatch<SetStateAction<boolean>>
  errorMessage: string | null
  setErrorMessage: Dispatch<SetStateAction<string | null>>

  // Move modes
  moveMode: boolean
  setMoveMode: Dispatch<SetStateAction<boolean>>
  groupMoveMode: boolean
  setGroupMoveMode: Dispatch<SetStateAction<boolean>>

  // Helper functions
  toggleMoveMode: () => void
  toggleGroupMoveMode: () => void
  showError: (message: string) => void
  clearError: () => void
}

const UIContext = createContext<UIContextState | undefined>(undefined)

interface UIProviderProps {
  children: ReactNode
}

export function UIProvider({ children }: UIProviderProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main')
  const [selectedMotor, setSelectedMotor] = useState<Motor | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [moveMode, setMoveMode] = useState(false)
  const [groupMoveMode, setGroupMoveMode] = useState(false)

  // Toggle move mode - memoized to prevent unnecessary re-renders
  const toggleMoveMode = useCallback(() => {
    setMoveMode(prev => !prev)
  }, [])

  // Toggle group move mode - memoized to prevent unnecessary re-renders
  const toggleGroupMoveMode = useCallback(() => {
    setGroupMoveMode(prev => !prev)
  }, [])

  // Show error message - memoized to prevent unnecessary re-renders
  const showError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  // Clear error message - memoized to prevent unnecessary re-renders
  const clearError = useCallback(() => {
    setErrorMessage(null)
  }, [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<UIContextState>(() => ({
    currentScreen,
    setCurrentScreen,
    selectedMotor,
    setSelectedMotor,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
    moveMode,
    setMoveMode,
    groupMoveMode,
    setGroupMoveMode,
    toggleMoveMode,
    toggleGroupMoveMode,
    showError,
    clearError,
  }), [
    currentScreen,
    selectedMotor,
    isLoading,
    errorMessage,
    moveMode,
    groupMoveMode,
    toggleMoveMode,
    toggleGroupMoveMode,
    showError,
    clearError,
  ])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// Custom hook to use the UIContext
export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
