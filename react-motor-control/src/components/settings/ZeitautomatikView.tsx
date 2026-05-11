import { memo } from 'react'
import { Motor } from '../../types'
import './ZeitautomatikView.css'

interface ZeitautomatikViewProps {
  timeAutoMotor: Motor | null
  timeAutoPoints: any[]
  loadingTimeAuto: boolean
  onBack: () => void
  onSave: () => void
  onWeekdayChange: (idx: number, dayIndex: number, checked: boolean) => void
  onTimeChange: (idx: number, field: 'hour' | 'minute', value: string) => void
  onActionChange: (idx: number, action: string) => void
  clampTimeValue: (field: 'hour' | 'minute', value: number) => number
  formatTimeValue: (field: 'hour' | 'minute', value: number | undefined | null) => string
}

function ZeitautomatikView({
  timeAutoMotor,
  timeAutoPoints,
  loadingTimeAuto,
  onBack,
  onSave,
  onWeekdayChange,
  onTimeChange,
  onActionChange,
  formatTimeValue
}: ZeitautomatikViewProps) {
  return (
    <div className="settings-screen">
      <div className="header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>Zeitautomatik - {timeAutoMotor?.displayName}</h1>
      </div>

      {loadingTimeAuto ? (
        <div className="zeitautomatik-view__loading">Lade Zeitpunkte...</div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); onSave(); }} className="zeitautomatik-view__form">
          <div className="zeitautomatik-view__grid">
            {timeAutoPoints.map((p, idx) => (
              <div key={p.id} className="zeitautomatik-view__card">
                {/* Kachel-Header */}
                <div className="zeitautomatik-view__card-header">
                  Zeitpunkt {idx + 1}
                </div>

                {/* Wochentage */}
                <div className="zeitautomatik-view__weekdays-section">
                  <span className="zeitautomatik-view__weekdays-label">Wochentage</span>
                  <div className="zeitautomatik-view__weekdays-grid">
                    {[...Array(7)].map((_, d) => {
                      const checked = !!(p.weekdayMask & (1 << d));
                      const isDisabled = checked && Array(7).fill(0).reduce((acc, _, i) => acc + ((p.weekdayMask & (1 << i)) ? 1 : 0), 0) === 1;
                      return (
                        <label
                          key={d}
                          className={`zeitautomatik-view__weekday-checkbox ${checked ? 'zeitautomatik-view__weekday-checkbox--active' : ''} ${isDisabled ? 'zeitautomatik-view__weekday-checkbox--disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => onWeekdayChange(idx, d, e.target.checked)}
                            disabled={isDisabled}
                            className={`zeitautomatik-view__weekday-checkbox-input ${isDisabled ? 'zeitautomatik-view__weekday-checkbox-input--disabled' : ''}`}
                          />
                          <span className="zeitautomatik-view__weekday-checkbox-icon">
                            <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
                              <polyline points="3,8 6,11 11,4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Uhrzeit & Aktion nebeneinander */}
                <div className="zeitautomatik-view__time-action-row">
                  {/* Uhrzeit */}
                  <div className="zeitautomatik-view__time-section">
                    <span className="zeitautomatik-view__section-label">Uhrzeit</span>
                    <div className="zeitautomatik-view__time-inputs">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={formatTimeValue('hour', p.hour)}
                        onChange={e => onTimeChange(idx, 'hour', e.target.value)}
                        className="zeitautomatik-view__time-input"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      <span className="zeitautomatik-view__time-separator">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={formatTimeValue('minute', p.minute)}
                        onChange={e => onTimeChange(idx, 'minute', e.target.value)}
                        className="zeitautomatik-view__time-input"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>
                    <div className="zeitautomatik-view__time-labels">
                      <span>HH24</span>
                      <span></span>
                      <span>MI</span>
                    </div>
                  </div>

                  {/* Aktion */}
                  <div className="zeitautomatik-view__action-section">
                    <span className="zeitautomatik-view__section-label">Aktion</span>
                    <select
                      value={p.action}
                      onChange={e => onActionChange(idx, e.target.value)}
                      className="zeitautomatik-view__action-select"
                    >
                      <option value="hoch">⬆️ Fahre hoch</option>
                      <option value="runter">⬇️ Fahre runter</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="zeitautomatik-view__buttons">
            <button type="submit" className="zeitautomatik-view__save-button">Speichern</button>
            <button type="button" className="zeitautomatik-view__cancel-button" onClick={onBack}>Abbrechen</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default memo(ZeitautomatikView)
