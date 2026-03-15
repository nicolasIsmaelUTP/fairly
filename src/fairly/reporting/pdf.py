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

    # ── Metrics section ───────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "Metrics", ln=True)
    pdf.set_font("Helvetica", "", 11)

    for metric in metrics:
        value = json.loads(metric.value_json)
        pdf.cell(0, 8, f"{metric.name} ({metric.chart_type}):", ln=True)
        for k, v in value.items():
            pdf.cell(0, 7, f"    {k}: {v}", ln=True)
        pdf.ln(4)

    # ── Inference summary ─────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "Inference Results", ln=True)
    pdf.set_font("Helvetica", "", 10)

    total = len(inferences)
    flagged = sum(1 for i in inferences if i.audit_status == "flag")
    passed = sum(1 for i in inferences if i.audit_status == "pass")
    unreviewed = total - flagged - passed

    pdf.cell(0, 8, f"Total inferences: {total}", ln=True)
    pdf.cell(0, 8, f"Flagged: {flagged}", ln=True)
    pdf.cell(0, 8, f"Passed: {passed}", ln=True)
    pdf.cell(0, 8, f"Unreviewed: {unreviewed}", ln=True)
    pdf.ln(8)

    # Show first 20 inferences as a sample
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 10, "Sample Inferences (up to 20)", ln=True)
    pdf.set_font("Helvetica", "", 9)

    for inf in inferences[:20]:
        pdf.multi_cell(0, 5, f"[{inf.audit_status.upper()}] Prompt #{inf.prompt_id}: {inf.response[:200]}")
        pdf.ln(3)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))

    return output_path
