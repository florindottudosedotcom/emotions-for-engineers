/**
   * Security utilities and Content Security Policy helpers
   */

  class SecurityManager {
      constructor() {
          this.init();
      }

      init() {
          this.setupCSP();
          this.sanitizeExistingContent();
          this.setupSecurityHeaders();
      }

      // Set up Content Security Policy via meta tag if not already present
      setupCSP() {
          if
  (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
              const cspMeta = document.createElement('meta');
              cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
              cspMeta.setAttribute('content', this.getCSPContent());
              document.head.appendChild(cspMeta);
          }
      }

      getCSPContent() {
          return [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://esm.run https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "font-src 'self' https://cdnjs.cloudflare.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com http://localhost:11434",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
          ].join('; ');
      }

      // Sanitize any existing content that might be unsafe
      sanitizeExistingContent() {
          // Find and sanitize any innerHTML usage
          const dangerousElements =
  document.querySelectorAll('[data-unsafe-html]');
          dangerousElements.forEach(element => {
              const content = element.getAttribute('data-unsafe-html');
              element.textContent = content;
              element.removeAttribute('data-unsafe-html');
          });
      }

      // Add security-related meta tags
      setupSecurityHeaders() {
          this.addMetaTag('referrer', 'strict-origin-when-cross-origin');
          this.addMetaTag('X-Content-Type-Options', 'nosniff');
          this.addMetaTag('X-Frame-Options', 'DENY');
          this.addMetaTag('X-XSS-Protection', '1; mode=block');
      }

      addMetaTag(name, content) {
          if (!document.querySelector(`meta[name="${name}"], 
  meta[http-equiv="${name}"]`)) {
              const meta = document.createElement('meta');
              if (name.startsWith('X-')) {
                  meta.setAttribute('http-equiv', name);
              } else {
                  meta.setAttribute('name', name);
              }
              meta.setAttribute('content', content);
              document.head.appendChild(meta);
          }
      }

      // Sanitize user input
      static sanitizeInput(input) {
          if (typeof input !== 'string') {
              return '';
          }

          return input
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/\//g, '&#x2F;');
      }

      // Validate URLs to prevent malicious redirects
      static validateUrl(url) {
          try {
              const urlObj = new URL(url);

              // Allow only specific protocols
              const allowedProtocols = ['http:', 'https:'];
              if (!allowedProtocols.includes(urlObj.protocol)) {
                  return false;
              }

              // Block private IP ranges for external APIs
              const hostname = urlObj.hostname;
              if (hostname === 'localhost' ||
                  hostname === '127.0.0.1' ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.') ||
                  hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
                  // Only allow localhost for Ollama
                  return urlObj.port === '11434' && urlObj.hostname ===
  'localhost';
              }

              return true;
          } catch {
              return false;
          }
      }

      // Rate limiting for API calls
      static createRateLimiter(maxRequests = 10, timeWindow = 60000) {
          const requests = [];

          return function(apiCall) {
              const now = Date.now();

              // Remove old requests outside the time window
              while (requests.length > 0 && requests[0] < now - timeWindow)
  {
                  requests.shift();
              }

              // Check if we're at the limit
              if (requests.length >= maxRequests) {
                  throw new Error('Rate limit exceeded. Please wait before making more requests.');
              }

              // Add current request
              requests.push(now);

              // Execute the API call
              return apiCall();
          };
      }

      // Secure random string generation
      static generateSecureId(length = 16) {
          const array = new Uint8Array(length);
          crypto.getRandomValues(array);
          return Array.from(array, byte => byte.toString(16).padStart(2,
  '0')).join('');
      }

      // Validate API keys format (basic validation)
      static validateApiKeyFormat(apiKey, provider) {
          if (!apiKey || typeof apiKey !== 'string') {
              return false;
          }

          const patterns = {
              openai: /^sk-[a-zA-Z0-9]{48,}$/,
              anthropic: /^sk-ant-[a-zA-Z0-9-]{95,}$/,
              google: /^[a-zA-Z0-9_-]{39}$/
          };

          const pattern = patterns[provider];
          return pattern ? pattern.test(apiKey) : apiKey.length > 10;
      }

      // Prevent prototype pollution
      static secureAssign(target, source) {
          const safeKeys = Object.keys(source).filter(key =>
              key !== '__proto__' &&
              key !== 'constructor' &&
              key !== 'prototype'
          );

          const result = {};
          safeKeys.forEach(key => {
              result[key] = source[key];
          });

          return Object.assign(target, result);
      }
  }

  // Initialize security manager
  document.addEventListener('DOMContentLoaded', () => {
      new SecurityManager();
  });

  // Export for use in other modules
  window.SecurityManager = SecurityManager;
