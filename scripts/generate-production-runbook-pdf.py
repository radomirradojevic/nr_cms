from __future__ import annotations

import re
import textwrap
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "deployment" / "production-manual-test-runbook-sr.md"
OUTPUT = ROOT / "output" / "pdf" / "night-raven-cms-production-manual-test-runbook-sr.pdf"

NAVY = colors.HexColor("#10243E")
BLUE = colors.HexColor("#246BFD")
CYAN = colors.HexColor("#36C5D9")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#617087")
PALE = colors.HexColor("#EEF4FF")
LINE = colors.HexColor("#CFDAEA")
GREEN = colors.HexColor("#169873")
ORANGE = colors.HexColor("#D97917")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("NR", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("NRBold", r"C:\Windows\Fonts\arialbd.ttf"))
    pdfmetrics.registerFont(TTFont("NRItalic", r"C:\Windows\Fonts\ariali.ttf"))
    pdfmetrics.registerFont(TTFont("NRMono", r"C:\Windows\Fonts\consola.ttf"))
    pdfmetrics.registerFont(TTFont("NRMonoBold", r"C:\Windows\Fonts\consolab.ttf"))


class ArchitectureFlowable(Flowable):
    def __init__(self, width: float):
        super().__init__()
        self.width = width
        self.height = 63 * mm

    def draw(self) -> None:
        canvas = self.canv
        box_w = (self.width - 18 * mm) / 3
        box_h = 31 * mm
        y = 21 * mm
        boxes = [
            ("MASTER", "ls.nrcms.com", "release trust\nlicence + purchase intent"),
            ("VENDOR", "vendor.nrcms.com", "Webshop\nPayPal Sandbox"),
            ("CLIENT", "client.nrcms.com", "Webshop + License Server\nlocal issuer transport"),
        ]
        for index, (label, domain, detail) in enumerate(boxes):
            x = index * (box_w + 9 * mm)
            fill = PALE if index else colors.HexColor("#E8FBF7")
            canvas.setFillColor(fill)
            canvas.setStrokeColor(CYAN if index else GREEN)
            canvas.setLineWidth(1.2)
            canvas.roundRect(x, y, box_w, box_h, 4 * mm, fill=1, stroke=1)
            canvas.setFillColor(NAVY)
            canvas.setFont("NRBold", 10)
            canvas.drawCentredString(x + box_w / 2, y + 22 * mm, label)
            canvas.setFont("NRBold", 8.5)
            canvas.drawCentredString(x + box_w / 2, y + 16 * mm, domain)
            canvas.setFillColor(MUTED)
            canvas.setFont("NR", 7.2)
            for line_no, line in enumerate(detail.split("\n")):
                canvas.drawCentredString(
                    x + box_w / 2, y + (9 - line_no * 4) * mm, line
                )
        canvas.setStrokeColor(BLUE)
        canvas.setFillColor(BLUE)
        canvas.setLineWidth(1.4)
        # Master ↔ Vendor and Master ↔ Client trust paths.
        for left, right in [(0, 1), (0, 2)]:
            x1 = left * (box_w + 9 * mm) + box_w
            x2 = right * (box_w + 9 * mm)
            mid_y = y + box_h / 2
            canvas.line(x1 + 1 * mm, mid_y, x2 - 1 * mm, mid_y)
            canvas.line(x2 - 3 * mm, mid_y + 1.5 * mm, x2 - 1 * mm, mid_y)
            canvas.line(x2 - 3 * mm, mid_y - 1.5 * mm, x2 - 1 * mm, mid_y)
        canvas.setFillColor(MUTED)
        canvas.setFont("NR", 7.2)
        canvas.drawString(0, 13 * mm, "HTTPS domain proof + Ed25519 installation PoP + signed immutable release")
        canvas.setFillColor(ORANGE)
        canvas.setFont("NRBold", 7.2)
        canvas.drawRightString(self.width, 13 * mm, "worker.nrcms.com: nije deploymentovan")


class Callout(Flowable):
    def __init__(self, text: str, width: float):
        super().__init__()
        self.width = width
        self.text = text
        self.height = 19 * mm

    def draw(self) -> None:
        canvas = self.canv
        canvas.setFillColor(colors.HexColor("#FFF6E9"))
        canvas.setStrokeColor(colors.HexColor("#F2C27A"))
        canvas.roundRect(0, 0, self.width, self.height, 3 * mm, fill=1, stroke=1)
        canvas.setFillColor(ORANGE)
        canvas.setFont("NRBold", 8)
        canvas.drawString(5 * mm, 12 * mm, "PRODUKCIJSKI PROFIL")
        canvas.setFillColor(INK)
        canvas.setFont("NR", 8)
        canvas.drawString(5 * mm, 6 * mm, self.text)


