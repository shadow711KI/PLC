import React, { useState } from 'react';
import './Settings.css';

// API-Aufruf: Zeitpunkte eines Motors auslesen
async function fetchTimeAutomationPoints(motor: any): Promise<any[]> {
  const res = await fetch(`/api/zeitautomatik?motor=${encodeURIComponent(motor.name)}`);
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  }
  return [];
}
// API-Aufruf: Motorlaufzeiten/Antippzeiten lesen
async function fetchMotorTimes(motor: any) {
  const res = await fetch(`/api/motor/times?motor=${encodeURIComponent(motor.technicalName)}`);
  if (res.ok) {
    const data = await res.json();
    if (data.success) return data.data;
  }
  return null;
}
// API-Aufruf: Motorlaufzeiten/Antippzeiten schreiben
async function saveMotorTimesApi(motor: any, payload: any) {
  const res = await fetch('/api/motor/times', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motor: motor.technicalName, ...payload })
  });
  if (res.ok) {
    const data = await res.json();
    return data.success ? (data.data ?? {}) : null; // akzeptiere Erfolg auch ohne Rücklese-Daten
  }
  return null;
}
import './Settings.css'

interface Motor {
  id: number;
  name: string;
  technicalName: string;
  displayName: string;
  sps: string;
  status: string;
}

interface SettingsProps {
  motors: Motor[]
  roomIcons: Record<string, string>
  groups: Record<string, string[]>
  onUpdateName: (motorName: string, newDisplayName: string) => Promise<boolean>
  onUpdateRoomIcon: (roomName: string, icon: string) => Promise<boolean>
  onUpdateGroup: (groupName: string, windows: string[]) => Promise<boolean>
  onDeleteGroup: (groupName: string) => Promise<boolean>
}

