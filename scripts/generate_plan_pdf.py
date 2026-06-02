from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "PLAN_MEJORA_APP_RHDREAMS.md"
PDF_PATH = ROOT / "docs" / "PLAN_MEJORA_APP_RHDREAMS.pdf"

PAGE_W, PAGE_H = 595, 842
MARGIN_X = 48
TOP_Y = 792
BOTTOM_Y = 48
LEADING = 13
FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

raw = MD_PATH.read_text(encoding="utf-8")

# Simplify markdown for a readable PDF generated without external dependencies.
lines = []
in_code = False
for line in raw.splitlines():
    if line.strip().startswith("```"):
        in_code = not in_code
        continue
    if in_code:
        lines.append("    " + line)
        continue
    line = re.sub(r"`([^`]+)`", r"\1", line)
    line = line.replace("**", "")
    lines.append(line)

def pdf_escape(text: str) -> str:
    replacements = {
        "–": "-",
        "—": "-",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "•": "-",
        "✅": "[ ]",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    data = text.encode("cp1252", errors="replace").decode("cp1252")
    return data.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

pages = []
current = []
y = TOP_Y

def new_page():
    global current, y
    if current:
        pages.append(current)
    current = []
    y = TOP_Y

def add_text(text: str, size=10, bold=False, indent=0, extra_after=0):
    global y
    if y < BOTTOM_Y + LEADING:
        new_page()
    x = MARGIN_X + indent
    font = FONT_BOLD if bold else FONT
    current.append(f"BT /{font} {size} Tf {x} {y} Td ({pdf_escape(text)}) Tj ET")
    y -= LEADING + extra_after

for line in lines:
    stripped = line.strip()
    if not stripped:
        y -= 5
        if y < BOTTOM_Y:
            new_page()
        continue

    if stripped.startswith("# "):
        y -= 8
        for part in textwrap.wrap(stripped[2:], width=52):
            add_text(part, size=18, bold=True, extra_after=4)
        continue
    if stripped.startswith("## "):
        y -= 7
        for part in textwrap.wrap(stripped[3:], width=62):
            add_text(part, size=14, bold=True, extra_after=3)
        continue
    if stripped.startswith("### "):
        y -= 4
        for part in textwrap.wrap(stripped[4:], width=72):
            add_text(part, size=12, bold=True, extra_after=2)
        continue

    indent = 0
    prefix = ""
    content = line
    if stripped.startswith("- "):
        prefix = "- "
        content = stripped[2:]
        indent = 12
    elif re.match(r"\d+\. ", stripped):
        m = re.match(r"(\d+\. )(.+)", stripped)
        prefix = m.group(1)
        content = m.group(2)
        indent = 12
    elif stripped.startswith("[ ]") or stripped.startswith("- [ ]"):
        content = stripped
        indent = 12
    elif line.startswith("    "):
        content = line.strip()
        indent = 18

    width = 92 if indent == 0 else 86
    wrapped = textwrap.wrap(content, width=width) or [""]
    for i, part in enumerate(wrapped):
        add_text((prefix if i == 0 else "  ") + part, size=9 if line.startswith("    ") else 10, indent=indent)

if current:
    pages.append(current)

objects = []

def add_obj(s: str) -> int:
    objects.append(s)
    return len(objects)

catalog_id = add_obj("<< /Type /Catalog /Pages 2 0 R >>")
pages_id = add_obj("PAGES_PLACEHOLDER")
font_id = add_obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
font_bold_id = add_obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
page_ids = []

for idx, content_lines in enumerate(pages, start=1):
    footer = f"BT /{FONT} 8 Tf {PAGE_W - 95} 28 Td (Pagina {idx} de {len(pages)}) Tj ET"
    stream = "\n".join(content_lines + [footer])
    stream_bytes = stream.encode("latin-1", errors="replace")
    content_id = add_obj(f"<< /Length {len(stream_bytes)} >>\nstream\n{stream}\nendstream")
    page_id = add_obj(
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
        f"/Resources << /Font << /{FONT} {font_id} 0 R /{FONT_BOLD} {font_bold_id} 0 R >> >> "
        f"/Contents {content_id} 0 R >>"
    )
    page_ids.append(page_id)

objects[pages_id - 1] = f"<< /Type /Pages /Kids [{' '.join(f'{pid} 0 R' for pid in page_ids)}] /Count {len(page_ids)} >>"

pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0]
for i, obj in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f"{i} 0 obj\n".encode("ascii"))
    pdf.extend(obj.encode("latin-1", errors="replace"))
    pdf.extend(b"\nendobj\n")

xref_pos = len(pdf)
pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("ascii"))
pdf.extend(b"0000000000 65535 f \n")
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
pdf.extend(
    f"trailer\n<< /Size {len(objects)+1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
)
PDF_PATH.write_bytes(pdf)
print(f"Generated {PDF_PATH} with {len(pages)} pages")
