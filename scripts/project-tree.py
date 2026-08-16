#!/usr/bin/env python3

from pathlib import Path
import re

# ============================================================
# Configuration
# ============================================================

ROOT = Path.cwd()
OUTPUT = ROOT / "PROJECT_TREE.md"

IGNORE_DIRS = {
    ".git",
    ".next",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".cache",
    ".vercel",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
}

IGNORE_FILES = {
    ".DS_Store",
    "PROJECT_TREE.md",
}

# Files that can be very large / noisy
IGNORE_EXTENSIONS = {
    ".lock",
    ".map",
    ".tsbuildinfo",
}

SOURCE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".php",
    ".sql",
}

# ============================================================
# Regex patterns for symbols
# ============================================================

PATTERNS = {
    "function": [
        re.compile(
            r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)"
        ),
        re.compile(
            r"^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*"
            r"(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
        ),
    ],

    "class": [
        re.compile(
            r"^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)"
        ),
    ],

    "interface": [
        re.compile(
            r"^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)"
        ),
    ],

    "type": [
        re.compile(
            r"^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*="
        ),
    ],

    "enum": [
        re.compile(
            r"^\s*(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)"
        ),
    ],

    "method": [
        re.compile(
            r"^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*"
            r"([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*\{"
        ),
    ],
}

# ============================================================
# Helpers
# ============================================================

def should_ignore(path: Path) -> bool:
    if path.name in IGNORE_FILES:
        return True

    if path.is_dir() and path.name in IGNORE_DIRS:
        return True

    if path.is_file() and path.suffix in IGNORE_EXTENSIONS:
        return True

    return False


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def read_source(path: Path):
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def extract_symbols(path: Path):
    """
    Extract high-level symbols from source files.
    This is intentionally heuristic rather than a full parser.
    """

    if path.suffix not in SOURCE_EXTENSIONS:
        return []

    content = read_source(path)

    if not content:
        return []

    symbols = []

    lines = content.splitlines()

    for line_number, line in enumerate(lines, start=1):

        stripped = line.strip()

        # Ignore comments
        if not stripped:
            continue

        if stripped.startswith("//"):
            continue

        if stripped.startswith("#"):
            continue

        found = False

        for symbol_type, patterns in PATTERNS.items():

            for pattern in patterns:

                match = pattern.match(line)

                if match:

                    name = match.group(1)

                    # Avoid treating common control-flow constructs as methods
                    if name in {
                        "if",
                        "for",
                        "while",
                        "switch",
                        "catch",
                    }:
                        continue

                    symbols.append(
                        {
                            "type": symbol_type,
                            "name": name,
                            "line": line_number,
                        }
                    )

                    found = True
                    break

            if found:
                break

    # Remove duplicate symbols
    seen = set()
    result = []

    for symbol in symbols:
        key = (
            symbol["type"],
            symbol["name"],
            symbol["line"],
        )

        if key not in seen:
            seen.add(key)
            result.append(symbol)

    return result


def file_description(path: Path):
    """
    Basic semantic description based on Next.js conventions.
    """

    name = path.name

    if name == "page.tsx" or name == "page.ts":
        return "Next.js route/page"

    if name == "layout.tsx" or name == "layout.ts":
        return "Next.js layout"

    if name == "route.ts" or name == "route.js":
        return "Next.js API Route Handler"

    if name == "middleware.ts":
        return "Next.js middleware"

    if name == "proxy.ts":
        return "Next.js proxy/middleware boundary"

    if name.startswith("loading."):
        return "Next.js loading UI"

    if name.startswith("error."):
        return "Next.js error boundary"

    if name.startswith("not-found."):
        return "Next.js not-found boundary"

    if "test" in name.lower() or "spec" in name.lower():
        return "Test"

    if name == "schema.prisma":
        return "Prisma database schema"

    if name == "package.json":
        return "Node.js package configuration"

    if name.startswith("next.config"):
        return "Next.js configuration"

    if name.startswith("tsconfig"):
        return "TypeScript configuration"

    if name.startswith(".env"):
        return "Environment configuration"

    return None


def render_file(path: Path, prefix: str, is_last: bool):
    connector = "└── " if is_last else "├── "

    desc = file_description(path)

    line = f"{prefix}{connector}{path.name}"

    if desc:
        line += f" — {desc}"

    output = [line]

    symbols = extract_symbols(path)

    if symbols:

        child_prefix = prefix + ("    " if is_last else "│   ")

        for index, symbol in enumerate(symbols):

            last_symbol = index == len(symbols) - 1

            symbol_connector = "└── " if last_symbol else "├── "

            output.append(
                f"{child_prefix}{symbol_connector}"
                f"{symbol['type']}: "
                f"{symbol['name']} "
                f"(line {symbol['line']})"
            )

    return output