export default function Settings({ motors, roomIcons, groups, onUpdateName, onUpdateRoomIcon, onUpdateGroup, onDeleteGroup }: SettingsProps) {
  const [view, setView] = useState<'main' | 'sps' | 'groups' | 'automatiken' | 'zeitautomatik' | 'motorzeiten'>('main')
  const [editingMotorId, setEditingMotorId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingIconMotorId, setEditingIconMotorId] = useState<number | null>(null)
  const [editingIcon, setEditingIcon] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedWindows, setSelectedWindows] = useState<string[]>([])
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [selectedSPS, setSelectedSPS] = useState<string>('')

  // Zeitautomatik State
  const [timeAutoMotor, setTimeAutoMotor] = useState<Motor | null>(null);
  const [timeAutoPoints, setTimeAutoPoints] = useState<any[]>([]);
  const [loadingTimeAuto, setLoadingTimeAuto] = useState(false);

  // Motor-Zeiten State
  const [motorTimesMotor, setMotorTimesMotor] = useState<Motor | null>(null);
  const [motorTimes, setMotorTimes] = useState<{ laufzeitHoch: number; laufzeitRunter: number; antipzeitHoch: number; antipzeitRunter: number; wendezeit: number }>({
    laufzeitHoch: 0,
    laufzeitRunter: 0,
    antipzeitHoch: 0,
    antipzeitRunter: 0,
    wendezeit: 0
  });
  const [loadingMotorTimes, setLoadingMotorTimes] = useState(false);
  const [savingMotorTimes, setSavingMotorTimes] = useState(false);

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
  const [loadingSpsStatus, setLoadingSpsStatus] = useState(false);

  // Zeitsynchronisation State
  const [syncingTime, setSyncingTime] = useState(false);

  // Lade Automatik-Status beim Öffnen der SPS-Ansicht
  React.useEffect(() => {
    if (view === 'sps') {
      loadAutomatikStatus();
    }
  }, [view]);

  // Automatik-Status von allen SPS-Stationen laden
  const loadAutomatikStatus = async () => {
    setLoadingSpsStatus(true);
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
              technicalName = Object.entries(motorNumberMapping[spsName] || {}).find(([_unused, nr]) => nr === maybeNum)?.[0];
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

    setLoadingSpsStatus(false);
    setTimeout(() => {
      console.log('[DEBUG] automatikEnabled nach loadAutomatikStatus:', automatikEnabled);
    }, 500);
  };

  // SPS-Automatiken Status laden
  const loadSPSAutomatiken = async (spsName: string) => {
    setLoadingSpsStatus(true);
    try {
      const res = await fetch(`/api/sps/automatiken/${spsName}`);
      const data = await res.json();
      if (data.success) {
        setSpsAutomatikStatus(prev => ({ ...prev, [spsName]: data.data }));
      }
    } catch (e) {
      console.error(`❌ Fehler beim Laden der Automatiken für ${spsName}:`, e);
    } finally {
      setLoadingSpsStatus(false);
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

  // Automatik An/Aus schalten
  const toggleAutomatik = async (motor: Motor, enabled: boolean) => {
    // Use technicalName if present, else fallback to name
    const automatikKey = motor.technicalName || motor.name;
    setAutomatikEnabled(prev => ({ ...prev, [automatikKey]: enabled }));
    try {
      const res = await fetch('/api/zeitautomatik/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motor: automatikKey, enabled })
      });
      const data = await res.json();
      if (!data.success) {
        setAutomatikEnabled(prev => ({ ...prev, [automatikKey]: !enabled }));
        console.error('❌ Fehler beim Schalten der Automatik:', data.message);
      } else {
        console.log(`✅ Automatik ${enabled ? 'AN' : 'AUS'} für ${motor.displayName}`);
      }
    } catch (e) {
      setAutomatikEnabled(prev => ({ ...prev, [automatikKey]: !enabled }));
      console.error('❌ Fehler bei Automatik-Request:', e);
    }
  };

  // Öffnet Zeitautomatik-Dialog und lädt Daten (nur wenn Automatik AN)
  const openTimeAutoDialog = async (motor: Motor) => {
    // Prüfen ob Automatik aktiv ist
    if (!automatikEnabled[motor.name]) {
      alert('Zeitautomatik ist ausgeschaltet. Bitte erst einschalten!');
      return;
    }
    setView('zeitautomatik');
    setTimeAutoMotor(motor);
    setLoadingTimeAuto(true);
    const points = await fetchTimeAutomationPoints(motor);
    const sanitized = (points || []).map(p => ({
      ...p,
      hour: clampTimeValue('hour', typeof p.hour === 'number' ? p.hour : NaN),
      minute: clampTimeValue('minute', typeof p.minute === 'number' ? p.minute : NaN)
    }));
    setTimeAutoPoints(sanitized);
    setLoadingTimeAuto(false);
  };
  
  const closeTimeAutoDialog = () => {
    setView('main');
    setTimeAutoMotor(null);
    setTimeAutoPoints([]);
  };

  // Öffnet Motor-Zeiten Dialog (laufzeit/antipp/wendezeit)
  const openMotorSettingsPanel = async (motor?: Motor | null) => {
    const targetMotor = motor || timeAutoMotor;
    if (!targetMotor) return;
    setView('motorzeiten');
    setMotorTimesMotor(targetMotor);
    setLoadingMotorTimes(true);
    const data = await fetchMotorTimes(targetMotor);
    if (data) {
      setMotorTimes({
        laufzeitHoch: data.laufzeitHoch ?? 0,
        laufzeitRunter: data.laufzeitRunter ?? 0,
        antipzeitHoch: data.antipzeitHoch ?? 0,
        antipzeitRunter: data.antipzeitRunter ?? 0,
        wendezeit: data.wendezeit ?? 0
      });
    } else {
      alert('Keine Antwort von SPS für Motor-Zeiten');
      setView('main');
      setMotorTimesMotor(null);
    }
    setLoadingMotorTimes(false);
  };

  // Handler: Wochentag togglen (mind. 1 Tag muss aktiv bleiben)
  const handleWeekdayChange = (idx: number, dayIndex: number, checked: boolean) => {
    const updated = [...timeAutoPoints];
    const mask = updated[idx].weekdayMask || 0;
    const checkedCount = Array(7).fill(0).reduce((acc, _, i) => acc + ((mask & (1 << i)) ? 1 : 0), 0);
    if (!checked && checkedCount === 1 && (mask & (1 << dayIndex))) {
      // Prevent unchecking the last checked day
      return;
    }
    if (checked) {
      updated[idx].weekdayMask |= (1 << dayIndex);
    } else {
      updated[idx].weekdayMask &= ~(1 << dayIndex);
    }
    setTimeAutoPoints(updated);
  };

  const clampTimeValue = (field: 'hour' | 'minute', value: number) => {
    const min = field === 'hour' ? 1 : 0;
    const max = field === 'hour' ? 24 : 59;
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  };

  const formatTimeValue = (field: 'hour' | 'minute', value: number | undefined | null) => {
    return clampTimeValue(field, typeof value === 'number' ? value : NaN).toString().padStart(2, '0');
  };

  // Handler: Stunde/Minute ändern
  const handleTimeChange = (idx: number, field: 'hour' | 'minute', value: string) => {
    const cleaned = value.replace(/\D+/g, '');
    const num = cleaned === '' ? NaN : parseInt(cleaned, 10);
    const clamped = clampTimeValue(field, num);
    setTimeAutoPoints(points => points.map((p, i) => i === idx ? { ...p, [field]: clamped } : p));
  };

  // Handler: Aktion ändern
  const handleActionChange = (idx: number, action: string) => {
    const updated = [...timeAutoPoints];
    updated[idx].action = action;
    setTimeAutoPoints(updated);
  };

  // Motor-Zeiten Feldänderung
  const handleMotorTimesChange = (key: keyof typeof motorTimes, value: string) => {
    const num = Math.max(0, Math.min(0xFFFF, parseInt(value, 10) || 0));
    setMotorTimes(prev => ({ ...prev, [key]: num }));
  };


  const saveMotorTimes = async () => {
    if (!motorTimesMotor) return;
    setSavingMotorTimes(true);
    const saved = await saveMotorTimesApi(motorTimesMotor, motorTimes);
    setSavingMotorTimes(false);
    if (saved) {
      setMotorTimes({
        laufzeitHoch: saved.laufzeitHoch ?? motorTimes.laufzeitHoch,
        laufzeitRunter: saved.laufzeitRunter ?? motorTimes.laufzeitRunter,
        antipzeitHoch: saved.antipzeitHoch ?? motorTimes.antipzeitHoch,
        antipzeitRunter: saved.antipzeitRunter ?? motorTimes.antipzeitRunter,
        wendezeit: saved.wendezeit ?? motorTimes.wendezeit
      });
    } else {
      alert('Speichern fehlgeschlagen (keine Antwort von SPS)');
    }
  };
  
  // Gruppiere Motoren nach SPS
// API-Aufruf: Zeitpunkte eines Motors speichern
async function saveTimeAutomationPoints(motor: any, points: any[]): Promise<boolean> {
  const res = await fetch('/api/zeitautomatik', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motor: motor.name, points })
  });
  return res.ok;
}
  const motorsBySPS = motors.reduce((acc, motor) => {
    if (!acc[motor.sps]) acc[motor.sps] = [];
    acc[motor.sps].push(motor);
    return acc;
  }, {} as Record<string, Motor[]>);

  async function handleSaveTimeAuto() {
    if (timeAutoMotor) {
      const normalizedPoints = timeAutoPoints.map(p => ({
        ...p,
        hour: clampTimeValue('hour', typeof p.hour === 'number' ? p.hour : NaN),
        minute: clampTimeValue('minute', typeof p.minute === 'number' ? p.minute : NaN)
      }));
      await saveTimeAutomationPoints(timeAutoMotor, normalizedPoints);
    }
    closeTimeAutoDialog();
  }
  
  const spsInfo: Record<string, { host: string; port: number }> = {
    SPS1: { host: '192.168.178.234', port: 1001 },
    SPS2: { host: '192.168.178.234', port: 1002 },
    SPS3: { host: '192.168.178.235', port: 1003 },
  }

  // Mapping: Technischer Name → Motornummer (synchron mit Backend)
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
  }
  
  const startEditing = (motor: Motor) => {
    setEditingMotorId(motor.id)
    setEditingName(motor.displayName)
  }
  
  const saveEdit = async (motor: Motor) => {
    if (editingName.trim() && editingName !== motor.displayName) {
      await onUpdateName(motor.name, editingName.trim())
    }
    setEditingMotorId(null)
  }
  
  const cancelEdit = () => {
    setEditingMotorId(null)
    setEditingName('')
  }
  
  const handleKeyDown = (e: React.KeyboardEvent, motor: Motor) => {
    if (e.key === 'Enter') {
      saveEdit(motor)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }
  
  const startEditingIcon = (motorId: number, roomName: string) => {
    setEditingIconMotorId(motorId)
    setEditingIcon(roomIcons[roomName] || '')
  }
  
  const saveIcon = async (roomName: string) => {
    if (editingIcon.trim()) {
      const success = await onUpdateRoomIcon(roomName, editingIcon.trim())
      if (success) {
        console.log(`Icon gespeichert: ${roomName} → ${editingIcon.trim()}`)
      }
    }
    setEditingIconMotorId(null)
    setEditingIcon('')
  }
  
  const handleIconKeyDown = (e: React.KeyboardEvent, roomName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveIcon(roomName)
    } else if (e.key === 'Escape') {
      setEditingIconMotorId(null)
      setEditingIcon('')
    }
  }
  
  const createGroup = async () => {
    if (newGroupName.trim() && selectedWindows.length > 0) {
      await onUpdateGroup(newGroupName.trim(), selectedWindows)
      setNewGroupName('')
      setSelectedWindows([])
    }
  }
  
  const updateGroup = async () => {
    if (editingGroup && selectedWindows.length > 0) {
      await onUpdateGroup(editingGroup, selectedWindows)
      setEditingGroup(null)
      setSelectedWindows([])
    }
  }
  
  const deleteGroupHandler = async (groupName: string) => {
    if (confirm(`Gruppe "${groupName}" wirklich löschen?`)) {
      await onDeleteGroup(groupName)
    }
  }
  
  const startEditingGroup = (groupName: string) => {
    setEditingGroup(groupName)
    setSelectedWindows(groups[groupName] || [])
  }
  
  const cancelGroupEdit = () => {
    setEditingGroup(null)
    setNewGroupName('')
    setSelectedWindows([])
  }
  
  // Fallback Icon
  const getDefaultIcon = (roomName: string): string => {
    const name = roomName.toLowerCase()
    if (name.includes('wohnen')) return '🛋️'
    if (name.includes('schlafen') || name.includes('ankleide')) return '🛏️'
    if (name.includes('anna') || name.includes('frida')) return '👧'
    if (name.includes('arbeiten')) return '💼'
    if (name.includes('bad')) return '🚿'
    if (name.includes('fitness')) return '🏋️'
    if (name.includes('treppe')) return '🪜'
    return '🏠'
  }
  
  if (view === 'sps') {
    return (
      <div className="settings-screen">
        <style>{`@keyframes spsBar { 0% { background-position: 0 0; } 100% { background-position: 40px 0; } }`}</style>
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1>SPS Stationen</h1>
          <button 
            onClick={syncTimeToAllSPS}
            disabled={syncingTime}
            title="Zeit synchronisieren"
            style={{
              position: 'absolute',
              right: 0,
              top: 22,
              padding: '8px 12px',
              background: syncingTime ? '#ccc' : 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
              color: 'white',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              fontSize: 14,
              lineHeight: '16px',
              fontWeight: 'bold',
              cursor: syncingTime ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {syncingTime ? '⏳' : '🕐'}
          </button>
        </div>
        {loadingSpsStatus && (
          <div style={{
            margin: '8px 0 12px 0',
            padding: '10px 12px',
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 600,
            flexDirection: 'column'
          }}>
            ⏳ Lese SPS-Daten...
            <div style={{ width: '100%', height: 8, background: '#111', borderRadius: 4, overflow: 'hidden', border: '1px solid #333' }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(135deg, #0d6efd 0px, #0d6efd 10px, #66b2ff 10px, #66b2ff 20px)',
                backgroundSize: '40px 8px',
                animation: 'spsBar 1s linear infinite',
                borderRadius: 4
              }} />
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
                    className="automatiken-btn"
                    onClick={async () => { setSelectedSPS(spsName); setLoadingSpsStatus(true); setView('automatiken'); await loadSPSAutomatiken(spsName); }}
                    style={{
                      marginLeft: 10,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
                      color: 'white',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      fontWeight: 'bold',
                      fontSize: 14,
                      lineHeight: '16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s'
                    }}
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
                  // Debug log for Automatik toggle rendering
                  console.log('[DEBUG] Render Toggle:', {
                    spsName,
                    motor: automatikKey,
                    automatikEnabled: automatikEnabled[automatikKey],
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
                                onBlur={() => saveIcon(roomName)}
                                onKeyDown={(e) => handleIconKeyDown(e, roomName)}
                                placeholder="Icon"
                                autoFocus
                              />
                            ) : (
                              <div className="motor-icon" onClick={() => startEditingIcon(motor.id, roomName)}>
                                {currentIcon}
                              </div>
                            )}
                            {editingMotorId === motor.id ? (
                              <input
                                type="text"
                                className="motor-name-edit"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => saveEdit(motor)}
                                onKeyDown={(e) => handleKeyDown(e, motor)}
                                autoFocus
                              />
                            ) : (
                              <div className="motor-display-name" onClick={() => startEditing(motor)}>
                                {motor.displayName}
                                <span className="edit-icon">✏️</span>
                              </div>
                            )}
                            {/* Automatik An/Aus Toggle Switch */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                              <span style={{ fontSize: 20, fontWeight: 'bold', color: automatikEnabled[automatikKey] ? '#2196F3' : '#ccc' }}>A</span>
                              <div 
                                onClick={() => toggleAutomatik(motor, !automatikEnabled[automatikKey])}
                                onTouchEnd={(e) => { e.preventDefault(); toggleAutomatik(motor, !automatikEnabled[automatikKey]); }}
                                title={automatikEnabled[automatikKey] ? 'Automatik ausschalten' : 'Automatik einschalten'}
                                style={{
                                  width: 44,
                                  height: 22,
                                  backgroundColor: automatikEnabled[automatikKey] ? '#4CAF50' : '#ccc',
                                  borderRadius: 11,
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.3s',
                                  touchAction: 'manipulation'
                                }}
                              >
                                <div style={{
                                  width: 18,
                                  height: 18,
                                  backgroundColor: 'white',
                                  borderRadius: '50%',
                                  position: 'absolute',
                                  top: 2,
                                  left: automatikEnabled[automatikKey] ? 24 : 2,
                                  transition: 'left 0.3s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}></div>
                              </div>
                            </div>
                            <div className="motor-timeauto-wrap">
                              <button
                                className="motor-settings-btn motor-timeauto-icon"
                                title={automatikEnabled[automatikKey] ? 'Zeitautomatik einstellen' : 'Automatik ist ausgeschaltet'}
                                style={{ 
                                  cursor: automatikEnabled[automatikKey] ? 'pointer' : 'not-allowed', 
                                  opacity: automatikEnabled[automatikKey] ? 1 : 0.3,
                                  filter: automatikEnabled[automatikKey] ? 'none' : 'grayscale(100%)'
                                }}
                                onClick={() => automatikEnabled[automatikKey] && openTimeAutoDialog(motor)}
                                aria-label="Zeitautomatik"
                              >
                                <span style={{fontSize: 18}}>⏰</span>
                              </button>
                              <button
                                className="motor-settings-btn motor-settings-over"
                                title="Einstellungen"
                                onClick={() => openMotorSettingsPanel(motor)}
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
  
  if (view === 'zeitautomatik') {
    return (
      <div className="settings-screen">
        <div className="header">
          <button className="back-button" onClick={() => closeTimeAutoDialog()}>←</button>
          <h1>⏰ Zeitautomatik - {timeAutoMotor?.displayName}</h1>
        </div>

        {loadingTimeAuto ? (
          <div style={{color: '#666', padding: '20px', textAlign: 'center'}}>Lade Zeitpunkte...</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSaveTimeAuto(); }} style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: 20}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16}}>
              {timeAutoPoints.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  {/* Kachel-Header */}
                  <div style={{fontSize: 14, fontWeight: 'bold', color: '#0d6efd', paddingBottom: 8, borderBottom: '1px solid #444'}}>
                    Zeitpunkt {idx + 1}
                  </div>

                  {/* Wochentage */}
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    <span style={{fontSize: '12px', fontWeight: '600', color: '#999'}}>Wochentage</span>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6}}>
                      {[...Array(7)].map((_, d) => (
                        <label
                          key={d}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 6,
                            background: !!(p.weekdayMask & (1 << d)) ? '#0d6efd' : '#222',
                            borderRadius: 4,
                            color: !!(p.weekdayMask & (1 << d)) ? '#fff' : '#ccc',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!(p.weekdayMask & (1 << d))}
                            onChange={e => handleWeekdayChange(idx, d, e.target.checked)}
                            style={{cursor: 'pointer'}}
                            disabled={
                              !!(p.weekdayMask & (1 << d)) &&
                              Array(7).fill(0).reduce((acc, _, i) => acc + ((p.weekdayMask & (1 << i)) ? 1 : 0), 0) === 1
                            }
                          />
                          {['So','Mo','Di','Mi','Do','Fr','Sa'][d]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Uhrzeit & Aktion nebeneinander */}
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                    {/* Uhrzeit */}
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      <span style={{fontSize: '12px', fontWeight: '600', color: '#999'}}>Uhrzeit</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center'}}>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={formatTimeValue('hour', p.hour)}
                          onChange={e => handleTimeChange(idx, 'hour', e.target.value)}
                          style={{width: 50, textAlign:'center', background:'#111', color:'#fff', border:'1.5px solid #444', borderRadius: 4, fontSize: 14, padding: '0 8px', fontWeight: '600', height: '40px', boxSizing: 'border-box', lineHeight: '40px'}}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                        <span style={{fontWeight: 'bold', color: '#0d6efd', fontSize: 18}}>:</span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={formatTimeValue('minute', p.minute)}
                          onChange={e => handleTimeChange(idx, 'minute', e.target.value)}
                          style={{width: 50, textAlign: 'center', background: '#111', color: '#fff', border: '1.5px solid #444', borderRadius: 4, fontSize: 14, padding: '0 8px', fontWeight: '600', height: '40px', boxSizing: 'border-box', lineHeight: '40px'}}
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-around', fontSize: 10, color: '#666'}}>
                        <span>HH24</span>
                        <span></span>
                        <span>MI</span>
                      </div>
                    </div>

                    {/* Aktion */}
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      <span style={{fontSize: '12px', fontWeight: '600', color: '#999'}}>Aktion</span>
                      <select
                        value={p.action}
                        onChange={e => handleActionChange(idx, e.target.value)}
                        style={{
                          background: '#111',
                          color: '#fff',
                          border: '1.5px solid #444',
                          borderRadius: 4,
                          padding: 8,
                          fontSize: 14,
                          cursor: 'pointer',
                          height: '40px',
                          boxSizing: 'border-box'
                        }}
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
            <div style={{display: 'flex', justifyContent: 'flex-start', gap: 12, marginTop: 8}}>
              <button type="submit" className="save-btn">Speichern</button>
              <button type="button" className="cancel-btn" onClick={closeTimeAutoDialog}>Abbrechen</button>
            </div>
          </form>
        )}
      </div>
    )
  }

  if (view === 'motorzeiten') {
    return (
      <div className="settings-screen">
        <div className="header">
          <h1>⚙️ Zeiten - {motorTimesMotor?.displayName}</h1>
        </div>

        {loadingMotorTimes ? (
          <div style={{color: '#666', padding: '20px', textAlign: 'center'}}>Lade Werte...</div>
        ) : (
          <div style={{padding: '20px', display:'flex', flexDirection:'column', gap:16}}>
            <div style={{fontSize: '12px', color: '#999', padding: '10px', background: '#1e1e1e', borderRadius: '6px', borderLeft: '3px solid #0d6efd'}}>
              ℹ️ Alle Werte in 1/10 Sekunden (0,1s Schritte)
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize: '13px', fontWeight: '600', color: '#fff'}}>Laufzeit nach oben</span>
                <input type="number" min={0} max={65535} value={motorTimes.laufzeitHoch} onChange={e => handleMotorTimesChange('laufzeitHoch', e.target.value)} style={{background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'10px', fontSize: '14px'}} />
                <span style={{fontSize: '11px', color: '#666'}}>Zeit zum Fahren nach oben</span>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize: '13px', fontWeight: '600', color: '#fff'}}>Laufzeit nach unten</span>
                <input type="number" min={0} max={65535} value={motorTimes.laufzeitRunter} onChange={e => handleMotorTimesChange('laufzeitRunter', e.target.value)} style={{background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'10px', fontSize: '14px'}} />
                <span style={{fontSize: '11px', color: '#666'}}>Zeit zum Fahren nach unten</span>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize: '13px', fontWeight: '600', color: '#fff'}}>Wendezeit</span>
                <input type="number" min={0} max={65535} value={motorTimes.wendezeit} onChange={e => handleMotorTimesChange('wendezeit', e.target.value)} style={{background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'10px', fontSize: '14px'}} />
                <span style={{fontSize: '11px', color: '#666'}}>Zeit zum Umschalten der Richtung</span>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize: '13px', fontWeight: '600', color: '#fff'}}>Antippzeit nach oben</span>
                <input type="number" min={0} max={65535} value={motorTimes.antipzeitHoch} onChange={e => handleMotorTimesChange('antipzeitHoch', e.target.value)} style={{background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'10px', fontSize: '14px'}} />
                <span style={{fontSize: '11px', color: '#666'}}>Kurzzeitimpuls nach oben</span>
              </label>
              <label style={{display:'flex', flexDirection:'column', gap:6}}>
                <span style={{fontSize: '13px', fontWeight: '600', color: '#fff'}}>Antippzeit nach unten</span>
                <input type="number" min={0} max={65535} value={motorTimes.antipzeitRunter} onChange={e => handleMotorTimesChange('antipzeitRunter', e.target.value)} style={{background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'10px', fontSize: '14px'}} />
                <span style={{fontSize: '11px', color: '#666'}}>Kurzzeitimpuls nach unten</span>
              </label>
            </div>
            <div style={{display:'flex', justifyContent:'flex-start', gap:12, marginTop:8}}>
              <button className="save-btn" type="button" onClick={saveMotorTimes} disabled={savingMotorTimes}>{savingMotorTimes ? 'Speichern...' : 'Speichern'}</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  if (view === 'groups') {
    return (
      <div className="settings-screen">
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1>📂 Gruppen</h1>
        </div>

        <div className="groups-section">
          <div className="group-creation">
            <h2>Neue Gruppe erstellen</h2>
            <input
              type="text"
              placeholder="Gruppenname"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="group-name-input"
            />
            
            <div className="window-selection">
              <h3>Fenster auswählen:</h3>
              <div className="window-checkboxes">
                {motors.map((motor) => (
                  <label key={motor.id} className="window-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedWindows.includes(motor.displayName)}
                      onChange={(e) => {
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
              className="create-group-btn"
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedWindows.length === 0}
            >
              Gruppe erstellen
            </button>
          </div>

          <div className="existing-groups">
            <h2>Bestehende Gruppen</h2>
            {Object.keys(groups).length === 0 ? (
              <p>Keine Gruppen vorhanden</p>
            ) : (
              Object.entries(groups).map(([groupName, windows]) => (
                <div key={groupName} className="group-item">
                  {editingGroup === groupName ? (
                    <div className="group-edit">
                      <h3>Gruppe bearbeiten: {groupName}</h3>
                      <div className="window-selection">
                        <h4>Fenster auswählen:</h4>
                        <div className="window-checkboxes">
                          {motors.map((motor) => (
                            <label key={motor.id} className="window-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedWindows.includes(motor.displayName)}
                                onChange={(e) => {
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
                      <div className="group-edit-buttons">
                        <button onClick={updateGroup} disabled={selectedWindows.length === 0}>
                          Speichern
                        </button>
                        <button onClick={cancelGroupEdit}>
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group-display">
                      <div className="group-header">
                        <h3>{groupName}</h3>
                        <div className="group-actions">
                          <button onClick={() => startEditingGroup(groupName)}>Bearbeiten</button>
                          <button onClick={() => deleteGroupHandler(groupName)}>Löschen</button>
                        </div>
                      </div>
                      <div className="group-windows">
                        {windows.map((windowName) => (
                          <span key={windowName} className="group-window-tag">
                            {windowName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }
  
  if (view === 'automatiken') {
    const spsStatus = spsAutomatikStatus[selectedSPS] || {
      zeitautomatikB10: 0,
      beschattung: false,
      daemmerung: false,
      zeitautomatikB16: false
    };

    return (
      <div className="settings-screen">
        <style>{`@keyframes spsBar { 0% { background-position: 0 0; } 100% { background-position: 40px 0; } }`}</style>
        <div className="header">
          <button className="back-button" onClick={() => setView('sps')}>←</button>
          <h1>⚙️ Automatiken - {selectedSPS}</h1>
        </div>

        {loadingSpsStatus && (
          <div style={{
            margin: '8px 0 12px 0',
            padding: '10px 12px',
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 600,
            flexDirection: 'column'
          }}>
            ⏳ Lese SPS-Daten...
            <div style={{ width: '100%', height: 8, background: '#111', borderRadius: 4, overflow: 'hidden', border: '1px solid #333' }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'repeating-linear-gradient(135deg, #0d6efd 0px, #0d6efd 10px, #66b2ff 10px, #66b2ff 20px)',
                backgroundSize: '40px 8px',
                animation: 'spsBar 1s linear infinite',
                borderRadius: 4
              }} />
            </div>
          </div>
        )}

        <div className="automatiken-section" style={{ padding: 20 }}>
          {/* Zeitautomatik B10 (einzelner Motor) */}
          <div className="automatik-item" style={{ marginBottom: 25, padding: 20, border: '1px solid #cfd8dc', borderRadius: 10, backgroundColor: '#e8f1f7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
              <span style={{ fontSize: 32, marginRight: 12 }}>⏰</span>
              <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>Zeitautomatik B10<br />(alle Motoren)</h3>
            </div>
            <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 15 }}>
              {/* Toggle Switch AUS/AN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: spsStatus.zeitautomatikB10 === 0 ? 'bold' : 'normal', color: spsStatus.zeitautomatikB10 === 0 ? '#333' : '#999' }}>AUS</span>
                <div 
                  onClick={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', spsStatus.zeitautomatikB10 === 1 ? 0 : 1); }}
                  onTouchEnd={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', spsStatus.zeitautomatikB10 === 1 ? 0 : 1); }}
                  style={{
                    width: 60,
                    height: 30,
                    backgroundColor: spsStatus.zeitautomatikB10 === 1 ? '#4CAF50' : '#ccc',
                    borderRadius: 15,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                    touchAction: 'manipulation'
                  }}
                >
                  <div style={{
                    width: 26,
                    height: 26,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: 2,
                    left: spsStatus.zeitautomatikB10 === 1 ? 32 : 2,
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}></div>
                </div>
                <span style={{ fontSize: 14, fontWeight: spsStatus.zeitautomatikB10 === 1 ? 'bold' : 'normal', color: spsStatus.zeitautomatikB10 === 1 ? '#333' : '#999' }}>AN</span>
              </div>
              
              {/* Zufallsautomatik Button */}
              <button
                onClick={() => toggleSPSAutomatik(selectedSPS, 'zeitautomatikB10', 2)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: spsStatus.zeitautomatikB10 === 2 ? '#0d6efd' : '#eef3fb',
                  color: spsStatus.zeitautomatikB10 === 2 ? '#fff' : '#345',
                  border: spsStatus.zeitautomatikB10 === 2 ? '2px solid #0d6efd' : '2px solid #d6e2f3',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: spsStatus.zeitautomatikB10 === 2 ? 'bold' : 'normal',
                  transition: 'all 0.3s'
                }}
              >
                🎲 Zufall
              </button>
            </div>
          </div>

          {/* Beschattungsautomatik */}
          <div className="automatik-item" style={{ marginBottom: 25, padding: 20, border: '1px solid #cfd8dc', borderRadius: 10, backgroundColor: '#e8f1f7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
              <span style={{ fontSize: 32, marginRight: 12 }}>☀️</span>
              <h3 style={{ margin: 0, fontSize: 18 }}>Beschattungsautomatik</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
              <span style={{ fontSize: 14, fontWeight: !spsStatus.beschattung ? 'bold' : 'normal', color: !spsStatus.beschattung ? '#333' : '#999' }}>AUS</span>
              <div 
                onClick={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'beschattung', !spsStatus.beschattung); }}
                onTouchEnd={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'beschattung', !spsStatus.beschattung); }}
                style={{
                  width: 60,
                  height: 30,
                  backgroundColor: spsStatus.beschattung ? '#4CAF50' : '#ccc',
                  borderRadius: 15,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{
                  width: 26,
                  height: 26,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 2,
                  left: spsStatus.beschattung ? 32 : 2,
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>
              </div>
              <span style={{ fontSize: 14, fontWeight: spsStatus.beschattung ? 'bold' : 'normal', color: spsStatus.beschattung ? '#333' : '#999' }}>AN</span>
            </div>
          </div>

          {/* Dämmerungsautomatik */}
          <div className="automatik-item" style={{ marginBottom: 25, padding: 20, border: '1px solid #cfd8dc', borderRadius: 10, backgroundColor: '#e8f1f7', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
              <span style={{ fontSize: 32, marginRight: 12 }}>🌙</span>
              <h3 style={{ margin: 0, fontSize: 18 }}>Dämmerungsautomatik</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
              <span style={{ fontSize: 14, fontWeight: !spsStatus.daemmerung ? 'bold' : 'normal', color: !spsStatus.daemmerung ? '#333' : '#999' }}>AUS</span>
              <div 
                onClick={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'daemmerung', !spsStatus.daemmerung); }}
                onTouchEnd={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'daemmerung', !spsStatus.daemmerung); }}
                style={{
                  width: 60,
                  height: 30,
                  backgroundColor: spsStatus.daemmerung ? '#4CAF50' : '#ccc',
                  borderRadius: 15,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{
                  width: 26,
                  height: 26,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 2,
                  left: spsStatus.daemmerung ? 32 : 2,
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>
              </div>
              <span style={{ fontSize: 14, fontWeight: spsStatus.daemmerung ? 'bold' : 'normal', color: spsStatus.daemmerung ? '#333' : '#999' }}>AN</span>
            </div>
          </div>

          {/* Zeitautomatik B1-B6 (alle Motoren) */}
          <div className="automatik-item" style={{ marginBottom: 25, padding: 20, border: '1px solid #ccc', borderRadius: 10, backgroundColor: '#e0f2f1', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', minHeight: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
              <span style={{ fontSize: 32, marginRight: 12 }}>🏠</span>
              <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>Zeitautomatik<br />(einzelner Motor)</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
              <span style={{ fontSize: 14, fontWeight: !spsStatus.zeitautomatikB16 ? 'bold' : 'normal', color: !spsStatus.zeitautomatikB16 ? '#333' : '#999' }}>AUS</span>
              <div 
                onClick={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'zeitautomatikB16', !spsStatus.zeitautomatikB16); }}
                onTouchEnd={(e) => { e.preventDefault(); toggleSPSAutomatik(selectedSPS, 'zeitautomatikB16', !spsStatus.zeitautomatikB16); }}
                style={{
                  width: 60,
                  height: 30,
                  backgroundColor: spsStatus.zeitautomatikB16 ? '#4CAF50' : '#ccc',
                  borderRadius: 15,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                  touchAction: 'manipulation'
                }}
              >
                <div style={{
                  width: 26,
                  height: 26,
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 2,
                  left: spsStatus.zeitautomatikB16 ? 32 : 2,
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></div>
              </div>
              <span style={{ fontSize: 14, fontWeight: spsStatus.zeitautomatikB16 ? 'bold' : 'normal', color: spsStatus.zeitautomatikB16 ? '#333' : '#999' }}>AN</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="settings-screen">
      <div className="header">
        <h1>⚙️ Einstellungen</h1>
      </div>

      <div className="settings-list">
        <div className="settings-item" onClick={() => { setLoadingSpsStatus(true); setView('sps'); }}>
          <div className="settings-icon">🖥️</div>
          <div className="settings-label">
            <strong>SPS Stationen</strong><br />
            <small>3 Stationen konfiguriert</small>
          </div>
          <div className="settings-arrow">›</div>
        </div>

        <div className="settings-item" onClick={() => setView('groups')}>
          <div className="settings-icon">📂</div>
          <div className="settings-label">
            <strong>Gruppen</strong><br />
            <small>Motorgruppen verwalten</small>
          </div>
          <div className="settings-arrow">›</div>
        </div>

        <div className="settings-item" onClick={() => alert('System')}>
          <div className="settings-icon">ℹ️</div>
          <div className="settings-label">
            <strong>System Information</strong><br />
            <small>Version 1.0.0</small>
          </div>
          <div className="settings-arrow">›</div>
        </div>
      </div>
    </div>
  )
}

