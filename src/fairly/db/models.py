"""SQLAlchemy ORM models for the fairly database.

Each class maps 1-to-1 with the tables described in about_database.md.
The schema is designed for a local SQLite database (similar to MLflow).
"""

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


# ── Global Settings (singleton row) ─────────────────────────────────────────


class Settings(Base):
    """Stores application-wide configuration (API keys, theme, etc.).

    Designed to hold a single row.
    """

    __tablename__ = "settings"

    settings_id = Column(Integer, primary_key=True, default=1)
    featherless_key = Column(String, default="")
    aws_access_key = Column(String, default="")
    aws_secret_access_key = Column(String, default="")
    theme = Column(String, default="light")


# ── Catalog: Models ──────────────────────────────────────────────────────────


class Model(Base):
    """A VLM that can be evaluated (open-source or custom)."""

    __tablename__ = "model"

    model_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    source = Column(String, nullable=False, default="custom")  # "featherless" | "custom"
    metadata_json = Column(Text, default="{}")  # flexible JSON blob

    evaluations = relationship("Evaluation", back_populates="model")


# ── Catalog: Datasets ────────────────────────────────────────────────────────


class Dataset(Base):
    """Points to the image source and CSV metadata for an evaluation."""

    __tablename__ = "dataset"

    dataset_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    imgs_route = Column(String, default="")
    csv_route = Column(String, default="")
    image_column = Column(String, default="")  # CSV column name for image paths

    columns = relationship("ColumnMapping", back_populates="dataset")
    images = relationship("Image", back_populates="dataset")
    evaluations = relationship("Evaluation", back_populates="dataset")


# ── Catalog: Domains & Dimensions ────────────────────────────────────────────


class Domain(Base):
    """Use-case category (e.g. Healthcare, Hiring, Marketing)."""

    __tablename__ = "domain"

    domain_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    prompts = relationship("Prompt", back_populates="domain")
    evaluations = relationship("Evaluation", back_populates="domain")


class Dimension(Base):
    """Bias dimension (e.g. Pronoun, Age, Apparent Skin Color)."""

    __tablename__ = "dimension"

    dimension_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)

    columns = relationship("ColumnMapping", back_populates="dimension")
    prompts = relationship("Prompt", secondary="prompt_dimension", back_populates="dimensions")


# ── Column Mapping (Dataset ↔ Dimension bridge) ─────────────────────────────


class ColumnMapping(Base):
    """Links a CSV column name to a bias dimension for a given dataset."""

    __tablename__ = "column"

    column_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)  # actual CSV header name
    dataset_id = Column(Integer, ForeignKey("dataset.dataset_id"), nullable=False)
    dimension_id = Column(Integer, ForeignKey("dimension.dimension_id"), nullable=False)

    dataset = relationship("Dataset", back_populates="columns")
    dimension = relationship("Dimension", back_populates="columns")


# ── Prompt ↔ Dimension (many-to-many bridge) ────────────────────────────────


class PromptDimension(Base):
    """Many-to-many bridge: which dimensions each prompt targets."""

    __tablename__ = "prompt_dimension"

    prompt_id = Column(Integer, ForeignKey("prompt.prompt_id"), primary_key=True)
    dimension_id = Column(Integer, ForeignKey("dimension.dimension_id"), primary_key=True)


# ── Prompts ──────────────────────────────────────────────────────────────────


class Prompt(Base):
    """An evaluation question template tied to one domain and many dimensions."""

    __tablename__ = "prompt"

    prompt_id = Column(Integer, primary_key=True, autoincrement=True)
    domain_id = Column(Integer, ForeignKey("domain.domain_id"), nullable=False)
    text = Column(Text, nullable=False)
    expected_result = Column(Text, default="")
    bias_type = Column(String, default="")
    is_active = Column(Boolean, default=True)

    domain = relationship("Domain", back_populates="prompts")
    dimensions = relationship("Dimension", secondary="prompt_dimension", back_populates="prompts")
    inferences = relationship("Inference", back_populates="prompt")


# ── Evaluation (the "experiment") ────────────────────────────────────────────


class Evaluation(Base):
    """A single benchmark run combining a model, dataset, and domain."""

    __tablename__ = "evaluation"

    evaluation_id = Column(Integer, primary_key=True, autoincrement=True)
    model_id = Column(Integer, ForeignKey("model.model_id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("dataset.dataset_id"), nullable=False)
    domain_id = Column(Integer, ForeignKey("domain.domain_id"), nullable=False)
    num_images = Column(Integer, default=50)
    images_resolution = Column(String, default="low")  # "low" | "high"
    status = Column(String, default="pending")  # "pending" | "running" | "completed" | "failed"
    progress = Column(Integer, default=0)  # 0-100

    model = relationship("Model", back_populates="evaluations")
    dataset = relationship("Dataset", back_populates="evaluations")
    domain = relationship("Domain", back_populates="evaluations")
    dimensions = relationship("EvaluationDimension", back_populates="evaluation")
    inferences = relationship("Inference", back_populates="evaluation")
    metrics = relationship("Metric", back_populates="evaluation")


class EvaluationDimension(Base):
    """Many-to-many bridge: which dimensions were activated for a run."""

    __tablename__ = "evaluation_dimension"

    evaluation_id = Column(
        Integer, ForeignKey("evaluation.evaluation_id"), primary_key=True
    )
    dimension_id = Column(
        Integer, ForeignKey("dimension.dimension_id"), primary_key=True
    )

    evaluation = relationship("Evaluation", back_populates="dimensions")
    dimension = relationship("Dimension")


# ── Images (sampled subset) ──────────────────────────────────────────────────


class Image(Base):
    """An image selected during a benchmark's stratified sampling."""

    __tablename__ = "image"

    image_id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("dataset.dataset_id"), nullable=False)
    img_route = Column(String, nullable=False)
    local_thumbnail_route = Column(String, default="")

    dataset = relationship("Dataset", back_populates="images")
    inferences = relationship("Inference", back_populates="image")


# ── Inference (individual model response) ────────────────────────────────────


class Inference(Base):
    """One prompt + image → model response, within an evaluation."""

    __tablename__ = "inference"

    inference_id = Column(Integer, primary_key=True, autoincrement=True)
    image_id = Column(Integer, ForeignKey("image.image_id"), nullable=False)
    prompt_id = Column(Integer, ForeignKey("prompt.prompt_id"), nullable=False)
    evaluation_id = Column(Integer, ForeignKey("evaluation.evaluation_id"), nullable=False)
    response = Column(Text, default="")
    audit_status = Column(String, default="unreviewed")  # "unreviewed" | "pass" | "flag"

    image = relationship("Image", back_populates="inferences")
    prompt = relationship("Prompt", back_populates="inferences")
    evaluation = relationship("Evaluation", back_populates="inferences")


# ── Metrics (aggregated results) ─────────────────────────────────────────────


class Metric(Base):
    """Aggregated metric for a completed evaluation (drives the UI charts)."""

    __tablename__ = "metric"

    metric_id = Column(Integer, primary_key=True, autoincrement=True)
    evaluation_id = Column(Integer, ForeignKey("evaluation.evaluation_id"), nullable=False)
    name = Column(String, nullable=False)
    value_json = Column(Text, default="{}")
    chart_type = Column(String, default="kpi_delta")  # "kpi_delta" | "radar_chart" | "bar_chart"

    evaluation = relationship("Evaluation", back_populates="metrics")
