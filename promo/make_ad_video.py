"""
Remy Niyogushimwa - short animated vertical ad (9:16)
Scenes: intro, skills, projects, HANO citizen-voice app, mission, contact.
Output: remy_hano_ad_9x16.mp4 (H.264, 1080x1920, 30 fps, ~40 s)
"""

import math
import os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- config
W, H, FPS, DURATION = 1080, 1920, 30, 40.0
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "remy_hano_ad_9x16.mp4")
PHOTO = r"C:\xampp\htdocs\portfolio\assets\img\mine.jpg"
FONTS = {
    "bold": r"C:\Windows\Fonts\segoeuib.ttf",
    "reg": r"C:\Windows\Fonts\segoeui.ttf",
    "light": r"C:\Windows\Fonts\segoeuil.ttf",
}

NAVY = (7, 16, 32)
CYAN = (77, 216, 255)
BLUE = (110, 165, 255)
GOLD = (255, 200, 87)
WHITE = (243, 248, 255)
MUTED = (168, 195, 225)
DARK_CARD = (13, 30, 54)

_font_cache = {}


def f(size, weight="reg"):
    key = (size, weight)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(FONTS[weight], size)
    return _font_cache[key]


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def appear(t, start, dur=0.55):
    return ease((t - start) / dur)


def scene_alpha(t, start, end, fade=0.65):
    if t < start or t >= end:
        return 0.0
    return ease(min(1.0, (t - start) / fade, (end - t) / fade))


def rgba(color, alpha):
    return (color[0], color[1], color[2], int(255 * clamp(alpha)))


def centered(d, text, y, font, color, alpha=1.0, anchor="mt"):
    d.text((W / 2, y), text, font=font, fill=rgba(color, alpha), anchor=anchor)


def pill(d, x, y, w, h, text, font, accent=CYAN, alpha=1.0, fill=None):
    fill = fill or (20, 43, 72, int(200 * alpha))
    d.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fill,
                        outline=rgba(accent, 0.45 * alpha), width=2)
    d.text((x + w / 2, y + h / 2 + 1), text, font=font, fill=rgba(WHITE, alpha), anchor="mm")


def card(d, box, alpha=1.0, accent=CYAN, radius=34):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + 6, y0 + 10, x1 + 6, y1 + 10], radius=radius,
                        fill=(0, 0, 0, int(90 * alpha)))
    d.rounded_rectangle(box, radius=radius, fill=rgba((14, 32, 56), 0.97 * alpha),
                        outline=rgba(accent, 0.32 * alpha), width=2)


# ---------------------------------------------------------------- background
def build_background():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = yy / H
    base = np.zeros((H, W, 3), np.float32)
    base[:, :, 0] = 5 + 7 * (1 - t)
    base[:, :, 1] = 12 + 19 * (1 - t)
    base[:, :, 2] = 26 + 35 * (1 - t)

    def add_glow(cx, cy, r, color, strength):
        a = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))) * strength
        for c in range(3):
            base[:, :, c] += color[c] * a

    add_glow(180, 330, 520, (10, 70, 120), 0.55)
    add_glow(910, 1500, 600, (70, 45, 10), 0.40)
    add_glow(540, 960, 780, (12, 45, 90), 0.28)

    # faint grid
    for gx in range(0, W, 120):
        base[:, gx:min(gx + 1, W), :] += 7
    for gy in range(0, H, 120):
        base[gy:min(gy + 1, H), :, :] += 7

    # vignette
    cx, cy = W / 2, H / 2
    dist = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2)
    base *= np.clip(1.12 - 0.28 * dist[..., None], 0.55, 1.0)
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


BASE = build_background()

rng = np.random.default_rng(7)
PARTICLES = [
    (float(rng.integers(0, W)), float(rng.integers(0, H)),
     float(rng.uniform(1.5, 4.5)), float(rng.uniform(0.15, 0.55)),
     float(rng.uniform(0, 6.28)))
    for _ in range(55)
]


def draw_particles(d, t):
    for x, y, r, speed, phase in PARTICLES:
        yy = (y - t * 26 * speed) % H
        a = 0.10 + 0.16 * (0.5 + 0.5 * math.sin(t * 1.4 + phase))
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=rgba(CYAN, a))


def draw_progress(d, t):
    p = clamp(t / DURATION)
    d.rounded_rectangle([90, 1872, 990, 1878], radius=3, fill=(255, 255, 255, 35))
    d.rounded_rectangle([90, 1872, 90 + int(900 * p), 1878], radius=3, fill=rgba(GOLD, 0.85))


