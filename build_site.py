import os
import re
from pathlib import Path
from ruamel.yaml import YAML

# --- Constants ---
DOCS_DIR = Path("docs")
MKDOCS_FILE = Path("mkdocs.yml")
EXCLUDED_DIRS = ["assets"]

# --- Main Logic ---

def get_course_dirs():
    """Finds all course directories in the docs folder."""
    course_dirs = []
    for item in DOCS_DIR.iterdir():
        if item.is_dir() and item.name not in EXCLUDED_DIRS:
            course_dirs.append(item)
    return course_dirs

def get_course_metadata(course_dir: Path, lang: str = "en"):
    """
    Extracts metadata (title, description) from a course's index file.
    """
    index_file = course_dir / f"index.{lang}.md"
    if not index_file.exists():
        return None

    content = index_file.read_text(encoding="utf-8")

    # Extract description from YAML frontmatter
    description = ""
    frontmatter_match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        desc_match = re.search(r"description:\s*\"?(.*?)\"?\s*$", frontmatter, re.MULTILINE)
        if desc_match:
            description = desc_match.group(1).strip()

    # Extract title from the first H1 header
    title = ""
    title_match = re.search(r"^#\s+(.*)", content, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip().replace('"', '')

    # Fallback to directory name if title is not found
    if not title:
        title = course_dir.name.replace("-", " ").title()

    return {"title": title, "description": description, "path": course_dir}

def get_chapters(course_dir: Path, lang: str = "en"):
    """Gets a sorted list of chapter files for a given course."""
    chapters = []
    for item in sorted(course_dir.glob(f"[0-9][0-9]-*.{lang}.md")):
        chapters.append(item)
    return chapters

def format_chapter_title(filename: str):
    """Formats a chapter filename into a human-readable title."""
    # Remove number prefix and language extension
    title = re.sub(r"^\d{2}-", "", filename)
    # This regex now handles any two-letter language code
    title = re.sub(r"\.[a-z]{2}\.md$", "", title)
    # Replace hyphens with spaces and capitalize
    title = title.replace("-", " ").title()
    return title

def main():
    """
    Main function to build the site navigation and index pages.
    """
    print("Starting site build process...")

    yaml = YAML()
    yaml.preserve_quotes = True
    # Prevent ruamel.yaml from wrapping long lines
    yaml.width = 4096

    # Check if mkdocs.yml exists, if not, initialize a basic config
    if not MKDOCS_FILE.exists():
        print(f"Warning: {MKDOCS_FILE} not found. A new one will be created.")
        mkdocs_config = {} # Or load a template
    else:
        with open(MKDOCS_FILE, 'r', encoding='utf-8') as f:
            mkdocs_config = yaml.load(f)

    # --- Build Navigation ---
    print("Building navigation structure for mkdocs.yml...")
    course_dirs = get_course_dirs()
    new_nav = [
        {'Home': 'index.md'},
        {'Course Creator': 'course-creator.html'},
        {'Available Courses': 'courses.md'},
        {'About': 'about.md'}
    ]

    for course_dir in sorted(course_dirs):
        # We only need the English version for the nav structure
        # The i18n plugin handles language switching
        metadata = get_course_metadata(course_dir, "en")
        if not metadata:
            print(f"Skipping {course_dir.name}: no index.en.md found.")
            continue

        course_title_key = metadata["title"]
        course_nav_list = [
            {"Overview": str(course_dir.relative_to(DOCS_DIR) / "index.md").replace('\\', '/')}
        ]

        chapters = get_chapters(course_dir, "en")
        for chapter_file in chapters:
            chapter_title = format_chapter_title(chapter_file.name)
            # Correctly create the nav path by removing the lang code
            lang_code = chapter_file.name.split('.')[-2]
            nav_path = str(chapter_file.relative_to(DOCS_DIR)).replace(f".{lang_code}.md", ".md").replace('\\', '/')
            course_nav_list.append({chapter_title: nav_path})

        new_nav.append({course_title_key: course_nav_list})

    mkdocs_config['nav'] = new_nav

    with open(MKDOCS_FILE, 'w', encoding='utf-8') as f:
        yaml.dump(mkdocs_config, f)
    print("✅ Successfully updated mkdocs.yml navigation.")

    # --- Build Index Pages ---
    print("Building main index pages...")

    # Find the i18n plugin configuration to get the list of languages
    i18n_plugin_config = None
    for plugin in mkdocs_config.get('plugins', []):
        if isinstance(plugin, dict) and 'i18n' in plugin:
            i18n_plugin_config = plugin['i18n']
            break

    if i18n_plugin_config:
        languages = [lang['locale'] for lang in i18n_plugin_config.get('languages', [])]
    else:
        print("Warning: i18n plugin configuration not found. Defaulting to 'en'.")
        languages = ['en']

    for lang in languages:
        index_content = f"# Available Courses\n\n"
        if lang == "de":
            index_content = f"# Verfügbare Kurse\n\n" # Simple i18n for the title

        index_content += "Welcome! This is your central hub for learning and growth. Below you'll find a curated list of courses designed to enhance your emotional intelligence and professional skills. Browse the available options and click \"Start Learning\" to begin your journey.\n\n"
        if lang == "de":
            index_content = "# Verfügbare Kurse\n\nWillkommen! Dies ist Ihr zentraler Hub für Lernen und Wachstum. Unten finden Sie eine kuratierte Liste von Kursen, die darauf ausgelegt sind, Ihre emotionale Intelligenz und beruflichen Fähigkeiten zu verbessern. Durchsuchen Sie die verfügbaren Optionen und klicken Sie auf \"Lernen starten\", um Ihre Reise zu beginnen.\n\n"

        index_content += "<div class=\"grid cards\" markdown>\n\n"

        cards_content = []
        for course_dir in sorted(course_dirs):
            metadata = get_course_metadata(course_dir, lang)
            if not metadata or not metadata['description']:
                # If the language-specific version doesn't exist, skip it
                continue

            link_path = str(course_dir.relative_to(DOCS_DIR) / "index.md").replace('\\', '/')
            card = (
                f"-   __{metadata['title']}__\n\n"
                f"    ---\n\n"
                f"    {metadata['description']}\n\n"
                f"    [:octicons-arrow-right-24: Start Learning]({link_path})\n"
            )
            cards_content.append(card)

        index_content += "\n".join(cards_content)
        index_content += "\n</div>\n"

        if cards_content:
            courses_file_path = DOCS_DIR / f"courses.{lang}.md"
            courses_file_path.write_text(index_content, encoding="utf-8")
            print(f"✅ Successfully generated courses.{lang}.md")

if __name__ == "__main__":
    main()
