import json
import pathlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS_ROOT = ROOT / "homelab-docs"
INDEX_PATH = DOCS_ROOT / "index.json"


def to_title(text):
    cleaned = text.replace("-", " ").replace("_", " ").strip()
    if not cleaned:
        return text
    return " ".join(word.capitalize() for word in cleaned.split())


def build_index():
    categories = []
    if not DOCS_ROOT.exists():
        return {"categories": []}

    landing = DOCS_ROOT / "landing.md"
    if landing.exists():
        categories.append(
            {
                "title": "Overview",
                "slug": "overview",
                "docs": [
                    {
                        "title": "Home",
                        "slug": "landing",
                    }
                ],
            }
        )

    for category_dir in sorted([p for p in DOCS_ROOT.iterdir() if p.is_dir()]):
        docs = []
        for md_file in sorted(category_dir.glob("*.md")):
            docs.append(
                {
                    "title": to_title(md_file.stem),
                    "slug": md_file.stem,
                }
            )

        if not docs:
            continue

        categories.append(
            {
                "title": to_title(category_dir.name),
                "slug": category_dir.name,
                "docs": docs,
            }
        )

    return {"categories": categories}


def main():
    index = build_index()
    DOCS_ROOT.mkdir(parents=True, exist_ok=True)
    with INDEX_PATH.open("w", encoding="utf-8") as handle:
        json.dump(index, handle, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
