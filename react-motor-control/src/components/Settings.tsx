import React, { useState, useRef } from 'react'
import { Motor, SettingsProps } from '../types'
import './Settings.css'
import SpsView from './settings/SpsView'
import GroupsView from './settings/GroupsView'
import AutomatikView from './settings/AutomatikView'
import ZeitautomatikView from './settings/ZeitautomatikView'
import MotorTimesView from './settings/MotorTimesView'
import {
  fetchTimeAutomationPoints,
  fetchMotorTimes,
  saveMotorTimesApi,
  saveTimeAutomationPoints,
  motorNumberMapping
} from './settings/settingsUtils'

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
  // null = unbekannt, true = AN, false = AUS
  const [automatikEnabled, setAutomatikEnabled] = useState<Record<string, boolean | null>>({});

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

  // AbortController ref: cancels any in-flight loadAutomatikStatus request when a newer one starts
  const automatikAbortControllerRef = useRef<AbortController | null>(null);

  // Lade Automatik-Status beim Öffnen der SPS-Ansicht.
  // Cleanup-Funktion bricht den laufenden Request ab wenn man die Ansicht verlässt,
  // damit kein veralteter Request nachträglich loadingSpsStatus=false setzt.
  React.useEffect(() => {
    if (view === 'sps') {
      loadAutomatikStatus();
    }
    return () => {
      automatikAbortControllerRef.current?.abort();
    };
  }, [view]);

  // Automatik-Status von allen SPS-Stationen laden
  // Uses AbortController so that only the latest call updates state.
  const loadAutomatikStatus = async () => {
    // Abort any previous in-flight request
    automatikAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    automatikAbortControllerRef.current = abortController;

    setLoadingSpsStatus(true);
    const spsNames = ['SPS1', 'SPS2', 'SPS3'];
    console.log('[DEBUG] Lade Automatik-Status für SPS:', spsNames);

    const tempAutomatikEnabled: Record<string, boolean | null> = {};

    await Promise.all(spsNames.map(async (spsName) => {
      try {
        const res = await fetch(`/api/sps/status/${spsName}`, { signal: abortController.signal });
        const data = await res.json();
        console.log(`[DEBUG] API-Response /api/sps/status/${spsName}:`, data);
        if (data.success && data.data) {
          Object.entries(data.data).forEach(([motorKey, status]: [string, any]) => {
            const maybeNum = parseInt(motorKey);
            let technicalName: string | undefined;
            if (Number.isFinite(maybeNum)) {
              technicalName = Object.entries(motorNumberMapping[spsName] || {}).find(([_unused, nr]) => nr === maybeNum)?.[0];
            } else {
              technicalName = motorKey;
            }
            if (technicalName) {
              const automVal = (status && 'automatik' in status) ? status.automatik : (status?.enabled ?? null);
              console.log(`[DEBUG] Setze Automatik-Status: ${technicalName} (SPS: ${spsName}, Key: ${motorKey}) →`, automVal);
              tempAutomatikEnabled[technicalName] = automVal;
            } else {
              console.warn(`[DEBUG] Kein technischer Name für MotorKey: ${motorKey} in SPS: ${spsName}`);
            }
          });
        } else {
          console.warn(`[DEBUG] Keine Daten für SPS: ${spsName}`);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // Abgebrochener Request – kein Fehler
        console.error(`❌ Fehler beim Laden des Status für ${spsName}:`, e);
      }
    }));

    // Only update state if this request was not superseded by a newer one
    if (!abortController.signal.aborted) {
      setAutomatikEnabled(tempAutomatikEnabled);
      setLoadingSpsStatus(false);
      console.log('[DEBUG] automatikEnabled nach loadAutomatikStatus:', tempAutomatikEnabled);
    }
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
    setAutomatikEnabled(prev => ({ ...prev, [automatikKey]: null })); // Set unknown during request
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
        // Reload once – AbortController ensures no stale response overwrites this
        await loadAutomatikStatus();
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
    const automatikKey = motor.technicalName || motor.name;
    if (!automatikEnabled[automatikKey]) {
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
  const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const maskToWeekdays = (mask: number) => weekdayNames.filter((_, i) => mask & (1 << i));

  const handleWeekdayChange = (idx: number, dayIndex: number, checked: boolean) => {
    const updated = [...timeAutoPoints];
    const point = { ...updated[idx] };
    const mask = point.weekdayMask || 0;
    const checkedCount = Array(7).fill(0).reduce((acc, _, i) => acc + ((mask & (1 << i)) ? 1 : 0), 0);
    if (!checked && checkedCount === 1 && (mask & (1 << dayIndex))) {
      // Prevent unchecking the last checked day
      return;
    }
    if (checked) {
      point.weekdayMask = mask | (1 << dayIndex);
    } else {
      point.weekdayMask = mask & ~(1 << dayIndex);
    }
    point.weekdays = maskToWeekdays(point.weekdayMask);
    updated[idx] = point;
    setTimeAutoPoints(updated);
  };

  const clampTimeValue = (field: 'hour' | 'minute', value: number) => {
    const min = 0;
    const max = field === 'hour' ? 23 : 59;
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
    setTimeAutoPoints(points => points.map((p, i) => i === idx ? { ...p, action } : p));
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
      <SpsView
        motorsBySPS={motorsBySPS}
        roomIcons={roomIcons}
        editingMotorId={editingMotorId}
        editingName={editingName}
        setEditingName={setEditingName}
        editingIconMotorId={editingIconMotorId}
        editingIcon={editingIcon}
        setEditingIcon={setEditingIcon}
        automatikEnabled={automatikEnabled}
        loadingSpsStatus={loadingSpsStatus}
        syncingTime={syncingTime}
        onBack={() => setView('main')}
        onSyncTime={syncTimeToAllSPS}
        onOpenAutomatiken={async (spsName) => { setSelectedSPS(spsName); setLoadingSpsStatus(true); setView('automatiken'); await loadSPSAutomatiken(spsName); }}
        onStartEditing={startEditing}
        onSaveEdit={saveEdit}
        onKeyDown={handleKeyDown}
        onStartEditingIcon={startEditingIcon}
        onSaveIcon={saveIcon}
        onIconKeyDown={handleIconKeyDown}
        onToggleAutomatik={toggleAutomatik}
        onOpenTimeAutoDialog={openTimeAutoDialog}
        onOpenMotorSettingsPanel={openMotorSettingsPanel}
        getDefaultIcon={getDefaultIcon}
      />
    )
  }

  if (view === 'zeitautomatik') {
    return (
      <ZeitautomatikView
        timeAutoMotor={timeAutoMotor}
        timeAutoPoints={timeAutoPoints}
        loadingTimeAuto={loadingTimeAuto}
        onBack={closeTimeAutoDialog}
        onSave={handleSaveTimeAuto}
        onWeekdayChange={handleWeekdayChange}
        onTimeChange={handleTimeChange}
        onActionChange={handleActionChange}
        clampTimeValue={clampTimeValue}
        formatTimeValue={formatTimeValue}
      />
    )
  }

  if (view === 'motorzeiten') {
    return (
      <MotorTimesView
        motorTimesMotor={motorTimesMotor}
        motorTimes={motorTimes}
        loadingMotorTimes={loadingMotorTimes}
        savingMotorTimes={savingMotorTimes}
        onBack={() => setView('main')}
        onSave={saveMotorTimes}
        onMotorTimesChange={handleMotorTimesChange}
      />
    )
  }

  if (view === 'groups') {
    return (
      <GroupsView
        motors={motors}
        groups={groups}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        selectedWindows={selectedWindows}
        setSelectedWindows={setSelectedWindows}
        editingGroup={editingGroup}
        onBack={() => setView('main')}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroupHandler}
        onStartEditingGroup={startEditingGroup}
        onCancelGroupEdit={cancelGroupEdit}
      />
    )
  }

  if (view === 'automatiken') {
    return (
      <AutomatikView
        selectedSPS={selectedSPS}
        spsAutomatikStatus={spsAutomatikStatus}
        loadingSpsStatus={loadingSpsStatus}
        onBack={() => setView('sps')}
        onToggleSPSAutomatik={toggleSPSAutomatik}
      />
    )
  }

  return (
    <div className="settings-screen">
      <div className="header">
        <h1>Einstellungen</h1>
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

