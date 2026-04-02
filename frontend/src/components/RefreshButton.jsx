import { useState } from "react";
import { api } from "../utils/api";
import { usePriceAlerts } from "../context/PriceAlertContext";

export default function RefreshButton({ onRefreshed }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { pushAlerts } = usePriceAlerts();

  const handleRefresh = async () => {
    setLoading(true);

    try {
      const result = await api.refresh();
      const changeCount = result.price_changes || 0;

      // 🔥 Toast message instead of inline
      setToast(
      changeCount > 0
    ? `🔥 ${changeCount} price changes`
    : `✅ no price changes`
    );

      if (result.changes?.length) pushAlerts(result.changes);

      onRefreshed?.();

      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`refresh-btn ${loading ? "refresh-btn--loading" : ""}`}
        onClick={handleRefresh}
        disabled={loading}
      >
        <span className="refresh-btn__icon">⟳</span>
        {loading ? "Refreshing..." : "Refresh Data"}
      </button>

      {/* 🔥 Floating Toast */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}