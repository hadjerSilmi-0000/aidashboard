"""
Service for dataset statistical analysis.
Provides descriptive stats, correlations, and missing value detection.
"""

import pandas as pd

def run_analysis(data: dict) -> dict:
    """
    Runs basic statistical analysis on the given dataset.

    Args:
        data (dict): Dictionary of dataset, e.g. {"age": [25, 30], "salary": [4000, 5000]}

    Returns:
        dict: Summary statistics, correlations, and missing value counts
    """

    try:
        # Convert dataset to DataFrame
        df = pd.DataFrame(data)

        # Summary stats (mean, std, min, max, etc.)
        summary = df.describe(include="all").to_dict()

        # Correlations (only numerical columns)
        correlations = {}
        if not df.empty:
            corr_matrix = df.corr(numeric_only=True)
            correlations = corr_matrix.to_dict()

        # Missing values count
        missing_values = df.isnull().sum().to_dict()

        return {
            "summary": summary,
            "correlations": correlations,
            "missing_values": missing_values
        }

    except Exception as e:
        # In production, better logging should be added here
        return {
            "summary": {},
            "correlations": {},
            "missing_values": {},
            "error": str(e)
        }
