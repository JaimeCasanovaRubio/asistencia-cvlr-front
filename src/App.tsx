import { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { api } from './api/client';
import type { Team, Player, Attendance, TrainingDays } from './types';
import { getTrainingDatesForTeam } from './utils/dates';
import {
  nextStatus,
  statusInfo,
  getPlayerAttendancePercent,
  getTeamAttendancePercent,
} from './utils/attendance';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Estados sincronizados con la Base de Datos
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  // Hash Router idéntico (#/, #/team?id=..., #/player?team=...&player=...)
  const [routeHash, setRouteHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHashChange = () => setRouteHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Formulario nuevo equipo
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDays, setNewTeamDays] = useState<TrainingDays>('martes_jueves');

  // Formulario nuevo jugador
  const [newPlayerName, setNewPlayerName] = useState('');

  // Fecha seleccionada
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // 1. CARGA INICIAL DE EQUIPOS DESDE FASTAPI
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teams');
      // Adaptar formato por si FastAPI usa snake_case (training_days)
      const mapped = res.data.map((t: any) => ({
        id: String(t.id),
        name: t.name,
        trainingDays: t.training_days || t.trainingDays || 'martes_jueves',
      }));
      setTeams(mapped);
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTeams();
    }
  }, [token]);

  // Desglosar la ruta actual
  const [path, queryString] = routeHash.split('?');
  const params = new URLSearchParams(queryString || '');
  const activeTeamId = params.get('id') || params.get('team') || '';

  // 2. CARGA DE JUGADORES Y ASISTENCIAS DEL EQUIPO SELECCIONADO
  const fetchTeamData = async (teamId: string) => {
    if (!teamId) return;
    try {
      setLoading(true);
      // Peticiones en paralelo al backend
      const [resPlayers, resAttendances] = await Promise.all([
        api.get(`/player/team/${teamId}`),
        api.get(`/teams/${teamId}/attendances`),
      ]);

      setPlayers(
        resPlayers.data.map((p: any) => ({
          id: String(p.id),
          teamId: String(teamId),
          name: p.name,
        }))
      );

      setAttendances(
        resAttendances.data.map((a: any) => ({
          id: String(a.id),
          playerId: String(a.player_id || a.playerId),
          date: a.date,
          status: a.status,
        }))
      );
    } catch (err) {
      console.error('Error al cargar datos del equipo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTeamId) {
      fetchTeamData(activeTeamId);
    }
  }, [token, activeTeamId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTeams([]);
    setPlayers([]);
    setAttendances([]);
  };

  if (!token) {
    return <Login onLoginSuccess={() => setToken(localStorage.getItem('token'))} />;
  }

  // ------------------------------------------------------------
  // PANTALLA 1: Lista de Equipos (#/)
  // ------------------------------------------------------------
  if (path === '#/' || !path) {
    const handleAddTeam = async (e: any) => {
      e.preventDefault();
      if (!newTeamName.trim()) return;
      try {
        const res = await api.post('/teams/create', {
          name: newTeamName,
          training_days: newTeamDays,
        });

        const created: Team = {
          id: String(res.data.id),
          name: res.data.name,
          trainingDays: res.data.training_days || res.data.trainingDays,
        };

        setTeams([...teams, created]);
        setNewTeamName('');
      } catch (err) {
        alert('Error al crear el equipo en la base de datos');
      }
    };

    const handleDeleteTeam = async (teamId: string) => {
      if (!confirm('¿Eliminar equipo y sus jugadores en Neon?')) return;

      try {
        await api.delete(`/teams/${teamId}`);
        setTeams(teams.filter((t) => t.id !== teamId));
      } catch (err) {
        alert('Error al eliminar equipo de la base de datos');
      }
    };

    return (
      <div className="container-app">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-xs text-slate-400">CVLR Asistencia (Online)</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-red-400 hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="card">
          <h1>🏟️️ Mis Equipos</h1>
          <form onSubmit={handleAddTeam} className="row-form flex-col sm:flex-row">
            <input
              type="text"
              placeholder="Nombre del equipo (ej: Benjamines)"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
            <select
              value={newTeamDays}
              onChange={(e) => setNewTeamDays(e.target.value as TrainingDays)}
            >
              <option value="martes_jueves">Martes y Jueves</option>
              <option value="lunes_miercoles">Lunes y Miércoles</option>
            </select>
            <button 
            type="submit" 
            className="btn-main">+ Crear equipo
            </button>
          </form>
        </div>

        <div className="card">
          <h1>📋 Lista</h1>
          {loading && teams.length === 0 ? (
            <p className="muted">Cargando equipos desde la base de datos...</p>
          ) : teams.length === 0 ? (
            <p className="muted">No hay equipos en la base de datos. Crea uno arriba.</p>
          ) : (
            teams.map((t) => {
              const pct = getTeamAttendancePercent(t.id, players, attendances);
              const count = players.filter((p) => p.teamId === t.id).length;
              const days = t.trainingDays === 'martes_jueves' ? 'Mar/Jue' : 'Lun/Mié';
              return (
                <div key={t.id} className="row">
                  <div>
                    <a href={`#/team?id=${t.id}`}>
                      <b>{t.name}</b>
                    </a>
                    <div className="muted">
                      {days} · {count} jugadores · {pct}%
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleDeleteTeam(t.id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // PANTALLA 2: Detalle de Equipo (#/team?id=...)
  // ------------------------------------------------------------
  if (path === '#/team') {
    const teamId = params.get('id') || '';
    const team = teams.find((t) => t.id === teamId);

    if (!team) {
      return (
        <div className="container-app">
          <div className="card">
            <p className="muted">Buscando datos del equipo...</p>
            <a href="#/">← Volver a equipos</a>
          </div>
        </div>
      );
    }

    const dates = getTrainingDatesForTeam(team.trainingDays);
    const effectiveDate = dates.includes(selectedDate) ? selectedDate : dates[0] || today;
    const teamPlayers = players.filter((p) => p.teamId === team.id);
    const teamPct = getTeamAttendancePercent(team.id, players, attendances);

    const handleAddPlayer = async (e: any) => {
      e.preventDefault();
      if (!newPlayerName.trim()) return;

      try {
        const res = await api.post(`/player`, {
          name: newPlayerName.trim(),
          team_id: team.id,
        });

        const created: Player = {
          id: String(res.data.id),
          teamId: team.id,
          name: res.data.name,
        };

        setPlayers([...players, created]);
        setNewPlayerName('');
      } catch (err) {
        alert('Error al añadir jugador al servidor');
      }
    };

    const handleDeletePlayer = async (playerId: string) => {
      if (!confirm('¿Quitar jugador de la base de datos?')) return;

      try {
        await api.delete(`/players/${playerId}`);
        setPlayers(players.filter((p) => p.id !== playerId));
        setAttendances(attendances.filter((a) => a.playerId !== playerId));
      } catch (err) {
        alert('Error al borrar jugador');
      }
    };

    const handleCycleStatus = async (playerId: string) => {
      const existing = attendances.find(
        (a) => a.playerId === playerId && a.date === effectiveDate
      );
      const next = nextStatus(existing?.status);

      try {
        // Enviar a FastAPI el nuevo estado para este jugador y fecha
        const res = await api.post('/attendance', {
          player_id: playerId,
          date: effectiveDate,
          status: next,
        });

        const updatedAttendance: Attendance = {
          id: String(res.data.id || existing?.id || Math.random()),
          playerId,
          date: effectiveDate,
          status: next,
        };

        if (existing) {
          setAttendances(
            attendances.map((a) => (a.id === existing.id ? updatedAttendance : a))
          );
        } else {
          setAttendances([...attendances, updatedAttendance]);
        }
      } catch (err) {
        alert('Error al guardar asistencia en el servidor');
      }
    };

    const handleExportCsv = () => {
      let csv = 'Fecha,Jugador,Estado\n';
      for (const a of attendances) {
        const owner = teamPlayers.find((p) => p.id === a.playerId);
        if (owner) {
          csv += `"${a.date}","${owner.name}","${a.status}"\n`;
        }
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `asistencias_${team.name}_${effectiveDate}.csv`;
      link.click();
    };

    return (
      <div className="container-app">
        <div className="card">
          <a href="#/">← Equipos</a>
          <h1 className="mt-2">{team.name}</h1>
          <div className="muted mb-3">
            {team.trainingDays === 'martes_jueves' ? 'Martes y Jueves' : 'Lunes y Miércoles'} · General {teamPct}%
          </div>

          <label className="text-xs text-slate-400 block mb-1">Fecha de entreno:</label>
          <select
            value={effectiveDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <form onSubmit={handleAddPlayer} className="row-form">
            <input
              type="text"
              placeholder="Nombre del jugador"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
            <button type="submit" className="btn-main">+ Añadir</button>
          </form>
        </div>

        <div className="card">
          <h1>📋 Pasar lista ({effectiveDate})</h1>
          {teamPlayers.length === 0 ? (
            <p className="muted">Sin jugadores. Añade uno arriba.</p>
          ) : (
            teamPlayers.map((p) => {
              const att = attendances.find(
                (a) => a.playerId === p.id && a.date === effectiveDate
              );
              const info = statusInfo(att?.status);
              const playerPct = getPlayerAttendancePercent(p.id, attendances);

              return (
                <div key={p.id} className="row">
                  <div>
                    <a href={`#/player?team=${team.id}&player=${p.id}`}>
                      <b>{p.name}</b>
                    </a>
                    <div className="muted">{playerPct}% asistencia</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-status"
                      onClick={() => handleCycleStatus(p.id)}
                      style={{ borderColor: info.color, color: info.color }}
                    >
                      {info.label}
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDeletePlayer(p.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <button type="button" onClick={handleExportCsv} className="btn-export">
            📥 Exportar CSV
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // PANTALLA 3: Historial del Jugador (#/player?team=...&player=...)
  // ------------------------------------------------------------
  if (path === '#/player') {
    const teamId = params.get('team') || '';
    const playerId = params.get('player') || '';
    const team = teams.find((t) => t.id === teamId);
    const player = players.find((p) => p.id === playerId);

    if (!team || !player) {
      return (
        <div className="container-app">
          <div className="card">
            <p className="muted">Cargando historial...</p>
            <a href={`#/team?id=${teamId}`}>← Volver al equipo</a>
          </div>
        </div>
      );
    }

    const dates = getTrainingDatesForTeam(team.trainingDays);
    const playerAttendances = attendances.filter((a) => a.playerId === player.id);
    const markedCount = playerAttendances.length;
    const playerPct = getPlayerAttendancePercent(player.id, attendances);

    const handleCyclePlayerDate = async (date: string) => {
      const existing = attendances.find(
        (a) => a.playerId === player.id && a.date === date
      );
      const next = nextStatus(existing?.status);

      try {
        const res = await api.post('/attendance', {
          player_id: player.id,
          date,
          status: next,
        });

        const updatedAttendance: Attendance = {
          id: String(res.data.id || existing?.id || Math.random()),
          playerId: player.id,
          date,
          status: next,
        };

        if (existing) {
          setAttendances(
            attendances.map((a) => (a.id === existing.id ? updatedAttendance : a))
          );
        } else {
          setAttendances([...attendances, updatedAttendance]);
        }
      } catch (err) {
        alert('Error al actualizar fecha en la base de datos');
      }
    };

    return (
      <div className="container-app">
        <div className="card">
          <a href={`#/team?id=${team.id}`}>← {team.name}</a>
          <h1 className="mt-2">{player.name}</h1>
          <div className="muted">
            {markedCount}/{dates.length} días marcados · {playerPct}% asistencia
          </div>
          <p className="muted mt-2">
            Toca una fecha para ciclar: ✓ → ⚠ → ✗ → ⏱ → ✓ ...
          </p>
        </div>

        <div className="card">
          {dates.map((d) => {
            const att = attendances.find(
              (a) => a.playerId === player.id && a.date === d
            );
            const info = statusInfo(att?.status);
            return (
              <div key={d} className="row">
                <span>{d}</span>
                <button
                  type="button"
                  className="btn-status"
                  onClick={() => handleCyclePlayerDate(d)}
                  style={{ borderColor: info.color, color: info.color }}
                >
                  {info.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}