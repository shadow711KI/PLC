import { memo } from 'react'
import { Motor } from '../../types'
import './MotorTimesView.css'

interface MotorTimesViewProps {
  motorTimesMotor: Motor | null
  motorTimes: {
    laufzeitHoch: number
    laufzeitRunter: number
    antipzeitHoch: number
    antipzeitRunter: number
    wendezeit: number
  }
  loadingMotorTimes: boolean
  savingMotorTimes: boolean
  onBack: () => void
  onSave: () => void
  onMotorTimesChange: (key: 'laufzeitHoch' | 'laufzeitRunter' | 'antipzeitHoch' | 'antipzeitRunter' | 'wendezeit', value: string) => void
}

function MotorTimesView({
  motorTimesMotor,
  motorTimes,
  loadingMotorTimes,
  savingMotorTimes,
  onBack,
  onSave,
  onMotorTimesChange
}: MotorTimesViewProps) {
  return (
    <div className="settings-screen">
      <div className="header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>Zeiten - {motorTimesMotor?.displayName}</h1>
      </div>

      {loadingMotorTimes ? (
        <div className="motor-times-view__loading">Lade Werte...</div>
      ) : (
        <div className="motor-times-view__container">
          <div className="motor-times-view__info-box">
            ℹ️ Alle Werte in 1/10 Sekunden (0,1s Schritte)
          </div>
          <div className="motor-times-view__fields">
            <label className="motor-times-view__field">
              <span className="motor-times-view__field-label">Laufzeit nach oben</span>
              <input type="number" min={0} max={65535} value={motorTimes.laufzeitHoch} onChange={e => onMotorTimesChange('laufzeitHoch', e.target.value)} className="motor-times-view__field-input" />
              <span className="motor-times-view__field-hint">Zeit zum Fahren nach oben</span>
            </label>
            <label className="motor-times-view__field">
              <span className="motor-times-view__field-label">Laufzeit nach unten</span>
              <input type="number" min={0} max={65535} value={motorTimes.laufzeitRunter} onChange={e => onMotorTimesChange('laufzeitRunter', e.target.value)} className="motor-times-view__field-input" />
              <span className="motor-times-view__field-hint">Zeit zum Fahren nach unten</span>
            </label>
            <label className="motor-times-view__field">
              <span className="motor-times-view__field-label">Wendezeit</span>
              <input type="number" min={0} max={65535} value={motorTimes.wendezeit} onChange={e => onMotorTimesChange('wendezeit', e.target.value)} className="motor-times-view__field-input" />
              <span className="motor-times-view__field-hint">Zeit zum Umschalten der Richtung</span>
            </label>
            <label className="motor-times-view__field">
              <span className="motor-times-view__field-label">Antippzeit nach oben</span>
              <input type="number" min={0} max={65535} value={motorTimes.antipzeitHoch} onChange={e => onMotorTimesChange('antipzeitHoch', e.target.value)} className="motor-times-view__field-input" />
              <span className="motor-times-view__field-hint">Kurzzeitimpuls nach oben</span>
            </label>
            <label className="motor-times-view__field">
              <span className="motor-times-view__field-label">Antippzeit nach unten</span>
              <input type="number" min={0} max={65535} value={motorTimes.antipzeitRunter} onChange={e => onMotorTimesChange('antipzeitRunter', e.target.value)} className="motor-times-view__field-input" />
              <span className="motor-times-view__field-hint">Kurzzeitimpuls nach unten</span>
            </label>
          </div>
          <div className="motor-times-view__buttons">
            <button className="save-btn" type="button" onClick={onSave} disabled={savingMotorTimes}>{savingMotorTimes ? 'Speichern...' : 'Speichern'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(MotorTimesView)
