"""Benchmark builder: selects prompts and samples images.

This module figures out *what* to evaluate before the runner executes it.
"""

import pandas as pd
from sqlalchemy.orm import Session

from fairly.db.models import ColumnMapping, Prompt, PromptDimension


def get_active_prompts(
    db: Session, domain_id: int, dimension_ids: list[int]
) -> list[Prompt]:
    """Fetch prompts matching the selected domain AND dimensions.

    This is the cross-filter described in the UX guide: only prompts
    whose domain AND dimension both match the user's selection are returned.

    Args:
        db: Active database session.
        domain_id: Selected domain PK.
        dimension_ids: List of activated dimension PKs.

    Returns:
        List of matching Prompt rows.
    """
    return (
        db.query(Prompt)
        .join(PromptDimension, Prompt.prompt_id == PromptDimension.prompt_id)
        .filter(
            Prompt.domain_id == domain_id,
            PromptDimension.dimension_id.in_(dimension_ids),
            Prompt.is_active.is_(True),
        )
        .distinct()
        .all()
    )


def stratified_sample(
    df: pd.DataFrame,
    group_columns: list[str],
    n: int = 50,
) -> pd.DataFrame:
    """Take a stratified sample from a DataFrame.

    Tries to pick roughly equal numbers from each group combination.
    Falls back to the full DataFrame if there are fewer rows than ``n``.

    Args:
        df: Full dataset DataFrame.
        group_columns: Columns to stratify by (e.g. ["gender", "skin_color"]).
        n: Target total sample size.

    Returns:
        A DataFrame with at most ``n`` rows, balanced across groups.
    """
    if len(df) <= n:
        return df

    # Combine group columns to create a single stratification key
    df = df.copy()
    df["_strat_key"] = df[group_columns].astype(str).agg("||".join, axis=1)

    groups = df["_strat_key"].nunique()
    per_group = max(1, n // groups)

    sampled = (
        df.groupby("_strat_key", group_keys=False)
        .apply(lambda g: g.sample(n=min(len(g), per_group), random_state=42))
    )
    sampled = sampled.drop(columns=["_strat_key"]).head(n)
    return sampled.reset_index(drop=True)


def get_mapped_dimensions(
    db: Session, dataset_id: int
) -> list[ColumnMapping]:
    """Return which dimensions a dataset has mappings for.

    Used by the UI to know which dimension switches to enable.

    Args:
        db: Active database session.
        dataset_id: FK to the dataset.

    Returns:
        List of ColumnMapping rows for the dataset.
    """
    return (
        db.query(ColumnMapping)
        .filter(ColumnMapping.dataset_id == dataset_id)
        .all()
    )
