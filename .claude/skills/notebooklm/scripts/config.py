"""
Configuration for NotebookLM Skill
Centralizes constants, selectors, and paths
"""

from pathlib import Path

# Paths
SKILL_DIR = Path(__file__).parent.parent
DATA_DIR = SKILL_DIR / "data"
BROWSER_STATE_DIR = DATA_DIR / "browser_state"
BROWSER_PROFILE_DIR = BROWSER_STATE_DIR / "browser_profile"
STATE_FILE = BROWSER_STATE_DIR / "state.json"
AUTH_INFO_FILE = DATA_DIR / "auth_info.json"
LIBRARY_FILE = DATA_DIR / "library.json"

# NotebookLM Selectors
QUERY_INPUT_SELECTORS = [
    "textarea.query-box-input",  # Primary
    'textarea[aria-label="Feld für Anfragen"]',  # Fallback German
    'textarea[aria-label="Input for queries"]',  # Fallback English
]

RESPONSE_SELECTORS = [
    ".to-user-container .message-text-content",  # Primary
    "[data-message-author='bot']",
    "[data-message-author='assistant']",
]

# Load proxy settings from .env file
def load_proxy_config():
    """Load proxy server from .env file if exists"""
    env_file = SKILL_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('PROXY_SERVER=') and not line.startswith('#'):
                        return line.split('=', 1)[1].strip()
        except Exception:
            pass
    return None

# Browser Configuration
BROWSER_ARGS = [
    '--disable-blink-features=AutomationControlled',  # Patches navigator.webdriver
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check'
]

# Add proxy server if configured
PROXY_SERVER = load_proxy_config()
if PROXY_SERVER:
    # Chrome requires full URL with protocol for --proxy-server
    # Ensure we have http:// prefix
    proxy_url = PROXY_SERVER
    if not proxy_url.startswith('http://') and not proxy_url.startswith('https://'):
        proxy_url = f'http://{proxy_url}'

    BROWSER_ARGS.append(f'--proxy-server={proxy_url}')
    print(f"[INFO] Using proxy: {proxy_url}")

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

# Timeouts
LOGIN_TIMEOUT_MINUTES = 10
QUERY_TIMEOUT_SECONDS = 180  # 增加到3分钟
PAGE_LOAD_TIMEOUT = 60000  # 增加到60秒
