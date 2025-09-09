import os
import frontmatter
from pathlib import Path

def get_message(key, lang, translations):
    """
    Retrieves a translated message for a given key and language.
    Falls back to English if the translation is not available.
    """
    return translations.get(lang, {}).get(key, translations.get("en", {}).get(key, ""))

def generate_index_for_language(lang_dir, translations):
    """
    Generates an index.md file for a specific language.
    """
    lang_code = lang_dir.name
    courses = []
    for course_dir in lang_dir.iterdir():
        if course_dir.is_dir():
            course_index_path = course_dir / "index.md"
            if course_index_path.is_file():
                try:
                    post = frontmatter.load(course_index_path)
                    description = post.get("description", "No description available.")
                    title = course_dir.name.replace("-", " ").replace("_", " ").title()
                    courses.append({
                        "title": title,
                        "description": description,
                        "path": f"/{lang_code}/{course_dir.name}/"
                    })
                except Exception as e:
                    print(f"Could not process {course_index_path}: {e}")

    courses.sort(key=lambda x: x["title"])

    # Generate content for the language-specific index.md
    hide_nav = "---\nhide:\n  - navigation\n---\n\n"
    title = f"# {get_message('available_courses_title', lang_code, translations)}\n\n"
    intro = f"{get_message('available_courses_intro', lang_code, translations)}\n\n"
    content = hide_nav + title + intro

    if not courses:
        content += f"{get_message('no_courses_yet', lang_code, translations)}\n"
    else:
        content += '<div class="grid cards" markdown>\n\n'
        for course in courses:
            content += f'-   [___{course["title"]}___]({course["path"]}){{.card-title}}\n\n'
            content += f'    ---\n'
            content += f'    {course["description"]}\n\n'
            content += f'    [:octicons-arrow-right-24: {get_message("go_to_course_button", lang_code, translations)}]({course["path"]})\n\n'
        content += '</div>\n'

    index_md_path = lang_dir / "index.md"
    try:
        with open(index_md_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully generated {index_md_path} with {len(courses)} courses.")
    except Exception as e:
        print(f"Could not write to {index_md_path}: {e}")

def main():
    """
    Scans for courses in all language directories and generates a language-specific
    index.md file for each with a card grid.
    """
    docs_dir = Path("docs")
    translations = {
        "en": {
            "available_courses_title": "Available Courses",
            "available_courses_intro": "Here is a list of all available courses. Please select one to get started.",
            "no_courses_yet": "No courses are available yet. Please check back later!",
            "go_to_course_button": "Go to course"
        },
        "de": {
            "available_courses_title": "Verfügbare Kurse",
            "available_courses_intro": "Hier ist eine Liste aller verfügbaren Kurse. Bitte wählen Sie einen aus, um zu beginnen.",
            "no_courses_yet": "Es sind noch keine Kurse verfügbar. Bitte schauen Sie später wieder vorbei!",
            "go_to_course_button": "Zum Kurs"
        }
    }

    # Generate a root index.md to redirect to the default language
    root_index_md = docs_dir / "index.md"
    default_lang = "en"
    root_content = f'---\nhide:\n  - navigation\n---\n\n<meta http-equiv="refresh" content="0; url=./{default_lang}/" />\n'
    try:
        with open(root_index_md, "w", encoding="utf-8") as f:
            f.write(root_content)
        print(f"Generated root index.md with redirect to /{default_lang}/")
    except Exception as e:
        print(f"Could not write to {root_index_md}: {e}")

    for lang_dir in docs_dir.iterdir():
        if lang_dir.is_dir() and (lang_dir / "course-example").is_dir():
            generate_index_for_language(lang_dir, translations)

if __name__ == "__main__":
    main()
