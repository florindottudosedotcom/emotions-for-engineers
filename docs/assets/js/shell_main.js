document.addEventListener('DOMContentLoaded', () => {
    const tabLinks = document.querySelectorAll('.tab-link');
    const contentFrame = document.getElementById('content-frame');

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
