# AGENTS.md
📌 **Project Overview**

**Name:** AI Course Creator

**Description:** A web application that allows users to generate educational courses using various AI providers (Cloud, WebLLM, Ollama). The project is built as a static website.

**Tech Stack:** HTML, CSS, JavaScript (ES Modules), Python (for build script), MkDocs (for site structure). Libraries: JSZip, js-yaml, Toast UI Editor, WebLLM.

**Repo Layout:**

```
/docs/           → Main application source (HTML, CSS, JS, Markdown content)
/site/           → Generated static site (do not edit directly)
/agents.md       → These instructions
/build_site.py   → Python script to build MkDocs navigation and course indexes
/mkdocs.yml      → MkDocs configuration file
/requirements.txt→ Python dependencies
/*.sh, *.bat     → Utility scripts to start the dev server
```

⚙️ **Setup & Run**

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Run dev server:**
The application is a collection of static files. You can serve it with a simple Python web server from the repository root.
```bash
python3 -m http.server
```
Then, open `http://localhost:8000/docs/course-creator.html` in your browser. The provided `start_course_creator.sh` script automates this.

**Build for production:**
The production site is built with MkDocs. First, run the custom build script, then run MkDocs.
```bash
python build_site.py
mkdocs build
```
The final static site will be in the `/site` directory.

**Environment:**
There is no `.env` file. API keys for cloud providers are entered in the UI on a per-session basis and are not stored.

✅ **Testing Instructions**

**Run all tests:**
There is no formal, automated test suite for this project yet.

**Rule:** All new features and bug fixes must be manually verified before submission. When possible, create a temporary Playwright script in a `jules-scratch/` directory to demonstrate the changes.

**Verification Attempts:**
When performing verifications with Playwright scripts, only attempt the verification a maximum of three times. If the verification is still unsuccessful after three attempts, skip it. Then, ask and instruct the user to perform the verification manually.

🎨 **Code Style & Conventions**

**Language Standard:** JavaScript (ES Modules), Python 3

**Formatting:** Follow standard modern JavaScript and Python conventions.

**Naming:**
*   Variables & Functions → `camelCase` (JS), `snake_case` (Python)
*   Classes → `PascalCase`
*   Constants → `UPPER_SNAKE_CASE`

**Comments:** Use comments only where the logic is non-obvious.

🔐 **Security & Permissions**

**Never hardcode secrets.** API keys are handled via the in-app settings modal and are not stored.

The application is a static site and has no server-side authentication or database.

🛠 **Workflow for Agents**

*   **Before coding:** Explain your plan in plain English.
*   **File paths:** Always write files in the correct directories.
*   **When unsure:** Ask clarifying questions before coding.
*   **Pull Requests:**
    *   Branch name format: `feature/<short-name>` or `fix/<short-name>`
    *   Commit message format: `type(scope): message` (Conventional Commits)

📂 **Project Structure**
```
/docs
  /assets/
    /css        → CSS stylesheets
    /js         → JavaScript files
      /modules  → Shared JS modules (UI, API, State, Course)
    /images     → SVG and other images
  /*.html       → The main application pages (launcher, creators)
  /[course-name]/ → Directories containing course content as Markdown files
```

🚨 **Common Pitfalls to Avoid**

*   Don’t edit the `/site` directory directly; it is generated during the build process.
*   Do not add API keys or other secrets to the source code.
*   Be aware that the three creator pages (`webllm`, `cloud`, `ollama`) have their own main JS files but share common modules.
