import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('docs/webllm_creator.html')
        await page.goto(f'file://{file_path}')

        # Wait for the initial chapter to be created
        try:
            await expect(page.locator('#chapter-title-1')).to_be_visible(timeout=10000)
        except Exception as e:
            print("Error: Initial chapter was not created on page load.")
            print("Dumping page content:")
            print(await page.content())
            raise e

        # --- 1. Test State Persistence ---
        print("Testing State Persistence...")
        await page.locator('#course-name').fill('Test Course Title')
        await page.locator('#course-desc').fill('Test Course Description')

        # Also test chapter title persistence
        await page.locator('#chapter-title-1').fill('My Custom Chapter 1 Title')

        await page.reload()

        # Wait for the page to be fully loaded after reload
        await page.wait_for_load_state('domcontentloaded')

        # Re-check that the chapter is visible after reload
        await expect(page.locator('#chapter-title-1')).to_be_visible(timeout=10000)

        # Check if the values are still there
        await expect(page.locator('#course-name')).to_have_value('Test Course Title')
        await expect(page.locator('#course-desc')).to_have_value('Test Course Description')
        await expect(page.locator('#chapter-title-1')).to_have_value('My Custom Chapter 1 Title')
        print("State Persistence Test Passed!")

        # --- 2. Test WebLLM Generation Fix ---
        print("Testing WebLLM Generation...")
        # This will also test the overwrite confirmation for the first chapter

        # Set up a handler for the confirmation dialog
        page.on('dialog', lambda dialog: dialog.accept())

        await page.locator('#master-prompt').fill('Create a short course about the history of the internet.')
        await page.locator('#num-chapters').select_option('2')

        # Click the main generate button
        await page.locator('#generate-course-btn').click()

        # Wait for the AI status to show that generation is complete
        # We'll wait for the "All chapters have been successfully generated!" message
        await expect(page.locator('#ai-status')).to_have_text(
            "✅ All chapters have been successfully generated!",
            timeout=180000 # 3 minutes, as WebLLM can be slow
        )
        print("WebLLM Generation Test Passed!")

        # --- 3. Test Chapter Overwrite Confirmation ---
        print("Testing Chapter Overwrite Confirmation...")

        # At this point, Chapter 1 is already generated.
        # We will grab the initial title and content to ensure it changes.
        initial_title = await page.locator('#chapter-title-1').input_value()

        # Click the per-chapter generate button
        await page.locator('.generate-chapter-btn[data-chapter-id="1"]').click()

        # Wait for the generation to complete again
        await expect(page.locator('#ai-status')).to_have_text(
            "✅ Chapter 1 has been successfully generated!",
            timeout=180000 # 3 minutes
        )

        # Check that the title has been overwritten (it's very unlikely to be the same)
        new_title = await page.locator('#chapter-title-1').input_value()
        assert initial_title != new_title, "Chapter title was not overwritten!"

        print("Chapter Overwrite Confirmation Test Passed!")

        # Take a screenshot of the final state
        await page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken.")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
