import { Logger } from './logger.js';

export class RateLimiter {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 2000;
    this.maxDelay = options.maxDelay || 10000;
    this.currentDelay = this.baseDelay;
    this.requestCount = 0;
    this.successRate = 1.0;
    this.lastRequestTime = 0;
    this.windowStart = Date.now();
    this.requestsInWindow = 0;
    this.maxRequestsPerWindow = options.maxRequestsPerWindow || 30;
    this.windowSize = options.windowSize || 60000; // 1 minute
    this.logger = new Logger('RateLimiter');
  }

  async delay() {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.windowSize) {
      this.windowStart = now;
      this.requestsInWindow = 0;
    }

    // Check if we're hitting rate limits
    if (this.requestsInWindow >= this.maxRequestsPerWindow) {
      const waitTime = this.windowSize - (now - this.windowStart);
      this.logger.info(`Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s`);
      await this.sleep(waitTime);
      this.windowStart = Date.now();
      this.requestsInWindow = 0;
    }

    // Calculate adaptive delay based on success rate
    const adaptiveDelay = this.calculateAdaptiveDelay();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Only delay if we haven't waited long enough naturally
    if (timeSinceLastRequest < adaptiveDelay) {
      const remainingDelay = adaptiveDelay - timeSinceLastRequest;
      await this.sleep(remainingDelay);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
    this.requestsInWindow++;
    
    this.logger.debug(`Request #${this.requestCount} after ${adaptiveDelay}ms delay`);
  }

  calculateAdaptiveDelay() {
    // Base delay adjusted by success rate and request count
    let delay = this.currentDelay * (2 - this.successRate);
    
    // Add progressive delay for high request counts
    if (this.requestCount > 50) {
      delay *= 1.5;
    } else if (this.requestCount > 100) {
      delay *= 2;
    }
    
    // Add some randomization to avoid pattern detection
    const jitter = Math.random() * 1000;
    delay += jitter;
    
    // Ensure delay is within bounds
    return Math.min(Math.max(delay, this.baseDelay), this.maxDelay);
  }

  recordSuccess() {
    this.successRate = Math.min(1.0, this.successRate + 0.05);
    this.currentDelay = Math.max(this.baseDelay, this.currentDelay * 0.95);
    this.logger.debug(`Success recorded. Rate: ${this.successRate.toFixed(2)}, Delay: ${this.currentDelay}ms`);
  }

  recordFailure(isBlocked = false) {
    const penaltyFactor = isBlocked ? 0.3 : 0.1;
    this.successRate = Math.max(0.1, this.successRate - penaltyFactor);
    this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 1.5);
    
    this.logger.warn(`Failure recorded (blocked: ${isBlocked}). Rate: ${this.successRate.toFixed(2)}, Delay: ${this.currentDelay}ms`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      successRate: this.successRate,
      currentDelay: this.currentDelay,
      requestsInWindow: this.requestsInWindow,
      windowTimeRemaining: Math.max(0, this.windowSize - (Date.now() - this.windowStart))
    };
  }

  reset() {
    this.requestCount = 0;
    this.successRate = 1.0;
    this.currentDelay = this.baseDelay;
    this.lastRequestTime = 0;
    this.windowStart = Date.now();
    this.requestsInWindow = 0;
    this.logger.info('Rate limiter reset');
  }
}

export class AntiDetection {
  constructor(page) {
    this.page = page;
    this.logger = new Logger('AntiDetection');
  }

