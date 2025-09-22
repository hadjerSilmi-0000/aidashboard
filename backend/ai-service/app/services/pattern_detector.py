"""
Detect patterns, anomalies, and outliers in datasets.
"""

import pandas as pd
from typing import Dict, Any

def detect_patterns(data: dict) -> Dict[str, Any]:
    """
    Detects simple patterns:
    - Outliers using IQR method
    - Trends (positive/negative correlation with another column)
    """
    df = pd.DataFrame(data)
    results = {"outliers": {}, "trends": []}

    # Outlier detection (IQR)
    for col in df.select_dtypes(include=["number"]).columns:
        q1, q3 = df[col].quantile([0.25, 0.75])
        iqr = q3 - q1
        mask = (df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)
        outliers = df[col][mask].tolist()
        if outliers:
            results["outliers"][col] = outliers

    # Simple trend detection: correlation > 0.6
    corr = df.corr(numeric_only=True).to_dict()
    for a, row in corr.items():
        for b, v in row.items():
            if a != b and abs(v) > 0.6:
                results["trends"].append(
                    {"columns": (a, b), "correlation": round(v, 2)}
                )

    return results
