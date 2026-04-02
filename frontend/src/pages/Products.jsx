import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import SourceBadge from "../components/SourceBadge";
import RefreshButton from "../components/RefreshButton";

const LIMIT = 20;
const SOURCES = ["", "grailed", "fashionphile", "1stdibs"];

function ProductCard({ product, changedIds }) {
  const navigate = useNavigate();
  const minPrice = product.listings?.length
    ? Math.min(...product.listings.map((l) => l.current_price))
    : null;
  const hasChange = changedIds.has(product.id);

  return (
    <div className="card product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-card__image-wrap">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} loading="lazy" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
        ) : null}
        <div className="product-card__no-img" style={{ display: product.image_url ? "none" : "flex" }}>
          👜
        </div>
        {hasChange && (
          <div className="price-change-pill price-change-pill--down">Price Updated</div>
        )}
        <div className="product-card__source-row">
          {product.listings?.slice(0, 2).map((l) => (
            <SourceBadge key={l.source} source={l.source} />
          ))}
          {product.listings?.length > 2 && (
            <span className="source-badge source-badge--default">+{product.listings.length - 2}</span>
          )}
        </div>
      </div>
      <div className="product-card__body">
        <div className="product-card__brand">{product.brand || "Unknown Brand"}</div>
        <div className="product-card__title">{product.title}</div>
        <div className="product-card__category">{product.category || "—"}</div>
        <div className="product-card__footer">
          <div className="product-card__price">
            {minPrice != null ? `$${minPrice.toLocaleString()}` : "—"}
          </div>
          <div className="product-card__listings-count">
            {product.listings?.length || 0} listing{product.listings?.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [changedIds] = useState(new Set());

  // Filters
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const prevFilters = useRef({ source, category, minPrice, maxPrice });

  const fetchProducts = useCallback(async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        offset: pageNum * LIMIT,
        limit: LIMIT,
        source: source || undefined,
        category: category || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
      });
      if (reset) {
        setProducts(data);
      } else {
        setProducts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      if (reset) setTotal(data.length);
      else setTotal((t) => t + data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [source, category, minPrice, maxPrice]);

  // Re-fetch on filter change
  useEffect(() => {
    const curr = { source, category, minPrice, maxPrice };
    const changed = JSON.stringify(curr) !== JSON.stringify(prevFilters.current);
    prevFilters.current = curr;
    setPage(0);
    fetchProducts(0, true);
  }, [source, category, minPrice, maxPrice, fetchProducts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, false);
  };

  const handleRefreshed = () => {
    setPage(0);
    fetchProducts(0, true);
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">Product <span>Listings</span></h1>
          <p className="page-subtitle">
            {loading ? "Loading..." : `${total}+ products found`}
          </p>
        </div>
        <RefreshButton onRefreshed={handleRefreshed} />
      </div>

      {/* ── Filters ── */}
      <div className="filters-bar">
        <span className="filter-label">Filter:</span>
        <select
          className="filter-select"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">All Sources</option>
          {SOURCES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="filter-input"
          placeholder="Category..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          className="filter-input filter-input--sm"
          placeholder="Min $"
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          className="filter-input filter-input--sm"
          placeholder="Max $"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        {(source || category || minPrice || maxPrice) && (
          <button
            onClick={() => { setSource(""); setCategory(""); setMinPrice(""); setMaxPrice(""); }}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {loading && products.length === 0 ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-text">Loading products...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__text">No products found. Try adjusting your filters.</div>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} changedIds={changedIds} />
            ))}
          </div>

          {/* ── Load More ── */}
          <div className="pagination">
            {loading && products.length > 0 ? (
              <div className="loading-spinner" style={{ width: 24, height: 24 }} />
            ) : hasMore ? (
              <button className="pagination__btn" onClick={loadMore}>
                Load More Products
              </button>
            ) : (
              <span className="pagination__info">All products loaded · {products.length} total</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}