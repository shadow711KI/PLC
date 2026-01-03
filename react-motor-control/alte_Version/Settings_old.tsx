import React, { useState } from 'react'
import { ZeitautomatikDialog } from './ZeitautomatikDialog'
import { MotorTimesDialog } from './MotorTimesDialog'
import { AutomatikToggle } from './AutomatikToggle'
import './Settings.css'

interface Motor {
  id: number;
  name: string;
  technicalName: string;
  displayName: string;
  sps: string;
  status?: string;
}

interface SettingsProps {
  motors: Motor[];
}

export default function Settings({ motors }: SettingsProps) {
  const [view, setView] = useState<'main' | 'sps' | 'groups' | 'automatiken' | 'zeitautomatik' | 'motorzeiten'>('main')

  // Automatik An/Aus State (per Motor)
  // Use technicalName as key for automatikEnabled
  const [automatikEnabled, setAutomatikEnabled] = useState<Record<string, boolean>>({});

  // SPS-Automatiken State (pro SPS)
  const [spsAutomatikStatus, setSpsAutomatikStatus] = useState<Record<string, {
    zeitautomatikB10: number,  // 0=AUS, 1=AN, 2=Zufallsautomatik
    beschattung: boolean,
    daemmerung: boolean,
    zeitautomatikB16: boolean
  }>>({});

  // Zeitsynchronisation State
  const [syncingTime, setSyncingTime] = useState(false);

  // Dialog State
  const [currentDialogMotor, setCurrentDialogMotor] = useState<Motor | null>(null);
  const [currentDialogType, setCurrentDialogType] = useState<'zeitautomatik' | 'motorzeiten' | null>(null);

  // Lade Automatik-Status beim Öffnen der SPS-Ansicht
  React.useEffect(() => {
    if (view === 'sps') {
      loadAutomatikStatus();
    }
  }, [view]);

  // Automatik-Status von allen SPS-Stationen laden
  const loadAutomatikStatus = async () => {
    const spsNames = ['SPS1', 'SPS2', 'SPS3'];
    console.log('[DEBUG] Lade Automatik-Status für SPS:', spsNames);

    await Promise.all(spsNames.map(async (spsName) => {
      try {
        const res = await fetch(`/api/sps/status/${spsName}`);
        const data = await res.json();
        console.log(`[DEBUG] API-Response /api/sps/status/${spsName}:`, data);
        if (data.success && data.data) {
          // backend may return keys as numeric motor numbers or as technical names
          Object.entries(data.data).forEach(([motorKey, status]: [string, any]) => {
            const maybeNum = parseInt(motorKey);
            let technicalName: string | undefined;
            if (Number.isFinite(maybeNum)) {
              // Map motor number back to technical name
              const motorNumberMapping: Record<string, Record<string, number>> = {
                SPS1: {
                  'Wohnen_Ost': 1,
                  'Wohnen_Sued_links': 2,
                  'Wohnen_Sued_rechts': 3,
                  'Wohnen_West_links': 4,
                  'Wohnen_West_rechts': 5,
                  'Arbeiten': 6,
                },
                SPS2: {
                  'Schlafen_Sued': 1,
                  'Anna_Sued': 2,
                  'Anna_West': 3,
                  'Fitnessraum': 4,
                  'Frida': 5,
                  'Treppe': 6,
                },
                SPS3: {
                  'Bad': 2,
                  'Schlafen_Ankleide': 3,
                  'Schlafen_Osten': 4,
                }
              };
              technicalName = Object.entries(motorNumberMapping[spsName] || {}).find(([_name, nr]) => nr === maybeNum)?.[0];
            } else {
              technicalName = motorKey; // assume backend already returned technical name
            }

            if (technicalName) {
              const automVal = status?.automatik ?? status?.enabled ?? false;
              console.log(`[DEBUG] Setze Automatik-Status: ${technicalName} (SPS: ${spsName}, Key: ${motorKey}) →`, automVal);
              setAutomatikEnabled(prev => {
                const updated = { ...prev, [technicalName]: !!automVal };
                console.log('[DEBUG] Neuer automatikEnabled State:', updated);
                return updated;
              });
            } else {
              console.warn(`[DEBUG] Kein technischer Name für MotorKey: ${motorKey} in SPS: ${spsName}`);
            }
          });
        } else {
          console.warn(`[DEBUG] Keine Daten für SPS: ${spsName}`);
        }
      } catch (e) {
        console.error(`❌ Fehler beim Laden des Status für ${spsName}:`, e);
      }
    }));
  };

  // SPS-Automatiken Status laden
  const loadSPSAutomatiken = async (spsName: string) => {
    try {
      const res = await fetch(`/api/sps/automatiken/${spsName}`);
      const data = await res.json();
      if (data.success) {
        setSpsAutomatikStatus(prev => ({ ...prev, [spsName]: data.data }));
      }
    } catch (e) {
      console.error(`❌ Fehler beim Laden der Automatiken für ${spsName}:`, e);
    } finally {
    }
  };

  // Zeitsynchronisation für alle SPSsen
  const syncTimeToAllSPS = async () => {
    setSyncingTime(true);
    try {
      const res = await fetch('/api/sps/sync-time');
      const data = await res.json();
      if (data.success) {
        alert(`✅ Zeit synchronisiert: ${data.time}\n\nSPS1: ${data.results.SPS1.message}\nSPS2: ${data.results.SPS2.message}\nSPS3: ${data.results.SPS3.message}`);
      } else {
        alert('❌ Fehler bei Zeitsynchronisation');
      }
    } catch (e) {
      console.error('❌ Fehler bei Zeitsynchronisation:', e);
      alert('❌ Fehler bei Zeitsynchronisation');
    } finally {
      setSyncingTime(false);
    }
  };

  // SPS-Automatik schalten (B10, Beschattung, Dämmerung, B1-B6)
  const toggleSPSAutomatik = async (spsName: string, type: string, value: number | boolean) => {
    // Optimistic UI: Status sofort aktualisieren
    setSpsAutomatikStatus(prev => ({
      ...prev,
      [spsName]: {
        ...prev[spsName],
        [type]: value
      }
    }));

    try {
      const res = await fetch('/api/sps/automatiken/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spsName, type, value })
      });
      const data = await res.json();
      if (!data.success) {
        // Bei Fehler Status zurücksetzen
        await loadSPSAutomatiken(spsName);
        console.error(`❌ Fehler beim Schalten von ${type}`);
      } else {
        console.log(`✅ ${type} ${value ? 'AN' : 'AUS'} für ${spsName}`);
      }
    } catch (e) {
      // Bei Fehler Status zurücksetzen
      await loadSPSAutomatiken(spsName);
      console.error(`❌ Fehler beim Schalten von ${type}:`, e);
    }
  };

  // Handler für Automatik-Toggle
  const handleAutomatikToggle = (motor: Motor, enabled: boolean) => {
    const automatikKey = motor.technicalName || motor.name;
    setAutomatikEnabled(prev => ({ ...prev, [automatikKey]: enabled }));
  };

  // Dialog Handler
  const openZeitautomatikDialog = (motor: Motor) => {
    if (!automatikEnabled[motor.technicalName || motor.name]) {
      alert('Zeitautomatik ist ausgeschaltet. Bitte erst einschalten!');
      return;
    }
    setCurrentDialogMotor(motor);
    setCurrentDialogType('zeitautomatik');
  };

  const openMotorTimesDialog = (motor: Motor) => {
    setCurrentDialogMotor(motor);
    setCurrentDialogType('motorzeiten');
  };

  const closeDialog = () => {
    setCurrentDialogMotor(null);
    setCurrentDialogType(null);
  };

  // Dialog-Rendering basierend auf currentDialogType
  if (currentDialogType === 'zeitautomatik' && currentDialogMotor) {
    return <ZeitautomatikDialog motor={currentDialogMotor} onClose={closeDialog} />
  }

  if (currentDialogType === 'motorzeiten' && currentDialogMotor) {
    return <MotorTimesDialog motor={currentDialogMotor} onClose={closeDialog} />
  }

  return (
    <div className="settings-root">
      <div className="settings-header-row">
        <span className="settings-gear">⚙️</span>
        <div className="settings-tabs">
          <button className={view === 'main' ? 'active' : ''} onClick={() => setView('main')}>Motoren</button>
          <button className={view === 'sps' ? 'active' : ''} onClick={() => setView('sps')}>SPS Automatiken</button>
          <button className={view === 'groups' ? 'active' : ''} onClick={() => setView('groups')}>Gruppen</button>
        </div>
      </div>


      {view === 'sps' && (
        <div className="sps-automatiken-section-legacy">
          <div className="sps-zeit-sync-row-legacy">
            <button className="zeit-sync-btn-legacy" onClick={syncTimeToAllSPS} disabled={syncingTime}>
              <span className="zeit-sync-icon-legacy">🕐</span> Zeit synchronisieren
            </button>
          </div>
          <div className="sps-automatiken-tiles">
            {['SPS1', 'SPS2', 'SPS3'].map(spsName => (
              <div key={spsName} className="sps-automatiken-tile">
                <div className="sps-tile-header">{spsName}</div>
                <div className="sps-tile-controls">
                  <div className="sps-tile-row">
                    <span className="sps-tile-label">Zeitautomatik</span>
                    <select
                      className="sps-tile-select"
                      value={spsAutomatikStatus[spsName]?.zeitautomatikB10 || 0}
                      onChange={(e) => toggleSPSAutomatik(spsName, 'zeitautomatikB10', parseInt(e.target.value))}
                    >
                      <option value={0}>AUS</option>
                      <option value={1}>AN</option>
                      <option value={2}>Zufall</option>
                    </select>
                  </div>
                  <div className="sps-tile-row">
                    <span className="sps-tile-label">Beschattung</span>
                    <input
                      type="checkbox"
                      checked={spsAutomatikStatus[spsName]?.beschattung || false}
                      onChange={(e) => toggleSPSAutomatik(spsName, 'beschattung', e.target.checked)}
                      className="sps-tile-checkbox"
                    />
                  </div>
                  <div className="sps-tile-row">
                    <span className="sps-tile-label">Dämmerung</span>
                    <input
                      type="checkbox"
                      checked={spsAutomatikStatus[spsName]?.daemmerung || false}
                      onChange={(e) => toggleSPSAutomatik(spsName, 'daemmerung', e.target.checked)}
                      className="sps-tile-checkbox"
                    />
                  </div>
                  <div className="sps-tile-row">
                    <span className="sps-tile-label">Zeitautomatik B16</span>
                    <input
                      type="checkbox"
                      checked={spsAutomatikStatus[spsName]?.zeitautomatikB16 || false}
                      onChange={(e) => toggleSPSAutomatik(spsName, 'zeitautomatikB16', e.target.checked)}
                      className="sps-tile-checkbox"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="back-button-legacy" onClick={() => setView('main')}>← Zurück</button>
        </div>
      )}

      {/* ...andere Views wie main und groups können nach gleichem Muster gestylt werden ... */}
    </div>
  )
}


