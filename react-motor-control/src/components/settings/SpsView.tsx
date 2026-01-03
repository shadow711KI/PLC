import { memo } from 'react'
import { Motor } from '../../types'
import { spsInfo, motorNumberMapping } from './settingsUtils'
import './SpsView.css'

interface SpsViewProps {
  motorsBySPS: Record<string, Motor[]>
  roomIcons: Record<string, string>
  editingMotorId: number | null
  editingName: string
  setEditingName: (name: string) => void
  editingIconMotorId: number | null
  editingIcon: string
  setEditingIcon: (icon: string) => void
  automatikEnabled: Record<string, boolean>
  loadingSpsStatus: boolean
  syncingTime: boolean
  onBack: () => void
  onSyncTime: () => void
  onOpenAutomatiken: (spsName: string) => void
  onStartEditing: (motor: Motor) => void
  onSaveEdit: (motor: Motor) => void
  onKeyDown: (e: React.KeyboardEvent, motor: Motor) => void
  onStartEditingIcon: (motorId: number, roomName: string) => void
  onSaveIcon: (roomName: string) => void
  onIconKeyDown: (e: React.KeyboardEvent, roomName: string) => void
  onToggleAutomatik: (motor: Motor, enabled: boolean) => void
  onOpenTimeAutoDialog: (motor: Motor) => void
  onOpenMotorSettingsPanel: (motor: Motor) => void
  getDefaultIcon: (roomName: string) => string
}

