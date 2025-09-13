# Universal Course Platform

This repository serves a dual purpose:

1.  **A Content Publishing Platform:** It uses MkDocs to build and deploy beautiful, searchable, multi-language course websites from Markdown files.
2.  **An AI-Powered Creation Tool:** It includes the "Universal Course Creator," a powerful, browser-based tool that uses AI to help you generate entire courses from a single prompt.

This allows you to manage the entire lifecycle of your course content—from creation to publication—in one place.

[![License: CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](./LICENSE).

---

## Part 1: The Universal Course Creator Tool

The Universal Course Creator is a standalone HTML file (`docs/course-creator.html`) that allows you to generate complete, multi-chapter courses using a variety of AI providers.

### Features

-   **AI-Powered Content:** Generate a course title, description, and full chapter content from a single topic prompt.
-   **Multiple AI Providers:** Supports a wide range of AI models to suit your needs:
    -   **Offline (Local Network):** Use models running on your own machine with **Ollama**.
    -   **Online (In-Browser):** Use **WebLLM** to run models directly in your browser tab—no server or setup required.
    -   **Online (Cloud APIs):** Use powerful cloud models from **OpenAI**, **Anthropic**, and **Google** (requires API keys).
-   **Multi-Language Translation:** Automatically translate your generated course into over 10 languages.
-   **Downloadable Format:** Packages the entire course into a `.zip` file with all necessary Markdown files and a folder structure compatible with the publishing platform.
-   **Manual Editing:** Full control to add, remove, and edit chapters and content after generation.

### How to Run the Course Creator

You can run the course creator tool in two ways:

1.  **Online (Recommended for WebLLM & Cloud APIs):**
    -   Access the tool directly from the published GitHub Pages site for this repository. This is the easiest way to get started, especially if you plan to use WebLLM or Cloud API providers.

2.  **Locally (Required for Ollama):**
    -   To use Ollama, you must run the tool from a local web server. We have included convenient scripts to do this for you.
    -   **On macOS/Linux:**
        ```bash
        ./start_course_creator.sh
        ```
    -   **On Windows:**
        ```batch
        ./start_course_creator.bat
        ```
    -   These scripts will start a local server and provide you with a URL (usually `http://localhost:8000/docs/course-creator.html`).
    -   **Important for Ollama Users:** You may need to configure Ollama to allow requests from the web browser. Please see the official Ollama documentation for instructions on how to manage `OLLAMA_ORIGINS`.

### How to Publish Your Generated Course

After you have downloaded the `.zip` file from the Course Creator, follow these steps to publish it:

1.  **Unzip the File:** Extract the contents of the downloaded `.zip` file. This will give you a new folder named after your course.
2.  **Move the Folder:** Move this new course folder into the `docs/` directory of this repository.
3.  **Commit and Push:** Use Git to add, commit, and push the new files to the `main` branch of your repository.
    ```bash
    git add .
    git commit -m "feat: add new course on My Awesome Topic"
    git push origin main
    ```
4.  **Verify Deployment:** The GitHub Actions workflow will automatically start. After a few minutes, your new course will be live on your GitHub Pages website.

---

## Part 2: The Course Publishing Platform

This repository is also a fully configured MkDocs project for publishing the content you create.

### Features

-   **Markdown-Based:** All content is written in simple Markdown files.
-   **Multi-Language Support:** Fully configured for multiple languages using a file-suffix convention (e.g., `index.en.md`, `index.de.md`).
-   **Automated Deployment:** Every push to the `main` branch automatically builds and deploys the latest version of your course website to GitHub Pages.
-   **Clean Navigation:** A contextual sidebar shows only the chapters for the course you are currently viewing.

### Local Development (Publishing Platform)

To preview your **published course website** as you make changes to the Markdown files, start the MkDocs live-reloading server:

```bash
# Make sure you have installed dependencies first: pip install -r requirements.txt
mkdocs serve
```

This will start a local web server, typically at `http://127.0.0.1:8000`, for previewing your final website. **Note:** This is for viewing the *output*, not for running the creator tool.

### Deployment to GitHub Pages

Deployment is automated via GitHub Actions. For the initial setup in your own fork:

1.  Go to your repository's **Settings** > **Pages**.
2.  Under "Build and deployment," for the **Source**, select **GitHub Actions**.
3.  Your website will be live at `https://<your-username>.github.io/<your-repo-name>/`.
