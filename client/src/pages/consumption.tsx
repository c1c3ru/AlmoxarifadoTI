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

const PALETTE = [
  { bar: "#f59e0b", bg: "#f59e0b22", text: "#d97706" },
  { bar: "#0ea5e9", bg: "#0ea5e922", text: "#0284c7" },
  { bar: "#10b981", bg: "#10b98122", text: "#059669" },
  { bar: "#8b5cf6", bg: "#8b5cf622", text: "#7c3aed" },
  { bar: "#f43f5e", bg: "#f43f5e22", text: "#e11d48" },
  { bar: "#06b6d4", bg: "#06b6d422", text: "#0891b2" },
  { bar: "#84cc16", bg: "#84cc1622", text: "#65a30d" },
  { bar: "#ec4899", bg: "#ec489922", text: "#db2777" },
];

function relativeDate(d: string | null): string {
  if (!d) return "sem uso";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 30) return `${diff}d atrás`;
  if (diff < 365) return `${Math.floor(diff / 30)}m atrás`;
  return `${Math.floor(diff / 365)}a atrás`;
}

function RankBadge({ rank }: { rank: number }) {
  const medals = [
    { bg: "#f59e0b", icon: "fas fa-trophy" },
    { bg: "#94a3b8", icon: "fas fa-medal" },
    { bg: "#d97706", icon: "fas fa-award" },
  ];
  if (rank <= 3) {
    const m = medals[rank - 1];
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: m.bg }}
      >
        <i className={`${m.icon} text-white`} style={{ fontSize: "0.6rem" }} />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
      <span className="text-muted-foreground font-bold" style={{ fontSize: "0.65rem" }}>
        {rank}
      </span>
    </div>
  );
}

