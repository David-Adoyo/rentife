"""Generate Rentife logo assets and favicons from the source PNGs.

Usage: python3 scripts/make-icons.py
Sources: brand-source/rentife-mark.png (house + R + tick) and brand-source/rentife-wordmark.png.
Outputs transparent logo PNGs to public/brand/ and favicons to src/app/ and public/.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand-source"
BRAND = ROOT / "public" / "brand"
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"


def white_to_alpha(im: Image.Image, soft: float = 120.0, floor: float = 40.0) -> Image.Image:
    """Make the white background transparent, keeping anti-aliased edges clean."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            d = ((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2) ** 0.5
            # Below `floor` is compression noise in the off-white background.
            a = max(0.0, min(1.0, (d - floor) / (soft - floor)))
            if a <= 0.02:
                px[x, y] = (0, 0, 0, 0)
                continue
            # Un-blend from white so edge pixels keep the true colour.
            nr, ng, nb = (max(0, min(255, round((c - 255 * (1 - a)) / a))) for c in (r, g, b))
            px[x, y] = (nr, ng, nb, round(a * 255))
    return im


def trim(im: Image.Image) -> Image.Image:
    return im.crop(im.getchannel("A").getbbox())


def square(im: Image.Image, size: int, pad: float, bg=(0, 0, 0, 0)) -> Image.Image:
    """Fit im inside a size x size canvas with fractional padding on each side."""
    inner = round(size * (1 - 2 * pad))
    ratio = min(inner / im.width, inner / im.height)
    fitted = im.resize((max(1, round(im.width * ratio)), max(1, round(im.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg)
    canvas.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    mark = trim(white_to_alpha(Image.open(SRC / "rentife-mark.png")))
    word = trim(white_to_alpha(Image.open(SRC / "rentife-wordmark.png")))

    mark.save(BRAND / "rentife-mark.png", optimize=True)
    word.save(BRAND / "rentife-wordmark.png", optimize=True)
    # White versions for dark backgrounds (footer).
    for name, img in (("rentife-mark-white.png", mark), ("rentife-wordmark-white.png", word)):
        white = Image.new("RGBA", img.size, (255, 255, 255, 0))
        white.putalpha(img.getchannel("A"))
        white.save(BRAND / name, optimize=True)

    # Favicons. Small sizes use less padding so the mark stays legible.
    ico_sizes = [16, 32, 48]
    ico_frames = [square(mark, s, 0.02 if s <= 32 else 0.06) for s in ico_sizes]
    ico_frames[-1].save(APP / "favicon.ico", sizes=[(s, s) for s in ico_sizes], append_images=ico_frames[:-1])
    square(mark, 512, 0.08).save(APP / "icon.png", optimize=True)  # Next.js <link rel="icon">
    # Apple touch icon: iOS ignores transparency, so use a solid ivory tile.
    square(mark, 180, 0.14, bg=(252, 250, 250, 255)).convert("RGB").save(APP / "apple-icon.png", optimize=True)
    # PWA icons referenced by the web manifest.
    square(mark, 192, 0.1, bg=(252, 250, 250, 255)).save(PUBLIC / "icon-192.png", optimize=True)
    square(mark, 512, 0.1, bg=(252, 250, 250, 255)).save(PUBLIC / "icon-512.png", optimize=True)
    # Maskable: safe zone is the centre 80%, so pad generously.
    square(mark, 512, 0.2, bg=(252, 250, 250, 255)).save(PUBLIC / "icon-maskable-512.png", optimize=True)
    print("mark", mark.size, "wordmark", word.size)


if __name__ == "__main__":
    main()
