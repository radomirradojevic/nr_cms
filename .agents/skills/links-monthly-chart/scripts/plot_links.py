"""
plot_links.py — Query the linkshortenerproject DB and produce a bar chart
showing links created per month for the past 12 months.

Usage (from project root):
    python .agents/skills/links-monthly-chart/scripts/plot_links.py

Output:
    links_monthly_chart.png  (saved in the current working directory)

Requirements:
    pip install psycopg2-binary python-dotenv matplotlib
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta  # fallback handled below

import matplotlib
matplotlib.use("Agg")  # non-interactive backend — safe in all environments
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# ---------------------------------------------------------------------------
# Locate and load .env
# ---------------------------------------------------------------------------
script_dir = os.path.dirname(os.path.abspath(__file__))
# scripts/ -> links-monthly-chart/ -> skills/ -> .agents/ -> project root
project_root = os.path.abspath(os.path.join(script_dir, "..", "..", "..", ".."))
dotenv_path = os.path.join(project_root, ".env")

if not os.path.exists(dotenv_path):
    sys.exit(
        f"ERROR: Could not find .env at {dotenv_path}\n"
        "Adjust 'project_root' in the script if your directory layout differs."
    )

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path)
except ImportError:
    # Fallback: manual parse of KEY=VALUE lines
    with open(dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

database_url = os.getenv("DATABASE_URL")
if not database_url:
    sys.exit("ERROR: DATABASE_URL is not set in .env")

# ---------------------------------------------------------------------------
# Build the list of the past 12 calendar months (including the current month)
# so months with zero links still appear on the chart.
# ---------------------------------------------------------------------------
now = datetime.now(tz=timezone.utc)
# Start of the current month
current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

months = []
for i in range(11, -1, -1):  # 11 months ago → current month
    # Subtract i months
    year = current_month_start.year
    month = current_month_start.month - i
    while month <= 0:
        month += 12
        year -= 1
    months.append(datetime(year, month, 1, tzinfo=timezone.utc))

month_labels = [m.strftime("%b %Y") for m in months]
month_starts = [m for m in months]

# ---------------------------------------------------------------------------
# Query the database
# ---------------------------------------------------------------------------
try:
    import psycopg2
except ImportError:
    sys.exit(
        "ERROR: psycopg2 is not installed.\n"
        "Run: pip install psycopg2-binary"
    )

query = """
    SELECT
        DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') AS month_start,
        COUNT(*)::int AS total
    FROM links
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY 1
    ORDER BY 1;
"""

try:
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
except Exception as e:
    sys.exit(f"ERROR: Database query failed:\n{e}")

# Map query results to our pre-built month list (fill zeros for missing months)
db_counts: dict[str, int] = {}
for row in rows:
    # row[0] is a datetime from the DB
    key = row[0].strftime("%b %Y") if hasattr(row[0], "strftime") else str(row[0])[:7]
    db_counts[key] = row[1]

counts = [db_counts.get(label, 0) for label in month_labels]

# ---------------------------------------------------------------------------
# Plot
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(13, 6))

bar_color = "#4f46e5"  # indigo-600
bars = ax.bar(month_labels, counts, color=bar_color, edgecolor="white", linewidth=0.6, zorder=3)

ax.set_title("Links Created — Past 12 Months", fontsize=17, fontweight="bold", pad=18)
ax.set_xlabel("Month", fontsize=12, labelpad=10)
ax.set_ylabel("Links Created", fontsize=12, labelpad=10)

ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
ax.tick_params(axis="x", rotation=35, labelsize=10)
ax.tick_params(axis="y", labelsize=10)
ax.grid(axis="y", linestyle="--", alpha=0.35, zorder=0)
ax.spines[["top", "right"]].set_visible(False)
ax.set_axisbelow(True)

# Value labels on top of each bar
for bar, count in zip(bars, counts):
    ax.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + max(counts) * 0.012 + 0.1,
        str(count),
        ha="center",
        va="bottom",
        fontsize=9,
        color="#374151",
    )

# A little breathing room above the tallest bar
ax.set_ylim(0, max(counts) * 1.15 + 1 if counts else 5)

plt.tight_layout()

output_path = os.path.join(os.getcwd(), "links_monthly_chart.png")
plt.savefig(output_path, dpi=150, bbox_inches="tight")
plt.close(fig)

print(f"Chart saved to: {output_path}")
