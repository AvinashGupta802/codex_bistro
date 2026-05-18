from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

OUT = Path("apps/mobile/assets/dishes")
OUT.mkdir(parents=True, exist_ok=True)

DISHES = {
    "fast-food": ("#e4572e", "#ffd166", "drumstick"),
    "burger": ("#7d5a50", "#f4a261", "burger"),
    "fries": ("#f2c14e", "#e4572e", "fries"),
    "pasta": ("#ddb892", "#fff1d6", "pasta"),
    "pizza": ("#d1495b", "#f9c74f", "pizza"),
    "taco": ("#f77f00", "#ffe66d", "taco"),
    "burrito": ("#e76f51", "#f6bd60", "wrap"),
    "bowl": ("#2a9d8f", "#a7c957", "bowl"),
    "noodles": ("#43aa8b", "#f7ede2", "noodles"),
    "sushi": ("#457b9d", "#ffffff", "sushi"),
    "wok": ("#70a288", "#f4d35e", "wok"),
    "steak": ("#8a1c1c", "#f08080", "steak"),
    "poke": ("#118ab2", "#ffd166", "bowl"),
    "curry": ("#ef476f", "#ffca3a", "curry"),
    "mac": ("#f4a261", "#ffd166", "mac"),
    "dessert": ("#5c4033", "#ffcad4", "dessert"),
    "drink": ("#00a6fb", "#caf0f8", "drink"),
    "juice": ("#43aa8b", "#ffba08", "drink"),
    "fried-chicken": ("#b5651d", "#f2cc8f", "drumstick"),
    "nachos": ("#f9c74f", "#e76f51", "nachos"),
    "ramen": ("#e76f51", "#fff3b0", "ramen"),
    "mezze": ("#588157", "#fefae0", "mezze"),
    "salad": ("#6a994e", "#b7e4c7", "salad"),
    "toast": ("#76a15a", "#dda15e", "toast"),
}

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def plate(draw, cx=320, cy=260):
    draw.ellipse((105, 82, 535, 512), fill="#fffaf0")
    draw.ellipse((145, 122, 495, 472), fill="#f3eadb")
    draw.ellipse((175, 152, 465, 442), fill="#fffaf0")

def garnish(draw):
    for i in range(18):
        x = 120 + i * 24
        y = 95 + (i % 5) * 6
        draw.ellipse((x, y, x + 7, y + 7), fill="#2d6a4f")

