const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

const chromePath = execSync('which google-chrome || which google-chrome-stable || which chromium-browser',
    { encoding: 'utf-8' }).trim();

async function testPersistence() {
    console.log('Testing data persistence...');

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });

        console.log('1. Loading initial page...');
        await page.goto('http://localhost:8000/creator/cloud.html');
        await page.waitForTimeout(2000);

        console.log('2. Filling in test data...');

        // Fill in course prompt
        await page.type('textarea[name="master-prompt"]', 'Create a comprehensive course about emotional intelligence for teachers.');

        // Select additional languages (Spanish and German)
        await page.check('input[value="es"]');
        await page.check('input[value="de"]');

        // Change number of chapters to 3
        await page.select('select[name="num-chapters"]', '3');

        // Fill chapter title
        await page.type('input.chapter-title', 'Introduction to Emotional Intelligence');

        console.log('3. Taking screenshot before reload...');
        await page.screenshot({ path: './screenshots/before-reload.png', fullPage: true });

        console.log('4. Waiting for state to save...');
        await page.waitForTimeout(1000); // Wait for debounced save

        console.log('5. Reloading page...');
        await page.reload();
        await page.waitForTimeout(3000); // Wait for page and state to load

        console.log('6. Taking screenshot after reload...');
        await page.screenshot({ path: './screenshots/after-reload.png', fullPage: true });

        console.log('7. Checking if data persisted...');

        // Check if prompt persisted
        const promptValue = await page.$eval('textarea[name="master-prompt"]', el => el.value);
        console.log('Prompt persisted:', promptValue.length > 0);

        // Check if languages persisted
        const englishChecked = await page.$eval('input[value="en"]', el => el.checked);
        const spanishChecked = await page.$eval('input[value="es"]', el => el.checked);
        const germanChecked = await page.$eval('input[value="de"]', el => el.checked);
        console.log('Languages persisted:', { en: englishChecked, es: spanishChecked, de: germanChecked });

        // Check if chapter count persisted
        const chaptersValue = await page.$eval('select[name="num-chapters"]', el => el.value);
        console.log('Chapters count persisted:', chaptersValue);

        // Check if chapter title persisted
        const chapterTitleValue = await page.$eval('input.chapter-title', el => el.value);
        console.log('Chapter title persisted:', chapterTitleValue);

        console.log('8. Taking final screenshot...');
        await page.screenshot({ path: './screenshots/persistence-test-final.png', fullPage: true });

    } catch (error) {
        console.error('Error during persistence test:', error);
    } finally {
        await browser.close();
    }
}

testPersistence();