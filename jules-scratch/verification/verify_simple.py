import asyncio
from playwright.async_api import async_playwright, expect
import os
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath('docs/webllm_creator.html')
        await page.goto(f'file://{file_path}')

        print("Waiting for 10 seconds to allow all JS to execute...")
        time.sleep(10)

        print("Taking screenshot...")
        await page.screenshot(path="jules-scratch/verification/verification_simple.png")

        print("Screenshot taken.")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
