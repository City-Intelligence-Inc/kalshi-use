"use client";

import { useState, useEffect, ReactNode } from "react";
import {
  Lightbulb, ChevronUp, ChevronDown, ArrowUp, ArrowDown,
  AlertCircle, X, Camera, Edit3, CheckCircle, XCircle,
  BarChart2, Maximize2, Skull, Activity, ImageIcon, Pencil,
  Search, AlertTriangle, CloudOff, Info,
} from "lucide-react";
import { Prediction, Factor, EvScenario, MarketData } from "@/lib/types";
import { acceptTrade, updatePrediction } from "@/lib/api";
import styles from "./PredictResultCard.module.css";

const BEGINNER_MODE_KEY = "beginner_mode";

// ── Beginner Tip ──

function BeginnerTip({ text, show }: { text: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className={styles.tipContainer}>
      <p className={styles.tipText}>{text}</p>
    </div>
  );
}

// ── Toggle Section ──

function ToggleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  beginnerTip,
  children,
}: {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  badge?: { text: string; color: string };
  beginnerTip?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.toggleSection}>
      <div className={styles.toggleHeader} onClick={() => setOpen(!open)}>
        <div className={styles.toggleLeft}>
          {icon}
          <span className={styles.toggleTitle}>{title}</span>
          {badge && (
            <span
              className={styles.toggleBadge}
              style={{ backgroundColor: badge.color + "20" }}
            >
              <span className={styles.toggleBadgeText} style={{ color: badge.color }}>
                {badge.text}
              </span>
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={16} color="#475569" />
        ) : (
          <ChevronDown size={16} color="#475569" />
        )}
      </div>
      {open && (
        <div className={styles.toggleBody}>
          {beginnerTip}
          {children}
        </div>
      )}
    </div>
  );
}

// ── Factor Row ──