def render_tree(directory: Path, prefix=""):
    entries = []

    for item in directory.iterdir():

        if should_ignore(item):
            continue

        entries.append(item)

    entries.sort(
        key=lambda p: (
            not p.is_dir(),
            p.name.lower(),
        )
    )

    output = []

    for index, item in enumerate(entries):

        is_last = index == len(entries) - 1

        if item.is_dir():

            connector = "└── " if is_last else "├── "

            output.append(
                f"{prefix}{connector}{item.name}/"
            )

            child_prefix = prefix + (
                "    " if is_last else "│   "
            )

            output.extend(
                render_tree(
                    item,
                    child_prefix,
                )
            )

        else:

            output.extend(
                render_file(
                    item,
                    prefix,
                    is_last,
                )
            )

    return output


# ============================================================
# Additional project statistics
# ============================================================

def collect_files(directory: Path):
    result = []

    for path in directory.rglob("*"):

        if should_ignore(path):
            continue

        if path.is_file():
            result.append(path)

    return result


def get_statistics(files):
    stats = {
        "total_files": len(files),
        "source_files": 0,
        "typescript": 0,
        "tsx": 0,
        "javascript": 0,
        "other": 0,
        "directories": 0,
    }

    directories = set()

    for path in files:

        directories.add(path.parent)

        ext = path.suffix.lower()

        if ext in {".ts", ".tsx"}:
            stats["source_files"] += 1

        if ext == ".ts":
            stats["typescript"] += 1

        elif ext == ".tsx":
            stats["tsx"] += 1

        elif ext in {".js", ".jsx", ".mjs", ".cjs"}:
            stats["javascript"] += 1

        else:
            stats["other"] += 1

    stats["directories"] = len(directories)

    return stats


def collect_routes(files):
    routes = []

    for path in files:

        if path.name == "route.ts" or path.name == "route.js":

            routes.append(relative(path))

    return sorted(routes)


def collect_pages(files):
    pages = []

    for path in files:

        if path.name in {
            "page.tsx",
            "page.ts",
            "page.jsx",
            "page.js",
        }:

            pages.append(relative(path))

    return sorted(pages)


def collect_services(files):
    return sorted(
        relative(p)
        for p in files
        if ".service." in p.name
    )


def collect_repositories(files):
    return sorted(
        relative(p)
        for p in files
        if ".repository." in p.name
    )


# ============================================================
# Generate report
# ============================================================

def main():

    files = collect_files(ROOT)

    stats = get_statistics(files)

    routes = collect_routes(files)
    pages = collect_pages(files)
    services = collect_services(files)
    repositories = collect_repositories(files)

    tree = render_tree(ROOT)

    lines = []

    lines.append("# Tvita Project Architecture Tree")
    lines.append("")
    lines.append("> Automatically generated project inventory.")
    lines.append("> Generated for AI-assisted architecture analysis.")
    lines.append("")
    lines.append("## Project Statistics")
    lines.append("")
    lines.append(f"- Total files: **{stats['total_files']}**")
    lines.append(f"- Directories: **{stats['directories']}**")
    lines.append(f"- TypeScript: **{stats['typescript']}**")
    lines.append(f"- TSX: **{stats['tsx']}**")
    lines.append(f"- JavaScript: **{stats['javascript']}**")
    lines.append(f"- Other files: **{stats['other']}**")
    lines.append("")
    
    lines.append("## API Routes")
    lines.append("")

    if routes:
        for route in routes:
            lines.append(f"- `{route}`")
    else:
        lines.append("- None detected.")

    lines.append("")

    lines.append("## Pages")
    lines.append("")

    if pages:
        for page in pages:
            lines.append(f"- `{page}`")
    else:
        lines.append("- None detected.")

    lines.append("")

    lines.append("## Services")
    lines.append("")

    if services:
        for service in services:
            lines.append(f"- `{service}`")
    else:
        lines.append("- None detected.")

    lines.append("")

    lines.append("## Repositories")
    lines.append("")

    if repositories:
        for repository in repositories:
            lines.append(f"- `{repository}`")
    else:
        lines.append("- None detected.")

    lines.append("")

    lines.append("## Complete Project Tree")
    lines.append("")
    lines.append("```text")
    lines.extend(tree)
    lines.append("```")
    lines.append("")

    lines.append("## AI Agent Instructions")
    lines.append("")
    lines.append(
        "Use this file as an architectural map, but do not treat "
        "it as a substitute for inspecting source files."
    )
    lines.append("")
    lines.append(
        "Before modifying code, verify actual imports, dependencies, "
        "runtime behavior, database relationships, and call sites."
    )
    lines.append("")

    OUTPUT.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )

    print()
    print("Project architecture generated successfully.")
    print()
    print(f"Output: {OUTPUT}")
    print()
    print(f"Files:       {stats['total_files']}")
    print(f"Directories: {stats['directories']}")
    print(f"API routes:  {len(routes)}")
    print(f"Pages:       {len(pages)}")
    print(f"Services:    {len(services)}")
    print(f"Repositories:{len(repositories)}")
    print()


if __name__ == "__main__":
    main()