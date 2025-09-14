let dom = {};
let state = {};

// Provider-agnostic API interface

async function generateAIText(systemPrompt) {
    console.log('generateAIText called with currentProvider:', window.currentProvider?.name);

    if (!window.currentProvider || !window.currentProvider.generateText) {
        throw new Error('No AI provider available');
    }

    try {
        return await window.currentProvider.generateText(systemPrompt);
    } catch (error) {
        console.error('AI text generation error:', error);
        throw error;
    }
}

export function initApi(domElements, appState) {
    dom = domElements;
    state = appState;
}

export {
    generateAIText
};
