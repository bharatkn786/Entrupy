import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import RefreshButton from "../components/RefreshButton";
import SourceBadge from "../components/SourceBadge";


function BarChart({ rows, maxVal }) {
  return (
    <div className="bar-chart">
      {rows.map(({ label, value }) => (
        <div className="bar-row" key={label}>
          <span className="bar-label">{label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.round((value / maxVal) * 100)}%` }}
            />
          </div>
          <span className="bar-value">${value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [changes, setChanges] = useState([]);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingC, setLoadingC] = useState(true);

  const fetchData = useCallback(async () => {
    setLoadingA(true);
    setLoadingC(true);
    try {
      const [a, c] = await Promise.all([
        api.getAnalytics(),
        api.getPriceChanges({ limit: 8 }),
      ]);
      setAnalytics(a);
      setChanges(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingA(false);
      setLoadingC(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalListings = analytics?.by_source?.reduce((s, r) => s + r.total_listings, 0) ?? 0;
  const totalSources = analytics?.by_source?.length ?? 0;
  const avgPrices = analytics?.by_category ?? [];
  const maxAvg = Math.max(...avgPrices.map((r) => r.avg_price), 1);

  return (
    <div className="page page--dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero__inner">
          <div className="page-header hero-header">
            <div>
              <h1 className="page-title">Market <span>Intelligence</span></h1>
              <p className="page-subtitle">Live data across luxury resale marketplaces</p>
            </div>
            <RefreshButton onRefreshed={fetchData} />
          </div>
        </div>
      </section>

      <div className="dashboard-content">

      {/* ── Top Stats ── */}
        <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Listings</div>
          <div className="stat-value stat-value--accent">
            {loadingA ? "—" : totalListings.toLocaleString()}
          </div>
          <div className="stat-sub">across all sources</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Sources Tracked</div>
          <div className="stat-value">{loadingA ? "—" : totalSources}</div>
          <div className="stat-sub">marketplaces connected</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Price Changes</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>
            {loadingA ? "—" : (analytics?.total_price_changes_detected ?? 0)}
          </div>
          <div className="stat-sub">detected in history</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Categories</div>
          <div className="stat-value">{loadingA ? "—" : avgPrices.length}</div>
          <div className="stat-sub">product types indexed</div>
        </div>
      </div>

        <div className="dash-grid">
        {/* ── By Source ── */}
        <div className="card dash-section">
          <div className="section-title">Listings by source</div>
          {loadingA ? (
            <div className="loading-state" style={{ padding: 40 }}>
              <div className="loading-spinner" />
            </div>
          ) : (
            <div>
              {analytics?.by_source?.map((row) => (
                <div className="source-stat-row" key={row.source}>
                  <div className={`source-dot source-dot--${row.source.toLowerCase().replace(/\s/g, "")}`} />
                  <span className="source-stat-name">{row.source}</span>
                  <span className="source-stat-value">{row.total_listings}</span>
                </div>
              ))}
              {!analytics?.by_source?.length && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state__text">No data yet — try refreshing</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Avg Price by Category ── */}
        <div className="card dash-section">
          <div className="section-title">Avg. price by category</div>
          {loadingA ? (
            <div className="loading-state" style={{ padding: 40 }}>
              <div className="loading-spinner" />
            </div>
          ) : avgPrices.length ? (
            <BarChart
              rows={avgPrices.map((r) => ({ label: r.category || "Unknown", value: r.avg_price }))}
              maxVal={maxAvg}
            />
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state__text">No category data yet</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Price Changes ── */}
        <div className="card dash-section" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Recent price changes</div>
          <Link to="/products" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", textDecoration: "none", letterSpacing: "0.1em" }}>
            VIEW ALL →
          </Link>
        </div>
        {loadingC ? (
          <div className="loading-state" style={{ padding: 40 }}>
            <div className="loading-spinner" />
          </div>
        ) : changes.length ? (
          <table className="price-table">
            <thead>
              <tr>
                <th>Listing ID</th>
                <th>Old Price</th>
                <th>New Price</th>
                <th>Change</th>
                <th>Detected</th>
                <th>View</th>  
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => {
                const pct = c.change_pct;
                const up = pct > 0;
                return (
                  <tr key={i}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>
                  #{c.listing_id}
                </td>

                <td>${c.old_price?.toLocaleString()}</td>

                <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  ${c.new_price?.toLocaleString()}
                </td>

                <td
                  className={pct > 0 ? "price-up" : "price-down"}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 15 }}
                >
                  {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
                </td>

                <td
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {c.changed_at ? new Date(c.changed_at).toLocaleString() : "—"}
                </td>

                {/* 🔥 NEW ACTION COLUMN */}
                <td>
                  <button
                    className="table-btn"
                    onClick={() => navigate(`/products/${c.product_id}`)}
                  >
                    Check →
                  </button>
                </td>
              </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <div className="empty-state__text">No price changes detected yet.<br />Try refreshing the data.</div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}