function SpsView({
  motorsBySPS,
  roomIcons,
  editingMotorId,
  editingName,
  setEditingName,
  editingIconMotorId,
  editingIcon,
  setEditingIcon,
  automatikEnabled,
  loadingSpsStatus,
  syncingTime,
  onBack,
  onSyncTime,
  onOpenAutomatiken,
  onStartEditing,
  onSaveEdit,
  onKeyDown,
  onStartEditingIcon,
  onSaveIcon,
  onIconKeyDown,
  onToggleAutomatik,
  onOpenTimeAutoDialog,
  onOpenMotorSettingsPanel,
  getDefaultIcon
}: SpsViewProps) {
  return (
    <div className="settings__screen">
      <div className="settings__header">
        <div className="sps-view__header-container">
          <button className="sps-view__back-button" onClick={onBack} aria-label="Zurück">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L10 14L18 22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="sps-view__title">SPS Stationen</h1>
          <button
            onClick={onSyncTime}
            disabled={syncingTime}
            title="Zeit synchronisieren"
            className={`sps-view__sync-button ${syncingTime ? 'sps-view__sync-button--syncing' : ''}`}>
            {syncingTime ? '⏳' : '🕐'}
          </button>
        </div>
      </div>
      {loadingSpsStatus && (
        <div className="sps-view__loading-bar">
          ⏳ Lese SPS-Daten...
          <div className="sps-view__loading-bar-track">
            <div className="sps-view__loading-bar-progress" />
          </div>
        </div>
      )}

      <div className="sps-list">
        {Object.entries(spsInfo).map(([spsName, info]) => (
          <div key={spsName} className="sps-section">
            <div className="sps-header">
              <h2>{spsName}</h2>
              <div className="sps-info">
                {info.host}:{info.port}
                <span className="motor-count">{motorsBySPS[spsName]?.length || 0} Motoren</span>
                <button
                  className="sps-view__automatiken-button"
                  onClick={() => onOpenAutomatiken(spsName)}
                >
                  ⚙️ Automatiken
                </button>
              </div>
            </div>
            <div className="motor-edit-list">
              {motorsBySPS[spsName]?.map((motor) => {
                const roomName = motor.displayName;
                const currentIcon = roomIcons[roomName] || getDefaultIcon(roomName);
                // Versuche zuerst technicalName, dann name
                const motorNr = motorNumberMapping[spsName]?.[motor.technicalName] || '?';
                // Use technicalName if present, else fallback to name
                const automatikKey = motor.technicalName || motor.name;
                const automVal = automatikEnabled[automatikKey];
                // Debug log für Automatik-Status
                console.log('[DEBUG] Render Toggle:', {
                  spsName,
                  motor: automatikKey,
                  automatikEnabled: automVal,
                  automatikEnabledState: automatikEnabled,
                });
                return (
                  <div key={motor.id} className="motor-edit-item">
                    <div className="motor-edit-info">
                      <div className="motor-tech-name">{motor.name} ({motorNr})</div>
                      <div className="motor-name-row">
                        {editingIconMotorId === motor.id ? (
                          <input
                            type="text"
                            className="motor-icon-edit"
                            value={editingIcon}
                            onChange={(e) => setEditingIcon(e.target.value)}
                            onBlur={() => onSaveIcon(roomName)}
                            onKeyDown={(e) => onIconKeyDown(e, roomName)}
                            placeholder="Icon"
                            autoFocus
                          />
                        ) : (
                          <div className="motor-icon" onClick={() => onStartEditingIcon(motor.id, roomName)}>
                            {currentIcon}
                          </div>
                        )}
                        {editingMotorId === motor.id ? (
                          <input
                            type="text"
                            className="motor-name-edit"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => onSaveEdit(motor)}
                            onKeyDown={(e) => onKeyDown(e, motor)}
                            autoFocus
                          />
                        ) : (
                          <div className="motor-display-name" onClick={() => onStartEditing(motor)}>
                            {motor.displayName}
                            <span className="edit-icon">✏️</span>
                          </div>
                        )}
                        {/* Automatik An/Aus Toggle Switch */}
                        <div className="sps-view__automatik-controls">
                          <span className={
                            automVal === true
                              ? 'sps-view__automatik-label sps-view__automatik-label--enabled'
                              : automVal === false
                                ? 'sps-view__automatik-label sps-view__automatik-label--disabled'
                                : 'sps-view__automatik-label sps-view__automatik-label--unknown'
                          }>A</span>
                          <div
                            onClick={() => automVal !== null && onToggleAutomatik(motor, !automVal)}
                            onTouchEnd={(e) => { e.preventDefault(); automVal !== null && onToggleAutomatik(motor, !automVal); }}
                            title={automVal === true ? 'Automatik ausschalten' : automVal === false ? 'Automatik einschalten' : 'Status unbekannt'}
                            className={
                              automVal === true
                                ? 'sps-view__toggle-track sps-view__toggle-track--enabled'
                                : automVal === false
                                  ? 'sps-view__toggle-track sps-view__toggle-track--disabled'
                                  : 'sps-view__toggle-track sps-view__toggle-track--unknown'
                            }
                          >
                            <div className={
                              automVal === true
                                ? 'sps-view__toggle-knob sps-view__toggle-knob--enabled'
                                : automVal === false
                                  ? 'sps-view__toggle-knob sps-view__toggle-knob--disabled'
                                  : 'sps-view__toggle-knob sps-view__toggle-knob--unknown'
                            }></div>
                          </div>
                        </div>
                        <div className="motor-timeauto-wrap">
                          <button
                            className={`motor-settings-btn motor-timeauto-icon sps-view__timeauto-button ${automatikEnabled[automatikKey] ? '' : 'sps-view__timeauto-button--disabled'}`}
                            title={automatikEnabled[automatikKey] ? 'Zeitautomatik einstellen' : 'Automatik ist ausgeschaltet'}
                            onClick={() => automatikEnabled[automatikKey] && onOpenTimeAutoDialog(motor)}
                            aria-label="Zeitautomatik"
                          >
                            <span className="sps-view__timeauto-icon">⏰</span>
                          </button>
                          <button
                            className="motor-settings-btn motor-settings-over"
                            title="Einstellungen"
                            onClick={() => onOpenMotorSettingsPanel(motor)}
                            aria-label="Erweitert"
                          >
                            ⚙️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(SpsView)
