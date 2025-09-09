# Universal Course Content Repository

This repository is designed to be the "absolute source" for your course content. It uses Markdown for content and MkDocs for generating a beautiful, searchable, and multi-language website that is automatically deployed to GitHub Pages.

[![License: CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](./LICENSE).

## Features
- **Dynamic Homepage:** A main landing page that automatically lists all available courses in a card grid.
- **Multi-Language Support:** Fully configured for English and German, with a language switcher. Easily extensible to other languages.
- **Automated Deployment:** Every push to the `main` branch automatically builds and deploys the latest version of the site to GitHub Pages.
- **Clean Navigation:** A contextual sidebar shows only the chapters for the course you are currently viewing.
- **Markdown-Based:** All content is written in simple Markdown files.

## Folder Structure

The repository is organized to support multiple courses and multiple languages in a clean way.

```
.
├── docs/
│   ├── en/
│   │   └── course-example/
│   │       ├── index.md     # Course homepage with metadata
│   │       └── ...
│   └── de/
│       └── ...
├── scripts/
│   └── build_index.py       # Script to generate the main homepage
├── .gitignore
├── mkdocs.yml
└── requirements.txt
```

- **`docs/`**: Contains all source content. The main `index.md` in this folder is auto-generated and should not be edited manually.
- **`docs/<lang>/<course-name>/`**: Each course has its own folder within a language.
- **`scripts/`**: Contains helper scripts, like the one to build the main homepage.

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

To preview your website as you make changes, you first need to generate the main homepage, then start the live-reloading server.

1.  **Generate the Homepage:**
    ```bash
    python scripts/build_index.py
    ```
2.  **Run the Server:**
    ```bash
    mkdocs serve
    ```

This will start a local web server, typically at `http://127.0.0.1:8000`. If you add or remove a course, you will need to re-run the `build_index.py` script to see the change on the main homepage.

## Managing Content

### Adding a New Course

1.  Decide on a short, descriptive name for your course folder (e.g., `new-awesome-course`).
2.  Create a new directory for the course inside the default language folder (e.g., `docs/en/new-awesome-course`).
3.  **Create a course homepage:** Add an `index.md` file inside your new course directory.
4.  **Add metadata:** At the top of this new `index.md`, add a "front matter" block with a `description`. This description will be shown on the main site landing page.
    ```yaml
    ---
    description: "A short, exciting description for your new course."
    ---

    # Welcome to the New Course
    ...
    ```
5.  Add your other chapter Markdown (`.md`) files to the course directory.
6.  The new course will automatically appear on the main homepage the next time the site is built.

### Translation Workflow

The system is designed to gracefully handle courses that exist in one language but not another.

1.  To add a translation for a course, create a corresponding course folder under the target language's directory (e.g., `docs/de/new-awesome-course`).
2.  Copy the markdown files from the source language and translate their content.
3.  The language switcher on the website will automatically link between the translated pages.

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
