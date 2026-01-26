"""
Browser Utilities for NotebookLM Skill
Handles browser launching, stealth features, and common interactions
"""

import json
import time
import random
import os
from typing import Optional, List
from pathlib import Path

from patchright.sync_api import Playwright, BrowserContext, Page
from config import BROWSER_PROFILE_DIR, STATE_FILE, BROWSER_ARGS, USER_AGENT

# Load proxy settings from .env file
def load_proxy_config():
    """Load proxy server from .env file if exists"""
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('PROXY_SERVER='):
                        return line.split('=', 1)[1].strip()
        except Exception:
            pass
    return None

PROXY_SERVER = load_proxy_config()


class BrowserFactory:
    """Factory for creating configured browser contexts"""

    @staticmethod
    def launch_persistent_context(
        playwright: Playwright,
        headless: bool = True,
        user_data_dir: str = str(BROWSER_PROFILE_DIR)
    ) -> BrowserContext:
        """
        Launch a persistent browser context with anti-detection features
        and cookie workaround.
        """
        # Prepare launch parameters
        launch_params = {
            "user_data_dir": user_data_dir,
            "channel": "chrome",  # Use real Chrome
            "headless": headless,
            "no_viewport": True,
            "ignore_default_args": ["--enable-automation"],
            "user_agent": USER_AGENT,
            "args": BROWSER_ARGS
        }

        # Add proxy if configured
        if PROXY_SERVER:
            # Parse proxy server string
            if PROXY_SERVER.startswith('http://'):
                launch_params["proxy"] = {
                    "server": PROXY_SERVER
                }
            elif PROXY_SERVER.startswith('socks5://'):
                launch_params["proxy"] = {
                    "server": PROXY_SERVER,
                    "type": "socks5"
                }
            elif PROXY_SERVER.startswith('socks://'):
                launch_params["proxy"] = {
                    "server": PROXY_SERVER,
                    "type": "socks5"
                }
            else:
                # Default to HTTP
                launch_params["proxy"] = {
                    "server": f"http://{PROXY_SERVER}"
                }
            print(f"  🌐 Using proxy: {launch_params['proxy']['server']}")

        # Launch persistent context
        context = playwright.chromium.launch_persistent_context(**launch_params)

        # Cookie Workaround for Playwright bug #36139
        # Session cookies (expires=-1) don't persist in user_data_dir automatically
        BrowserFactory._inject_cookies(context)

        return context

    @staticmethod
    def _inject_cookies(context: BrowserContext):
        """Inject cookies from state.json if available"""
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r') as f:
                    state = json.load(f)
                    if 'cookies' in state and len(state['cookies']) > 0:
                        context.add_cookies(state['cookies'])
                        # print(f"  🔧 Injected {len(state['cookies'])} cookies from state.json")
            except Exception as e:
                print(f"  ⚠️  Could not load state.json: {e}")


class StealthUtils:
    """Human-like interaction utilities"""

    @staticmethod
    def random_delay(min_ms: int = 100, max_ms: int = 500):
        """Add random delay"""
        time.sleep(random.uniform(min_ms / 1000, max_ms / 1000))

    @staticmethod
    def human_type(page: Page, selector: str, text: str, wpm_min: int = 320, wpm_max: int = 480):
        """Type with human-like speed"""
        element = page.query_selector(selector)
        if not element:
            # Try waiting if not immediately found
            try:
                element = page.wait_for_selector(selector, timeout=2000)
            except:
                pass
        
        if not element:
            print(f"⚠️ Element not found for typing: {selector}")
            return

        # Click to focus
        element.click()
        
        # Type
        for char in text:
            element.type(char, delay=random.uniform(25, 75))
            if random.random() < 0.05:
                time.sleep(random.uniform(0.15, 0.4))

    @staticmethod
    def realistic_click(page: Page, selector: str):
        """Click with realistic movement"""
        element = page.query_selector(selector)
        if not element:
            return

        # Optional: Move mouse to element (simplified)
        box = element.bounding_box()
        if box:
            x = box['x'] + box['width'] / 2
            y = box['y'] + box['height'] / 2
            page.mouse.move(x, y, steps=5)

        StealthUtils.random_delay(100, 300)
        element.click()
        StealthUtils.random_delay(100, 300)