# ---------------------------------------------------------------- photo
def make_photo():
    im = Image.open(PHOTO).convert("RGB")
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 3
    im = im.crop((left, top, left + side, top + side)).resize((380, 380), Image.LANCZOS)
    mask = Image.new("L", (380, 380), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, 379, 379], fill=255)
    out = Image.new("RGBA", (380, 380), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


PHOTO_CIRCLE = make_photo()

# ---------------------------------------------------------------- scenes
def scene_intro(d, t):
    a = scene_alpha(t, 0.0, 4.5)
    if a <= 0:
        return
    k = appear(t, 0.15)
    centered(d, "MURAPHO  /  HELLO", 430 + 25 * (1 - k), f(36, "bold"), GOLD, a * k)
    n = appear(t, 0.45)
    centered(d, "REMY", 610 - 30 * (1 - n), f(170, "bold"), WHITE, a * n)
    centered(d, "NIYOGUSHIMWA", 800, f(70, "bold"), CYAN, a * n)
    s = appear(t, 1.0)
    d.rounded_rectangle([465, 925, 615, 929], radius=2, fill=rgba(GOLD, a * s))
    centered(d, "SOFTWARE DEVELOPMENT STUDENT", 975, f(33, "reg"), WHITE, a * s)
    centered(d, "WEB & DIGITAL DESIGNER", 1030, f(33, "reg"), WHITE, a * s)
    centered(d, "Huye, Rwanda", 1105, f(29, "light"), MUTED, a * s)

    # rotating orbit accent
    o = appear(t, 0.7)
    cx, cy, r = W / 2, 620, 235
    for i in range(3):
        ang = t * 0.9 + i * 2.09
        x = cx + r * math.cos(ang)
        y = cy + r * 0.72 * math.sin(ang)
        col = GOLD if i == 0 else CYAN
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=rgba(col, a * o * 0.85))
    centered(d, "Muraho! Ndi Remy.", 1330, f(36, "reg"), GOLD, a * appear(t, 1.5))


def scene_skills(d, t):
    a = scene_alpha(t, 4.5, 9.5)
    if a <= 0:
        return
    centered(d, "WHAT I DO", 420, f(78, "bold"), WHITE, a * appear(t, 4.6))
    centered(d, "tools I use and skills I'm growing", 520, f(32, "light"), MUTED, a * appear(t, 4.75))
    rows = [
        ("WEB & CODE", "HTML   CSS   JavaScript   Git", CYAN),
        ("PROGRAMMING", "Python   C++   problem solving", BLUE),
        ("DIGITAL DESIGN", "Photoshop   Illustrator   InDesign", GOLD),
        ("LANGUAGE TOOLS", "OmegaT   SYSTRAN   translation", CYAN),
        ("PRACTICE", "small websites   AI exploration", BLUE),
    ]
    for i, (title, chips, accent) in enumerate(rows):
        p = appear(t, 4.9 + i * 0.22)
        if p <= 0:
            continue
        y = 650 + i * 190
        x = int(110 + 55 * (1 - p))
        w = int(860 * p)
        if w < 60:
            continue
        d.rounded_rectangle([x, y, x + w, y + 140], radius=26,
                            fill=rgba((15, 34, 59), 0.95 * a * p),
                            outline=rgba(accent, 0.35 * a * p), width=2)
        d.rounded_rectangle([x, y + 22, x + 7, y + 118], radius=3, fill=rgba(accent, a * p))
        d.text((x + 36, y + 30), title, font=f(34, "bold"), fill=rgba(WHITE, a * p))
        d.text((x + 36, y + 85), chips, font=f(26, "reg"), fill=rgba(MUTED, a * p))


def scene_skillnest(d, t):
    a = scene_alpha(t, 9.5, 15.0)
    if a <= 0:
        return
    centered(d, "FEATURED PROJECT", 410, f(32, "bold"), GOLD, a * appear(t, 9.6))
    p = appear(t, 9.7, 0.7)
    y0 = 510 + int(70 * (1 - p))
    card(d, (90, y0, 990, y0 + 870), a * p, CYAN)
    # browser mock
    d.rounded_rectangle([130, y0 + 40, 950, y0 + 100], radius=16,
                        fill=(255, 255, 255, int(22 * a * p)))
    for i, col in enumerate(((255, 120, 120), (255, 205, 100), (110, 230, 160))):
        d.ellipse([160 + i * 34, y0 + 60, 174 + i * 34, y0 + 74], fill=rgba(col, a * p))
    d.text((330, y0 + 58), "skillnest", font=f(28, "bold"), fill=rgba(WHITE, a * p))
    d.text((130, y0 + 160), "STUDENT SKILLS,", font=f(58, "bold"), fill=rgba(WHITE, a * p))
    d.text((130, y0 + 232), "REAL BUSINESS.", font=f(58, "bold"), fill=rgba(CYAN, a * p))
    lines = ["Online storefronts for student products",
             "Orders, delivery and digital payments",
             "A marketplace concept I'm building"]
    for i, line in enumerate(lines):
        d.text((130, y0 + 340 + i * 52), "-  " + line, font=f(28, "reg"),
               fill=rgba(MUTED, a * p * appear(t, 10.2 + i * 0.18)))
    pill(d, 130, y0 + 530, 260, 60, "PHP  /  MySQL", f(24, "bold"), CYAN, a * p)
    pill(d, 410, y0 + 530, 210, 60, "JavaScript", f(24, "bold"), BLUE, a * p)
    pill(d, 640, y0 + 530, 210, 60, "Marketplace", f(24, "bold"), GOLD, a * p)
    d.rounded_rectangle([130, y0 + 650, 400, y0 + 706], radius=28,
                        fill=rgba(GOLD, 0.18 * a * p), outline=rgba(GOLD, 0.6 * a * p), width=2)
    d.text((265, y0 + 678), "IN DEVELOPMENT", font=f(23, "bold"),
           fill=rgba(GOLD, a * p), anchor="mm")
    d.text((130, y0 + 760), "github.com/niyogushimwa/SkillNest", font=f(25, "reg"),
           fill=rgba(MUTED, a * p))