def styles():
    sample = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=sample["BodyText"],
            fontName="NR",
            fontSize=9,
            leading=13,
            textColor=INK,
            spaceAfter=4.5,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=sample["BodyText"],
            fontName="NR",
            fontSize=8.8,
            leading=12.5,
            leftIndent=6 * mm,
            firstLineIndent=-3.5 * mm,
            textColor=INK,
            spaceAfter=2.5,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=sample["Heading1"],
            fontName="NRBold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceBefore=7,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=sample["Heading2"],
            fontName="NRBold",
            fontSize=13.5,
            leading=17,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=sample["Heading3"],
            fontName="NRBold",
            fontSize=10.8,
            leading=14,
            textColor=NAVY,
            spaceBefore=7,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "code": ParagraphStyle(
            "Code",
            fontName="NRMono",
            fontSize=6.7,
            leading=8.8,
            leftIndent=3 * mm,
            rightIndent=3 * mm,
            borderColor=LINE,
            borderWidth=0.5,
            borderPadding=5,
            backColor=colors.HexColor("#F6F8FB"),
            textColor=colors.HexColor("#24324A"),
            spaceBefore=3,
            spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "Small",
            fontName="NR",
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
        ),
        "toc": ParagraphStyle(
            "TOC",
            fontName="NR",
            fontSize=9,
            leading=13,
            textColor=INK,
            leftIndent=5 * mm,
        ),
    }


def inline(value: str) -> str:
    value = escape(value)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(
        r"`([^`]+)`", r'<font name="NRMono" color="#244F89">\1</font>', value
    )
    return value


def wrap_code(lines: list[str], width: int = 112) -> str:
    result: list[str] = []
    for line in lines:
        if len(line) <= width:
            result.append(line)
            continue
        indent = re.match(r"^\s*", line).group(0)
        chunks = textwrap.wrap(
            line,
            width=width,
            subsequent_indent=indent + "  ",
            replace_whitespace=False,
            drop_whitespace=False,
            break_long_words=True,
            break_on_hyphens=False,
        )
        result.extend(chunks or [line])
    return "\n".join(result)


def make_table(rows: list[list[str]], available_width: float, style_map) -> Table:
    count = max(len(row) for row in rows)
    normalized = [row + [""] * (count - len(row)) for row in rows]
    if count == 2:
        widths = [available_width * 0.34, available_width * 0.66]
    elif count == 4:
        widths = [available_width * 0.28, available_width * 0.16] * 2
    else:
        widths = [available_width / count] * count
    data = [
        [Paragraph(inline(cell), style_map["small"]) for cell in row]
        for row in normalized
    ]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "NRBold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def markdown_story(text: str, available_width: float, style_map) -> list:
    lines = text.splitlines()
    story: list = []
    index = 0
    first_h1 = True
    forced_break_prefixes = (
        "7. Vendor",
        "8. Client",
        "10. VPS",
        "12. Ručni",
        "16. Referentna",
    )
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if line.startswith("```"):
            block: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                block.append(lines[index])
                index += 1
            story.append(Preformatted(wrap_code(block), style_map["code"]))
            index += 1
            continue
        if line.startswith("|"):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].startswith("|"):
                table_lines.append(lines[index])
                index += 1
            rows = [
                [part.strip() for part in row.strip().strip("|").split("|")]
                for row in table_lines
            ]
            if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", c) for c in rows[1]):
                rows.pop(1)
            story.extend([make_table(rows, available_width, style_map), Spacer(1, 5)])
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            title = heading.group(2)
            if level == 1 and first_h1:
                first_h1 = False
                index += 1
                continue
            if level == 2 and title.startswith(forced_break_prefixes):
                story.append(PageBreak())
            story.append(Paragraph(inline(title), style_map[f"h{level}"]))
            index += 1
            continue
        bullet = re.match(r"^([-*]|\d+\.)\s+(.+)$", line)
        if bullet:
            marker = "•" if bullet.group(1) in ("-", "*") else bullet.group(1)
            story.append(
                Paragraph(f"{marker}&nbsp;&nbsp;{inline(bullet.group(2))}", style_map["bullet"])
            )
            index += 1
            continue
        paragraph = [line.strip()]
        index += 1
        while index < len(lines):
            candidate = lines[index]
            if (
                not candidate.strip()
                or candidate.startswith("#")
                or candidate.startswith("```")
                or candidate.startswith("|")
                or re.match(r"^([-*]|\d+\.)\s+", candidate)
            ):
                break
            paragraph.append(candidate.strip())
            index += 1
        story.append(Paragraph(inline(" ".join(paragraph)), style_map["body"]))
    return story


