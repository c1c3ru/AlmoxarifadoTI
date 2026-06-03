import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";

interface ConsumptionItem {
  itemId: string;
  itemName: string;
  internalCode: string;
  categoryName: string;
  categoryIcon: string;
  totalConsumed: number;
  unit: string;
  totalEntradas: number;
  lastMovement: string | null;
  currentStock: number;
}

const CATEGORY_PALETTES = [
  { bg: "from-amber-500 to-orange-600", bar: "#f59e0b", light: "rgba(245,158,11,0.15)" },
  { bg: "from-sky-500 to-blue-600", bar: "#0ea5e9", light: "rgba(14,165,233,0.15)" },
  { bg: "from-emerald-500 to-teal-600", bar: "#10b981", light: "rgba(16,185,129,0.15)" },
  { bg: "from-violet-500 to-purple-600", bar: "#8b5cf6", light: "rgba(139,92,246,0.15)" },
  { bg: "from-rose-500 to-pink-600", bar: "#f43f5e", light: "rgba(244,63,94,0.15)" },
  { bg: "from-cyan-500 to-indigo-600", bar: "#06b6d4", light: "rgba(6,182,212,0.15)" },
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelativeDate(d: string | null): string {
  if (!d) return "sem movimentação";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;
  return `há ${Math.floor(diffDays / 365)} ano(s)`;
}

export default function ConsumptionDashboard() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"consumed" | "stock" | "name">("consumed");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: rawItems = [], isLoading } = useQuery<ConsumptionItem[]>({
    queryKey: ["/api/dashboard/consumption"],
    refetchInterval: 120000,
  });

  const categoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    let idx = 0;
    rawItems.forEach((item) => {
      if (!(item.categoryName in map)) {
        map[item.categoryName] = idx % CATEGORY_PALETTES.length;
        idx++;
      }
    });
    return map;
  }, [rawItems]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    rawItems.forEach((i) => seen.add(i.categoryName));
    return Array.from(seen).sort();
  }, [rawItems]);

  const maxConsumed = useMemo(() => Math.max(...rawItems.map((i) => i.totalConsumed), 1), [rawItems]);

  const filtered = useMemo(() => {
    let items = [...rawItems];
    if (filterCategory !== "all") items = items.filter((i) => i.categoryName === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.internalCode.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      if (sortBy === "consumed") return b.totalConsumed - a.totalConsumed;
      if (sortBy === "stock") return a.currentStock - b.currentStock;
      return a.itemName.localeCompare(b.itemName);
    });
    return items;
  }, [rawItems, search, sortBy, filterCategory]);

  const totalConsumed = useMemo(() => rawItems.reduce((s, i) => s + i.totalConsumed, 0), [rawItems]);
  const totalEntradas = useMemo(() => rawItems.reduce((s, i) => s + i.totalEntradas, 0), [rawItems]);
  const totalItens = rawItems.length;
  const semMovimentacao = rawItems.filter((i) => i.totalConsumed === 0 && i.totalEntradas === 0).length;
  const topItem = rawItems[0];

  return (
    <MainLayout
      title="Dashboard de Consumo"
      subtitle="Consumo histórico de todos os itens desde o início do sistema"
      showAddButton={false}
    >
      {/* Google Font: Syne */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@500&display=swap');
        .consumption-title { font-family: 'Syne', sans-serif; }
        .consumption-mono  { font-family: 'IBM Plex Mono', monospace; }

        .cons-kpi-card {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.5) 100%);
          border: 1px solid hsl(var(--border));
          border-radius: 1rem;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cons-kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
        .cons-kpi-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--kpi-glow, transparent);
          opacity: 0.08;
          pointer-events: none;
        }

        .cons-bar-track {
          height: 8px;
          background: hsl(var(--muted));
          border-radius: 99px;
          overflow: hidden;
        }
        .cons-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
          animation: barGrow 1.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes barGrow {
          from { width: 0 !important; }
        }

        .cons-rank-badge {
          width: 2rem; height: 2rem;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .cons-item-row {
          border: 1px solid hsl(var(--border)/0.6);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          background: hsl(var(--card));
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          animation: rowFadeIn 0.4s ease both;
        }
        .cons-item-row:hover {
          border-color: hsl(var(--primary)/0.4);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          transform: translateX(4px);
        }
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cons-filter-btn {
          padding: 0.375rem 0.85rem;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid hsl(var(--border));
          background: transparent;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all 0.18s;
        }
        .cons-filter-btn:hover { border-color: hsl(var(--primary)/0.5); color: hsl(var(--foreground)); }
        .cons-filter-btn.active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-color: transparent;
        }

        .cons-skeleton {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 0.5rem;
        }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        .cons-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 4rem 2rem;
          color: hsl(var(--muted-foreground));
          text-align: center;
        }
      `}</style>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total saídas */}
        <div className="cons-kpi-card" style={{ "--kpi-glow": "linear-gradient(135deg,#f59e0b,#ef4444)" } as React.CSSProperties}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total de Saídas</p>
          <p className="consumption-title text-3xl font-extrabold text-foreground leading-none">
            {isLoading ? <span className="cons-skeleton inline-block w-16 h-8" /> : totalConsumed.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">unidades consumidas</p>
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <i className="fas fa-arrow-trend-up text-amber-500" />
          </div>
        </div>

        {/* Total entradas */}
        <div className="cons-kpi-card" style={{ "--kpi-glow": "linear-gradient(135deg,#10b981,#06b6d4)" } as React.CSSProperties}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total de Entradas</p>
          <p className="consumption-title text-3xl font-extrabold text-foreground leading-none">
            {isLoading ? <span className="cons-skeleton inline-block w-16 h-8" /> : totalEntradas.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">unidades recebidas</p>
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <i className="fas fa-arrow-trend-down text-emerald-500" />
          </div>
        </div>

        {/* Total tipos de itens */}
        <div className="cons-kpi-card" style={{ "--kpi-glow": "linear-gradient(135deg,#8b5cf6,#ec4899)" } as React.CSSProperties}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Tipos de Itens</p>
          <p className="consumption-title text-3xl font-extrabold text-foreground leading-none">
            {isLoading ? <span className="cons-skeleton inline-block w-12 h-8" /> : totalItens}
          </p>
          <p className="text-xs text-muted-foreground mt-1">cadastrados no sistema</p>
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <i className="fas fa-boxes-stacked text-violet-500" />
          </div>
        </div>

        {/* Maior consumidor */}
        <div className="cons-kpi-card" style={{ "--kpi-glow": "linear-gradient(135deg,#f43f5e,#fb923c)" } as React.CSSProperties}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Maior Consumidor</p>
          {isLoading ? (
            <span className="cons-skeleton inline-block w-full h-8" />
          ) : topItem ? (
            <>
              <p className="consumption-title text-lg font-extrabold text-foreground leading-tight line-clamp-1">{topItem.itemName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 consumption-mono">{topItem.totalConsumed.toLocaleString("pt-BR")} {topItem.unit}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          )}
          <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <i className="fas fa-crown text-rose-500" />
          </div>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-semibold mr-1">Ordenar:</span>
          {(["consumed", "stock", "name"] as const).map((s) => (
            <button
              key={s}
              className={`cons-filter-btn ${sortBy === s ? "active" : ""}`}
              onClick={() => setSortBy(s)}
            >
              {s === "consumed" ? "Mais consumido" : s === "stock" ? "Menor estoque" : "Nome A–Z"}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            className={`cons-filter-btn ${filterCategory === "all" ? "active" : ""}`}
            onClick={() => setFilterCategory("all")}
          >
            Todas
          </button>
          {categories.map((cat) => {
            const palette = CATEGORY_PALETTES[categoryMap[cat] ?? 0];
            return (
              <button
                key={cat}
                className={`cons-filter-btn ${filterCategory === cat ? "active" : ""}`}
                onClick={() => setFilterCategory(cat === filterCategory ? "all" : cat)}
                style={filterCategory === cat ? { background: palette.bar, borderColor: "transparent", color: "#fff" } : {}}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RESULTS COUNT ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "item" : "itens"} encontrado{filtered.length !== 1 ? "s" : ""}
          {semMovimentacao > 0 && (
            <span className="ml-2 text-xs text-amber-500 font-medium">
              • {semMovimentacao} sem movimentação
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground consumption-mono">
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── ITEM LIST ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="cons-item-row" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-4">
                <span className="cons-skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <span className="cons-skeleton block h-4 w-48" />
                  <span className="cons-skeleton block h-3 w-32" />
                  <span className="cons-skeleton block h-2 w-full" />
                </div>
                <span className="cons-skeleton w-16 h-6 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="cons-empty">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <i className="fas fa-chart-bar text-2xl text-muted-foreground" />
          </div>
          <p className="font-semibold text-lg">Nenhum item encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item, idx) => {
            const paletteIdx = categoryMap[item.categoryName] ?? 0;
            const palette = CATEGORY_PALETTES[paletteIdx];
            const pct = maxConsumed > 0 ? (item.totalConsumed / maxConsumed) * 100 : 0;
            const globalRank = rawItems.findIndex((r) => r.itemId === item.itemId) + 1;
            const isTop3 = globalRank <= 3;

            return (
              <div
                key={item.itemId}
                className="cons-item-row"
                style={{ animationDelay: `${Math.min(idx, 20) * 0.04}s` }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Rank badge */}
                  <div
                    className="cons-rank-badge text-white flex-shrink-0"
                    style={{
                      background: isTop3
                        ? ["linear-gradient(135deg,#f59e0b,#ef4444)", "linear-gradient(135deg,#9ca3af,#6b7280)", "linear-gradient(135deg,#d97706,#b45309)"][globalRank - 1]
                        : `hsl(var(--muted))`,
                      color: isTop3 ? "#fff" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {isTop3 ? (
                      <i className={["fas fa-trophy", "fas fa-medal", "fas fa-award"][globalRank - 1]} style={{ fontSize: "0.65rem" }} />
                    ) : (
                      <span className="text-xs">{globalRank}</span>
                    )}
                  </div>

                  {/* Category icon */}
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${palette.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <i className={`${item.categoryIcon} text-white text-sm`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate text-sm sm:text-base leading-tight">{item.itemName}</p>
                      <span className="consumption-mono text-xs text-muted-foreground flex-shrink-0">{item.internalCode}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: palette.light, color: palette.bar }}
                      >
                        {item.categoryName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <i className="fas fa-clock-rotate-left mr-1 opacity-50" />
                        {formatRelativeDate(item.lastMovement)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="cons-bar-track">
                      <div
                        className="cons-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${palette.bar}cc, ${palette.bar})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics column */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right ml-2">
                    <div>
                      <p className="consumption-title text-xl font-extrabold leading-none" style={{ color: palette.bar }}>
                        {item.totalConsumed.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.unit} saídas</p>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span title="Entradas">
                        <i className="fas fa-arrow-down text-emerald-500 mr-0.5" />
                        {item.totalEntradas.toLocaleString("pt-BR")}
                      </span>
                      <span title="Estoque atual">
                        <i className="fas fa-warehouse text-sky-400 mr-0.5" />
                        {item.currentStock.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {item.totalConsumed === 0 && item.totalEntradas === 0 && (
                      <span className="text-xs text-amber-500 font-semibold mt-0.5">
                        <i className="fas fa-minus-circle mr-1" />
                        Sem uso
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-center text-muted-foreground mt-8 mb-2">
          <i className="fas fa-info-circle mr-1" />
          Dados acumulados desde o início do sistema · Atualizado automaticamente a cada 2 minutos
        </p>
      )}
    </MainLayout>
  );
}
