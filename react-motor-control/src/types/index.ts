// ============================================================================
// SHARED TYPE DEFINITIONS
// ============================================================================

// ----------------------------------------------------------------------------
// Motor Types
// ----------------------------------------------------------------------------

export interface Motor {
  id: number
  name: string
  technicalName: string
  displayName: string
  sps: string
  status: string
  type?: 'jalousie' | 'rollladen'
}

// ----------------------------------------------------------------------------
// Screen & UI Types
// ----------------------------------------------------------------------------

export type Screen = 'main' | 'settings' | 'rooms'

// ----------------------------------------------------------------------------
// Room & Group Types
// ----------------------------------------------------------------------------

export interface Room {
  name: string
  motors: Motor[]
  icon: string
}

export interface RoomConfig {
  icons: Record<string, string>
  order: string[]
}

export interface GroupConfig {
  groups: Record<string, string[]>
  order: string[]
}

// ----------------------------------------------------------------------------
// Motor Command & API Types
// ----------------------------------------------------------------------------

export interface MotorCommand {
  motor: string
  action: 'hoch' | 'runter' | 'stop' | 'lamellen_oeffnen' | 'lamellen_schliessen'
  sps: string
  port: number
}

export interface MotorStatusQuery {
  motorId: number
  host: string
  port: number
}

export interface MotorStatusResponse {
  status: string
  dataSize: number
  raw: string
}

// ----------------------------------------------------------------------------
// SPS (PLC) Types
// ----------------------------------------------------------------------------

export interface SpsConfig {
  host: string
  port: number
}

export type SpsMapping = Record<string, SpsConfig>

// Default SPS Mapping
export const DEFAULT_SPS_MAPPING: SpsMapping = {
  SPS1: { host: '192.168.178.234', port: 1001 },
  SPS2: { host: '192.168.178.234', port: 1002 },
  SPS3: { host: '192.168.178.235', port: 1003 },
}

// ----------------------------------------------------------------------------
// Zeitautomatik (Time Automation) Types
// ----------------------------------------------------------------------------

export interface ZeitautomatikPoint {
  id?: number
  zeitpunkt: number
  aktion: string
  action: string
  hour: number
  minute: number
  weekdayMask: number
}

export interface ZeitautomatikConfig {
  motor: string
  data: ZeitautomatikPoint[]
}

// ----------------------------------------------------------------------------
// Motor Times Configuration Types
// ----------------------------------------------------------------------------

export interface MotorTimesConfig {
  laufzeitHoch: number
  laufzeitRunter: number
  antipzeitHoch: number
  antipzeitRunter: number
  wendezeit: number
}

// ----------------------------------------------------------------------------
// Configuration Files Types
// ----------------------------------------------------------------------------

export interface MotorConfigFile {
  motors: Motor[]
}

// API Response Types for config endpoints
export interface MotorConfigResponse {
  motors: Array<{
    id: number
    displayName: string
    technicalName: string
    sps: string
    type?: 'jalousie' | 'rollladen'
  }>
}

export interface RoomConfigResponse {
  rooms: Record<string, { icon: string }>
  order: string[]
}

export interface GroupConfigResponse {
  groups: Record<string, string[]>
  order: string[]
}

// ----------------------------------------------------------------------------
// Component Props Types
// ----------------------------------------------------------------------------

export interface MotorListProps {
  motors: Motor[]
  roomIcons: Record<string, string>
  roomOrder: string[]
  onUpdateRoomOrder: (order: string[]) => void
  selectedMotor: Motor | null
  onSelectMotor: (motor: Motor) => void
  onAction: (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
  isLoading: boolean
  errorMessage: string | null
  moveMode: boolean
}

export interface RoomsProps {
  motors: Motor[]
  groups: Record<string, string[]>
  groupOrder: string[]
  roomIcons: Record<string, string>
  onUpdateGroupOrder: (order: string[]) => void
  selectedMotor: Motor | null
  onSelectMotor: (motor: Motor) => void
  onAction: (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
  onGroupAction: (motors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
  isLoading: boolean
  errorMessage: string | null
  moveMode: boolean
}

export interface Group {
  name: string
  windows: string[]
  motors: Motor[]
}

export interface SettingsProps {
  motors: Motor[]
  roomIcons: Record<string, string>
  groups: Record<string, string[]>
  onUpdateName: (motorName: string, newDisplayName: string) => Promise<boolean>
  onUpdateRoomIcon: (roomName: string, icon: string) => Promise<boolean>
  onUpdateGroups: (groups: Record<string, string[]>, order: string[]) => Promise<boolean>
  onUpdateGroup: (groupName: string, windows: string[]) => Promise<boolean>
  onDeleteGroup: (groupName: string) => Promise<boolean>
  onBack: () => void
}

export interface NavigationProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  moveMode: boolean
  onToggleMoveMode: () => void
  groupMoveMode: boolean
  onToggleGroupMoveMode: () => void
}