function FactorRow({ factor }: { factor: Factor }) {
  const isYes = factor.direction === "favors_yes";
  const dirColor = isYes ? "#22C55E" : "#EF4444";
  const magDots =
    factor.magnitude === "high" ? 3 : factor.magnitude === "medium" ? 2 : 1;

  return (
    <div className={styles.factorRow}>
      <div className={styles.factorIconCol}>
        {isYes ? (
          <ArrowUp size={14} color={dirColor} />
        ) : (
          <ArrowDown size={14} color={dirColor} />
        )}
      </div>
      <div className={styles.factorContent}>
        <p className={styles.factorStat}>{factor.stat}</p>
        <p className={styles.factorDetail}>{factor.detail}</p>
        <div className={styles.factorMeta}>
          <span className={styles.factorSource}>{factor.source}</span>
          <div className={styles.magDots}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={styles.magDot}
                style={{ backgroundColor: n <= magDots ? dirColor : "#334155" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EV Table ──

function EvTable({ scenarios }: { scenarios: EvScenario[] }) {
  return (
    <div className={styles.evTable}>
      <div className={styles.evHeaderRow}>
        <span className={styles.evHeaderCell} style={{ flex: 1 }}>True Prob</span>
        <span className={styles.evHeaderCell} style={{ flex: 1.2 }}>EV / Contract</span>
        <span className={styles.evHeaderCell} style={{ flex: 1 }}>Kelly Size</span>
      </div>
      {scenarios.map((s, i) => {
        const evColor = s.ev_per_contract >= 0 ? "#22C55E" : "#EF4444";
        const isBest =
          s.ev_per_contract ===
          Math.max(...scenarios.map((x) => x.ev_per_contract));
        return (
          <div
            key={i}
            className={`${styles.evDataRow} ${i % 2 === 0 ? styles.evDataRowAlt : ""} ${isBest ? styles.evBestRow : ""}`}
          >
            <span className={styles.evCell} style={{ flex: 1 }}>
              {(s.probability * 100).toFixed(0)}%
            </span>
            <span
              className={styles.evCell}
              style={{ flex: 1.2, color: evColor, fontWeight: 700 }}
            >
              {s.ev_per_contract >= 0 ? "+" : ""}
              {s.ev_per_contract.toFixed(2)}c
            </span>
            <span className={styles.evCell} style={{ flex: 1 }}>
              {(s.kelly_fraction * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Price Cell ──

function PriceCell({ label, value, color }: { label: string; value?: number | null; color?: string }) {
  return (
    <div className={styles.priceCell}>
      <span className={styles.priceCellLabel}>{label}</span>
      <span className={styles.priceCellValue} style={color ? { color } : undefined}>
        {value != null ? `${value}¢` : "—"}
      </span>
    </div>
  );
}

// ── Depth Bar ──

function DepthBar({ yesDepth, noDepth }: { yesDepth: number; noDepth: number }) {
  const total = yesDepth + noDepth;
  if (total === 0) return null;
  const yesPct = (yesDepth / total) * 100;

  return (
    <div className={styles.depthContainer}>
      <p className={styles.depthLabel}>Orderbook depth</p>
      <div className={styles.depthBarTrack}>
        <div className={styles.depthBarYes} style={{ width: `${yesPct}%` }} />
        <div className={styles.depthBarNo} style={{ width: `${100 - yesPct}%` }} />
      </div>
      <div className={styles.depthLegend}>
        <span className={styles.depthLegendYes}>YES {yesDepth}</span>
        <span className={styles.depthLegendNo}>NO {noDepth}</span>
      </div>
    </div>
  );
}

// ── Live Market Section ──

function LiveMarketSection({ data, beginnerMode }: { data: MarketData; beginnerMode: boolean }) {
  if (data.status === "not_found") {
    return (
      <div className={styles.warningRow}>
        <AlertTriangle size={16} color="#EAB308" />
        <span className={styles.warningText}>
          Ticker not found on Kalshi — prices may be outdated
        </span>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className={styles.warningRow}>
        <CloudOff size={16} color="#64748B" />
        <span className={styles.warningText} style={{ color: "#94A3B8" }}>
          Live data unavailable — Kalshi API unreachable
        </span>
      </div>
    );
  }

  const isLive = data.market_status === "active" || data.market_status === "open";
  const delta = data.price_delta;

  return (
    <div>
      {/* Status badge + 24h delta */}
      <div className={styles.statusRow}>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: isLive ? "#22C55E20" : "#64748B20" }}
        >
          <span
            className={styles.statusDot}
            style={{ backgroundColor: isLive ? "#22C55E" : "#64748B" }}
          />
          <span
            className={styles.statusText}
            style={{ color: isLive ? "#22C55E" : "#64748B" }}
          >
            {isLive ? "LIVE" : (data.market_status ?? "CLOSED").toUpperCase()}
          </span>
        </span>
        {delta != null && delta !== 0 && (
          <span
            className={styles.deltaPill}
            style={{ backgroundColor: delta > 0 ? "#22C55E18" : "#EF444418" }}
          >
            {delta > 0 ? (
              <ArrowUp size={12} color="#22C55E" />
            ) : (
              <ArrowDown size={12} color="#EF4444" />
            )}
            <span style={{ color: delta > 0 ? "#22C55E" : "#EF4444" }}>
              {delta > 0 ? "+" : ""}{delta}¢ 24h
            </span>
          </span>
        )}
      </div>

      {/* Price grid */}
      <div className={styles.priceGrid}>
        <div className={styles.priceRow}>
          <PriceCell label="YES BID" value={data.yes_bid} color="#22C55E" />
          <PriceCell label="YES ASK" value={data.yes_ask} color="#22C55E" />
          <PriceCell label="SPREAD" value={data.spread} />
        </div>
        <div className={styles.priceRow}>
          <PriceCell label="NO BID" value={data.no_bid} color="#EF4444" />
          <PriceCell label="NO ASK" value={data.no_ask} color="#EF4444" />
          <PriceCell label="LAST" value={data.last_price} />
        </div>
      </div>
      <BeginnerTip
        show={beginnerMode}
        text="BID = highest someone will pay. ASK = lowest someone will sell for. SPREAD = gap between them — smaller is easier to trade."
      />

      {/* Volume row */}
      {(data.volume != null || data.open_interest != null) && (
        <div className={styles.volumeRow}>
          {data.volume != null && (
            <div className={styles.volumeItem}>
              <span className={styles.volumeLabel}>Volume</span>
              <span className={styles.volumeValue}>{data.volume.toLocaleString()}</span>
            </div>
          )}
          {data.volume_24h != null && (
            <div className={styles.volumeItem}>
              <span className={styles.volumeLabel}>24h Vol</span>
              <span className={styles.volumeValue}>{data.volume_24h.toLocaleString()}</span>
            </div>
          )}
          {data.open_interest != null && (
            <div className={styles.volumeItem}>
              <span className={styles.volumeLabel}>Open Interest</span>
              <span className={styles.volumeValue}>{data.open_interest.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
      <BeginnerTip
        show={beginnerMode && (data.volume != null || data.open_interest != null)}
        text="Volume = how many contracts traded. Open Interest = contracts still active (not settled yet)."
      />

      {/* Orderbook depth bar */}
      {data.yes_depth != null && data.no_depth != null && (
        <DepthBar yesDepth={data.yes_depth} noDepth={data.no_depth} />
      )}
      <BeginnerTip
        show={beginnerMode && data.yes_depth != null && data.no_depth != null}
        text="Orderbook depth = how much money is lined up on each side."
      />

      {/* Event context */}
      {data.event_title && (
        <div className={styles.eventContext}>
          <p className={styles.eventLabel}>Event</p>
          <p className={styles.eventTitle}>{data.event_title}</p>
          {data.related_market_count != null && data.related_market_count > 1 && (
            <p className={styles.eventSub}>
              {data.related_market_count} related markets
              {data.mutually_exclusive ? " · mutually exclusive" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

interface Props {
  prediction: Prediction;
  imageUri?: string;
  onReset: () => void;
  onPredictionUpdate?: (updated: Prediction) => void;
}

export default function PredictResultCard({
  prediction,
  imageUri,
  onReset,
  onPredictionUpdate,
}: Props) {
  const rec = prediction.recommendation;
  const [editVisible, setEditVisible] = useState(false);
  const [editNotes, setEditNotes] = useState(prediction.user_notes ?? "");
  const [editIdea, setEditIdea] = useState(prediction.model_idea ?? "");
  const [editContext, setEditContext] = useState(prediction.context ?? "");
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(BEGINNER_MODE_KEY);
    if (v === "true") setBeginnerMode(true);
  }, []);

  if (!rec) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} color="#475569" />
          <p className={styles.errorText}>
            {prediction.status === "failed"
              ? "Analysis failed. Try again."
              : "No recommendation available."}
          </p>
          {prediction.error_message && (
            <p className={styles.errorDetail}>{prediction.error_message}</p>
          )}
          <button className={styles.resetButton} onClick={onReset}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sideColor = rec.side === "yes" ? "#22C55E" : "#EF4444";
  const confidencePct = (rec.confidence * 100).toFixed(0);
  const positionPct = ((rec.recommended_position ?? 0) * 100).toFixed(0);

  const evScenarios = rec.ev_analysis ?? [];
  const factors = rec.factors ?? [];

  const bestEv =
    evScenarios.length > 0
      ? Math.max(...evScenarios.map((e) => e.ev_per_contract))
      : 0;

  const yesFactors = factors.filter((f) => f.direction === "favors_yes").length;
  const noFactors = factors.filter((f) => f.direction === "favors_no").length;

  const toggleBeginner = () => {
    const next = !beginnerMode;
    setBeginnerMode(next);
    localStorage.setItem(BEGINNER_MODE_KEY, next ? "true" : "false");
  };

  // Trade card computation
  const md = prediction.market_data;
  const hasMarket = md?.status === "found";
  const entryPrice = hasMarket
    ? rec.side === "yes"
      ? (md!.yes_ask ?? md!.last_price ?? null)
      : (md!.no_ask ?? (md!.yes_bid != null ? 100 - md!.yes_bid : md!.last_price != null ? 100 - md!.last_price : null))
    : null;
  const targetPrice = Math.round(rec.confidence * 100);
  const edge = entryPrice != null ? targetPrice - entryPrice : null;
  const maxProfitPer = entryPrice != null ? 100 - entryPrice : null;
  const returnPct = entryPrice != null && entryPrice > 0 ? ((100 - entryPrice) / entryPrice * 100) : null;
  const exampleBankroll = 100;
  const suggestedSpend = Math.round(exampleBankroll * (rec.recommended_position ?? 0.05));
  const contracts = entryPrice != null && entryPrice > 0 ? Math.max(1, Math.floor(suggestedSpend / (entryPrice / 100))) : null;
  const totalCost = contracts != null && entryPrice != null ? (contracts * entryPrice / 100) : null;
  const maxProfit = contracts != null && maxProfitPer != null ? (contracts * maxProfitPer / 100) : null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const ep =
        rec.side === "yes"
          ? md?.yes_ask ?? md?.last_price ?? 50
          : md?.no_ask ?? (md?.yes_bid != null ? 100 - md.yes_bid : md?.last_price != null ? 100 - md.last_price : 50);

      await acceptTrade({
        user_id: prediction.user_id,
        prediction_id: prediction.prediction_id,
        ticker: rec.ticker,
        side: rec.side,
        entry_price: ep,
        title: rec.title,
        model: prediction.model,
        confidence: rec.confidence,
        image_key: prediction.image_key,
      });
      setAccepted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to accept trade";
      alert(msg);
    } finally {
      setAccepting(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (editNotes !== (prediction.user_notes ?? ""))
        updates.user_notes = editNotes;
      if (editIdea !== (prediction.model_idea ?? ""))
        updates.model_idea = editIdea;
      if (editContext !== (prediction.context ?? ""))
        updates.context = editContext;

      if (Object.keys(updates).length === 0) {
        setEditVisible(false);
        setSaving(false);
        return;
      }

      const updated = await updatePrediction(
        prediction.prediction_id,
        updates
      );
      onPredictionUpdate?.(updated);
      setEditVisible(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* ═══ Beginner Toggle ═══ */}
        <button className={styles.beginnerToggle} onClick={toggleBeginner}>
          <Lightbulb
            size={16}
            color={beginnerMode ? "#818CF8" : "#475569"}
            fill={beginnerMode ? "#818CF8" : "none"}
          />
          <span className={`${styles.beginnerToggleText} ${beginnerMode ? styles.beginnerToggleTextActive : ""}`}>
            Explain
          </span>
          <span className={`${styles.beginnerDot} ${beginnerMode ? styles.beginnerDotOn : ""}`} />
        </button>

        {/* ═══ THE TRADE ═══ */}
        {rec.no_bet ? (
          <div className={styles.passCard}>
            <div className={styles.passIconCircle}>
              <X size={28} color="#EAB308" />
            </div>
            <p className={styles.passTitle}>PASS</p>
            <p className={styles.passSubtitle}>No edge — don&apos;t trade this</p>
            <BeginnerTip
              show={beginnerMode}
              text="The model doesn't see a good bet here — the market price looks about right."
            />
            <div className={styles.passDivider} />
            <p className={styles.passReason}>
              {rec.no_bet_reason || "Market is efficiently priced. No mispricing detected."}
            </p>
            <p className={styles.passTicker}>{rec.ticker}</p>
          </div>
        ) : (
          <div className={styles.tradeCard}>
            {/* Order header */}
            <div className={styles.orderHeader}>
              <span className={styles.tradeLabel}>SUGGESTED ORDER</span>
              {hasMarket && (
                <span className={styles.liveDot} style={{ backgroundColor: "#22C55E" }}>
                  <span className={styles.liveDotText}>LIVE</span>
                </span>
              )}
            </div>

            {/* Main action */}
            <div className={styles.tradeActionRow}>
              <span className={styles.tradeAction} style={{ color: sideColor }}>
                BUY {rec.side.toUpperCase()}
              </span>
              {entryPrice != null && (
                <span className={styles.atPrice}>@ {entryPrice}¢</span>
              )}
            </div>

            {/* Ticker + title */}
            <p className={styles.tradeTicker}>{rec.ticker}</p>
            {rec.title && <p className={styles.tradeTitle}>{rec.title}</p>}

            {/* Order details grid */}
            {entryPrice != null && (
              <div className={styles.orderGrid}>
                <div className={styles.orderRow}>
                  <span className={styles.orderLabel}>Limit Price</span>
                  <span className={styles.orderValue}>{entryPrice}¢</span>
                </div>
                <div className={styles.orderRow}>
                  <span className={styles.orderLabel}>Side</span>
                  <span className={styles.orderValue} style={{ color: sideColor }}>
                    {rec.side.toUpperCase()}
                  </span>
                </div>
                {contracts != null && (
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>Contracts</span>
                    <span className={styles.orderValue}>{contracts}</span>
                  </div>
                )}
                {totalCost != null && (
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>Total Cost</span>
                    <span className={styles.orderValue}>${totalCost.toFixed(2)}</span>
                  </div>
                )}
                <div className={styles.orderDivider} />
                {maxProfit != null && (
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>Max Profit</span>
                    <span className={styles.orderValue} style={{ color: "#22C55E" }}>
                      +${maxProfit.toFixed(2)}{returnPct != null ? ` (${returnPct.toFixed(0)}%)` : ""}
                    </span>
                  </div>
                )}
                {totalCost != null && (
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>Max Loss</span>
                    <span className={styles.orderValue} style={{ color: "#EF4444" }}>
                      -${totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
                {edge != null && (
                  <div className={styles.orderRow}>
                    <span className={styles.orderLabel}>Edge</span>
                    <span className={styles.orderValue} style={{ color: edge > 0 ? "#22C55E" : "#EF4444" }}>
                      {edge > 0 ? "+" : ""}{edge}¢
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Confidence + sizing strip */}
            <div className={styles.numbersStrip}>
              <div className={styles.numberBox}>
                <span className={styles.numberLabel}>Model says</span>
                <span className={styles.numberValue} style={{ color: sideColor }}>
                  {confidencePct}%
                </span>
                <span className={styles.numberSub}>true prob</span>
              </div>
              <div className={styles.numberDivider} />
              <div className={styles.numberBox}>
                <span className={styles.numberLabel}>Market says</span>
                <span className={styles.numberValue}>
                  {entryPrice != null ? `${entryPrice}%` : "—"}
                </span>
                <span className={styles.numberSub}>implied prob</span>
              </div>
              <div className={styles.numberDivider} />
              <div className={styles.numberBox}>
                <span className={styles.numberLabel}>Position</span>
                <span className={styles.numberValue}>
                  {(rec.recommended_position ?? 0) > 0 ? `${positionPct}%` : "—"}
                </span>
                <span className={styles.numberSub}>of bankroll</span>
              </div>
            </div>

            {!hasMarket && (
              <div className={styles.noMarketNote}>
                <Info size={14} color="#64748B" />
                <span className={styles.noMarketNoteText}>
                  Prices estimated — market not matched on Kalshi
                </span>
              </div>
            )}

            <BeginnerTip
              show={beginnerMode}
              text={`This is the order you'd place on Kalshi. BUY ${rec.side.toUpperCase()} means you're betting ${rec.side === "yes" ? "the event happens" : "the event doesn't happen"}. You pay the limit price per contract and get $1 back if you're right.`}
            />
          </div>
        )}

        {/* ═══ Accept / Reject ═══ */}
        {!rec.no_bet && (
          <div className={styles.acceptRow}>
            {accepted ? (
              <div className={styles.acceptedBanner}>
                <CheckCircle size={20} color="#22C55E" />
                <span className={styles.acceptedText}>Trade accepted &amp; logged</span>
              </div>
            ) : (
              <>
                <button
                  className={styles.acceptButton}
                  disabled={accepting}
                  onClick={handleAccept}
                >
                  {accepting ? (
                    <span className="spinner spinner-sm" style={{ borderTopColor: "#fff" }} />
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>Accept Trade</span>
                    </>
                  )}
                </button>
                <button className={styles.rejectButton} onClick={onReset}>
                  <XCircle size={18} />
                  <span>Pass</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══ WHY ═══ */}
        <ToggleSection
          title="Why this trade"
          icon={<Lightbulb size={16} color="#64748B" />}
          defaultOpen
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="The model's main argument for why this bet is worth taking."
            />
          }
        >
          <p className={styles.bodyText}>{rec.reasoning}</p>
        </ToggleSection>

        {/* ═══ EDGE ═══ */}
        {factors.length > 0 && (
          <ToggleSection
            title="Edge breakdown"
            icon={<BarChart2 size={16} color="#64748B" />}
            defaultOpen
            badge={{
              text: `${yesFactors} YES / ${noFactors} NO`,
              color: yesFactors > noFactors ? "#22C55E" : "#EF4444",
            }}
            beginnerTip={
              <BeginnerTip
                show={beginnerMode}
                text="Specific facts the model found. Green ↑ = supports the bet. Red ↓ = argues against. More dots = stronger signal."
              />
            }
          >
            {factors.map((f, i) => (
              <FactorRow key={i} factor={f} />
            ))}
          </ToggleSection>
        )}

        {/* ═══ SIZING ═══ */}
        <ToggleSection
          title="Sizing scenarios"
          icon={<Maximize2 size={16} color="#64748B" />}
          badge={evScenarios.length > 0 ? {
            text: `best +${bestEv.toFixed(2)}c`,
            color: "#22C55E",
          } : undefined}
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="What happens if the model's probability estimate is off. Green EV = still profitable. Kelly = suggested bet size at that probability."
            />
          }
        >
          {evScenarios.length > 0 ? (
            <>
              <p className={styles.evExplainer}>
                If your true probability estimate is wrong, here&apos;s how the trade looks at different levels.
                Positive EV = mispricing in your favor.
              </p>
              <EvTable scenarios={evScenarios} />
            </>
          ) : (
            <p className={styles.mutedMessage}>EV analysis unavailable for this prediction</p>
          )}
        </ToggleSection>

        {/* ═══ BEAR CASE ═══ */}
        <ToggleSection
          title="What kills this trade"
          icon={<Skull size={16} color="#64748B" />}
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="The strongest argument AGAINST this bet. Read this before putting money down."
            />
          }
        >
          <div className={styles.bearCard}>
            <p className={rec.bear_case ? styles.bodyText : styles.mutedMessage}>
              {rec.bear_case || "No counter-argument identified"}
            </p>
          </div>
        </ToggleSection>

        {/* ═══ Live Market Data ═══ */}
        {prediction.market_data ? (
          <ToggleSection
            title="Live market data"
            icon={<Activity size={16} color="#64748B" />}
            badge={
              prediction.market_data.status === "found"
                ? { text: "LIVE", color: "#22C55E" }
                : prediction.market_data.status === "not_found"
                  ? { text: "NOT FOUND", color: "#EAB308" }
                  : { text: "ERROR", color: "#64748B" }
            }
          >
            <LiveMarketSection data={prediction.market_data} beginnerMode={beginnerMode} />
          </ToggleSection>
        ) : (
          <ToggleSection
            title="Live market data"
            icon={<Activity size={16} color="#64748B" />}
            badge={{ text: "NO MATCH", color: "#64748B" }}
          >
            <div className={styles.warningRow}>
              <Search size={16} color="#64748B" />
              <span className={styles.warningText} style={{ color: "#94A3B8" }}>
                {rec.ticker && rec.ticker !== "UNKNOWN"
                  ? `Could not find "${rec.ticker}" on Kalshi`
                  : "Could not identify a Kalshi market from this screenshot"}
              </span>
            </div>
          </ToggleSection>
        )}

        {/* ═══ Screenshot ═══ */}
        {imageUri && (
          <ToggleSection title="Screenshot" icon={<ImageIcon size={16} color="#64748B" />}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUri}
              alt="Screenshot"
              className={styles.screenshotImage}
            />
          </ToggleSection>
        )}

        {/* ═══ User Notes ═══ */}
        {(prediction.user_notes || prediction.model_idea) && (
          <ToggleSection title="Your notes" icon={<Pencil size={16} color="#64748B" />} defaultOpen>
            {prediction.user_notes && (
              <p className={styles.bodyText}>{prediction.user_notes}</p>
            )}
            {prediction.model_idea && (
              <div style={{ marginTop: prediction.user_notes ? 12 : 0 }}>
                <p className={styles.ideaLabel}>Model idea</p>
                <p className={styles.bodyText}>{prediction.model_idea}</p>
              </div>
            )}
          </ToggleSection>
        )}

        {/* ═══ Meta ═══ */}
        <div className={styles.metaRow}>
          <span className={styles.metaText}>
            {prediction.model} &middot;{" "}
            {new Date(prediction.completed_at ?? prediction.created_at).toLocaleString()}
            {prediction.updated_at && " (edited)"}
          </span>
        </div>

        {/* ═══ Actions ═══ */}
        <div className={styles.actionRow}>
          <button className={styles.resetButton} onClick={onReset}>
            <Camera size={18} />
            <span>Scan Another</span>
          </button>
          <button
            className={styles.editButton}
            onClick={() => {
              setEditNotes(prediction.user_notes ?? "");
              setEditIdea(prediction.model_idea ?? "");
              setEditContext(prediction.context ?? "");
              setEditVisible(true);
            }}
          >
            <Edit3 size={18} color="#A78BFA" />
          </button>
        </div>

        {/* ═══ Edit Modal ═══ */}
        {editVisible && (
          <div className="modal-backdrop" onClick={() => setEditVisible(false)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="modal-handle" />
              <h3 className={styles.editTitle}>Edit Prediction</h3>

              <label className={styles.editLabel}>Your Notes</label>
              <textarea
                className={styles.editInput}
                placeholder="Add your thoughts on this prediction..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />

              <label className={styles.editLabel}>Model Idea</label>
              <textarea
                className={styles.editInput}
                placeholder="Suggest an analysis approach or model idea..."
                value={editIdea}
                onChange={(e) => setEditIdea(e.target.value)}
              />

              <label className={styles.editLabel}>Context</label>
              <textarea
                className={styles.editInput}
                placeholder="What should the model look for?"
                value={editContext}
                onChange={(e) => setEditContext(e.target.value)}
              />

              <button
                className={styles.saveButton}
                disabled={saving}
                onClick={handleSaveEdit}
              >
                {saving ? <span className="spinner spinner-sm" style={{ borderTopColor: "#fff" }} /> : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
