import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { Logger } from '../utils/logger.js';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

export class BrowserManager {
  constructor(options = {}) {
    // Default reliable User Agent
    const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    this.options = {
      headless: options.headless ?? 'new',
      timeout: options.timeout ?? 30000,
      viewport: options.viewport ?? { width: 1366, height: 768 },
      userAgent: options.userAgent ?? defaultUserAgent,
      antiDetection: options.antiDetection ?? true,
      ...options
    };
    this.browser = null;
    this.page = null;
    this.logger = new Logger('BrowserManager');
  }

  async initialize() {
    try {
      this.logger.info('Initializing browser...');
      
      const launchOptions = {
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ],
        defaultViewport: this.options.viewport,
        ignoreDefaultArgs: ['--enable-automation'],
        ignoreHTTPSErrors: true
      };

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // Set user agent with validation
      const userAgent = this.options.userAgent;
      if (typeof userAgent === 'string' && userAgent.trim().length > 0) {
        try {
          await this.page.setUserAgent(userAgent.trim());
          this.logger.info(`User agent set: ${userAgent.substring(0, 50)}...`);
        } catch (error) {
          this.logger.warn(`Failed to set user agent, using default: ${error.message}`);
          await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        }
      } else {
        this.logger.warn('Invalid user agent provided, using default');
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      }

      // Set viewport
      await this.page.setViewport(this.options.viewport);

      // Set extra headers to appear more human-like
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      if (this.options.antiDetection) {
        await this.setupAntiDetection();
      }

      // Set default navigation timeout
      this.page.setDefaultNavigationTimeout(this.options.timeout);
      this.page.setDefaultTimeout(this.options.timeout);

      this.logger.info('Browser initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error.message);
      throw error;
    }
  }

  async setupAntiDetection() {
    // Remove automation indicators
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      delete window.navigator.webdriver;
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "",
              enabledPlugin: Plugin
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          }
        ],
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });
  }

  async navigateToPage(url, waitUntil = 'domcontentloaded') {
    try {
      this.logger.info(`Navigating to: ${url}`);
      
      const response = await this.page.goto(url, {
        waitUntil: waitUntil,
        timeout: this.options.timeout
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`);
      }

      // Wait for page to be fully loaded
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        this.logger.warn('Network idle timeout - continuing anyway');
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to navigate to ${url}:`, error.message);
      throw error;
    }
  }

  async waitForSelector(selector, options = {}) {
    try {
      return await this.page.waitForSelector(selector, {
        timeout: 10000,
        ...options
      });
    } catch (error) {
      this.logger.warn(`Selector not found: ${selector}`);
      return null;
    }
  }

  async humanLikeDelay(min = 1000, max = 3000) {
    const delay = Math.random() * (max - min) + min;
    this.logger.debug(`Human-like delay: ${Math.round(delay)}ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanLikeScroll(distance = 300) {
    await this.page.evaluate((scrollDistance) => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const scrollStep = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, scrollStep);
          totalHeight += scrollStep;

          if (totalHeight >= scrollDistance) {
            clearInterval(timer);
            resolve();
          }
        }, 50 + Math.random() * 50); // Random delay between scrolls
      });
    }, distance);
  }

  async scrollToEnd() {
    let previousHeight = 0;
    let currentHeight = await this.page.evaluate('document.body.scrollHeight');
    let stuckCount = 0;

    while (stuckCount < 3) {
      previousHeight = currentHeight;
      
      // Scroll down
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for new content to load
      await this.humanLikeDelay(2000, 4000);

      currentHeight = await this.page.evaluate('document.body.scrollHeight');

      if (currentHeight === previousHeight) {
        stuckCount++;
      } else {
        stuckCount = 0;
      }

      this.logger.debug(`Scroll progress: ${currentHeight}px (stuck: ${stuckCount}/3)`);
    }

    this.logger.info('Reached end of scrollable content');
  }

  async takeScreenshot(filename) {
    try {
      const filepath = `./output/screenshots/${filename}`;
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      this.logger.info(`Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      this.logger.error('Failed to take screenshot:', error.message);
      return null;
    }
  }

  async getPageTitle() {
    return await this.page.title();
  }

  async getCurrentUrl() {
    return this.page.url();
  }

  async close() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.info('Browser closed successfully');
    } catch (error) {
      this.logger.error('Error closing browser:', error.message);
    }
  }

  isInitialized() {
    return this.browser !== null && this.page !== null && !this.page.isClosed();
  }
}