export default function ConsumptionDashboard() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"consumed" | "stock" | "name">("consumed");
  const [category, setCategory] = useState<string>("all");

  const { data: raw = [], isLoading } = useQuery<ConsumptionItem[]>({
    queryKey: ["/api/dashboard/consumption"],
    refetchInterval: 120000,
  });

  const catPalette = useMemo(() => {
    const map: Record<string, number> = {};
    let i = 0;
    raw.forEach((r) => {
      if (!(r.categoryName in map)) map[r.categoryName] = i++ % PALETTE.length;
    });
    return map;
  }, [raw]);

  const categories = useMemo(() => Array.from(new Set(raw.map((r) => r.categoryName))).sort(), [raw]);
  const maxConsumed = useMemo(() => Math.max(...raw.map((r) => r.totalConsumed), 1), [raw]);

  const items = useMemo(() => {
    let list = [...raw];
    if (category !== "all") list = list.filter((i) => i.categoryName === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.internalCode.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "consumed") return b.totalConsumed - a.totalConsumed;
      if (sortBy === "stock") return a.currentStock - b.currentStock;
      return a.itemName.localeCompare(b.itemName);
    });
    return list;
  }, [raw, category, search, sortBy]);

  const totalSaidas = raw.reduce((s, i) => s + i.totalConsumed, 0);
  const totalEntradas = raw.reduce((s, i) => s + i.totalEntradas, 0);
  const topItem = raw[0];

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div
      className={`rounded-lg animate-pulse bg-muted ${className}`}
      style={{ minHeight: "1rem" }}
    />
  );

  return (
    <MainLayout
      title="Dashboard de Consumo"
      subtitle="Saídas acumuladas desde o início do sistema"
      showAddButton={false}
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total de Saídas",
            value: isLoading ? null : totalSaidas.toLocaleString("pt-BR"),
            sub: "unidades",
            icon: "fas fa-arrow-up",
            color: "#f43f5e",
            colorBg: "#f43f5e18",
          },
          {
            label: "Total de Entradas",
            value: isLoading ? null : totalEntradas.toLocaleString("pt-BR"),
            sub: "unidades",
            icon: "fas fa-arrow-down",
            color: "#10b981",
            colorBg: "#10b98118",
          },
          {
            label: "Tipos de Itens",
            value: isLoading ? null : String(raw.length),
            sub: "cadastrados",
            icon: "fas fa-boxes-stacked",
            color: "#8b5cf6",
            colorBg: "#8b5cf618",
          },
          {
            label: "Maior Consumidor",
            value: isLoading ? null : topItem?.itemName ?? "—",
            sub: topItem ? `${topItem.totalConsumed} ${topItem.unit}` : "",
            icon: "fas fa-crown",
            color: "#f59e0b",
            colorBg: "#f59e0b18",
            truncate: true,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 relative overflow-hidden"
          >
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: kpi.colorBg }}
            >
              <i className={kpi.icon} style={{ color: kpi.color, fontSize: "0.8rem" }} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-10">
              {kpi.label}
            </p>
            {kpi.value === null ? (
              <>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-14" />
              </>
            ) : (
              <>
                <p
                  className={`font-extrabold text-foreground leading-tight ${kpi.truncate ? "text-sm line-clamp-2" : "text-2xl"}`}
                >
                  {kpi.value}
                </p>
                {kpi.sub && (
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── SEARCH & SORT ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item, código ou categoria..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Sort select */}
        <select
          aria-label="Ordenar itens por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="py-2 px-3 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          <option value="consumed">Mais consumido</option>
          <option value="stock">Menor estoque</option>
          <option value="name">Nome A–Z</option>
        </select>
      </div>

      {/* ── CATEGORY CHIPS (scroll horizontal) ── */}
      <div className="mb-4 overflow-x-auto pb-1">
        <div className="flex gap-1.5 w-max">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
              category === "all"
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border text-muted-foreground bg-card hover:border-primary/40"
            }`}
          >
            Todas categorias
          </button>
          {categories.map((cat) => {
            const p = PALETTE[catPalette[cat] ?? 0];
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(active ? "all" : cat)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
                style={
                  active
                    ? { background: p.bar, color: "#fff", borderColor: "transparent" }
                    : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))", background: "hsl(var(--card))" }
                }
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RESULTS INFO ── */}
      <p className="text-xs text-muted-foreground mb-3">
        <span className="font-semibold text-foreground">{items.length}</span>{" "}
        {items.length === 1 ? "item" : "itens"}
        {category !== "all" && <span> em <strong>{category}</strong></span>}
        {search && <span> · busca: &ldquo;{search}&rdquo;</span>}
      </p>

      {/* ── LIST ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded-full" />
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="w-14 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <i className="fas fa-chart-bar text-xl" />
          </div>
          <p className="font-semibold">Nenhum item encontrado</p>
          <p className="text-sm mt-1">Ajuste os filtros ou a busca</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, displayIdx) => {
            const globalRank = raw.findIndex((r) => r.itemId === item.itemId) + 1;
            const p = PALETTE[catPalette[item.categoryName] ?? 0];
            const pct = maxConsumed > 0 ? (item.totalConsumed / maxConsumed) * 100 : 0;
            const noMovement = item.totalConsumed === 0 && item.totalEntradas === 0;

            return (
              <div
                key={item.itemId}
                className="rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                style={{ animationDelay: `${Math.min(displayIdx, 15) * 0.03}s` }}
              >
                {/* TOP ROW */}
                <div className="flex items-start gap-2.5">
                  {/* Rank */}
                  <RankBadge rank={globalRank} />

                  {/* Category icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: p.bg }}
                  >
                    <i className={`${item.categoryIcon} text-sm`} style={{ color: p.bar }} />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm leading-snug truncate">
                        {item.itemName}
                      </p>
                      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                        {item.internalCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: p.bg, color: p.text }}
                      >
                        {item.categoryName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <i className="far fa-clock mr-1 opacity-50" />
                        {relativeDate(item.lastMovement)}
                      </span>
                      {noMovement && (
                        <span className="text-xs text-amber-500 font-medium">sem uso</span>
                      )}
                    </div>
                  </div>

                  {/* Consumed count */}
                  <div className="text-right flex-shrink-0 pl-1">
                    <p className="font-extrabold text-lg leading-none" style={{ color: p.bar }}>
                      {item.totalConsumed.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.unit} saídas</p>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                {!noMovement && (
                  <div className="mt-2.5 ml-[4.25rem]">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: p.bar }}
                      />
                    </div>
                  </div>
                )}

                {/* BOTTOM STATS ROW (só aparece se tiver dados relevantes) */}
                {(item.totalEntradas > 0 || item.currentStock > 0) && (
                  <div className="mt-2 ml-[4.25rem] flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <i className="fas fa-arrow-down mr-1 text-emerald-500" />
                      {item.totalEntradas.toLocaleString("pt-BR")} entradas
                    </span>
                    <span>
                      <i className="fas fa-warehouse mr-1 text-sky-400" />
                      {item.currentStock.toLocaleString("pt-BR")} em estoque
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <p className="text-xs text-center text-muted-foreground mt-6">
          <i className="fas fa-circle-info mr-1" />
          Dados acumulados desde o início · atualizado a cada 2 min
        </p>
      )}
    </MainLayout>
  );
}
