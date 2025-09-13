document.addEventListener('DOMContentLoaded', () => {
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentFrame = document.getElementById('content-frame');
    const ollamaTab = document.getElementById('ollama-tab');

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
});
