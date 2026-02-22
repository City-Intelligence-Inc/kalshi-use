import random

from backend.models.base import ModelRunner, register

STUB_TICKERS = [
    "kxnbagame-26feb21hounyknicks",
    "kxpolitics-trumpapproval50",
    "kxfed-ratecut-mar26",
    "kxcrypto-btc100k-apr26",
    "kxufc312-mainevent",
]

STUB_TITLES = [
    "NBA: Rockets vs Knicks — Feb 21",
    "Trump Approval Above 50% by March?",
    "Fed Rate Cut in March 2026?",
    "Bitcoin Above $100k by April?",
    "UFC 312 Main Event Winner",
]

FACTOR_POOL = [
    {
        "stat": "Historical win rate in similar matchups",
        "source": "ESPN Analytics",
        "direction": "favors_yes",
        "magnitude": "high",
        "detail": "Team/candidate has won 72% of comparable scenarios since 2020.",
    },
    {
        "stat": "Recent momentum shift",
        "source": "538/Silver Bulletin",
        "direction": "favors_yes",
        "magnitude": "medium",
        "detail": "Trailing 7-day average moved +4.2 points in the favored direction.",
    },
    {
        "stat": "Market volume spike",
        "source": "Kalshi order book",
        "direction": "favors_yes",
        "magnitude": "medium",
        "detail": "Volume up 3.1x in the last 24 hours — informed money likely entering.",
    },
    {
        "stat": "Contrarian polling data",
        "source": "RealClearPolitics",
        "direction": "favors_no",
        "magnitude": "high",
        "detail": "Latest aggregate polls disagree with current market pricing by 8+ points.",
    },
    {
        "stat": "Key injury/personnel report",
        "source": "Official team/org release",
        "direction": "favors_no",
        "magnitude": "high",
        "detail": "Star player listed as questionable; market hasn't fully adjusted.",
    },
    {
        "stat": "Weather/external factor",
        "source": "NOAA / AccuWeather",
        "direction": "favors_no",
        "magnitude": "low",
        "detail": "Marginal external condition could affect outcome by ~2%.",
    },
    {
        "stat": "Venue/home advantage",
        "source": "Sports Reference",
        "direction": "favors_yes",
        "magnitude": "medium",
        "detail": "Home team wins 61% at this venue over the last 3 seasons.",
    },
    {
        "stat": "Economic indicator trend",
        "source": "Federal Reserve / BLS",
        "direction": "favors_yes",
        "magnitude": "medium",
        "detail": "Leading indicator moved in a direction consistent with this outcome.",
    },
    {
        "stat": "Social sentiment analysis",
        "source": "Twitter/X trending data",
        "direction": "favors_no",
        "magnitude": "low",
        "detail": "Public sentiment is overwhelmingly on one side — contrarian signal.",
    },
    {
        "stat": "Technical price pattern",
        "source": "Kalshi price chart",
        "direction": "favors_yes",
        "magnitude": "medium",
        "detail": "Price broke through resistance at 62c with strong volume confirmation.",
    },
]

BEAR_CASES = [
    "The primary risk is a late-breaking news event that shifts fundamentals. If polling "
    "tightens or key data releases surprise to the downside, the current edge evaporates. "
    "Markets have historically overreacted to momentum in similar spots.",
    "Injury uncertainty is the biggest counter-argument. If the questionable player suits up "
    "and performs at 80%+, the line moves sharply against this position. Also, venue "
    "factors may be overstated for this particular matchup.",
    "The market may already be pricing in the edge we've identified. Smart money has had "
    "access to this data for 48+ hours. The remaining upside could be marginal, and "
    "transaction costs eat into expected value.",
    "Regression to the mean is the bear case. The recent trend that supports this position "
    "is a 2-sigma move that's unlikely to sustain. Base rates suggest a pullback toward "
    "the prior equilibrium within the contract window.",
    "Model uncertainty is high here — our confidence interval spans 15+ percentage points. "
    "A small change in assumptions flips the EV calculation negative. This is closer to "
    "a coin flip than the headline confidence number suggests.",
]