  async setupStealthMode() {
    try {
      this.logger.info('Setting up stealth mode...');

      // Override webdriver detection
      await this.page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        delete Object.getPrototypeOf(navigator).webdriver;
        delete navigator.webdriver;

        // Override the `plugins` property to use a custom getter.
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override the `languages` property to use a custom getter.
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Override the `permissions` property to use a custom getter.
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Overwrite the `chrome` object.
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };

        // Mock hairline features
        Object.defineProperty(window.screen, 'availWidth', {
          get: () => window.screen.width
        });

        Object.defineProperty(window.screen, 'availHeight', {
          get: () => window.screen.height - 40 // Account for taskbar
        });
      });

      this.logger.info('Stealth mode setup completed');
    } catch (error) {
      this.logger.error('Failed to setup stealth mode:', error.message);
    }
  }

  async randomizeViewport() {
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1600, height: 900 }
    ];

    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await this.page.setViewport(viewport);
    this.logger.debug(`Viewport set to ${viewport.width}x${viewport.height}`);
  }

  async simulateHumanBehavior() {
    // Random mouse movements
    await this.randomMouseMovement();
    
    // Random scroll behavior
    await this.randomScroll();
    
    // Random pauses
    await this.randomPause();
  }

  async randomMouseMovement() {
    try {
      const viewport = this.page.viewport();
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      
      await this.page.mouse.move(x, y, { steps: 10 });
      await this.sleep(100 + Math.random() * 200);
    } catch (error) {
      this.logger.debug('Random mouse movement failed:', error.message);
    }
  }

  async randomScroll() {
    try {
      const scrollY = Math.random() * 500 + 100;
      await this.page.evaluate((y) => {
        window.scrollBy(0, y);
      }, scrollY);
      await this.sleep(500 + Math.random() * 1000);
    } catch (error) {
      this.logger.debug('Random scroll failed:', error.message);
    }
  }

  async randomPause() {
    const pauseTime = Math.random() * 2000 + 500;
    await this.sleep(pauseTime);
  }

  async simulateTyping(selector, text, options = {}) {
    try {
      const element = await this.page.waitForSelector(selector);
      await element.click();
      
      // Clear existing content
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      
      // Type with human-like delays
      for (const char of text) {
        await this.page.keyboard.type(char, {
          delay: 50 + Math.random() * 100
        });
        
        // Occasional pauses
        if (Math.random() < 0.1) {
          await this.sleep(300 + Math.random() * 700);
        }
      }
      
      // Random pause after typing
      await this.sleep(200 + Math.random() * 500);
      
    } catch (error) {
      this.logger.error(`Typing simulation failed for ${selector}:`, error.message);
      throw error;
    }
  }

  async detectCaptcha() {
    const captchaSelectors = [
      '.recaptcha-checkbox-border',
      '#captcha-form',
      '.challenge-form',
      '[data-testid="captcha"]',
      '.px-captcha'
    ];

    for (const selector of captchaSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await this.page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }, element);
          
          if (isVisible) {
            this.logger.warn(`CAPTCHA detected: ${selector}`);
            return true;
          }
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }

    return false;
  }

  async detectBlocking() {
    const blockingIndicators = [
      'blocked', 'restricted', 'suspended', 'verify your identity',
      'unusual activity', 'try again later', 'rate limit'
    ];

    try {
      const pageText = await this.page.evaluate(() => document.body.innerText.toLowerCase());
      
      for (const indicator of blockingIndicators) {
        if (pageText.includes(indicator)) {
          this.logger.warn(`Potential blocking detected: "${indicator}"`);
          return true;
        }
      }

      // Check HTTP status
      const response = await this.page.goto(this.page.url(), { waitUntil: 'domcontentloaded' });
      if (response.status() === 429 || response.status() === 403) {
        this.logger.warn(`HTTP blocking detected: ${response.status()}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error detecting blocking:', error.message);
      return false;
    }
  }

  async waitForCaptchaSolve(maxWaitTime = 300000) { // 5 minutes
    this.logger.info('Waiting for CAPTCHA to be solved...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const hasCaptcha = await this.detectCaptcha();
      if (!hasCaptcha) {
        this.logger.info('CAPTCHA appears to be solved');
        return true;
      }
      
      await this.sleep(5000); // Check every 5 seconds
    }
    
    this.logger.error('CAPTCHA solve timeout reached');
    return false;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

// Traffic shaping utility
export class TrafficShaper {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.logger = new Logger('TrafficShaper');
  }

  async queueRequest(requestFunc, priority = 1) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        func: requestFunc,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort by priority (higher number = higher priority)
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const result = await request.func();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
      
      // Add delay between requests
      if (this.requestQueue.length > 0) {
        await this.sleep(1000 + Math.random() * 2000);
      }
    }
    
    this.isProcessing = false;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueLength() {
    return this.requestQueue.length;
  }

  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
    this.isProcessing = false;
  }
}