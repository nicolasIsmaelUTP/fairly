"""PDF report generator for evaluation results.

Creates a clean, stakeholder-friendly PDF summarising a benchmark run.
"""

import json
from pathlib import Path

from fpdf import FPDF
from sqlalchemy.orm import Session

from fairly.db.crud_evaluations import get_evaluation, list_inferences, list_metrics


def generate_pdf(db: Session, evaluation_id: int, output_path: str | Path) -> Path:
    """Generate a PDF report for a completed evaluation.

    Args:
        db: Active database session.
        evaluation_id: PK of the evaluation to report on.
        output_path: File path where the PDF will be saved.

    Returns:
        Path to the generated PDF file.
    """
    evaluation = get_evaluation(db, evaluation_id)
    if evaluation is None:
        raise ValueError(f"Evaluation {evaluation_id} not found")

    metrics = list_metrics(db, evaluation_id)
    inferences = list_inferences(db, evaluation_id)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    # ── Title page ────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(0, 20, "fairly - Bias Evaluation Report", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, f"Evaluation ID: {evaluation.evaluation_id}", ln=True)
    pdf.cell(0, 8, f"Model: {evaluation.model.name}", ln=True)
    pdf.cell(0, 8, f"Dataset: {evaluation.dataset.name}", ln=True)
    pdf.cell(0, 8, f"Domain: {evaluation.domain.name}", ln=True)
    pdf.cell(0, 8, f"Images sampled: {evaluation.num_images}", ln=True)
    pdf.cell(0, 8, f"Resolution: {evaluation.images_resolution}", ln=True)
    pdf.cell(0, 8, f"Status: {evaluation.status}", ln=True)
    pdf.ln(10)

    # ── Fairness Indicator ────────────────────────────────────────────────
    fairness = next((m for m in metrics if m.chart_type == "fairness_indicator"), None)
    if fairness:
        data = json.loads(fairness.value_json)
        verdict = data.get("verdict", "N/A")
        pdf.set_font("Helvetica", "B", 18)
        label = "FAIR" if verdict == "FAIR" else "WARNING" if verdict == "WARNING" else "BIASED"
        pdf.cell(0, 14, f"Fairness Verdict: {label}", ln=True)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 8, f"Error rate: {data.get('error_rate', 0)}%", ln=True)
        pdf.cell(0, 8, f"Errors: {data.get('errors', 0)} / {data.get('total', 0)}", ln=True)
        pdf.ln(6)

    # ── Bias Pillars (Radar data as table) ────────────────────────────────
    radar = next((m for m in metrics if m.chart_type == "radar_chart"), None)
    if radar:
        data = json.loads(radar.value_json)
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 12, "Bias Pillar Scores", ln=True)
        pdf.set_font("Helvetica", "", 10)
        for bias_name, score in sorted(data.items()):
            bar_len = int(score * 0.8)  # scale to ~80 chars max
            bar = chr(9608) * max(bar_len // 5, 1)  # block char
            pdf.cell(60, 7, bias_name, border=0)
            pdf.cell(20, 7, f"{score}%", border=0)
            pdf.cell(0, 7, bar, ln=True)
        pdf.ln(6)

    # ── Error Rate by Bias Type ───────────────────────────────────────────
    bar_metric = next((m for m in metrics if m.chart_type == "bar_chart"), None)
    if bar_metric:
        data = json.loads(bar_metric.value_json)
        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 12, "Error Rate by Bias Type", ln=True)
        pdf.set_font("Helvetica", "", 10)
        for bias_name, pct in sorted(data.items()):
            pdf.cell(60, 7, bias_name, border=0)
            pdf.cell(0, 7, f"{pct}%", ln=True)
        pdf.ln(6)

    # ── Inference summary ─────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "Inference Results", ln=True)
    pdf.set_font("Helvetica", "", 10)

    total = len(inferences)
    flagged = sum(1 for i in inferences if i.audit_status == "flag")
    passed = sum(1 for i in inferences if i.audit_status == "pass")
    errored = sum(1 for i in inferences if i.response.startswith("[ERROR]") or i.response.startswith("[SKIPPED]"))
    unreviewed = total - flagged - passed

    pdf.cell(0, 8, f"Total inferences: {total}", ln=True)
    pdf.cell(0, 8, f"Flagged: {flagged}", ln=True)
    pdf.cell(0, 8, f"Passed: {passed}", ln=True)
    pdf.cell(0, 8, f"Errors/Skipped: {errored}", ln=True)
    pdf.cell(0, 8, f"Unreviewed: {unreviewed}", ln=True)
    pdf.ln(8)

    # Group by prompt for clean output
    from collections import defaultdict
    by_prompt: dict[int, list] = defaultdict(list)
    for inf in inferences:
        by_prompt[inf.prompt_id].append(inf)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Responses by Prompt", ln=True)

    for prompt_id, items in sorted(by_prompt.items()):
        prompt_text = items[0].prompt.text if items[0].prompt else f"Prompt #{prompt_id}"
        pdf.set_font("Helvetica", "B", 10)
        pdf.multi_cell(0, 6, f"Prompt #{prompt_id}: {prompt_text[:120]}")
        pdf.set_font("Helvetica", "", 9)
        for inf in items[:10]:
            status_tag = inf.audit_status.upper()
            pdf.cell(0, 5, f"  [{status_tag}] {inf.response[:150]}", ln=True)
        if len(items) > 10:
            pdf.cell(0, 5, f"  ... and {len(items) - 10} more", ln=True)
        pdf.ln(3)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))

    return output_path
