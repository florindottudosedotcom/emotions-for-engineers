# Universal Course Content Repository

This repository is designed to be the "absolute source" for your course content. It uses Markdown for content and MkDocs for generating a beautiful, searchable, and multi-language website.

[![License: CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](./LICENSE).

## Table of Contents
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Local Development](#local-development)
- [Managing Content](#managing-content)
- [Translation Workflow](#translation-workflow)
- [Building the Website](#building-the-website)
- [Deployment to GitHub Pages](#deployment-to-github-pages)
- [Generating PDFs](#generating-pdfs)

## Folder Structure

The repository is organized to support multiple courses and multiple languages in a clean way.

```
.
├── docs/
│   ├── en/                  # English language content
│   │   └── course-example/
│   │       ├── assets/
│   │       │   └── placeholder.png
│   │       ├── 01-introduction.md
│   │       └── 02-advanced-topics.md
│   └── de/                  # German language content
│       └── course-example/
│           └── 01-introduction.md
├── mkdocs.yml             # Main configuration file for the site
└── requirements.txt       # Python dependencies
```

- **`docs/`**: This is the heart of your repository, containing all source content.
- **`docs/<lang>/`**: Each language gets its own sub-folder (e.g., `en` for English, `de` for German).
- **`docs/<lang>/<course-name>/`**: Inside each language folder, create a folder for each course.

## Getting Started

To work with this repository on your local machine, you'll need Python installed.

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

## Local Development

To preview your website as you make changes, run the MkDocs live-reloading server.

```bash
mkdocs serve
```

This will start a local web server, typically at `http://127.0.0.1:8000`, where you can preview your site. The `mkdocs-static-i18n` plugin handles serving all languages at once under different paths (e.g., `/` for English, `/de/` for German), so the single `mkdocs serve` command is sufficient. The website will automatically refresh whenever you save a file.

## Managing Content

### Adding a New Course

1.  Decide on a short, descriptive name for your course folder (e.g., `new-course`).
2.  Create a new directory for the course inside the default language folder: `docs/en/new-course`.
3.  Add your Markdown (`.md`) files to this new directory.
4.  There is no need to manually update the navigation; the site will automatically discover the new files.

### Adding a New Chapter

Simply add a new, numbered Markdown file to the appropriate course folder (e.g., `docs/en/course-example/03-new-chapter.md`).

## Translation Workflow

This setup is designed for your "automatic translation + human review" workflow.

### Adding Translations for an Existing Course

1.  Mirror the directory structure in the target language's folder. For example, to translate `course-example` to German, ensure the `docs/de/course-example/` directory exists.
2.  Copy the Markdown file you want to translate from the source language (e.g., `docs/en/course-example/01-introduction.md`) to the target language folder (`docs/de/course-example/01-introduction.md`).
3.  Translate the content of the new file. You can use an automatic translation tool to get the initial version and then have a human translator review and correct it.

### Adding a New Language

1.  Choose the two-letter ISO 639-1 code for the new language (e.g., `fr` for French).
2.  Update `mkdocs.yml` by adding the new language to the `plugins.i18n.languages` list and the `extra.alternate` list.
3.  Create the corresponding language folder in `docs` (e.g., `docs/fr/`).
4.  Start translating content into that folder.

## Building the Website

To generate the final, static website that you can deploy to any web host:

```bash
mkdocs build
```

This command will create a `site/` directory. This directory contains the complete website, with all languages. The default language will be at the root, and other languages will be in subdirectories (e.g., `site/de/`).

## Deployment to GitHub Pages

This repository is configured with a GitHub Actions workflow to automatically deploy your website to GitHub Pages.

### How it Works
1.  Every time you push a commit or merge a pull request to the `main` branch, the workflow will run.
2.  It automatically builds your MkDocs site, including all languages.
3.  It then pushes the contents of the generated `site/` directory to a special branch named `gh-pages`.

### One-Time Setup
To get your site live, you need to enable GitHub Pages in your repository settings:

1.  Go to your repository on GitHub and click on the **Settings** tab.
2.  In the left sidebar, click on **Pages**.
3.  Under "Build and deployment", for the **Source**, select **Deploy from a branch**.
4.  Under "Branch", select `gh-pages` as the source branch and `/ (root)` as the folder.
5.  Click **Save**.

After a few minutes, your website will be live at the URL shown on that page (usually `https://<your-username>.github.io/<your-repo-name>/`).

## Generating PDFs

The easiest way to generate a PDF of a chapter is to use your web browser's built-in "Print to PDF" functionality.

1.  Navigate to the page you want to save as a PDF in your browser (either in the local development server or on the live website).
2.  Go to `File > Print...`.
3.  Choose "Save as PDF" as the destination.
4.  The generated website theme is print-friendly, so the output should be clean.
