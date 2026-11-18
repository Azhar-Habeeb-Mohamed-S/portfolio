#!/usr/bin/env python3
"""Lightweight sanity checks for the static portfolio.

No dependencies, no build step. Run with: python scripts/verify.py
Used locally and by .github/workflows/ci.yml on every push and pull request.
"""

from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

errors = []
notes = []


class HtmlChecker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.html_count = 0
        self.stack = []
        self.inline_styles = []
        self.empty_alts = []
        self.local_refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.html_count += 1
        if "style" in attrs:
            self.inline_styles.append(tag)
        if tag == "img" and not (attrs.get("alt") or "").strip():
            self.empty_alts.append(attrs.get("src", "<no src>"))
        for key in ("src", "href"):
            value = attrs.get(key)
            if value and not re.match(r"^(https?:|//|#|mailto:|tel:|data:)", value):
                self.local_refs.append(value.split("#")[0].split("?")[0])
        if tag not in VOID_TAGS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS and self.stack and self.stack[-1] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID_TAGS:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            errors.append(f"HTML: unexpected closing tag </{tag}>")


def check_text_file(name):
    path = ROOT / name
    if not path.is_file():
        errors.append(f"{name}: file is missing")
        return ""
    return path.read_text(encoding="utf-8")


def main():
    html = check_text_file("index.html")
    css = check_text_file("styles.css")
    check_text_file("script.js")

    if html:
        checker = HtmlChecker()
        checker.feed(html)
        checker.close()

        if checker.html_count != 1:
            errors.append(f"HTML: expected exactly one <html>, found {checker.html_count}")
        if checker.stack:
            errors.append("HTML: unclosed tags -> " + ", ".join(checker.stack))
        if checker.inline_styles:
            errors.append("HTML: inline style= attributes -> " + ", ".join(checker.inline_styles))
        if checker.empty_alts:
            errors.append("HTML: images with empty alt -> " + ", ".join(checker.empty_alts))
        missing = sorted({ref for ref in checker.local_refs if ref and not (ROOT / ref).exists()})
        if missing:
            errors.append("HTML: missing local assets -> " + ", ".join(missing))

        # Hardcoded clock fallback values should not be baked into the markup.
        for clock_id in ("clock-time", "clock-date"):
            match = re.search(rf'id="{clock_id}"[^>]*>([^<]+)<', html)
            if match and match.group(1).strip():
                errors.append(f'HTML: hardcoded fallback in #{clock_id}: "{match.group(1).strip()}"')

    if css:
        opens = css.count("{")
        closes = css.count("}")
        if opens != closes:
            errors.append(f"CSS: unbalanced braces ({opens} open, {closes} close)")
        else:
            notes.append(f"CSS braces balanced ({opens})")
        if re.search(r"@import\s+url\(\s*['\"]?https?://", css, re.IGNORECASE):
            errors.append("CSS: remote stylesheet @import found — styles must be local")

    if errors:
        print("FAILED:")
        for error in errors:
            print("  - " + error)
        return 1

    for note in notes:
        print("OK: " + note)
    print("All sanity checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
