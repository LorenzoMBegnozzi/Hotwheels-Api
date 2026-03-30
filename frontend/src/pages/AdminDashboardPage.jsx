import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import "../css/AdminDashboard.css";

const ADMIN_EMAIL = "lorenzobegnozzi@hotmail.com";

const getAuthHeaders = () => {
  let token = localStorage.getItem("token");
  if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;
  return token ? { Authorization: token } : {};
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const timeAgo = (d) => {
  if (!d) return "Nunca";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return formatDate(d);
};

const StatCard = ({ label, value, sub, accent }) => (
  <div className={`adm-card${accent ? " adm-card--accent" : ""}`}>
    <span className="adm-card-value">{value ?? "—"}</span>
    <span className="adm-card-label">{label}</span>
    {sub && <span className="adm-card-sub">{sub}</span>}
  </div>
);

const MiniBar = ({ value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="adm-minibar-track">
      <div className="adm-minibar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null); // null=loading, true/false
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [view, setView] = useState("overview"); // 'overview' | 'users'
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");

  // 1. Verifica se o usuário logado é o admin
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get("/api/auth/profile", {
          headers: getAuthHeaders(),
        });
        if (data.email?.toLowerCase() === ADMIN_EMAIL) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch {
        setAllowed(false);
      }
    };
    check();
  }, []);

  // 2. Carrega stats quando acesso permitido
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get("/api/admin/stats", {
        headers: getAuthHeaders(),
      });
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/api/admin/users", {
        headers: getAuthHeaders(),
      });
      setAllUsers(data);
    } catch {
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      loadStats();
    }
  }, [allowed, loadStats]);

  useEffect(() => {
    if (allowed && view === "users" && allUsers.length === 0) {
      loadUsers();
    }
  }, [allowed, view, allUsers.length, loadUsers]);

  // Auto-refresh a cada 30s
  useEffect(() => {
    if (!allowed) return;
    const id = setInterval(loadStats, 30_000);
    return () => clearInterval(id);
  }, [allowed, loadStats]);

  if (allowed === null) {
    return (
      <div className="adm-loading-screen">
        <div className="adm-spinner" />
        <p>Verificando acesso…</p>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="adm-denied">
        <span className="adm-denied-icon">🚫</span>
        <h2>Acesso negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <button className="adm-btn" onClick={() => navigate("/home")}>
          Voltar ao início
        </button>
      </div>
    );
  }

  // Chart: registros por dia (últimos 7 dias)
  const chartData = (() => {
    if (!stats?.registrationsByDay) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = stats.registrationsByDay.find((r) => r._id === key);
      days.push({
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }),
        count: entry?.count ?? 0,
      });
    }
    return days;
  })();
  const chartMax = Math.max(...chartData.map((d) => d.count), 1);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="adm-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-left">
            <span className="adm-header-icon">⚙️</span>
            <div>
              <h1 className="adm-header-title">Painel Admin</h1>
              <p className="adm-header-sub">Hotwheels API · atualiza a cada 30s</p>
            </div>
          </div>
          <button
            className="adm-btn adm-btn--ghost"
            onClick={() => navigate("/home")}
          >
            ← Voltar
          </button>
        </div>
        <div className="adm-tabs">
          <button
            className={`adm-tab${view === "overview" ? " adm-tab--active" : ""}`}
            onClick={() => setView("overview")}
          >
            Visão geral
          </button>
          <button
            className={`adm-tab${view === "users" ? " adm-tab--active" : ""}`}
            onClick={() => setView("users")}
          >
            Usuários
          </button>
        </div>
      </header>

      <main className="adm-main">
        {view === "overview" && (
          <>
            {loadingStats && !stats ? (
              <div className="adm-loading">
                <div className="adm-spinner" />
              </div>
            ) : (
              <>
                {/* Cards de métricas */}
                <section className="adm-section">
                  <h2 className="adm-section-title">Métricas gerais</h2>
                  <div className="adm-cards-grid">
                    <StatCard
                      label="Usuários cadastrados"
                      value={stats?.totalUsers}
                      accent
                    />
                    <StatCard
                      label="Online agora"
                      value={stats?.onlineUsers}
                      sub="(últimos 15 min)"
                      accent
                    />
                    <StatCard label="Carros no catálogo" value={stats?.totalCars} />
                    <StatCard label="Publicações no feed" value={stats?.totalPosts} />
                    <StatCard
                      label="Novos hoje"
                      value={stats?.newUsersToday}
                      sub="cadastros hoje"
                    />
                    <StatCard
                      label="Novos esta semana"
                      value={stats?.newUsersWeek}
                      sub="últimos 7 dias"
                    />
                    <StatCard
                      label="Novos este mês"
                      value={stats?.newUsersMonth}
                      sub="mês atual"
                    />
                  </div>
                </section>

                {/* Gráfico de cadastros */}
                <section className="adm-section">
                  <h2 className="adm-section-title">Cadastros — últimos 7 dias</h2>
                  <div className="adm-chart">
                    {chartData.map((day) => (
                      <div key={day.label} className="adm-chart-col">
                        <span className="adm-chart-count">{day.count}</span>
                        <div className="adm-chart-bar-wrap">
                          <div
                            className="adm-chart-bar"
                            style={{
                              height: `${Math.round((day.count / chartMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="adm-chart-label">{day.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Top coletores */}
                <section className="adm-section">
                  <h2 className="adm-section-title">Top coletores</h2>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Usuário</th>
                          <th>Email</th>
                          <th>Coleção</th>
                          <th>Seguidores</th>
                          <th>Visto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.topCollectors?.map((u, i) => (
                          <tr key={u._id}>
                            <td className="adm-rank">#{i + 1}</td>
                            <td className="adm-user-cell">
                              <span className="adm-username">{u.name}</span>
                            </td>
                            <td className="adm-muted">{u.email}</td>
                            <td>
                              <div className="adm-bar-cell">
                                <span>{u.collectionSize}</span>
                                <MiniBar
                                  value={u.collectionSize}
                                  max={stats.topCollectors[0]?.collectionSize}
                                />
                              </div>
                            </td>
                            <td>{u.followersCount}</td>
                            <td className="adm-muted">{timeAgo(u.lastSeen)}</td>
                          </tr>
                        ))}
                        {!stats?.topCollectors?.length && (
                          <tr>
                            <td colSpan={6} className="adm-empty">
                              Nenhum dado disponível
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Cadastros recentes */}
                <section className="adm-section">
                  <h2 className="adm-section-title">Cadastros recentes</h2>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Usuário</th>
                          <th>Email</th>
                          <th>Cadastrado em</th>
                          <th>Último acesso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.recentUsers?.map((u) => (
                          <tr key={u._id}>
                            <td className="adm-username">{u.name}</td>
                            <td className="adm-muted">{u.email}</td>
                            <td>{formatDate(u.createdAt)}</td>
                            <td className="adm-muted">{timeAgo(u.lastSeen)}</td>
                          </tr>
                        ))}
                        {!stats?.recentUsers?.length && (
                          <tr>
                            <td colSpan={4} className="adm-empty">
                              Nenhum dado disponível
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {view === "users" && (
          <section className="adm-section">
            <div className="adm-users-header">
              <h2 className="adm-section-title">
                Todos os usuários ({allUsers.length})
              </h2>
              <div className="adm-search-wrap">
                <input
                  className="adm-search"
                  type="text"
                  placeholder="Buscar por nome ou email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="adm-btn adm-btn--sm" onClick={loadUsers}>
                  ↻ Atualizar
                </button>
              </div>
            </div>
            {loadingUsers ? (
              <div className="adm-loading">
                <div className="adm-spinner" />
              </div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Email</th>
                      <th>Coleção</th>
                      <th>Seguidores</th>
                      <th>Seguindo</th>
                      <th>Cadastrado</th>
                      <th>Último acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isOnline =
                        u.lastSeen &&
                        Date.now() - new Date(u.lastSeen).getTime() < 15 * 60 * 1000;
                      return (
                        <tr key={u._id}>
                          <td className="adm-user-cell">
                            {isOnline && (
                              <span className="adm-online-dot" title="Online" />
                            )}
                            <span className="adm-username">{u.name}</span>
                          </td>
                          <td className="adm-muted">{u.email}</td>
                          <td>{u.collectionSize}</td>
                          <td>{u.followersCount}</td>
                          <td>{u.followingCount}</td>
                          <td className="adm-muted">{formatDate(u.createdAt)}</td>
                          <td className="adm-muted">{timeAgo(u.lastSeen)}</td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="adm-empty">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
