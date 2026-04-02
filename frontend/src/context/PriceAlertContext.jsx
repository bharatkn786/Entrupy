import { createContext, useContext, useState, useCallback } from "react";

const PriceAlertContext = createContext(null);

export function PriceAlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const pushAlerts = useCallback((changes) => {
    if (!changes || changes.length === 0) return;
    const newAlerts = changes.map((c, i) => ({
      id: Date.now() + i,
      ...c,
    }));
    setAlerts(newAlerts);
    // Auto-dismiss after 12s
    setTimeout(() => setAlerts([]), 12000);
  }, []);

  const dismiss = useCallback(() => setAlerts([]), []);

  return (
    <PriceAlertContext.Provider value={{ alerts, pushAlerts, dismiss }}>
      {children}
    </PriceAlertContext.Provider>
  );
}

export function usePriceAlerts() {
  return useContext(PriceAlertContext);
}