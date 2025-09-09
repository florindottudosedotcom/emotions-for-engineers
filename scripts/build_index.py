import os
import frontmatter
from pathlib import Path

def main():
    """
    Scans for courses and generates a root index.md file with a card grid.
    """
    docs_dir = Path("docs")
    en_dir = docs_dir / "en"
    index_md_path = docs_dir / "index.md"

    if not en_dir.is_dir():
        print(f"Directory not found: {en_dir}")
        return

    courses = []
    for course_dir in en_dir.iterdir():
        if course_dir.is_dir():
            # Look for the course's own index file for metadata
            course_index_path = course_dir / "index.md"
            if course_index_path.is_file():
                try:
                    post = frontmatter.load(course_index_path)
                    description = post.get("description", "No description available.")

                    # Generate a clean course title from the directory name
                    title = course_dir.name.replace("-", " ").replace("_", " ").title()

                    courses.append({
                        "title": title,
                        "description": description,
                        "path": f"en/{course_dir.name}/"
                    })
                except Exception as e:
                    print(f"Could not process {course_index_path}: {e}")

    # Sort courses alphabetically by title
    courses.sort(key=lambda x: x["title"])

    # Generate the content for the root index.md file
    content = "---\nhide:\n  - navigation\n---\n\n"
    content += "# Available Courses\n\n"
    content += "Here is a list of all available courses. Please select one to get started.\n\n"

    if not courses:
        content += "No courses are available yet. Please check back later!"
    else:
        content += '<div class="grid cards" markdown>\n\n'
        for course in courses:
            content += f'-   [___{course["title"]}___]({course["path"]}){{.card-title}}\n\n'
            content += f'    ---\n'
            content += f'    {course["description"]}\n\n'
            content += f'    [:octicons-arrow-right-24: Go to course]({course["path"]})\n\n'
        content += '</div>\n'

    # Write the generated content to the root index.md
    try:
        with open(index_md_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully generated {index_md_path} with {len(courses)} courses.")
    except Exception as e:
        print(f"Could not write to {index_md_path}: {e}")

if __name__ == "__main__":
    main()
