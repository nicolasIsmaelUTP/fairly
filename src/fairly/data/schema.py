"""Schema helpers for validating dataset metadata.

Provides light validation for CSV columns and dimension mappings.
"""

import pandas as pd


def validate_csv_has_columns(df: pd.DataFrame, required: list[str]) -> list[str]:
    """Check which required columns are missing from a DataFrame.

    Args:
        df: The loaded DataFrame.
        required: Column names expected to exist.

    Returns:
        List of column names that are missing (empty if all present).
    """
    existing = set(df.columns)
    return [col for col in required if col not in existing]


def get_unique_groups(df: pd.DataFrame, column: str) -> list[str]:
    """Return sorted unique values in a column (for stratified sampling).

    Args:
        df: The loaded DataFrame.
        column: Column name to inspect.

    Returns:
        Sorted list of unique string values.
    """
    return sorted(df[column].dropna().unique().astype(str).tolist())
