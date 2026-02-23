"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Link as LinkIcon, BarChart3, Filter } from "lucide-react";
import AppShell from "@/components/AppShell";
import MarketCard from "@/components/MarketCard";
import { getPortfolioBalance, getIntegrations, getMarkets } from "@/lib/api";
import { AggregatedPortfolio, Integration, KalshiMarket } from "@/lib/types";
import styles from "./page.module.css";

const USER_ID = "demo-user-1";

type SortOption = "volume" | "price_high" | "price_low" | "change";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "volume", label: "Hot" },
  { key: "change", label: "Movers" },
  { key: "price_high", label: "High" },
  { key: "price_low", label: "Low" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Politics: "#818CF8",
  Elections: "#F472B6",
  Economics: "#34D399",
  Financials: "#FBBF24",
  "Science and Technology": "#60A5FA",
  "Climate and Weather": "#2DD4BF",
  Entertainment: "#FB923C",
  Sports: "#A78BFA",
  Companies: "#F87171",
  Health: "#4ADE80",
  World: "#38BDF8",
  Social: "#E879F9",
};

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<AggregatedPortfolio | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [sort, setSort] = useState<SortOption>("volume");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [bal, intgs, mkts] = await Promise.all([
        getPortfolioBalance(USER_ID).catch(() => null),
        getIntegrations(USER_ID).catch(() => [] as Integration[]),
        getMarkets(200).catch(() => [] as KalshiMarket[]),
      ]);
      if (bal) setPortfolio(bal);
      setIntegrations(intgs);
      setMarkets(mkts);
    } catch {
      // silent on dashboard load
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasIntegrations = integrations.length > 0;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    markets.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [markets]);

  const filteredMarkets = useMemo(
    () =>
      selectedCategory
        ? markets.filter((m) => m.category === selectedCategory)
        : markets,
    [markets, selectedCategory]
  );

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    switch (sort) {
      case "volume":
        return (b.volume_24h ?? 0) - (a.volume_24h ?? 0);
      case "price_high":
        return (b.last_price ?? 0) - (a.last_price ?? 0);
      case "price_low":
        return (a.last_price ?? 0) - (b.last_price ?? 0);
      case "change": {
        const deltaA =
          a.last_price != null && a.previous_price != null
            ? Math.abs(a.last_price - a.previous_price)
            : 0;
        const deltaB =
          b.last_price != null && b.previous_price != null
            ? Math.abs(b.last_price - b.previous_price)
            : 0;
        return deltaB - deltaA;
      }
      default:
        return 0;
    }
  });

  const handleMarketPress = (market: KalshiMarket) => {
    window.open(`https://kalshi.com/markets/${market.ticker}`, "_blank");
  };

  return (
    <AppShell>
      <h1 className={styles.title}>Portfolio</h1>

      {/* Total value card */}
      <div className={styles.card}>
        <p className={styles.cardLabel}>Total Value</p>
        <p className={styles.cardValueLarge}>
          ${portfolio ? portfolio.total_value.toFixed(2) : "0.00"}
        </p>
      </div>

      {/* Balance breakdown */}
      <div className={styles.row}>
        <div className={`${styles.card} ${styles.halfCard}`}>
          <p className={styles.cardLabel}>Available</p>
          <p className={`${styles.cardValue} ${styles.greenText}`}>
            ${portfolio ? portfolio.available_balance.toFixed(2) : "0.00"}
          </p>
        </div>
        <div className={`${styles.card} ${styles.halfCard}`}>
          <p className={styles.cardLabel}>In Positions</p>
          <p className={`${styles.cardValue} ${styles.blueText}`}>
            ${portfolio ? portfolio.total_payout.toFixed(2) : "0.00"}
          </p>
        </div>
      </div>

      {/* Platform cards */}
      {integrations.map((intg) => (
        <div key={intg.platform_account} className={styles.card}>
          <div className={styles.platformHeader}>
            <div className={styles.platformLeft}>
              <span
                className={styles.statusDot}
                style={{
                  backgroundColor:
                    intg.status === "active" ? "#22C55E" : "#EF4444",
                }}
              />
              <span className={styles.platformName}>
                Kalshi ({intg.account_type === "agent" ? "AI Agent" : "Personal"})
              </span>
            </div>
            <span className={styles.connectedText}>Connected</span>
          </div>
        </div>
      ))}

      {/* Deposit button */}
      {hasIntegrations && (
        <button
          className={styles.depositButton}
          onClick={() => window.open("https://kalshi.com/account/wallet", "_blank")}
        >
          <Wallet size={18} />
          <span>Deposit on Kalshi</span>
        </button>
      )}

      {/* Empty state */}
      {!hasIntegrations && (
        <div className={styles.emptyCard}>
          <LinkIcon size={40} color="#475569" />
          <p className={styles.emptyTitle}>No platforms connected</p>
          <p className={styles.emptySubtitle}>
            Go to Settings to connect your Kalshi account
          </p>
          <button
            className={styles.connectButton}
            onClick={() => router.push("/settings")}
          >
            Connect a Platform
          </button>
        </div>
      )}

      {/* Live Markets */}
      {sortedMarkets.length > 0 && (
        <div className={styles.marketsSection}>
          <div className={styles.marketHeader}>
            <h2 className={styles.sectionTitle}>
              Live Markets ({filteredMarkets.length})
            </h2>
            <div className={styles.sortRow}>
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  className={`${styles.sortPill} ${sort === s.key ? styles.sortPillActive : ""}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div className={styles.filterRow}>
              <button
                className={`${styles.filterChip} ${!selectedCategory ? styles.filterChipActive : ""}`}
                onClick={() => setSelectedCategory(null)}
              >
                <Filter size={12} />
                All
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                const accent = CATEGORY_COLORS[cat] ?? "#6366F1";
                return (
                  <button
                    key={cat}
                    className={styles.filterChip}
                    style={active ? {
                      backgroundColor: accent + "30",
                      borderColor: accent + "60",
                      color: accent,
                    } : undefined}
                    onClick={() => setSelectedCategory(active ? null : cat)}
                  >
                    <span
                      className={styles.filterDot}
                      style={{ backgroundColor: accent }}
                    />
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
          {sortedMarkets.map((market, i) => (
            <MarketCard
              key={market.ticker + i}
              market={market}
              onPress={handleMarketPress}
            />
          ))}
        </div>
      )}

      {loadingMarkets && (
        <div className={styles.loadingRow}>
          <div className="spinner" />
          <span className={styles.loadingText}>Loading markets...</span>
        </div>
      )}

      {!loadingMarkets && markets.length === 0 && (
        <div className={styles.emptyMarkets}>
          <BarChart3 size={32} color="#475569" />
          <p className={styles.emptyMarketsText}>No open markets available</p>
        </div>
      )}
    </AppShell>
  );
}
