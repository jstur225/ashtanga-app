"""Build the small, static Noto Serif SC webfont used by the mini program.

The source font is intentionally kept outside the repository. Download the
official Google Fonts variable TTF and pass its path as the first argument.
All user-facing characters currently present in the mini-program source are
included in the generated font.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


ROOT = Path(__file__).resolve().parents[1]
WEAPP_ROOT = ROOT / "weapp"
OUTPUT_PATH = ROOT / "public" / "fonts" / "ashtanga-noto-serif-sc-ui-v2.woff"
SOURCE_SUFFIXES = {".js", ".json", ".wxml", ".wxss"}


def collect_characters() -> str:
    characters: set[str] = set()
    for path in WEAPP_ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in SOURCE_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8")
        characters.update(character for character in text if not character.isspace())

    # Preserve ordinary text input, dates, email addresses, and punctuation.
    characters.update(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        "0123456789"
        " ，。！？、；：‘’“”（）【】《》…—·"
        "@._+-/%:()[]{}#&='\""
    )
    return "".join(sorted(characters))


def build(source_path: Path) -> None:
    if not source_path.is_file():
        raise FileNotFoundError(f"Source font not found: {source_path}")

    font = TTFont(source_path)
    instantiateVariableFont(font, {"wght": 400}, inplace=True)

    options = subset.Options()
    options.flavor = "woff"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True

    characters = collect_characters()
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=characters)
    subsetter.subset(font)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff"
    font.save(OUTPUT_PATH)
    print(
        f"Generated {OUTPUT_PATH.relative_to(ROOT)} "
        f"({OUTPUT_PATH.stat().st_size / 1024:.1f} KiB, "
        f"{len(characters)} source characters)"
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python scripts/build-weapp-font-subset.py "
            "<NotoSerifSC-variable.ttf>"
        )
    build(Path(sys.argv[1]).resolve())
