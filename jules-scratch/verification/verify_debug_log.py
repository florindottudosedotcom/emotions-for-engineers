import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath('docs/webllm_creator.html')
        await page.goto(f'file://{file_path}')

        # 1. Click the toggle button
        print("Clicking toggle debug button...")
        await page.locator('#toggle-debug-btn').click()

        # 2. Assert that the button text changed
        print("Checking if button text changed...")
        await expect(page.locator('#toggle-debug-btn')).to_have_text("Clicked!")

        # 3. Assert that the fieldset is now visible
        print("Checking if debug fieldset is visible...")
        await expect(page.locator('#debug-fieldset')).to_be_visible()

        print("Debug UI is working correctly!")

        # 4. Take a screenshot to confirm
        await page.screenshot(path="jules-scratch/verification/verify_debug_log.png")
        print("Screenshot taken.")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
