document.addEventListener('DOMContentLoaded', () => {
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentFrame = document.getElementById('content-frame');
    const ollamaTab = document.getElementById('ollama-tab');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');

    // Hide Ollama tab if not on localhost
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (ollamaTab) {
            ollamaTab.style.display = 'none';
        }
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active class from all tabs
            tabLinks.forEach(innerLink => {
                innerLink.classList.remove('active');
            });

            // Add active class to the clicked tab
            link.classList.add('active');

            // Update the iframe source
            const newSrc = link.getAttribute('data-src');
            if (contentFrame.src !== newSrc) {
                contentFrame.src = newSrc;
            }
        });
    });

    function showHelpModal() {
        if (helpModal) helpModal.classList.add('visible');
    }

    function hideHelpModal() {
        if (helpModal) helpModal.classList.remove('visible');
    }

    if (helpBtn) helpBtn.addEventListener('click', showHelpModal);
    if (closeHelpBtn) closeHelpBtn.addEventListener('click', hideHelpModal);
});
