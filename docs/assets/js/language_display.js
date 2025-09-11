// docs/assets/js/language_display.js

// This script adds the name of the current language next to the language switcher icon.
// It's a workaround for a conflict between the i18n plugin and the Material theme.

document.addEventListener("DOMContentLoaded", function() {
  // Mapping of language codes to their full names.
  // This needs to be kept in sync with the `plugins.i18n.languages` section of mkdocs.yml.
  const languageNames = {
    "en": "English",
    "de": "Deutsch",
    "fr": "Français",
    "hi": "हिन्दी",
    "it": "Italiano",
    "ja": "日本語",
    "pt": "Português",
    "ro": "Română",
    "ru": "Русский",
    "es": "Español",
    "zh": "中文"
  };

  // Find the language switcher button
  const langSwitcher = document.querySelector(".md-header__option .md-select");

  if (langSwitcher) {
    // Get the current language from the <html> tag
    const currentLang = document.documentElement.lang;

    // Get the full name, default to the code if not found
    const currentLangName = languageNames[currentLang] || currentLang;

    // Create a new span element to hold the language name
    const langNameSpan = document.createElement("span");
    langNameSpan.className = "md-header__button md-header__button--active";
    langNameSpan.textContent = currentLangName;
    langNameSpan.style.marginLeft = "0.2rem"; // Add a little space

    // Insert the new span right before the language switcher's globe icon
    langSwitcher.insertBefore(langNameSpan, langSwitcher.querySelector(".md-icon"));
  }
});