def appendix_story(available_width: float, style_map) -> list:
    items = [
        ("Dodatak A — kompletan ls.nrcms.com .env primer", ROOT / "deploy/env/ls.nrcms.com.env.example"),
        ("Dodatak B — kompletan vendor.nrcms.com .env primer", ROOT / "deploy/env/vendor.nrcms.com.env.example"),
        ("Dodatak C — kompletan client.nrcms.com .env primer", ROOT / "deploy/env/client.nrcms.com.env.example"),
    ]
    story: list = []
    for title, path in items:
        story.extend(
            [
                PageBreak(),
                Paragraph(title, style_map["h1"]),
                Paragraph(
                    f"Izvor: <font name=\"NRMono\">{escape(path.relative_to(ROOT).as_posix())}</font>. "
                    "Zameniti sve placeholdere; fajl ne commitovati sa stvarnim secret vrednostima.",
                    style_map["body"],
                ),
            ]
        )
        lines = path.read_text(encoding="utf-8").splitlines()
        for chunk_index in range(0, len(lines), 42):
            if chunk_index:
                story.append(
                    Paragraph(
                        f"Nastavak — linije {chunk_index + 1}–{min(chunk_index + 42, len(lines))}",
                        style_map["h3"],
                    )
                )
            story.append(
                Preformatted(
                    wrap_code(lines[chunk_index : chunk_index + 42], 108),
                    style_map["code"],
                )
            )
    return story


def draw_page(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(18 * mm, height - 14 * mm, width - 18 * mm, height - 14 * mm)
        canvas.setFont("NRBold", 7.4)
        canvas.setFillColor(NAVY)
        canvas.drawString(18 * mm, height - 10.5 * mm, "NIGHT RAVEN CMS / PRODUCTION RUNBOOK")
        canvas.setFont("NR", 7)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 18 * mm, height - 10.5 * mm, "27. avgust 2026.")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("NR", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "Ručni produkcijski E2E • PayPal Sandbox • Vercel/VPS")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"Strana {doc.page}")
    canvas.restoreState()


def build() -> None:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page_width, _ = A4
    margin = 18 * mm
    available_width = page_width - 2 * margin
    style_map = styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=margin,
        leftMargin=margin,
        topMargin=19 * mm,
        bottomMargin=18 * mm,
        title="Night Raven CMS — produkcijski deployment i ručni E2E test",
        author="Night Raven CMS",
        subject="Vercel/VPS, Master, vendor, client, PayPal Sandbox",
    )

    cover_title = ParagraphStyle(
        "CoverTitle",
        fontName="NRBold",
        fontSize=28,
        leading=32,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=10,
    )
    cover_subtitle = ParagraphStyle(
        "CoverSubtitle",
        fontName="NR",
        fontSize=12,
        leading=17,
        textColor=MUTED,
        alignment=TA_LEFT,
    )
    story = [
        Spacer(1, 20 * mm),
        Paragraph("Night Raven CMS", cover_title),
        Paragraph("Produkcijski deployment i ručni E2E test", cover_title),
        Spacer(1, 4 * mm),
        Paragraph(
            "Master License Server + vendor Webshop + client CMS<br/>"
            "Vercel, self-hosted VPS ili mešoviti deployment • PayPal Sandbox",
            cover_subtitle,
        ),
        Spacer(1, 13 * mm),
        ArchitectureFlowable(available_width),
        Spacer(1, 7 * mm),
        Callout(
            "Addoni su potpisani i ugrađeni u immutable build; javni deployment worker nije potreban.",
            available_width,
        ),
        Spacer(1, 14 * mm),
        Paragraph("Operativni dokument • 27. avgust 2026.", style_map["small"]),
        PageBreak(),
        Paragraph("Kako koristiti ovaj dokument", style_map["h1"]),
        Paragraph(
            "Prvo popuniti Master, vendor i client env dodatke. Zatim pratiti redosled: "
            "Master → release katalog → commerce foundation → vendor → PayPal → client → ručni E2E. "
            "Komande koje menjaju bazu imaju eksplicitni apply/migration korak.",
            style_map["body"],
        ),
        Paragraph("Brza navigacija", style_map["h2"]),
    ]
    toc = [
        "0  Zatečeni javni baseline i obavezna zamena dev Master ključa",
        "1–5  Arhitektura, GitHub/Vercel granica, preduslovi i baze",
        "6  Master License Server: keys, release import, commerce i lifetime ključ",
        "7  Vendor CMS: aktivacija, Master katalog, proizvodi i PayPal Sandbox",
        "8  Client CMS: kupovina, aktivacija i lokalni issuer",
        "9–11  Worker odluka, VPS i mešoviti deployment",
        "12–15  E2E acceptance, Live prelaz, rollback i GO kriterijumi",
        "Dodaci A–C  kompletni .env template-i",
    ]
    story.extend([Paragraph(f"•&nbsp;&nbsp;{inline(item)}", style_map["toc"]) for item in toc])
    story.append(PageBreak())
    story.extend(markdown_story(SOURCE.read_text(encoding="utf-8"), available_width, style_map))
    story.extend(appendix_story(available_width, style_map))
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(OUTPUT)


if __name__ == "__main__":
    build()
