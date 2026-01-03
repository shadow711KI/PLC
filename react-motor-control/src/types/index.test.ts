import { describe, it, expect } from 'vitest'
import {
  Motor,
  Screen,
  Room,
  RoomConfig,
  GroupConfig,
  MotorCommand,
  MotorStatusQuery,
  MotorStatusResponse,
  SpsConfig,
  SpsMapping,
  DEFAULT_SPS_MAPPING,
  ZeitautomatikPoint,
  ZeitautomatikConfig,
  MotorTimesConfig,
  MotorConfigFile,
  Group,
} from './index'

describe('Type Definitions', () => {
  describe('Motor Type', () => {
    it('should accept valid motor object', () => {
      const motor: Motor = {
        id: 1,
        name: 'wohnen_ost',
        technicalName: 'wohnen_ost',
        displayName: 'Wohnen Ost',
        sps: 'SPS1',
        status: '0',
        type: 'jalousie',
      }

      expect(motor.id).toBe(1)
      expect(motor.name).toBe('wohnen_ost')
      expect(motor.type).toBe('jalousie')
    })

    it('should accept motor without optional type', () => {
      const motor: Motor = {
        id: 2,
        name: 'arbeiten',
        technicalName: 'arbeiten',
        displayName: 'Arbeiten',
        sps: 'SPS2',
        status: '1',
      }

      expect(motor.type).toBeUndefined()
    })
  })

  describe('Screen Type', () => {
    it('should accept valid screen values', () => {
      const screens: Screen[] = ['main', 'settings', 'rooms']

      screens.forEach(screen => {
        expect(['main', 'settings', 'rooms']).toContain(screen)
      })
    })
  })

  describe('Room Type', () => {
    it('should accept valid room object', () => {
      const room: Room = {
        name: 'Wohnzimmer',
        motors: [],
        icon: '🛋️',
      }

      expect(room.name).toBe('Wohnzimmer')
      expect(room.icon).toBe('🛋️')
      expect(Array.isArray(room.motors)).toBe(true)
    })
  })

  describe('RoomConfig Type', () => {
    it('should accept valid room config object', () => {
      const config: RoomConfig = {
        icons: {
          'Wohnzimmer': '🛋️',
          'Schlafzimmer': '🛏️',
        },
        order: ['Wohnzimmer', 'Schlafzimmer'],
      }

      expect(config.icons['Wohnzimmer']).toBe('🛋️')
      expect(config.order).toHaveLength(2)
    })
  })

  describe('GroupConfig Type', () => {
    it('should accept valid group config object', () => {
      const config: GroupConfig = {
        groups: {
          'Alle': ['wohnen_ost', 'wohnen_sued_links'],
        },
        order: ['Alle'],
      }

      expect(config.groups['Alle']).toContain('wohnen_ost')
      expect(config.order[0]).toBe('Alle')
    })
  })

  describe('MotorCommand Type', () => {
    it('should accept valid motor command', () => {
      const command: MotorCommand = {
        motor: 'wohnen_ost',
        action: 'hoch',
        sps: 'SPS1',
        port: 1001,
      }

      expect(command.action).toBe('hoch')
      expect(command.port).toBe(1001)
    })

    it('should accept all action types', () => {
      const actions: MotorCommand['action'][] = [
        'hoch',
        'runter',
        'stop',
        'lamellen_oeffnen',
        'lamellen_schliessen',
      ]

      actions.forEach(action => {
        const command: MotorCommand = {
          motor: 'test',
          action,
          sps: 'SPS1',
          port: 1001,
        }
        expect(command.action).toBe(action)
      })
    })
  })

  describe('MotorStatusQuery Type', () => {
    it('should accept valid status query', () => {
      const query: MotorStatusQuery = {
        motorId: 1,
        host: '192.168.178.234',
        port: 1001,
      }

      expect(query.motorId).toBe(1)
      expect(query.host).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
    })
  })

  describe('MotorStatusResponse Type', () => {
    it('should accept valid status response', () => {
      const response: MotorStatusResponse = {
        status: '0',
        dataSize: 36,
        raw: '00000000000000000000000000000000',
      }

      expect(response.status).toBe('0')
      expect(response.dataSize).toBe(36)
    })
  })

  describe('SpsConfig Type', () => {
    it('should accept valid SPS config', () => {
      const config: SpsConfig = {
        host: '192.168.178.234',
        port: 1001,
      }

      expect(config.host).toBe('192.168.178.234')
      expect(config.port).toBeGreaterThan(1000)
    })
  })

  describe('SpsMapping Type', () => {
    it('should accept valid SPS mapping', () => {
      const mapping: SpsMapping = {
        SPS1: { host: '192.168.178.234', port: 1001 },
        SPS2: { host: '192.168.178.234', port: 1002 },
      }

      expect(mapping.SPS1.port).toBe(1001)
      expect(mapping.SPS2.port).toBe(1002)
    })
  })

  describe('DEFAULT_SPS_MAPPING Constant', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SPS_MAPPING.SPS1).toEqual({
        host: '192.168.178.234',
        port: 1001,
      })
      expect(DEFAULT_SPS_MAPPING.SPS2).toEqual({
        host: '192.168.178.234',
        port: 1002,
      })
      expect(DEFAULT_SPS_MAPPING.SPS3).toEqual({
        host: '192.168.178.235',
        port: 1003,
      })
    })

    it('should have three SPS entries', () => {
      const keys = Object.keys(DEFAULT_SPS_MAPPING)
      expect(keys).toHaveLength(3)
      expect(keys).toContain('SPS1')
      expect(keys).toContain('SPS2')
      expect(keys).toContain('SPS3')
    })
  })

  describe('ZeitautomatikPoint Type', () => {
    it('should accept valid time automation point', () => {
      const point: ZeitautomatikPoint = {
        id: 1,
        zeitpunkt: 480,
        aktion: '1',
        action: 'hoch',
        hour: 8,
        minute: 0,
        weekdayMask: 127,
      }

      expect(point.hour).toBe(8)
      expect(point.minute).toBe(0)
      expect(point.weekdayMask).toBe(127)
    })

    it('should accept point without optional id', () => {
      const point: ZeitautomatikPoint = {
        zeitpunkt: 1080,
        aktion: '2',
        action: 'runter',
        hour: 18,
        minute: 0,
        weekdayMask: 31,
      }

      expect(point.id).toBeUndefined()
      expect(point.hour).toBe(18)
    })
  })

  describe('ZeitautomatikConfig Type', () => {
    it('should accept valid time automation config', () => {
      const config: ZeitautomatikConfig = {
        motor: 'wohnen_ost',
        data: [
          {
            zeitpunkt: 480,
            aktion: '1',
            action: 'hoch',
            hour: 8,
            minute: 0,
            weekdayMask: 127,
          },
        ],
      }

      expect(config.motor).toBe('wohnen_ost')
      expect(config.data).toHaveLength(1)
      expect(Array.isArray(config.data)).toBe(true)
    })
  })

  describe('MotorTimesConfig Type', () => {
    it('should accept valid motor times config', () => {
      const config: MotorTimesConfig = {
        laufzeitHoch: 60,
        laufzeitRunter: 65,
        antipzeitHoch: 1,
        antipzeitRunter: 1,
        wendezeit: 2,
      }

      expect(config.laufzeitHoch).toBe(60)
      expect(config.laufzeitRunter).toBe(65)
      expect(config.wendezeit).toBe(2)
    })

    it('should accept all numeric values', () => {
      const config: MotorTimesConfig = {
        laufzeitHoch: 0,
        laufzeitRunter: 0,
        antipzeitHoch: 0,
        antipzeitRunter: 0,
        wendezeit: 0,
      }

      Object.values(config).forEach(value => {
        expect(typeof value).toBe('number')
      })
    })
  })

  describe('MotorConfigFile Type', () => {
    it('should accept valid motor config file', () => {
      const configFile: MotorConfigFile = {
        motors: [
          {
            id: 1,
            name: 'wohnen_ost',
            technicalName: 'wohnen_ost',
            displayName: 'Wohnen Ost',
            sps: 'SPS1',
            status: '0',
          },
        ],
      }

      expect(configFile.motors).toHaveLength(1)
      expect(configFile.motors[0].id).toBe(1)
    })
  })

  describe('Group Type', () => {
    it('should accept valid group object', () => {
      const group: Group = {
        name: 'Alle',
        windows: ['wohnen_ost', 'wohnen_sued_links'],
        motors: [],
      }

      expect(group.name).toBe('Alle')
      expect(group.windows).toHaveLength(2)
      expect(Array.isArray(group.motors)).toBe(true)
    })
  })
})
