"""
Generate human-readable insights from analysis results.
- Primary path: ask configured LLM via AIClient to produce JSON/text insights.
- Fallback: small deterministic rule-based summarizer (useful for mock/local tests).
"""

from typing import Dict, Any
from app.utils.ai_client import AIClient

def _simple_rule_based_insights(analysis: Dict[str, Any]) -> str:
    # Very small deterministic generator for offline fallback
    parts = []
    summary = analysis.get("summary", {})
    missing = analysis.get("missing_values", {})
    corrs = analysis.get("correlations", {})

    # missing values summary
    if missing:
        mv = ", ".join(f"{k}: {v}" for k, v in missing.items() if v)
        if mv:
            parts.append(f"Missing values detected — {mv}.")
        else:
            parts.append("No missing values detected.")

    # column means (if available)
    means = []
    for col, stats in (summary or {}).items():
        if isinstance(stats, dict) and "mean" in stats:
            means.append((col, stats["mean"]))
    if means:
        means.sort(key=lambda x: x[1], reverse=True)
        highest = means[0]
        parts.append(f"Column with highest mean: '{highest[0]}' ≈ {highest[1]:.2f}.")

    # top correlation
    best = None
    for a, row in (corrs or {}).items():
        for b, v in (row or {}).items():
            if a != b and isinstance(v, (int, float)):
                if best is None or abs(v) > abs(best[2]):
                    best = (a, b, v)
    if best and abs(best[2]) > 0.5:
        parts.append(f"Notable correlation between '{best[0]}' and '{best[1]}': r = {best[2]:.2f}.")

    if not parts:
        parts.append("Dataset is small or has little structure to summarize.")

    return " ".join(parts)

def generate_insights(analysis: Dict[str, Any], use_llm: bool = True) -> Dict[str, Any]:
    """
    Input: analysis dict (output of run_analysis)
    Output: dict containing:
      - text: natural language insights
      - confidence: 0..1 (heuristic)
      - source: 'llm' or 'rules'
    """
    client = AIClient()
    prompt = (
        "You are a data analyst assistant. Given the following analysis (summary statistics, correlations, "
        "and missing value counts), produce 3 concise human-readable insights (one-sentence each), "
        "a short recommendation, and a confidence score between 0 and 1. Return only plain text."
        "\n\nANALYSIS:\n"
        f"{analysis}\n\nINSIGHTS:"
    )

    if use_llm and client.provider != "mock":
        try:
            text = client.query(prompt, max_tokens=400, temperature=0.0)
            return {"text": text, "confidence": 0.8, "source": client.provider}
        except Exception:
            # fallback to rules
            pass

    # fallback deterministic rule-based insights
    text = _simple_rule_based_insights(analysis)
    return {"text": text, "confidence": 0.6, "source": "rules"}