def scene_projects(d, t):
    a = scene_alpha(t, 15.0, 20.5)
    if a <= 0:
        return
    centered(d, "MORE WORK", 410, f(78, "bold"), WHITE, a * appear(t, 15.1))
    items = [
        ("PERSONAL PORTFOLIO", "Live site  -  HTML / CSS / JS / SEO", "remyportfolio.vercel.app", CYAN),
        ("JOB-FINDING PLATFORM", "PHP / MySQL  -  jobs as a path to success", "github.com/niyogushimwa/job-finding", BLUE),
        ("NISR DATA STORY", "Animated statistics  -  every life counts", "Rwanda vital statistics 2025", GOLD),
    ]
    for i, (title, sub, link, accent) in enumerate(items):
        p = appear(t, 15.35 + i * 0.35, 0.6)
        if p <= 0:
            continue
        y = 560 + i * 300
        x = int(90 + 260 * (1 - p))
        w = int(900 * p)
        if w < 80:
            continue
        card(d, (x, y, x + w, y + 250), a * p, accent, 28)
        d.rounded_rectangle([x + 26, y + 34, x + 34, y + 216], radius=4, fill=rgba(accent, a * p))
        d.text((x + 60, y + 48), title, font=f(36, "bold"), fill=rgba(WHITE, a * p))
        d.text((x + 60, y + 112), sub, font=f(26, "reg"), fill=rgba(MUTED, a * p))
        d.text((x + 60, y + 170), link, font=f(24, "reg"), fill=rgba(accent, a * p))


def scene_hano(d, t):
    a = scene_alpha(t, 20.5, 29.5)
    if a <= 0:
        return
    centered(d, "COMING SOON  /  MOBILE APP", 320, f(30, "bold"), GOLD, a * appear(t, 20.6))
    centered(d, "HANO", 400, f(126, "bold"), WHITE, a * appear(t, 20.7))
    centered(d, "Citizen Voice   -   Ijwi ryawe ni ngombwa", 545, f(31, "reg"), CYAN,
             a * appear(t, 20.95))

    p = appear(t, 21.1, 0.8)
    px, py, pw, ph = 290, 650 + int(170 * (1 - p)), 500, 1010
    d.rounded_rectangle([px - 8, py + 12, px + pw + 8, py + ph + 12], radius=64,
                        fill=(0, 0, 0, int(100 * a * p)))
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=58,
                        fill=rgba((16, 38, 64), 0.99 * a * p),
                        outline=rgba(CYAN, 0.55 * a * p), width=4)
    d.rounded_rectangle([px + 185, py + 18, px + 315, py + 30], radius=6,
                        fill=(255, 255, 255, int(70 * a * p)))
    d.text((px + 42, py + 68), "HANO", font=f(40, "bold"), fill=rgba(WHITE, a * p))
    d.text((px + 42, py + 122), "Report an issue in your community", font=f(22, "reg"),
           fill=rgba(MUTED, a * p))
    d.rounded_rectangle([px + 32, py + 172, px + 468, py + 175], radius=2,
                        fill=rgba(CYAN, 0.35 * a * p))

    bubbles = [
        ("Road is damaged", GOLD),
        ("No clean water", CYAN),
        ("Unsafe crossing", BLUE),
        ("School needs help", GOLD),
    ]
    for i, (text, col) in enumerate(bubbles):
        q = appear(t, 21.9 + i * 0.55, 0.5)
        if q <= 0:
            continue
        by = int(py + 230 + i * 150 + 40 * (1 - q))
        bx = int(px + 42 + (35 if i % 2 else 0))
        bw = 360 if i % 2 == 0 else 330
        d.rounded_rectangle([bx, by, bx + bw, by + 108], radius=26,
                            fill=rgba((26, 56, 88), 0.96 * a * q),
                            outline=rgba(col, 0.5 * a * q), width=2)
        d.ellipse([bx + 24, by + 38, bx + 56, by + 70], fill=rgba(col, a * q))
        d.text((bx + 76, by + 53), text, font=f(24, "reg"),
               fill=rgba(WHITE, a * q), anchor="lm")

    d.rounded_rectangle([px + 18, py + 850, px + 482, py + 972], radius=28,
                        fill=(255, 255, 255, int(14 * a * p)))
    for i, word in enumerate(("REPORT", "TRACK", "SOLVE")):
        col = CYAN if i == 1 else MUTED
        d.text((px + 83 + i * 167, py + 910), word, font=f(21, "bold"),
               fill=rgba(col, a * p * appear(t, 25.2 + i * 0.2)), anchor="mm")
    centered(d, "An idea in progress - built to listen first.", 1745, f(27, "light"),
             MUTED, a * appear(t, 26.0))


