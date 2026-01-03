import { memo } from 'react'
import './AutomatikView.css'

interface AutomatikViewProps {
  selectedSPS: string
  spsAutomatikStatus: Record<string, {
    zeitautomatikB10: number
    beschattung: boolean
    daemmerung: boolean
    zeitautomatikB16: boolean
  }>
  loadingSpsStatus: boolean
  onBack: () => void
  onToggleSPSAutomatik: (spsName: string, type: string, value: number | boolean) => void
}

function AutomatikView({
  selectedSPS,
  spsAutomatikStatus,
  loadingSpsStatus,
  onBack,
  onToggleSPSAutomatik
}: AutomatikViewProps) {
  const spsStatus = spsAutomatikStatus[selectedSPS] || {
    zeitautomatikB10: 0,
    beschattung: false,
    daemmerung: false,
    zeitautomatikB16: false
  };

  return (
    <div className="settings-screen">
      <div className="header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>Automatiken - {selectedSPS}</h1>
      </div>

      {loadingSpsStatus && (
        <div className="automatik-view__loading-bar">
          ⏳ Lese SPS-Daten...
          <div className="automatik-view__loading-bar-track">
            <div className="automatik-view__loading-bar-progress" />
          </div>
        </div>
      )}

      <div className="automatik-view__section">
        {/* Zeitautomatik B10 (einzelner Motor) */}
        <div className="automatik-view__item">
          <div className="automatik-view__item-header">
            <span className="automatik-view__item-icon">⏰</span>
            <h3 className="automatik-view__item-title">Zeitautomatik B10<br />(alle Motoren)</h3>
          </div>
          <div className="automatik-view__controls">
            {/* Toggle Switch AUS/AN */}
            <div className="automatik-view__toggle-container">
              <span className={`automatik-view__toggle-label ${spsStatus.zeitautomatikB10 === 0 ? 'automatik-view__toggle-label--active' : ''}`}>AUS</span>
              <div
                onClick={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', spsStatus.zeitautomatikB10 === 1 ? 0 : 1); }}
                onTouchEnd={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', spsStatus.zeitautomatikB10 === 1 ? 0 : 1); }}
                className={`automatik-view__toggle-track ${spsStatus.zeitautomatikB10 === 1 ? 'automatik-view__toggle-track--on' : 'automatik-view__toggle-track--off'}`}
              >
                <div className={`automatik-view__toggle-knob ${spsStatus.zeitautomatikB10 === 1 ? 'automatik-view__toggle-knob--on' : 'automatik-view__toggle-knob--off'}`}></div>
              </div>
              <span className={`automatik-view__toggle-label ${spsStatus.zeitautomatikB10 === 1 ? 'automatik-view__toggle-label--active' : ''}`}>AN</span>
            </div>

            {/* Zufallsautomatik Button */}
            <button
              onClick={() => onToggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', 2)}
              className={`automatik-view__random-button ${spsStatus.zeitautomatikB10 === 2 ? 'automatik-view__random-button--active' : ''}`}
            >
              🎲 Zufall
            </button>
          </div>
        </div>

        {/* Beschattungsautomatik */}
        <div className="automatik-view__item">
          <div className="automatik-view__item-header">
            <span className="automatik-view__item-icon">☀️</span>
            <h3 className="automatik-view__item-title">Beschattungsautomatik</h3>
          </div>
          <div className="automatik-view__controls automatik-view__controls--simple">
            <span className={`automatik-view__toggle-label ${!spsStatus.beschattung ? 'automatik-view__toggle-label--active' : ''}`}>AUS</span>
            <div
              onClick={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'beschattung', !spsStatus.beschattung); }}
              onTouchEnd={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'beschattung', !spsStatus.beschattung); }}
              className={`automatik-view__toggle-track ${spsStatus.beschattung ? 'automatik-view__toggle-track--on' : 'automatik-view__toggle-track--off'}`}
            >
              <div className={`automatik-view__toggle-knob ${spsStatus.beschattung ? 'automatik-view__toggle-knob--on' : 'automatik-view__toggle-knob--off'}`}></div>
            </div>
            <span className={`automatik-view__toggle-label ${spsStatus.beschattung ? 'automatik-view__toggle-label--active' : ''}`}>AN</span>
          </div>
        </div>

        {/* Dämmerungsautomatik */}
        <div className="automatik-view__item">
          <div className="automatik-view__item-header">
            <span className="automatik-view__item-icon">🌙</span>
            <h3 className="automatik-view__item-title">Dämmerungsautomatik</h3>
          </div>
          <div className="automatik-view__controls automatik-view__controls--simple">
            <span className={`automatik-view__toggle-label ${!spsStatus.daemmerung ? 'automatik-view__toggle-label--active' : ''}`}>AUS</span>
            <div
              onClick={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'daemmerung', !spsStatus.daemmerung); }}
              onTouchEnd={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'daemmerung', !spsStatus.daemmerung); }}
              className={`automatik-view__toggle-track ${spsStatus.daemmerung ? 'automatik-view__toggle-track--on' : 'automatik-view__toggle-track--off'}`}
            >
              <div className={`automatik-view__toggle-knob ${spsStatus.daemmerung ? 'automatik-view__toggle-knob--on' : 'automatik-view__toggle-knob--off'}`}></div>
            </div>
            <span className={`automatik-view__toggle-label ${spsStatus.daemmerung ? 'automatik-view__toggle-label--active' : ''}`}>AN</span>
          </div>
        </div>

        {/* Zeitautomatik B1-B6 (alle Motoren) */}
        <div className="automatik-view__item automatik-view__item--alt">
          <div className="automatik-view__item-header">
            <span className="automatik-view__item-icon">🏠</span>
            <h3 className="automatik-view__item-title">Zeitautomatik<br />(einzelner Motor)</h3>
          </div>
          <div className="automatik-view__controls automatik-view__controls--simple">
            <span className={`automatik-view__toggle-label ${!spsStatus.zeitautomatikB16 ? 'automatik-view__toggle-label--active' : ''}`}>AUS</span>
            <div
              onClick={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'zeitautomatikB16', !spsStatus.zeitautomatikB16); }}
              onTouchEnd={(e) => { e.preventDefault(); onToggleSPSAutomatik(selectedSPS, 'zeitautomatikB16', !spsStatus.zeitautomatikB16); }}
              className={`automatik-view__toggle-track ${spsStatus.zeitautomatikB16 ? 'automatik-view__toggle-track--on' : 'automatik-view__toggle-track--off'}`}
            >
              <div className={`automatik-view__toggle-knob ${spsStatus.zeitautomatikB16 ? 'automatik-view__toggle-knob--on' : 'automatik-view__toggle-knob--off'}`}></div>
            </div>
            <span className={`automatik-view__toggle-label ${spsStatus.zeitautomatikB16 ? 'automatik-view__toggle-label--active' : ''}`}>AN</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(AutomatikView)
