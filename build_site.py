  #!/usr/bin/env python3
  """
  Dynamic site builder for the Universal Course Platform.

  This script scans the docs/ directory for course directories and 
  automatically:
  1. Generates navigation structure for mkdocs.yml
  2. Creates multi-language course index pages  
  3. Extracts metadata from course index files
  4. Implements caching for better performance
  5. Provides comprehensive error handling and logging

  Usage:
      python build_site.py [--verbose] [--cache] [--validate]
  """

  import os
  import re
  import yaml
  import json
  import logging
  import hashlib
  import argparse
  from pathlib import Path
  from typing import Dict, List, Tuple, Optional, Any
  from datetime import datetime

  # Configuration
  LANGUAGES = {
      'en': 'English',
      'de': 'Deutsch',
      'fr': 'Français',
      'hi': 'हिन्दी',
      'it': 'Italiano',
      'ja': '日本語',
      'pt': 'Português',
      'ro': 'Română',
      'ru': 'Русский',
      'es': 'Español',
      'zh': '中文'
  }

  CACHE_FILE = '.build_cache.json'
  DOCS_DIR = 'docs'
  MKDOCS_CONFIG = 'mkdocs.yml'

  # Setup logging
  logging.basicConfig(
      level=logging.INFO,
      format='%(asctime)s - %(levelname)s - %(message)s',
      handlers=[
          logging.StreamHandler(),
          logging.FileHandler('build_site.log')
      ]
  )
  logger = logging.getLogger(__name__)


  class SiteBuilder:
      """Enhanced site builder with caching, validation, and error 
  handling."""

      def __init__(self, use_cache: bool = True, validate: bool = False):
          self.use_cache = use_cache
          self.validate = validate
          self.cache = self._load_cache() if use_cache else {}
          self.courses = {}
          self.stats = {
              'processed_files': 0,
              'courses_found': 0,
              'languages_processed': set(),
              'errors': []
          }

      def _load_cache(self) -> Dict[str, Any]:
          """Load build cache from file."""
          try:
              if os.path.exists(CACHE_FILE):
                  with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                      cache = json.load(f)
                      logger.info(f"Loaded cache with {len(cache)} entries")
                      return cache
          except Exception as e:
              logger.warning(f"Failed to load cache: {e}")
          return {}

      def _save_cache(self):
          """Save build cache to file."""
          if not self.use_cache:
              return

          try:
              with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                  json.dump(self.cache, f, indent=2)
                  logger.info(f"Saved cache with {len(self.cache)} entries")
          except Exception as e:
              logger.error(f"Failed to save cache: {e}")

      def _get_file_hash(self, file_path: str) -> str:
          """Calculate hash of file contents for cache validation."""
          try:
              with open(file_path, 'rb') as f:
                  return hashlib.md5(f.read()).hexdigest()
          except Exception:
              return ""

      def _is_cache_valid(self, file_path: str) -> bool:
          """Check if cached data is still valid for a file."""
          if not self.use_cache or file_path not in self.cache:
              return False

          cached_hash = self.cache[file_path].get('hash', '')
          current_hash = self._get_file_hash(file_path)
          return cached_hash == current_hash

      def extract_metadata(self, file_path: str) -> Tuple[str, str]:
          """Extract title and description from a markdown file with 
  caching."""
          try:
              # Check cache first
              if self._is_cache_valid(file_path):
                  cached_data = self.cache[file_path]
                  logger.debug(f"Using cached metadata for {file_path}")
                  return cached_data['title'], cached_data['description']

              # Read and process file
              with open(file_path, 'r', encoding='utf-8') as f:
                  content = f.read()

              self.stats['processed_files'] += 1

              # Extract YAML frontmatter
              title, description = self._parse_frontmatter(content)

              # If no title in frontmatter, extract from first H1
              if not title:
                  title = self._extract_h1_title(content)

              # Validate extracted data
              if self.validate:
                  self._validate_metadata(file_path, title, description)

              # Cache the results
              if self.use_cache:
                  self.cache[file_path] = {
                      'title': title,
                      'description': description,
                      'hash': self._get_file_hash(file_path),
                      'timestamp': datetime.now().isoformat()
                  }

              logger.debug(f"Extracted metadata from {file_path}: 
  title='{title[:50]}...'")
              return title, description

          except Exception as e:
              error_msg = f"Error reading {file_path}: {e}"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)
              return "", ""

      def _parse_frontmatter(self, content: str) -> Tuple[str, str]:
          """Parse YAML frontmatter from content."""
          frontmatter_match = re.match(r'^---\s*\n(.*?)\n---', content,
  re.DOTALL)
          if frontmatter_match:
              try:
                  frontmatter = yaml.safe_load(frontmatter_match.group(1))
                  title = frontmatter.get('title', '') if
  isinstance(frontmatter, dict) else ''
                  description = frontmatter.get('description', '') if
  isinstance(frontmatter, dict) else ''
                  return title, description
              except yaml.YAMLError as e:
                  logger.warning(f"Invalid YAML frontmatter: {e}")
          return '', ''

      def _extract_h1_title(self, content: str) -> str:
          """Extract title from first H1 heading."""
          h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
          return h1_match.group(1).strip() if h1_match else ''

      def _validate_metadata(self, file_path: str, title: str, description: 
  str):
          """Validate extracted metadata."""
          if not title:
              self.stats['errors'].append(f"No title found in {file_path}")
          if not description:
              logger.warning(f"No description found in {file_path}")
          if len(title) > 100:
              logger.warning(f"Title very long ({len(title)} chars) in 
  {file_path}")
          if len(description) > 500:
              logger.warning(f"Description very long ({len(description)} 
  chars) in {file_path}")

      def scan_courses(self) -> Dict[str, Dict[str, Dict[str, str]]]:
          """Scan docs directory for course directories and extract 
  metadata."""
          docs_path = Path(DOCS_DIR)

          if not docs_path.exists():
              error_msg = f"Error: {DOCS_DIR}/ directory not found"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)
              return {}

          logger.info(f"Scanning courses in {docs_path}")

          for item in docs_path.iterdir():
              if item.is_dir() and item.name not in ['assets', '.git',
  '__pycache__']:
                  self._process_course_directory(item)

          # Clean up empty course entries
          self.courses = {name: data for name, data in self.courses.items()
  if data}

          self.stats['courses_found'] = len(self.courses)
          logger.info(f"Found {self.stats['courses_found']} courses")

          return self.courses

      def _process_course_directory(self, course_dir: Path):
          """Process a single course directory."""
          course_name = course_dir.name
          self.courses[course_name] = {}

          logger.debug(f"Processing course directory: {course_name}")

          # Look for index files in different languages
          for lang_code in LANGUAGES.keys():
              index_file = course_dir / f'index.{lang_code}.md'
              if index_file.exists():
                  title, description =
  self.extract_metadata(str(index_file))
                  if title:  # Only include if we found a title
                      self.courses[course_name][lang_code] = {
                          'title': title,
                          'description': description
                      }
                      self.stats['languages_processed'].add(lang_code)
                      logger.debug(f"Added {lang_code} version of 
  {course_name}")

          # Check for orphaned chapter files
          if self.validate:
              self._validate_course_structure(course_dir, course_name)

      def _validate_course_structure(self, course_dir: Path, course_name: 
  str):
          """Validate course directory structure."""
          # Check for orphaned chapter files
          chapter_files = list(course_dir.glob('*.md'))
          index_files = [f for f in chapter_files if
  f.name.startswith('index.')]

          if not index_files:
              self.stats['errors'].append(f"No index files found in 
  {course_name}")

          # Check for chapters without corresponding index
          for lang_code in LANGUAGES.keys():
              if lang_code in self.courses.get(course_name, {}):
                  continue  # Has index file

              # Check if there are chapter files for this language
              lang_chapters = [f for f in chapter_files
                             if f.name.endswith(f'.{lang_code}.md') and not
  f.name.startswith('index.')]
              if lang_chapters:
                  logger.warning(f"Found {len(lang_chapters)} {lang_code} 
  chapters in {course_name} but no index file")

      def generate_navigation(self) -> List[Dict[str, Any]]:
          """Generate navigation structure for mkdocs.yml."""
          nav = [
              {'Home': 'index.md'},
              {'Course Creator': 'course-creator.html'}
          ]

          if not self.courses:
              logger.warning("No courses found for navigation")
              return nav

          # Add course categories/sections
          course_nav = []
          for course_name, course_data in sorted(self.courses.items()):
              title = self._get_course_title(course_data)
              course_nav.append({title: f'{course_name}/index.md'})

          if course_nav:
              nav.append({'Courses': course_nav})
              logger.info(f"Generated navigation with {len(course_nav)} 
  courses")

          return nav

      def _get_course_title(self, course_data: Dict[str, Dict[str, str]]) ->
   str:
          """Get the best available title for a course."""
          # Prefer English title, fallback to first available language
          if 'en' in course_data:
              return course_data['en']['title']
          elif course_data:
              first_lang = next(iter(course_data.keys()))
              return course_data[first_lang]['title']
          else:
              return "Untitled Course"

      def update_mkdocs_config(self, nav: List[Dict[str, Any]]) -> bool:
          """Update mkdocs.yml with new navigation structure."""
          config_path = Path(MKDOCS_CONFIG)

          if not config_path.exists():
              error_msg = f"Error: {MKDOCS_CONFIG} not found"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)
              return False

          try:
              # Create backup
              backup_path = config_path.with_suffix('.yml.backup')
              config_path.rename(backup_path)

              with open(backup_path, 'r', encoding='utf-8') as f:
                  config = yaml.safe_load(f)

              if not isinstance(config, dict):
                  raise ValueError("Invalid mkdocs.yml format")

              # Update navigation
              config['nav'] = nav

              # Write back to file
              with open(config_path, 'w', encoding='utf-8') as f:
                  yaml.dump(config, f, default_flow_style=False,
  allow_unicode=True, sort_keys=False)

              # Remove backup on success
              backup_path.unlink()

              logger.info(f"Updated {config_path} with {len(nav)} navigation
   items")
              return True

          except Exception as e:
              error_msg = f"Error updating mkdocs.yml: {e}"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)

              # Restore backup if it exists
              backup_path = config_path.with_suffix('.yml.backup')
              if backup_path.exists():
                  backup_path.rename(config_path)
                  logger.info("Restored mkdocs.yml from backup")

              return False

      def generate_course_index_pages(self) -> bool:
          """Generate courses.{lang}.md files listing all available 
  courses."""
          if not self.courses:
              logger.warning("No courses to generate index pages for")
              return True

          success = True
          generated_count = 0

          for lang_code, lang_name in LANGUAGES.items():
              # Filter courses that have content in this language
              lang_courses = {name: data[lang_code] for name, data in
  self.courses.items()
                             if lang_code in data}

              if not lang_courses:
                  logger.debug(f"No courses found for language: 
  {lang_code}")
                  continue  # Skip if no courses in this language

              if self._generate_language_index(lang_code, lang_name,
  lang_courses):
                  generated_count += 1
              else:
                  success = False

          logger.info(f"Generated {generated_count} course index pages")
          return success

      def _generate_language_index(self, lang_code: str, lang_name: str, 
                                  lang_courses: Dict[str, Dict[str, str]]) -> bool:
          """Generate course index for a specific language."""
          try:
              # Generate content
              content = self._build_course_index_content(lang_name,
  lang_courses)

              # Write to file
              output_file = Path(f'{DOCS_DIR}/courses.{lang_code}.md')
              with open(output_file, 'w', encoding='utf-8') as f:
                  f.write(content)

              logger.debug(f"Generated {output_file} with 
  {len(lang_courses)} courses")
              return True

          except Exception as e:
              error_msg = f"Error writing courses.{lang_code}.md: {e}"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)
              return False

      def _build_course_index_content(self, lang_name: str, 
                                     lang_courses: Dict[str, Dict[str, 
  str]]) -> str:
          """Build the content for a course index page."""
          content = f"""---
  title: {lang_name} Courses
  description: Collection of courses available in {lang_name}
  ---

  # {lang_name} Courses

  Welcome to our collection of courses available in {lang_name}.

  ## Available Courses

  """

          for course_name, course_info in sorted(lang_courses.items()):
              title = course_info['title']
              description = course_info['description']
              content += f"### [{title}]({course_name}/index.md)\n\n"
              if description:
                  content += f"{description}\n\n"

          content += f"""
  ---

  *Total courses available in {lang_name}: {len(lang_courses)}*
  *Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*
  """

          return content

      def build(self) -> bool:
          """Execute the complete build process."""
          logger.info("Starting site build...")

          try:
              # Scan for courses
              self.scan_courses()

              if not self.courses:
                  logger.warning("No courses found. Nothing to do.")
                  return True

              # Generate navigation
              nav = self.generate_navigation()

              # Update mkdocs.yml
              if not self.update_mkdocs_config(nav):
                  return False

              # Generate course index pages
              if not self.generate_course_index_pages():
                  return False

              # Save cache
              self._save_cache()

              # Print statistics
              self._print_statistics()

              logger.info("Site build complete!")
              return True

          except Exception as e:
              error_msg = f"Build failed with exception: {e}"
              logger.error(error_msg)
              self.stats['errors'].append(error_msg)
              return False

      def _print_statistics(self):
          """Print build statistics."""
          stats = self.stats
          logger.info("Build Statistics:")
          logger.info(f"  Courses found: {stats['courses_found']}")
          logger.info(f"  Files processed: {stats['processed_files']}")
          logger.info(f"  Languages processed: {', '.join(sorted(stats['languages_processed']))}")

          if stats['errors']:
              logger.warning(f"  Errors encountered: 
  {len(stats['errors'])}")
              for error in stats['errors'][:5]:  # Show first 5 errors
                  logger.warning(f"    - {error}")
              if len(stats['errors']) > 5:
                  logger.warning(f"    ... and {len(stats['errors']) - 5} 
  more")


  def main():
      """Main function to build the site."""
      parser = argparse.ArgumentParser(description='Build the Universal 
  Course Platform site')
      parser.add_argument('--verbose', '-v', action='store_true',
  help='Enable verbose logging')
      parser.add_argument('--no-cache', action='store_true', help='Disable caching')
      parser.add_argument('--validate', action='store_true', help='Enable validation checks')

      args = parser.parse_args()

      if args.verbose:
          logging.getLogger().setLevel(logging.DEBUG)

      # Create builder instance
      builder = SiteBuilder(
          use_cache=not args.no_cache,
          validate=args.validate
      )

      # Execute build
      success = builder.build()

      if not success:
          logger.error("Build failed!")
          exit(1)


  if __name__ == "__main__":
      main()

