import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../utils/api";
import SourceBadge from "../components/SourceBadge";

function PriceHistoryChart({ history }) {
  if (!history.length) return null;

  // Simple sparkline using SVG
  const prices = history.map((h) => h.new_price).reverse();
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 300, H = 60, PAD = 8;

  const points = prices.map((p, i) => {
    const x = PAD + (i / (prices.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - ((p - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 300, height: 60 }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {prices.map((p, i) => {
        const [x, y] = points[i].split(",");
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" opacity={i === prices.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [p, h] = await Promise.all([
          api.getProduct(id),
          api.getPriceHistory(id),
        ]);
        setProduct(p);
        setHistory(h);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-text">Loading product...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page">
        <div className="error-box">{error || "Product not found."}</div>
        <Link to="/products" className="back-btn" style={{ marginTop: 20 }}>← Back to Products</Link>
      </div>
    );
  }

  const historyPrices = history.map(h => h.new_price);

  const minPrice = historyPrices.length
    ? Math.min(...historyPrices)
    : product.listings?.length
      ? Math.min(...product.listings.map(l => l.current_price))
      : null;

  const maxPrice = historyPrices.length
    ? Math.max(...historyPrices)
    : product.listings?.length
      ? Math.max(...product.listings.map(l => l.current_price))
      : null;

  // Group history by listing
  const historyByListing = {};
  history.forEach((h) => {
    if (!historyByListing[h.listing_id]) historyByListing[h.listing_id] = [];
    historyByListing[h.listing_id].push(h);
  });

  return (
    <div className="page">
      <Link to="/products" className="back-btn">← Back to Products</Link>

      <div className="detail-layout">
        {/* ── Image ── */}
        <div>
          <div className="detail-image-wrap">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title}
                onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
            ) : null}
            <div className="detail-no-img" style={{ display: product.image_url ? "none" : "flex" }}>
              👜
            </div>
          </div>

          {/* Price range under image */}
          {minPrice != null && (
            <div className="card" style={{ marginTop: 16, padding: 20, display: "flex", gap: 24, justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div className="stat-label">Lowest</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--green)" }}>
                  ${minPrice.toLocaleString()}
                </div>
              </div>
              <div style={{ width: 1, background: "var(--border)" }} />
              <div style={{ textAlign: "center" }}>
                <div className="stat-label">Highest</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--red)" }}>
                  ${maxPrice.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="detail-right">
          <div>
            <div className="detail-brand">{product.brand}</div>
            <h1 className="detail-title">{product.title}</h1>
          </div>

          <div className="detail-meta">
            {product.category && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-elevated)", padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border)" }}>
                {product.category}
              </span>
            )}
          </div>

          {/* Listings */}
          <div>
            <div className="section-title">Available on</div>
            <div className="detail-listings">
              {product.listings?.map((l) => (
                <div className="listing-row" key={l.id}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <SourceBadge source={l.source} />
                    <div className="listing-row__price">${l.current_price?.toLocaleString()} <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>{l.currency}</span></div>
                  </div>
                  {l.listing_url && (
                    <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="listing-row__link">
                      View ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price history sparkline */}
          {history.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 16 }}>Price Trend</div>
              <PriceHistoryChart history={history} />
            </div>
          )}
        </div>
      </div>

      {/* ── Full price history table ── */}
      <div className="card dash-section" style={{ marginTop: 40 }}>
        <div className="section-title">Full price history</div>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📈</div>
            <div className="empty-state__text">No price change history yet.</div>
          </div>
        ) : (
          <table className="price-table">
            <thead>
              <tr>
                <th>Listing ID</th>
                <th>Old Price</th>
                <th>New Price</th>
                <th>Change</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const hasOld = h.old_price != null;
                const pct = hasOld
                  ? (((h.new_price - h.old_price) / h.old_price) * 100).toFixed(1)
                  : null;
                const up = pct > 0;
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>#{h.listing_id}</td>
                    <td>{hasOld ? `$${h.old_price?.toLocaleString()}` : <span style={{ color: "var(--text-tertiary)" }}>First seen</span>}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>${h.new_price?.toLocaleString()}</td>
                    <td>
                      {pct != null ? (
                        <span className={up ? "price-up" : "price-down"} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          {up ? "▲" : "▼"} {Math.abs(pct)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
                      {h.observed_at ? new Date(h.observed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}