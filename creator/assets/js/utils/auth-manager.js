/**
 * OAuth2 + PKCE Authentication Manager - Following CLAUDE.md Guidelines
 * Framework for future OAuth2 provider integration
 */

import { logger } from '../core/utils.js';

/**
 * OAuth2 Authentication Manager with PKCE support
 * Ready for future expansion when AI providers add OAuth2 support
 */
export class AuthManager {
    constructor() {
        this.providers = new Map();
        this.currentAuth = null;
        this.authState = 'logged_out'; // logged_out, authenticating, authenticated

        // PKCE parameters
        this.codeVerifier = null;
        this.codeChallenge = null;

        logger.info('OAuth2 Auth Manager initialized');
    }

    /**
     * Register an OAuth2 provider configuration
     * @param {string} providerId - Unique provider identifier
     * @param {Object} config - OAuth2 configuration
     */
    registerProvider(providerId, config) {
        const requiredFields = ['clientId', 'authorizationEndpoint', 'tokenEndpoint', 'scopes'];
        const missingFields = requiredFields.filter(field => !config[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required OAuth2 config fields: ${missingFields.join(', ')}`);
        }

        this.providers.set(providerId, {
            ...config,
            redirectUri: config.redirectUri || `${window.location.origin}/auth/callback`,
            responseType: 'code',
            grantType: 'authorization_code'
        });

        logger.info(`Registered OAuth2 provider: ${providerId}`);
    }

    /**
     * Generate PKCE code verifier and challenge
     */
    async generatePKCE() {
        // Generate random code verifier (43-128 characters)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.codeVerifier = btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        // Generate code challenge (SHA256 hash of verifier)
        const encoder = new TextEncoder();
        const data = encoder.encode(this.codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        this.codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        logger.debug('Generated PKCE parameters');
    }

    /**
     * Initiate OAuth2 authentication flow
     * @param {string} providerId - Provider to authenticate with
     * @returns {Promise<string>} Authorization URL
     */
    async authenticate(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Unknown OAuth2 provider: ${providerId}`);
        }

        await this.generatePKCE();

        const state = this.generateState();
        const params = new URLSearchParams({
            client_id: provider.clientId,
            redirect_uri: provider.redirectUri,
            response_type: provider.responseType,
            scope: provider.scopes.join(' '),
            state: state,
            code_challenge: this.codeChallenge,
            code_challenge_method: 'S256'
        });

        const authUrl = `${provider.authorizationEndpoint}?${params.toString()}`;

        // Store state for validation
        sessionStorage.setItem('oauth2_state', state);
        sessionStorage.setItem('oauth2_provider', providerId);

        this.authState = 'authenticating';
        logger.info(`Starting OAuth2 flow for ${providerId}`);

        return authUrl;
    }

    /**
     * Handle OAuth2 callback (authorization code)
     * @param {string} code - Authorization code from callback
     * @param {string} state - State parameter from callback
     * @returns {Promise<Object>} Access token response
     */
    async handleCallback(code, state) {
        // Validate state parameter
        const storedState = sessionStorage.getItem('oauth2_state');
        if (state !== storedState) {
            throw new Error('Invalid OAuth2 state parameter');
        }

        const providerId = sessionStorage.getItem('oauth2_provider');
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error('OAuth2 provider not found');
        }

        // Exchange authorization code for access token
        const tokenResponse = await this.exchangeCodeForToken(provider, code);

        this.currentAuth = {
            providerId,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
            scope: tokenResponse.scope
        };

        this.authState = 'authenticated';

        // Clean up session storage
        sessionStorage.removeItem('oauth2_state');
        sessionStorage.removeItem('oauth2_provider');

        logger.info(`OAuth2 authentication successful for ${providerId}`);
        return this.currentAuth;
    }

    /**
     * Exchange authorization code for access token
     * @param {Object} provider - Provider configuration
     * @param {string} code - Authorization code
     * @returns {Promise<Object>} Token response
     */
    async exchangeCodeForToken(provider, code) {
        const params = new URLSearchParams({
            grant_type: provider.grantType,
            client_id: provider.clientId,
            code: code,
            redirect_uri: provider.redirectUri,
            code_verifier: this.codeVerifier
        });

        const response = await fetch(provider.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Get current access token (refresh if needed)
     * @returns {Promise<string>} Valid access token
     */
    async getAccessToken() {
        if (!this.currentAuth) {
            throw new Error('Not authenticated');
        }

        // Check if token needs refresh
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (now >= (this.currentAuth.expiresAt - bufferTime)) {
            if (this.currentAuth.refreshToken) {
                await this.refreshAccessToken();
            } else {
                throw new Error('Access token expired and no refresh token available');
            }
        }

        return this.currentAuth.accessToken;
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        const provider = this.providers.get(this.currentAuth.providerId);
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: provider.clientId,
            refresh_token: this.currentAuth.refreshToken
        });

        const response = await fetch(provider.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString()
        });

        if (!response.ok) {
            this.logout();
            throw new Error('Token refresh failed');
        }

        const tokenResponse = await response.json();

        this.currentAuth.accessToken = tokenResponse.access_token;
        this.currentAuth.expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

        if (tokenResponse.refresh_token) {
            this.currentAuth.refreshToken = tokenResponse.refresh_token;
        }

        logger.info('Access token refreshed successfully');
    }

    /**
     * Generate random state parameter
     * @returns {string} Random state string
     */
    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array));
    }

    /**
     * Check if currently authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.authState === 'authenticated' && this.currentAuth !== null;
    }

    /**
     * Log out and clear authentication
     */
    logout() {
        this.currentAuth = null;
        this.authState = 'logged_out';
        this.codeVerifier = null;
        this.codeChallenge = null;

        sessionStorage.removeItem('oauth2_state');
        sessionStorage.removeItem('oauth2_provider');

        logger.info('OAuth2 logout completed');
    }

    /**
     * Get supported providers
     * @returns {Array<string>} List of registered provider IDs
     */
    getSupportedProviders() {
        return Array.from(this.providers.keys());
    }
}

// Example provider configurations for future use
export const OAUTH_PROVIDERS = {
    // Google AI/Gemini (currently supported)
    google: {
        clientId: 'your-google-client-id',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/generative-language']
    },

    // Microsoft Azure OpenAI (when OAuth2 support is added)
    azure: {
        clientId: 'your-azure-client-id',
        authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: ['https://cognitiveservices.azure.com/.default']
    }

    // Note: OpenAI and Anthropic don't support OAuth2 yet
    // These would be added when they implement OAuth2 support
};

export default AuthManager;