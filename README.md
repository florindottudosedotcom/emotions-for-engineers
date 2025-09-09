# Universal Course Content Repository

This repository is designed to be the "absolute source" for your course content. It uses Markdown for content and MkDocs for generating a beautiful, searchable, and multi-language website that is automatically deployed to GitHub Pages.

[![License: CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](./LICENSE).

## Features
- **Multi-Language Support:** Fully configured for English and German, with a language switcher. Easily extensible to other languages.
- **Automated Deployment:** Every push to the `main` branch automatically builds and deploys the latest version of the site to GitHub Pages.
- **Clean Navigation:** A contextual sidebar shows only the chapters for the course you are currently viewing.
- **Markdown-Based:** All content is written in simple Markdown files.

## Folder Structure

The repository is organized to support multiple courses and multiple languages using a file-suffix convention.

```
.
├── docs/
│   ├── index.en.md          # Homepage for English
│   ├── index.de.md          # Homepage for German
│   └── course-example/
│       ├── 01-introduction.en.md
│       ├── 01-introduction.de.md
│       └── ...
├── .gitignore
├── mkdocs.yml
└── requirements.txt
```

- **`docs/`**: Contains all source content for all languages.
- **`*.en.md`**: English language files are identified by the `.en.md` suffix.
- **`*.de.md`**: German language files are identified by the `.de.md` suffix.

## Getting Started

To work with this repository on your local machine, you'll need Python installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/florindottudosedotcom/emotions-for-engineers.git
    cd emotions-for-engineers
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

To preview your website as you make changes, start the live-reloading server:

```bash
mkdocs serve
```

This will start a local web server, typically at `http://127.0.0.1:8000`. The server will automatically rebuild the site when you save a file.

## Managing Content

### Adding a New Course

1.  Decide on a short, descriptive name for your course folder (e.g., `new-awesome-course`).
2.  Create a new directory for the course inside the `docs/` folder (e.g., `docs/new-awesome-course`).
3.  Add your chapter Markdown (`.md`) files to the course directory, making sure to use the correct language suffix (e.g., `chapter-1.en.md`).
4.  Add the new course to the navigation in the `mkdocs.yml` file. You will need to add an entry for each language you are supporting.

### Translation Workflow

The system uses file suffixes to manage translations.

1.  To add a translation for a page, create a new file with the same name but the target language's suffix. For example, to translate `course-example/intro.en.md`, you would create `course-example/intro.de.md`.
2.  The language switcher on the website will automatically link between the translated pages if they share the same base filename.

## Deployment to GitHub Pages

Deployment is fully automated. Simply push your changes to the `main` branch, and the GitHub Actions workflow will build and deploy your site automatically.

### One-Time Setup
To get your site live, you need to enable GitHub Pages in your repository settings:

1.  Go to your repository on GitHub and click on the **Settings** tab.
2.  In the left sidebar, under "Code and automation", click on **Pages**.
3.  Under "Build and deployment", for the **Source**, select **Deploy from a branch**.
4.  Under "Branch", select `gh-pages` as the source branch and `/ (root)` as the folder.
5.  Click **Save**.

After a few minutes, your website will be live at: **https://florindottudosedotcom.github.io/emotions-for-engineers/**