def draw_food(draw, kind, accent, light):
    plate(draw)
    if kind == "burger":
        rounded_rect(draw, (190, 200, 450, 255), 28, "#e6a35c")
        rounded_rect(draw, (175, 250, 465, 285), 8, "#2d6a4f")
        rounded_rect(draw, (185, 285, 455, 332), 12, "#6f1d1b")
        rounded_rect(draw, (190, 330, 450, 382), 22, "#d98c46")
        for x in range(220, 420, 36):
            draw.ellipse((x, 218, x+8, 226), fill="#fff")
    elif kind == "fries":
        rounded_rect(draw, (220, 280, 420, 410), 18, "#d62828")
        for x in range(210, 430, 28):
            rounded_rect(draw, (x, 150 + (x % 3)*10, x+18, 330), 8, "#ffd166")
    elif kind == "pizza":
        draw.pieslice((155, 130, 500, 475), 205, 335, fill="#f9c74f", outline="#bc6c25", width=8)
        draw.polygon([(325, 305), (500, 230), (470, 390)], fill="#d1495b")
        for x, y in [(300, 250), (355, 265), (400, 225), (430, 320), (350, 350)]:
            draw.ellipse((x, y, x+28, y+28), fill="#9d0208")
    elif kind in ["pasta", "mac", "noodles", "ramen"]:
        draw.ellipse((170, 190, 470, 410), fill=light)
        for i in range(18):
            y = 225 + i * 8
            draw.arc((190, y, 450, y + 82), 180, 350, fill="#f4a261", width=7)
        if kind == "ramen":
            draw.ellipse((250, 230, 330, 310), fill="#fff")
            draw.ellipse((275, 255, 310, 290), fill="#f4a261")
    elif kind in ["bowl", "poke", "salad"]:
        draw.ellipse((160, 185, 480, 430), fill="#264653")
        draw.ellipse((185, 160, 455, 360), fill=light)
        colors = ["#2d6a4f", "#ffb703", "#e76f51", "#ffffff", "#06d6a0"]
        for i in range(24):
            x = 205 + (i % 6) * 38
            y = 195 + (i // 6) * 36
            draw.ellipse((x, y, x+30, y+24), fill=colors[i % len(colors)])
    elif kind == "sushi":
        for x in [190, 290, 390]:
            draw.ellipse((x, 210, x+90, 320), fill="#111")
            draw.ellipse((x+12, 222, x+78, 308), fill="#fff")
            draw.rectangle((x+35, 235, x+58, 295), fill="#ef476f")
    elif kind in ["curry", "wok"]:
        draw.ellipse((165, 180, 475, 420), fill="#343a40")
        draw.ellipse((190, 170, 450, 360), fill=light)
        for x, y, c in [(240,230,"#e76f51"), (315,255,"#2d6a4f"), (365,220,"#ffffff"), (285,300,"#ffba08")]:
            draw.ellipse((x, y, x+55, y+40), fill=c)
    elif kind == "steak":
        draw.ellipse((180, 200, 460, 375), fill="#7f1d1d")
        draw.ellipse((255, 245, 390, 330), fill="#f08080")
        draw.arc((220, 220, 430, 360), 15, 170, fill="#fff", width=8)
    elif kind in ["dessert"]:
        rounded_rect(draw, (220, 190, 420, 360), 24, "#5c4033")
        draw.rectangle((220, 250, 420, 285), fill="#ffcad4")
        draw.ellipse((285, 160, 355, 230), fill="#ef476f")
    elif kind in ["drink"]:
        rounded_rect(draw, (235, 145, 405, 410), 24, light)
        draw.rectangle((255, 180, 385, 390), fill=accent)
        draw.line((360, 105, 330, 210), fill="#fff", width=9)
        draw.ellipse((280, 205, 315, 240), fill="#fff", width=3)
    elif kind == "nachos":
        for i in range(13):
            angle = i * 0.48
            x = 320 + math.cos(angle) * 90
            y = 280 + math.sin(angle) * 70
            draw.polygon([(x, y-55), (x-45, y+35), (x+45, y+35)], fill="#ffd166", outline="#bc6c25")
        draw.ellipse((260, 240, 380, 330), fill="#e76f51")
    elif kind == "taco":
        draw.pieslice((170, 160, 470, 455), 180, 360, fill="#ffd166", outline="#bc6c25", width=8)
        for x, y, c in [(230,260,"#2d6a4f"), (285,230,"#6f1d1b"), (340,270,"#ef476f"), (390,240,"#fff")]:
            draw.ellipse((x, y, x+50, y+42), fill=c)
    elif kind == "wrap" or kind == "toast":
        rounded_rect(draw, (190, 190, 450, 360), 28, "#dda15e")
        draw.rectangle((220, 220, 420, 255), fill="#2d6a4f")
        draw.rectangle((220, 270, 420, 310), fill="#e76f51")
    elif kind == "mezze":
        for x, y, c in [(190,200,"#fefae0"), (320,180,"#588157"), (265,300,"#bc6c25"), (395,300,"#f4a261")]:
            draw.ellipse((x, y, x+100, y+90), fill=c)
    else:
        draw.ellipse((185, 190, 455, 390), fill=light)

def make(name, colors):
    accent, light, kind = colors
    img = Image.new("RGB", (640, 480), "#fff8ee")
    draw = ImageDraw.Draw(img)
    for y in range(480):
        ratio = y / 480
        r = int(255 * (1-ratio) + int(accent[1:3], 16) * ratio * 0.45)
        g = int(248 * (1-ratio) + int(accent[3:5], 16) * ratio * 0.45)
        b = int(238 * (1-ratio) + int(accent[5:7], 16) * ratio * 0.45)
        draw.line((0, y, 640, y), fill=(r, g, b))
    draw.ellipse((-80, -130, 270, 200), fill=light)
    draw.ellipse((455, 315, 760, 610), fill=accent)
    garnish(draw)
    draw_food(draw, kind, accent, light)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=3))
    img.save(OUT / f"{name}.png", quality=94)

for name, colors in DISHES.items():
    make(name, colors)

print(f"Generated {len(DISHES)} dish assets in {OUT}")
