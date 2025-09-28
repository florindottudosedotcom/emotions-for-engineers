/**
 * Translation Service - Following CLAUDE.md Guidelines
 * AI-powered translation service for slides content
 */

import { logger } from '../core/utils.js';

export class TranslationService {
    constructor(aiProvider) {
        this.aiProvider = aiProvider;
        this.translationCache = new Map();
        this.batchSize = 3; // Number of slides to translate in one request
    }

    /**
     * Get language configuration with native names
     */
    getLanguageConfig() {
        return [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'de', name: 'German', nativeName: 'Deutsch' },
            { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文' },
            { code: 'es', name: 'Spanish', nativeName: 'Español' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語' },
            { code: 'fr', name: 'French', nativeName: 'Français' },
            { code: 'it', name: 'Italian', nativeName: 'Italiano' },
            { code: 'ro', name: 'Romanian', nativeName: 'Română' }
        ];
    }

    /**
     * Get language name by code
     */
    getLanguageName(code) {
        const lang = this.getLanguageConfig().find(l => l.code === code);
        return lang ? lang.name : code;
    }

    /**
     * Get native language name by code
     */
    getNativeLanguageName(code) {
        const lang = this.getLanguageConfig().find(l => l.code === code);
        return lang ? lang.nativeName : code;
    }

    /**
     * Extract translatable content from slides
     */
    extractTranslatableContent(slides) {
        const content = [];

        slides.forEach((slide, index) => {
            const slideContent = {
                slideIndex: index,
                slideNumber: slide.slideNumber,
                title: slide.title || '',
                content: slide.content || '',
                bulletPoints: []
            };

            // Extract bullet points if content contains them
            if (slide.content && slide.content.includes('•')) {
                const lines = slide.content.split('\n');
                slideContent.bulletPoints = lines
                    .filter(line => line.trim().startsWith('•'))
                    .map(line => line.trim().substring(1).trim());

                // Remove bullet points from main content
                slideContent.content = lines
                    .filter(line => !line.trim().startsWith('•'))
                    .join('\n')
                    .trim();
            }

            content.push(slideContent);
        });

        return content;
    }

    /**
     * Create translation prompt for a batch of slides
     */
    createTranslationPrompt(slidesBatch, targetLanguage) {
        const langName = this.getLanguageName(targetLanguage);
        const nativeName = this.getNativeLanguageName(targetLanguage);

        let prompt = `Translate the following presentation slides to ${langName} (${nativeName}).

IMPORTANT INSTRUCTIONS:
- Maintain professional presentation tone
- Keep technical accuracy
- Preserve formatting structure
- Use appropriate cultural context
- Return ONLY valid JSON without code blocks or explanations

Translate these ${slidesBatch.length} slides:

`;

        slidesBatch.forEach((slide, index) => {
            prompt += `SLIDE ${slide.slideNumber}:
Title: "${slide.title}"
Content: "${slide.content}"`;

            if (slide.bulletPoints && slide.bulletPoints.length > 0) {
                prompt += `\nBullet Points:\n${slide.bulletPoints.map(bp => `- ${bp}`).join('\n')}`;
            }
            prompt += '\n\n';
        });

        prompt += `Respond with this exact JSON structure:
{
  "translations": [
    {
      "slideNumber": ${slidesBatch[0].slideNumber},
      "title": "translated title",
      "content": "translated content",
      "bulletPoints": ["translated bullet 1", "translated bullet 2"]
    }
  ]
}`;

        return prompt;
    }

    /**
     * Translate slides content to target language
     */
    async translateSlides(slides, targetLanguage, onProgress = null) {
        const cacheKey = `${JSON.stringify(slides)}_${targetLanguage}`;

        // Check cache first
        if (this.translationCache.has(cacheKey)) {
            logger.debug(`Using cached translation for ${targetLanguage}`);
            return this.translationCache.get(cacheKey);
        }

        if (!this.aiProvider) {
            throw new Error('No AI provider available for translation');
        }

        try {
            logger.info(`Starting translation to ${targetLanguage}`);

            const translatableContent = this.extractTranslatableContent(slides);
            const totalSlides = translatableContent.length;
            const batches = [];

            // Split into batches
            for (let i = 0; i < translatableContent.length; i += this.batchSize) {
                batches.push(translatableContent.slice(i, i + this.batchSize));
            }

            const translatedSlides = [];
            let processedSlides = 0;

            // Process each batch
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];

                if (onProgress) {
                    onProgress({
                        language: targetLanguage,
                        current: processedSlides,
                        total: totalSlides,
                        status: `Translating slides ${processedSlides + 1}-${processedSlides + batch.length}...`
                    });
                }

                const prompt = this.createTranslationPrompt(batch, targetLanguage);

                try {
                    const response = await this.aiProvider.generateText(prompt);
                    const parsed = this.parseTranslationResponse(response);

                    if (parsed && parsed.translations) {
                        translatedSlides.push(...parsed.translations);
                        processedSlides += batch.length;
                    } else {
                        // Fallback: create simple translations
                        batch.forEach(slide => {
                            translatedSlides.push({
                                slideNumber: slide.slideNumber,
                                title: slide.title,
                                content: slide.content,
                                bulletPoints: slide.bulletPoints || []
                            });
                        });
                        processedSlides += batch.length;
                        logger.warn(`Failed to parse translation for batch ${batchIndex + 1}, using original content`);
                    }
                } catch (error) {
                    logger.error(`Translation failed for batch ${batchIndex + 1}:`, error);

                    // Fallback: use original content
                    batch.forEach(slide => {
                        translatedSlides.push({
                            slideNumber: slide.slideNumber,
                            title: slide.title,
                            content: slide.content,
                            bulletPoints: slide.bulletPoints || []
                        });
                    });
                    processedSlides += batch.length;
                }

                // Small delay between batches to be respectful to the API
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (onProgress) {
                onProgress({
                    language: targetLanguage,
                    current: totalSlides,
                    total: totalSlides,
                    status: `Translation to ${this.getLanguageName(targetLanguage)} complete`
                });
            }

            // Cache the translation
            this.translationCache.set(cacheKey, translatedSlides);

            logger.info(`Translation to ${targetLanguage} completed: ${translatedSlides.length} slides`);
            return translatedSlides;

        } catch (error) {
            logger.error(`Translation to ${targetLanguage} failed:`, error);
            throw new Error(`Translation to ${this.getLanguageName(targetLanguage)} failed: ${error.message}`);
        }
    }