REASONINGS = [
    "Market is mispriced based on recent data. Break-even probability is {breakeven}% but "
    "our estimated true probability is {true_prob}%, creating a {edge}% edge.",
    "Strong momentum signal detected with confirming volume. Historical analogs suggest "
    "the market hasn't fully adjusted to the latest information catalyst.",
    "Contrarian opportunity — public sentiment is heavily skewed but fundamentals point "
    "the other direction. Smart money flow confirms the contrarian thesis.",
    "Statistical edge identified through cross-referencing multiple data sources. The "
    "consensus estimate appears to underweight a key factor.",
    "Clear mispricing relative to comparable markets. Similar contracts are trading at "
    "prices that imply a different probability than this one.",
]

NO_BET_REASONS = [
    "Market is efficiently priced — current price closely matches estimated true probability.",
    "Insufficient data to establish a statistical edge. Model confidence interval is too wide.",
    "Edge exists but is smaller than transaction costs. EV is technically positive but not actionable.",
    "High model uncertainty — multiple plausible scenarios with divergent outcomes.",
]


def _generate_ev_scenarios(side: str, confidence: float) -> list[dict]:
    """Generate 3 EV scenarios at different probability points."""
    scenarios = []
    # Current contract price (derived from confidence)
    contract_price = round(random.uniform(0.30, 0.70), 2)

    for offset in [-0.10, 0.0, 0.10]:
        prob = round(min(0.95, max(0.05, confidence + offset)), 2)
        if side == "yes":
            ev = round(prob * (1.0 - contract_price) - (1 - prob) * contract_price, 4)
        else:
            ev = round((1 - prob) * (1.0 - contract_price) - prob * contract_price, 4)
        # Kelly: edge / odds
        odds = (1.0 - contract_price) / contract_price if contract_price > 0 else 1.0
        edge = max(0, ev / contract_price) if contract_price > 0 else 0
        kelly = round(max(0, edge / odds), 4) if odds > 0 else 0

        scenarios.append({
            "probability": prob,
            "ev_per_contract": round(ev, 4),
            "kelly_fraction": kelly,
        })
    return scenarios


@register
class RandomModel(ModelRunner):
    name = "random"
    display_name = "Random Generator"
    description = "Generates random analysis for testing. Not a real model."

    def run(self, image_key: str, context: str | None) -> dict:
        idx = random.randint(0, len(STUB_TICKERS) - 1)
        ticker = STUB_TICKERS[idx]
        title = STUB_TITLES[idx]
        side = random.choice(["yes", "no"])
        confidence = round(random.uniform(0.55, 0.95), 2)

        # Occasionally return no_bet
        is_no_bet = random.random() < 0.15

        if is_no_bet:
            confidence = round(random.uniform(0.45, 0.55), 2)

        # Pick 3-5 random factors
        num_factors = random.randint(3, 5)
        factors = random.sample(FACTOR_POOL, num_factors)

        # Generate EV scenarios
        ev_analysis = _generate_ev_scenarios(side, confidence)

        # Kelly sizing
        avg_kelly = sum(s["kelly_fraction"] for s in ev_analysis) / len(ev_analysis)
        recommended_position = round(min(avg_kelly, 0.15), 4)  # cap at 15%

        # Reasoning with filled-in numbers
        breakeven = round(random.uniform(0.40, 0.65) * 100)
        true_prob = round(confidence * 100)
        edge = abs(true_prob - breakeven)
        reasoning = random.choice(REASONINGS).format(
            breakeven=breakeven, true_prob=true_prob, edge=edge
        )

        result = {
            "ticker": ticker,
            "title": title,
            "side": side,
            "confidence": confidence,
            "reasoning": reasoning,
            "factors": factors,
            "ev_analysis": ev_analysis,
            "bear_case": random.choice(BEAR_CASES),
            "recommended_position": recommended_position,
            "no_bet": is_no_bet,
            "no_bet_reason": random.choice(NO_BET_REASONS) if is_no_bet else None,
        }
        return result
