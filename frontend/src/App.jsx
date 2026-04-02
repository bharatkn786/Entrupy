import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import { PriceAlertProvider } from "./context/PriceAlertContext";
import PriceChangeBanner from "./components/PriceChangeBanner";
import "./App.css";

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
      <div className="navbar__inner">
        <div className="navbar__brand">
          <span className="navbar__logo">⬡</span>
          <span className="navbar__name">ENTRUPY</span>
          <span className="navbar__sub">PRICE MONITOR</span>
        </div>
        <div className="navbar__links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
            Products
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <PriceAlertProvider>
      <BrowserRouter>
        <div className="app">
          <NavBar />
          <PriceChangeBanner />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
            </Routes>
          </main>
          <footer className="footer">
            <span>© 2025 Entrupy Price Monitor</span>
            <span className="footer__dot">·</span>
            <span>Live Marketplace Intelligence</span>
          </footer>
        </div>
      </BrowserRouter>
    </PriceAlertProvider>
  );
}