def scene_mission(d, t):
    a = scene_alpha(t, 29.5, 34.5)
    if a <= 0:
        return
    centered(d, "EVERY VOICE COUNTS.", 470, f(82, "bold"), WHITE, a * appear(t, 29.6))
    centered(d, "Ijwi ryawe ni ngombwa.", 590, f(40, "reg"), GOLD, a * appear(t, 29.8))
    rows = [
        "Share a problem in your community",
        "Follow it as it gets solved",
        "Help build a better Rwanda",
    ]
    for i, line in enumerate(rows):
        p = appear(t, 30.1 + i * 0.4, 0.5)
        y = 790 + i * 190
        d.ellipse([210, y, 270, y + 60], fill=rgba((CYAN, BLUE, GOLD)[i], a * p))
        d.text((210, y + 30), str(i + 1), font=f(28, "bold"), fill=rgba(NAVY, a * p), anchor="mm")
        d.text((305, y + 28), line, font=f(31, "reg"), fill=rgba(WHITE, a * p), anchor="lm")
        d.rounded_rectangle([210, y + 100, 870, y + 103], radius=2,
                            fill=(255, 255, 255, int(28 * a * p)))
    centered(d, "Technology is useful when it listens.", 1520, f(32, "light"), MUTED,
             a * appear(t, 31.8))


def scene_contact(d, t, img):
    a = scene_alpha(t, 34.5, 40.0, fade=0.5)
    if a <= 0:
        return
    p = appear(t, 34.6, 0.7)
    size = int(310 * p)
    if size > 20:
        photo = PHOTO_CIRCLE.resize((size, size), Image.LANCZOS)
        px, py = int(W / 2 - size / 2), int(390 + (310 - size) / 2)
        ring = Image.new("RGBA", (size + 16, size + 16), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring)
        rd.ellipse([0, 0, size + 15, size + 15], outline=rgba(GOLD, a * p), width=4)
        rd.ellipse([8, 8, size + 7, size + 7], outline=rgba(CYAN, 0.45 * a * p), width=2)
        img.alpha_composite(ring, (px - 8, py - 8))
        img.alpha_composite(photo, (px, py))

    centered(d, "REMY NIYOGUSHIMWA", 780, f(64, "bold"), WHITE, a * p)
    centered(d, "Let's build something useful.", 865, f(34, "light"), CYAN, a * p)
    contacts = [
        "niyogushimwaremy@gmail.com",
        "linkedin.com/in/remy-niyogushimwa-7033a5377",
        "github.com/niyogushimwa",
        "WhatsApp  +250 793 138 244",
    ]
    for i, line in enumerate(contacts):
        q = appear(t, 35.2 + i * 0.25)
        centered(d, line, 980 + i * 78, f(29 if i != 1 else 25, "reg"), WHITE, a * q)
    centered(d, "Murakoze!", 1450, f(46, "bold"), GOLD, a * appear(t, 36.5))
    centered(d, "HANO  /  Citizen Voice", 1540, f(28, "light"), MUTED, a * appear(t, 36.8))


SCENES = [scene_intro, scene_skills, scene_skillnest, scene_projects,
          scene_hano, scene_mission]


# ---------------------------------------------------------------- render
def render():
    writer = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"avc1"), FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError("Could not open video writer")
    total = int(DURATION * FPS)
    for frame_idx in range(total):
        t = frame_idx / FPS
        img = BASE.copy()
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        draw_particles(d, t)
        for scene in SCENES:
            scene(d, t)
        scene_contact(d, t, img)  # needs compositing for the photo
        draw_progress(d, t)
        img = Image.alpha_composite(img, overlay)
        writer.write(cv2.cvtColor(np.asarray(img.convert("RGB")), cv2.COLOR_RGB2BGR))
        if frame_idx % 150 == 0:
            print(f"frame {frame_idx}/{total}", flush=True)
    writer.release()
    print("saved:", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    render()