    /**
     * Parse AI response for translation
     */
    parseTranslationResponse(response) {
        try {
            // Clean up response - remove code blocks if present
            let cleaned = response.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.substring(7);
            }
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith('```')) {
                cleaned = cleaned.substring(0, cleaned.length - 3);
            }

            return JSON.parse(cleaned);
        } catch (error) {
            logger.error('Failed to parse translation response:', error);
            logger.debug('Raw response:', response);
            return null;
        }
    }

    /**
     * Create translated slides data structure
     */
    createTranslatedSlides(originalSlides, translations, targetLanguage) {
        return originalSlides.map((originalSlide, index) => {
            const translation = translations.find(t => t.slideNumber === originalSlide.slideNumber) ||
                              translations[index];

            if (!translation) {
                // Fallback to original content
                return {
                    ...originalSlide,
                    language: targetLanguage
                };
            }

            // Reconstruct content with bullet points if needed
            let translatedContent = translation.content || '';
            if (translation.bulletPoints && translation.bulletPoints.length > 0) {
                if (translatedContent) {
                    translatedContent += '\n\n';
                }
                translatedContent += translation.bulletPoints.map(bp => `• ${bp}`).join('\n');
            }

            return {
                ...originalSlide,
                title: translation.title || originalSlide.title,
                content: translatedContent || originalSlide.content,
                language: targetLanguage
            };
        });
    }

    /**
     * Translate slides to multiple languages
     */
    async translateToMultipleLanguages(slides, targetLanguages, onProgress = null) {
        const results = new Map();
        const totalLanguages = targetLanguages.length;

        for (let langIndex = 0; langIndex < targetLanguages.length; langIndex++) {
            const language = targetLanguages[langIndex];

            try {
                if (onProgress) {
                    onProgress({
                        currentLanguage: langIndex + 1,
                        totalLanguages,
                        language,
                        status: `Starting translation to ${this.getLanguageName(language)}...`
                    });
                }

                const translations = await this.translateSlides(slides, language, onProgress);
                const translatedSlides = this.createTranslatedSlides(slides, translations, language);

                results.set(language, translatedSlides);

                if (onProgress) {
                    onProgress({
                        currentLanguage: langIndex + 1,
                        totalLanguages,
                        language,
                        status: `${this.getLanguageName(language)} translation complete`
                    });
                }

            } catch (error) {
                logger.error(`Failed to translate to ${language}:`, error);

                // Store original content as fallback
                const fallbackSlides = slides.map(slide => ({
                    ...slide,
                    language
                }));
                results.set(language, fallbackSlides);

                if (onProgress) {
                    onProgress({
                        currentLanguage: langIndex + 1,
                        totalLanguages,
                        language,
                        status: `Translation to ${this.getLanguageName(language)} failed, using original content`,
                        error: error.message
                    });
                }
            }
        }

        return results;
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.translationCache.clear();
        logger.debug('Translation cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.translationCache.size,
            languages: Array.from(this.translationCache.keys())
                .map(key => key.split('_').pop())
                .filter((lang, index, arr) => arr.indexOf(lang) === index)
        };
    }
}