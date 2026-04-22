"""Generates /public/og-default.png — 1200x630 branded OG card."""
import math
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

W, H = 1200, 630
INK = (28, 26, 24)
ORANGE = (244, 130, 34)
WHITE = (255, 255, 255)

img = Image.new("RGB", (W, H), INK)
draw = ImageDraw.Draw(img, "RGBA")

# Soft orange glow from bottom-right
for r in range(900, 200, -20):
    alpha = int(20 * (1 - (r - 200) / 700))
    draw.ellipse((W - r // 2, H - r // 3, W + r // 2, H + r // 2 * 2),
                 fill=(244, 130, 34, max(alpha, 0)))

# Bottom orange accent bar
draw.rectangle((0, H - 10, W, H), fill=ORANGE)

# Logo (inverted to white, smaller)
logo = Image.open(PUBLIC / "Logo1.png").convert("RGBA")
alpha = logo.split()[3]
white_logo = Image.new("RGBA", logo.size, WHITE)
white_logo.putalpha(alpha)
target_w = 220
ratio = target_w / white_logo.width
new_h = int(white_logo.height * ratio)
logo_resized = white_logo.resize((target_w, new_h), Image.LANCZOS)
img.paste(logo_resized, (80, 70), logo_resized)

# Fonts
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
f_eyebrow = ImageFont.truetype(FONT_BOLD, 22)
f_head    = ImageFont.truetype(FONT_BLACK, 80)
f_sub     = ImageFont.truetype(FONT_REG, 32)
f_rating  = ImageFont.truetype(FONT_BOLD, 22)

# ── Top-right: stars + rating ──
def draw_star(cx, cy, r, fill):
    pts = []
    for i in range(10):
        angle = math.pi / 2 - i * math.pi / 5
        radius = r if i % 2 == 0 else r * 0.4
        pts.append((cx + radius * math.cos(angle), cy - radius * math.sin(angle)))
    draw.polygon(pts, fill=fill)

star_size = 16
star_gap = 8
total_stars_w = 5 * (star_size * 2) + 4 * star_gap
star_y = 95
star_x0 = W - 80 - total_stars_w
for i in range(5):
    cx = star_x0 + star_size + i * (star_size * 2 + star_gap)
    draw_star(cx, star_y, star_size, ORANGE)

rating_text = "5.0  \u00b7  100+ GOOGLE REVIEWS"
bbox = draw.textbbox((0, 0), rating_text, font=f_rating)
text_w = bbox[2] - bbox[0]
draw.text((W - 80 - text_w, star_y + 30), rating_text, font=f_rating, fill=WHITE)

# ── Main content block ──
y_eyebrow = 320
draw.text((80, y_eyebrow), "DUBLIN'S #1 5-STAR RING INSTALLER", font=f_eyebrow, fill=ORANGE)
draw.text((80, y_eyebrow + 40), "Expertly Installed.", font=f_head, fill=WHITE)
draw.text((80, y_eyebrow + 125), "Perfectly Secured.", font=f_head, fill=WHITE)

# Subline
draw.text((80, y_eyebrow + 230),
          "Ring doorbells & cameras \u2014 serving all of Leinster",
          font=f_sub, fill=(255, 255, 255, 180))

out = PUBLIC / "og-default.png"
img.save(out, "PNG", optimize=True)
print(f"Wrote {out} ({img.size[0]}x{img.size[1]})")
