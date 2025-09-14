# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Universal Course Platform with dual functionality:
1. **AI-Powered Course Creator**: A browser-based tool (`docs/course-creator.html`) that generates complete courses using various AI providers
2. **MkDocs Publishing Platform**: Automatically builds and deploys multi-language course websites from Markdown content

## Key Commands

### Development and Testing
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start local MkDocs development server (for previewing published content)
mkdocs serve
# This serves the site at http://127.0.0.1:8000

# Run the course creator locally (required for Ollama integration)
# On macOS/Linux:
./start_course_creator.sh
# On Windows:
./start_course_creator.bat
# This serves the creator at http://localhost:8000/docs/course-creator.html

# Build the site (regenerates navigation and content)
python build_site.py
mkdocs build
```

### Content Management
```bash
# Generate navigation structure and course index pages
python build_site.py

# Deploy to GitHub Pages (automatic on push to main)
git push origin main
```

## Architecture

### Core Components

- **`build_site.py`**: Dynamic site builder that scans `docs/` for course directories and auto-generates:
  - Navigation structure in `mkdocs.yml`
  - Multi-language course index pages (`courses.{lang}.md`)
  - Metadata extraction from course index files

- **Course Creator System**: Refactored into a launcher-based architecture:
  - **`docs/course-creator.html`**: Launcher page that provides access to specialized creator tools
  - **`docs/cloud_creator.html`**: Cloud AI tool (OpenAI, Anthropic, Google APIs)
  - **`docs/webllm_creator.html`**: In-browser AI tool using WebLLM (no server required)
  - **`docs/ollama_creator.html`**: Local AI tool for Ollama integration
  - All tools support multi-language translation (11+ languages) and downloadable course packages

- **MkDocs Configuration**: Material theme with i18n plugin for 11 languages

### Content Structure

- **Course directories**: Located in `docs/`, each containing:
  - `index.{lang}.md` files with YAML frontmatter (title, description)
  - Chapter files following pattern: `{NN}-{chapter-name}.{lang}.md`
  - Supported languages: en, de, fr, hi, it, ja, pt, ro, ru, es, zh

- **Static assets**: CSS/JS customizations in `docs/assets/`

### Build Process

1. `build_site.py` scans `docs/` for course directories (excludes `assets/`)
2. Extracts metadata from `index.{lang}.md` files (title from H1, description from frontmatter)
3. Generates navigation structure based on numbered chapters (`01-`, `02-`, etc.)
4. Creates language-specific course listing pages
5. Updates `mkdocs.yml` with dynamic navigation
6. GitHub Actions automatically builds and deploys on push to `main`

### Multi-language Support

- File naming convention: `filename.{lang}.md` (e.g., `index.en.md`, `about.de.md`)
- MkDocs i18n plugin handles language switching
- Build script generates localized navigation and course listings
- Chapters must exist in target language to appear in navigation

## Course Creation Workflow

1. **Access the Launcher**: Open `course-creator.html` to choose your AI provider
2. **Select Provider**:
   - **Cloud AI**: Use API-based services (OpenAI, Anthropic, Google) - requires API keys
   - **WebLLM**: In-browser AI processing - no server or API keys needed
   - **Ollama**: Local AI models - requires local Ollama installation
3. **Generate Content**: Input topic → AI generates course structure and content
4. **Download Package**: Get ZIP file with MkDocs-compatible structure
5. **Publish**: Extract to `docs/`, commit, and push to auto-deploy

## Important Notes

- Course directories are auto-discovered; no manual nav configuration needed
- Chapter ordering is based on filename prefixes (`01-`, `02-`, etc.)
- **Creator Tool Access**:
  - **Ollama integration**: Only available when running locally (detects localhost/127.0.0.1)
  - **WebLLM**: Works from any hosted environment (GitHub Pages, local, etc.)
  - **Cloud AI**: Works from any hosted environment but requires API keys
- All content is licensed under CC BY-SA 4.0
- GitHub Pages deployment is automatic via `.github/workflows/deploy.yml`