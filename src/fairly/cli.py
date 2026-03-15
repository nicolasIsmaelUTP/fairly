"""CLI entry point for fairly.

Provides the `fairly ui` command to launch the local dashboard.
"""

import typer
from rich.console import Console

app = typer.Typer(
    name="fairly",
    help="Bias evaluation toolkit for Vision-Language Models.",
    add_completion=False,
)
console = Console()


@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """fairly — Bias evaluation toolkit for Vision-Language Models."""
    if ctx.invoked_subcommand is None:
        console.print("[bold green]fairly[/] v0.1.0")
        console.print("Run [bold]fairly ui[/] to launch the dashboard.")
        raise typer.Exit()


@app.command()
def ui(
    port: int = typer.Option(8000, help="Port to serve the dashboard on."),
    host: str = typer.Option("127.0.0.1", help="Host to bind the server to."),
):
    """Launch the fairly dashboard (FastAPI + React UI)."""
    import uvicorn

    from fairly.db.database import init_db
    from fairly.db.seed import seed_all

    console.print(f"[bold green]fairly[/] v0.1.0 — starting dashboard...")
    console.print(f"  → http://{host}:{port}")

    # Ensure the database and tables exist
    init_db()
    seed_all()

    uvicorn.run(
        "fairly.server.app:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )


@app.command()
def version():
    """Print the fairly version."""
    console.print("[bold green]fairly[/] v0.1.0")


if __name__ == "__main__":
    app()
