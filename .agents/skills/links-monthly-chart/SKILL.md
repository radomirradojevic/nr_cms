---
name: links-monthly-chart
description: Generates a bar chart PNG showing the number of links created per month over the past 12 months, by querying the project's PostgreSQL database. Use this skill whenever the user wants to visualize link creation trends, see monthly link stats, chart how many links were created over time, or get any analytics about when links were added. Trigger this even if the user just says "show me a chart of links" or "how many links have been created lately" — if there's data to visualize, this skill handles it end-to-end.
---

# Links Monthly Chart

Produces a bar chart PNG (`links_monthly_chart.png`) showing total links created per calendar month for the past 12 months. The data comes straight from the project's PostgreSQL database using the `DATABASE_URL` from `.env`.

## How to run it

1. Make sure the required Python packages are installed (one-time setup):

   ```bash
   pip install psycopg2-binary python-dotenv matplotlib
   ```

2. Run the bundled script from the project root:

   ```bash
   python .agents/skills/links-monthly-chart/scripts/plot_links.py
   ```

3. The chart is saved as `links_monthly_chart.png` in the current working directory. Tell the user the full path.

## What the chart looks like

- **X-axis**: Calendar months over the past 12 months, formatted as `Mon YYYY` (e.g. `May 2025`, `Jun 2025`, …)
- **Y-axis**: Total number of links created in that month (integer)
- **Bars**: Indigo/purple, with the count printed above each bar for easy reading
- Months with zero links are included so the time axis is always continuous

## Troubleshooting

- **`DATABASE_URL` not found**: The script looks for `.env` in the project root (four directories up from the script). If your layout differs, open the script and adjust `project_root`.
- **`psycopg2` SSL errors with Neon**: Neon's connection strings already include `sslmode=require` — no extra configuration needed.
- **Empty chart**: The database may genuinely have no links in the past 12 months, or the `DATABASE_URL` may be pointing at a different environment.
