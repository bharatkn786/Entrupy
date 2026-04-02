import { usePriceAlerts } from "../context/PriceAlertContext";
import { useNavigate } from "react-router-dom";

export default function PriceChangeBanner() {
  const { alerts, dismiss } = usePriceAlerts();
  const navigate = useNavigate();

  if (!alerts.length) return null;

  return (
    <div className="price-banner">
      <span className="price-banner__icon">⚡</span>

      <div style={{ flex: 1 }}>
        <strong>Price change detected</strong>

        {/*  SCROLLABLE CONTAINER */}
        <div className="price-banner__changes scrollable">
          {alerts.map((a) => (
            <div key={a.id} className="price-banner__pill">

              {/* Title */}
              <span>
                {a.title?.slice(0, 22)}
                {a.title?.length > 22 ? "…" : ""}
              </span>

              {/* Change % */}
              <span style={{ fontWeight: 600, marginLeft: 6 }}>
                {a.change_pct > 0 ? "▲" : "▼"} {Math.abs(a.change_pct)}%
              </span>

              {/* 🔥 BUTTON */}
              <button
                className="check-btn"
                onClick={() => navigate(`/products/${a.product_id}`)}
              >
                Check here →
              </button>

            </div>
          ))}
        </div>
      </div>

      <button className="price-banner__close" onClick={dismiss}>✕</button>
    </div>
  );
}