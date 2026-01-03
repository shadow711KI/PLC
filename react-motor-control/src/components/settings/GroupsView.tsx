import { memo } from 'react'
import { Motor } from '../../types'
import './GroupsView.css'

interface GroupsViewProps {
  motors: Motor[]
  groups: Record<string, string[]>
  newGroupName: string
  setNewGroupName: (name: string) => void
  selectedWindows: string[]
  setSelectedWindows: (windows: string[]) => void
  editingGroup: string | null
  onBack: () => void
  onCreateGroup: () => void
  onUpdateGroup: () => void
  onDeleteGroup: (groupName: string) => void
  onStartEditingGroup: (groupName: string) => void
  onCancelGroupEdit: () => void
}

function GroupsView({
  motors,
  groups,
  newGroupName,
  setNewGroupName,
  selectedWindows,
  setSelectedWindows,
  editingGroup,
  onBack,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onStartEditingGroup,
  onCancelGroupEdit
}: GroupsViewProps) {
  return (
    <div className="settings-screen">
      <div className="groups-view__header">
        <button className="groups-view__back-button" onClick={onBack} aria-label="Zurück">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 7L11 14L18 21" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="groups-view__title">Gruppen</h1>
      </div>

      <div className="groups-view__section">
        <div className="group-section-title">Neue Gruppe erstellen</div>
        <div className="group-section-divider" />
        <input
          type="text"
          placeholder="Gruppenname"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          className="groups-view__input"
        />
        <div className="groups-view__windows-container">
          <span className="groups-view__windows-label">Fenster:</span>
          <div className="window-checkbox-grid">
            {motors.map(motor => (
              <label key={motor.id} className="window-checkbox-label window-checkbox-label--grid">
                <input
                  type="checkbox"
                  className="window-checkbox-input"
                  checked={selectedWindows.includes(motor.displayName)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedWindows([...selectedWindows, motor.displayName])
                    } else {
                      setSelectedWindows(selectedWindows.filter(name => name !== motor.displayName))
                    }
                  }}
                />
                {motor.displayName}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={onCreateGroup}
          disabled={!newGroupName.trim() || selectedWindows.length === 0}
          className={`groups-view__create-button ${(!newGroupName.trim() || selectedWindows.length === 0) ? 'groups-view__create-button--disabled' : ''}`}
        >
          Gruppe erstellen
        </button>
      </div>

      <div className="groups-view__section">
        <div className="group-section-title">Bestehende Gruppen</div>
        <div className="group-section-divider" />
        {Object.keys(groups).length === 0 ? (
          <div className="groups-view__no-groups">Keine Gruppen vorhanden</div>
        ) : (
          Object.entries(groups).map(([groupName, windows]) => (
            <div key={groupName} className="groups-view__group-item">
              {editingGroup === groupName ? (
                <>
                  <div className="group-name-label groups-view__group-edit-label">Gruppe bearbeiten: {groupName}</div>
                  <div className="groups-view__windows-container">
                    <span className="groups-view__windows-label">Fenster:</span>
                    <div className="window-checkbox-grid">
                      {motors.map(motor => (
                        <label key={motor.id} className="window-checkbox-label window-checkbox-label--grid">
                          <input
                            type="checkbox"
                            className="window-checkbox-input"
                            checked={selectedWindows.includes(motor.displayName)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedWindows([...selectedWindows, motor.displayName])
                              } else {
                                setSelectedWindows(selectedWindows.filter(name => name !== motor.displayName))
                              }
                            }}
                          />
                          {motor.displayName}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="groups-view__button-row">
                    <button onClick={onUpdateGroup} disabled={selectedWindows.length === 0} className={`groups-view__save-button ${selectedWindows.length === 0 ? 'groups-view__save-button--disabled' : ''}`}>Speichern</button>
                    <button onClick={onCancelGroupEdit} className="groups-view__cancel-button">Abbrechen</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="groups-view__group-header">
                    <div className="groups-view__group-name">{groupName}</div>
                  </div>
                  <div className="group-window-grid">
                    {windows.map(windowName => (
                      <span key={windowName} className="group-window-label">{windowName}</span>
                    ))}
                  </div>
                  <div className="groups-view__button-row">
                    <button className="group-action-btn group-action-btn--edit" onClick={() => onStartEditingGroup(groupName)}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{marginRight:4,verticalAlign:'middle'}} xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17.25V14.75C3 14.1977 3.44772 13.75 4 13.75H16C16.5523 13.75 17 14.1977 17 14.75V17.25C17 17.8023 16.5523 18.25 16 18.25H4C3.44772 18.25 3 17.8023 3 17.25Z" fill="#1976ff"/>
                        <path d="M14.5 3.5C14.7761 3.22386 15.2239 3.22386 15.5 3.5L16.5 4.5C16.7761 4.77614 16.7761 5.22386 16.5 5.5L8 14H6V12L14.5 3.5Z" fill="#fff"/>
                      </svg>
                      Bearbeiten
                    </button>
                    <button className="group-action-btn group-action-btn--delete" onClick={() => onDeleteGroup(groupName)}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{marginRight:4,verticalAlign:'middle'}} xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="8" width="2" height="6" rx="1" fill="#fff"/>
                        <rect x="9" y="8" width="2" height="6" rx="1" fill="#fff"/>
                        <rect x="13" y="8" width="2" height="6" rx="1" fill="#fff"/>
                        <path d="M3 6H17" stroke="#1976ff" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="6" y="4" width="8" height="2" rx="1" fill="#1976ff"/>
                      </svg>
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default memo(GroupsView)
