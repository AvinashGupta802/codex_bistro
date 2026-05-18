from pathlib import Path
from PIL import Image, ImageOps
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: crop-dish-contact-sheet.py <contact-sheet-path>")

source = Path(sys.argv[1])
out = Path("apps/mobile/assets/dishes")
out.mkdir(parents=True, exist_ok=True)

names = [
    "fast-food",
    "burger",
    "fries",
    "pasta",
    "pizza",
    "taco",
    "burrito",
    "bowl",
    "noodles",
    "sushi",
    "wok",
    "steak",
    "poke",
    "curry",
    "mac",
    "dessert",
    "drink",
    "ramen",
    "mezze",
    "salad",
    "toast",
    "nachos",
    "juice",
    "fried-chicken",
]

img = Image.open(source).convert("RGB")
w, h = img.size
cols, rows = 6, 4
tile_w, tile_h = w / cols, h / rows

for idx, name in enumerate(names):
    col = idx % cols
    row = idx // cols
    left = round(col * tile_w)
    upper = round(row * tile_h)
    right = round((col + 1) * tile_w)
    lower = round((row + 1) * tile_h)
    tile = img.crop((left, upper, right, lower))
    tile = ImageOps.fit(tile, (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    tile.save(out / f"{name}.png", optimize=True, quality=94)

print(f"Cropped {len(names)} realistic dish photos into {out}")
