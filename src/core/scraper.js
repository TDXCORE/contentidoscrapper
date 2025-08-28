import { BrowserManager } from './browser-manager.js';
import { ContentExtractor } from './content-extractor.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { Logger } from '../utils/logger.js';
import { ExportManager } from '../exporters/export-manager.js';
import { JigsawStackFallback } from '../services/jigsawstack-fallback.js';

export class LinkedInScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless ?? true,
      delay: options.delay ?? 2000,
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 30000,
      userAgent: options.userAgent ?? null,
      viewport: options.viewport ?? { width: 1366, height: 768 },
      antiDetection: options.antiDetection ?? true,
      maxPosts: options.maxPosts ?? null,
      ...options
    };

    this.browserManager = new BrowserManager(this.options);
    this.contentExtractor = new ContentExtractor();
    this.rateLimiter = new RateLimiter();
    this.logger = new Logger('LinkedInScraper');
    this.exportManager = new ExportManager();
    this.jigsawStackFallback = new JigsawStackFallback({
      apiKey: this.options.jigsawstackApiKey
    });
    this.isAuthenticated = false;
    this.scrapedData = [];
    this.profileMetadata = {};
    this.useFallback = this.options.useFallback ?? true;
  }

  async initialize() {
    try {
      this.logger.info('Initializing LinkedIn scraper...');
      const success = await this.browserManager.initialize();
      
      if (success) {
        this.logger.info('LinkedIn scraper initialized successfully');
      }
      
      return success;
    } catch (error) {
      this.logger.error('Failed to initialize scraper:', error.message);
      throw error;
    }
  }

  async login(credentials) {
    try {
      this.logger.info('Attempting to log in to LinkedIn with enhanced techniques...');

      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required for LinkedIn login');
      }

      // First visit LinkedIn homepage to establish session
      await this.browserManager.navigateToPage('https://www.linkedin.com', 'networkidle0');
      await this.browserManager.humanLikeDelay(2000, 4000);

      // Human-like browsing behavior before login
      await this.simulateHumanBrowsing();

      // Navigate to LinkedIn login page
      await this.browserManager.navigateToPage('https://www.linkedin.com/login');
      await this.browserManager.humanLikeDelay(1500, 3000);
      
      // Wait for login form with multiple selectors
      const usernameField = await this.browserManager.waitForSelector('#username', { timeout: 15000 });
      if (!usernameField) {
        throw new Error('Login form not found - LinkedIn may have changed their layout');
      }

      // Simulate human typing behavior for email
      await this.humanLikeTyping('#username', credentials.email);
      await this.browserManager.humanLikeDelay(800, 1500);
      
      // Simulate human typing behavior for password
      await this.humanLikeTyping('#password', credentials.password);
      await this.browserManager.humanLikeDelay(1000, 2000);
      
      // Look for submit button with multiple possible selectors
      const submitSelectors = [
        'button[type="submit"]',
        '.login__form_action_container button',
        '[data-litms-control-urn*="login-submit"]'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        submitButton = await this.browserManager.page.$(selector);
        if (submitButton) break;
      }
      
      if (!submitButton) {
        throw new Error('Submit button not found - LinkedIn may have changed their layout');
      }

      // Click login button with human-like behavior
      await this.browserManager.page.evaluate((button) => {
        button.scrollIntoView();
      }, submitButton);
      
      await this.browserManager.humanLikeDelay(500, 1000);
      await submitButton.click();
      
      // Wait for navigation with extended timeout for potential challenges
      await this.browserManager.humanLikeDelay(3000, 6000);
      
      let currentUrl = await this.browserManager.getCurrentUrl();
      this.logger.info(`After login attempt, current URL: ${currentUrl.substring(0, 50)}...`);
      
      // Handle different post-login scenarios
      if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
        this.isAuthenticated = true;
        this.logger.info('Successfully logged in to LinkedIn');
        return true;
      } 
      
      // Handle CAPTCHA/challenge pages
      if (currentUrl.includes('challenge') || currentUrl.includes('captcha')) {
        this.logger.warn('CAPTCHA or security challenge detected, waiting for resolution...');
        
        // Wait longer for manual resolution or automatic bypass
        for (let i = 0; i < 12; i++) { // Wait up to 2 minutes
          await this.browserManager.humanLikeDelay(8000, 12000);
          currentUrl = await this.browserManager.getCurrentUrl();
          
          if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
            this.isAuthenticated = true;
            this.logger.info('Successfully bypassed challenge and logged in to LinkedIn');
            return true;
          }
        }
        
        throw new Error('CAPTCHA or security challenge could not be resolved automatically');
      }
      
      // Handle 2FA or email verification
      if (currentUrl.includes('add-phone') || currentUrl.includes('verify') || currentUrl.includes('checkpoint')) {
        this.logger.warn('Additional verification required, attempting to continue...');
        
        // Try to skip phone verification if possible
        const skipButtons = await this.browserManager.page.$$('button[data-litms-control-urn*="skip"], a[href*="skip"], .secondary-action');
        if (skipButtons.length > 0) {
          await skipButtons[0].click();
          await this.browserManager.humanLikeDelay(2000, 4000);
        }
        
        // Wait for final redirect
        for (let i = 0; i < 10; i++) {
          await this.browserManager.humanLikeDelay(5000, 8000);
          currentUrl = await this.browserManager.getCurrentUrl();
          
          if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
            this.isAuthenticated = true;
            this.logger.info('Successfully completed additional verification and logged in');
            return true;
          }
        }
        
        this.logger.warn('Additional verification could not be completed automatically');
      }
      
      // Check one more time after delays
      currentUrl = await this.browserManager.getCurrentUrl();
      if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
        this.isAuthenticated = true;
        this.logger.info('Login successful after extended verification process');
        return true;
      }
      
      if (currentUrl.includes('login')) {
        throw new Error('Login failed. Please check your credentials or try again later.');
      }
      
      throw new Error(`Login process unclear. Final URL: ${currentUrl}`);
      
    } catch (error) {
      this.logger.error('LinkedIn login failed:', error.message);
      throw error;
    }
  }

  async simulateHumanBrowsing() {
    try {
      // Simulate reading the page
      await this.browserManager.humanLikeDelay(2000, 4000);
      
      // Random scroll to simulate reading
      const scrollDistance = Math.random() * 500 + 200;
      await this.browserManager.humanLikeScroll(scrollDistance);
      
      // Move mouse randomly
      await this.browserManager.page.mouse.move(
        Math.random() * 800 + 200,
        Math.random() * 600 + 200
      );
      
      await this.browserManager.humanLikeDelay(1000, 2000);
    } catch (error) {
      this.logger.debug('Human browsing simulation error:', error.message);
    }
  }

  async humanLikeTyping(selector, text) {
    try {
      // Focus the field first
      await this.browserManager.page.focus(selector);
      await this.browserManager.humanLikeDelay(200, 500);
      
      // Clear any existing text
      await this.browserManager.page.click(selector, { clickCount: 3 });
      await this.browserManager.humanLikeDelay(100, 300);
      
      // Type with realistic delays and occasional typos
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Occasional typing mistakes (1% chance)
        if (Math.random() < 0.01 && i > 0) {
          // Type wrong character then backspace
          const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          await this.browserManager.page.type(selector, wrongChar, { delay: 80 + Math.random() * 40 });
          await this.browserManager.humanLikeDelay(200, 500);
          await this.browserManager.page.keyboard.press('Backspace');
          await this.browserManager.humanLikeDelay(100, 300);
        }
        
        // Type the correct character
        await this.browserManager.page.type(selector, char, { 
          delay: 80 + Math.random() * 120 
        });
        
        // Vary typing speed
        if (char === ' ' || '.@-'.includes(char)) {
          await this.browserManager.humanLikeDelay(150, 400);
        } else {
          await this.browserManager.humanLikeDelay(50, 200);
        }
      }
    } catch (error) {
      this.logger.warn(`Human-like typing failed for ${selector}:`, error.message);
      // Fallback to regular typing
      await this.browserManager.page.type(selector, text, { delay: 100 });
    }
  }

  async scrapeProfile(profileUrl) {
    try {
      this.logger.info(`Starting to scrape profile: ${profileUrl}`);
      
      if (!this.browserManager.isInitialized()) {
        throw new Error('Browser not initialized. Call initialize() first.');
      }

      // Validate profile URL
      if (!this.isValidLinkedInProfileUrl(profileUrl)) {
        throw new Error('Invalid LinkedIn profile URL provided');
      }

      // Use retry mechanism for navigation
      await this.retry(async () => {
        await this.browserManager.navigateToPage(profileUrl, 'networkidle0');
        
        // Check if we got blocked
        const currentUrl = await this.browserManager.getCurrentUrl();
        const pageContent = await this.browserManager.page.content();
        
        if (pageContent.includes('blocked') || pageContent.includes('999') || currentUrl.includes('authwall')) {
          throw new Error('LinkedIn blocked the request - retrying with different approach');
        }
        
        // Additional human-like behavior after navigation
        await this.simulateHumanBrowsing();
      });

      await this.rateLimiter.delay();

      // Extract profile metadata with error handling
      try {
        this.profileMetadata = await this.contentExtractor.extractProfileMetadata(this.browserManager.page);
      } catch (error) {
        this.logger.warn('Could not extract full profile metadata:', error.message);
        this.profileMetadata = { name: 'Unknown', url: profileUrl };
      }
      
      // Navigate to recent activity/posts with authentication check
      const activityUrl = profileUrl.replace(/\/$/, '') + '/recent-activity/all/';
      this.logger.info(`Navigating to activity page: ${activityUrl}`);
      
      await this.retry(async () => {
        await this.browserManager.navigateToPage(activityUrl, 'networkidle0');
        
        // Check for authentication requirement
        const currentUrl = await this.browserManager.getCurrentUrl();
        const pageContent = await this.browserManager.page.content();
        
        if (currentUrl.includes('authwall') || currentUrl.includes('login')) {
          if (!this.isAuthenticated) {
            throw new Error('Authentication required to access activity page. Please provide LinkedIn credentials.');
          } else {
            throw new Error('Authentication session may have expired');
          }
        }
        
        if (pageContent.includes('blocked') || pageContent.includes('999')) {
          throw new Error('Activity page blocked - trying alternative approach');
        }
        
        // Additional delay and behavior simulation
        await this.simulateActivityPageBrowsing();
      });

      await this.rateLimiter.delay();

      // Scroll and load all posts with enhanced error handling
      await this.loadAllPosts();

      // Extract post data
      const posts = await this.contentExtractor.extractPosts(
        this.browserManager.page, 
        this.options.maxPosts
      );

      this.scrapedData = posts;
      this.logger.info(`Successfully scraped ${posts.length} posts from profile`);

      return posts;

    } catch (error) {
      this.logger.error('Profile scraping failed:', error.message);
      
      // Try alternative scraping approach if main method fails
      if (error.message.includes('blocked') || error.message.includes('999') || error.message.includes('timeout')) {
        this.logger.info('Attempting alternative scraping approach...');
        try {
          const altPosts = await this.alternativeScrapingApproach(profileUrl);
          if (altPosts.length > 0) {
            return altPosts;
          }
        } catch (altError) {
          this.logger.warn('Alternative scraping approach also failed:', altError.message);
        }

        // If alternative approach fails and fallback is enabled, try JigsawStack
        if (this.useFallback) {
          return await this.tryJigsawStackFallback(profileUrl);
        }
      }
      
      throw error;
    }
  }

  async simulateActivityPageBrowsing() {
    try {
      // Simulate reading the activity page
      await this.browserManager.humanLikeDelay(3000, 5000);
      
      // Scroll a bit to simulate interest
      await this.browserManager.humanLikeScroll(300);
      await this.browserManager.humanLikeDelay(2000, 3000);
      
      // Move mouse to simulate reading posts
      await this.browserManager.page.mouse.move(
        400 + Math.random() * 400,
        300 + Math.random() * 400
      );
      
      await this.browserManager.humanLikeDelay(1000, 2000);
    } catch (error) {
      this.logger.debug('Activity page browsing simulation error:', error.message);
    }
  }

  async alternativeScrapingApproach(profileUrl) {
    try {
      this.logger.info('Using alternative scraping approach...');
      
      // Try accessing profile posts through different URL patterns
      const alternativeUrls = [
        profileUrl.replace(/\/$/, '') + '/detail/recent-activity/shares/',
        profileUrl.replace(/\/$/, '') + '/detail/recent-activity/',
        profileUrl.replace(/\/$/, '') + '/'
      ];
      
      for (const altUrl of alternativeUrls) {
        try {
          this.logger.info(`Trying alternative URL: ${altUrl}`);
          
          await this.retry(async () => {
            await this.browserManager.navigateToPage(altUrl, 'networkidle0');
            await this.simulateHumanBrowsing();
          });
          
          // Check if we can extract any content
          const posts = await this.contentExtractor.extractPosts(
            this.browserManager.page, 
            Math.min(this.options.maxPosts || 10, 10) // Limit to 10 posts for alternative approach
          );
          
          if (posts.length > 0) {
            this.scrapedData = posts;
            this.logger.info(`Alternative approach succeeded: ${posts.length} posts extracted`);
            return posts;
          }
          
        } catch (error) {
          this.logger.debug(`Alternative URL failed: ${altUrl} - ${error.message}`);
          continue;
        }
      }
      
      throw new Error('All alternative scraping approaches failed');
      
    } catch (error) {
      this.logger.error('Alternative scraping approach failed:', error.message);
      return []; // Return empty array instead of throwing
    }
  }

  async tryJigsawStackFallback(profileUrl) {
    try {
      this.logger.info('🔧 Attempting JigsawStack fallback for LinkedIn scraping...');
      
      if (!this.jigsawStackFallback) {
        throw new Error('JigsawStack fallback service not initialized');
      }

      const result = await this.jigsawStackFallback.scrapeLinkedInProfile(profileUrl);
      
      if (result.success) {
        this.logger.info(`✅ JigsawStack fallback succeeded! Extracted ${result.posts.length} posts`);
        
        // Update our internal data structures
        this.profileMetadata = result.profileMetadata;
        this.scrapedData = result.posts;
        
        // Add metadata indicating this was scraped via fallback
        this.profileMetadata.scrapedVia = 'jigsawstack-fallback';
        this.profileMetadata.fallbackUsed = true;
        this.profileMetadata.originalMethod = 'puppeteer-failed';
        
        return result.posts;
      } else {
        throw new Error(`JigsawStack fallback failed: ${result.error}`);
      }
      
    } catch (error) {
      this.logger.error('❌ JigsawStack fallback failed:', error.message);
      
      // Return minimal data rather than failing completely
      return this.createMinimalProfileData(profileUrl, error.message);
    }
  }

  createMinimalProfileData(profileUrl, errorMessage) {
    this.logger.warn('Creating minimal profile data due to all scraping methods failing');
    
    // Extract basic info from URL
    const profileUsername = profileUrl.split('/in/')[1]?.replace('/', '') || 'unknown';
    
    this.profileMetadata = {
      name: profileUsername.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      url: profileUrl,
      username: profileUsername,
      scrapedAt: new Date().toISOString(),
      scrapedVia: 'minimal-fallback',
      error: errorMessage,
      fallbackUsed: true,
      dataLimited: true
    };
    
    // Return empty posts array but don't throw
    this.scrapedData = [];
    return [];
  }

  async loadAllPosts() {
    try {
      this.logger.info('Loading all posts by scrolling...');
      
      let postCount = 0;
      let previousPostCount = 0;
      let stuckCount = 0;
      const maxStuckCount = 3;

      while (stuckCount < maxStuckCount) {
        // Scroll down to load more posts
        await this.browserManager.humanLikeScroll(800);
        await this.rateLimiter.delay();

        // Count current posts
        const currentPostElements = await this.browserManager.page.$$(
          '.feed-shared-update-v2, .feed-shared-article, .feed-shared-video, article[data-urn]'
        );
        
        postCount = currentPostElements.length;
        
        // Check if we've reached the max posts limit
        if (this.options.maxPosts && postCount >= this.options.maxPosts) {
          this.logger.info(`Reached maximum posts limit: ${this.options.maxPosts}`);
          break;
        }

        // Check if we're stuck (no new posts loaded)
        if (postCount === previousPostCount) {
          stuckCount++;
          this.logger.debug(`No new posts loaded (${stuckCount}/${maxStuckCount})`);
        } else {
          stuckCount = 0;
          this.logger.debug(`Loaded ${postCount} posts so far`);
        }

        previousPostCount = postCount;

        // Rate limiting between scroll actions
        await this.browserManager.humanLikeDelay(1500, 3000);
      }

      this.logger.info(`Finished loading posts. Total found: ${postCount}`);
      
    } catch (error) {
      this.logger.error('Error loading posts:', error.message);
      throw error;
    }
  }

  async export(options = {}) {
    try {
      this.logger.info(`Exporting scraped data in format: ${options.format || 'all'}`);
      
      if (!this.scrapedData.length) {
        throw new Error('No data to export. Run scrapeProfile() first.');
      }

      const exportOptions = {
        format: 'all',
        includeMedia: true,
        includeEngagement: true,
        includeHashtags: true,
        includeMentions: true,
        separateFiles: false,
        outputDir: './output',
        ...options
      };

      const results = await this.exportManager.export(
        this.scrapedData,
        this.profileMetadata,
        exportOptions
      );

      this.logger.info('Export completed successfully');
      return results;
    } catch (error) {
      this.logger.error('Export failed:', error.message);
      throw error;
    }
  }

  async exportToExcel(options = {}) {
    return await this.export({ ...options, format: 'excel' });
  }

  async exportToJson(options = {}) {
    return await this.export({ ...options, format: 'json' });
  }

  async exportToCsv(options = {}) {
    return await this.export({ ...options, format: 'csv' });
  }

  async exportAll(options = {}) {
    return await this.export({ ...options, format: 'all' });
  }

  isValidLinkedInProfileUrl(url) {
    const linkedinProfilePattern = /^https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
    return linkedinProfilePattern.test(url);
  }

  getScrapedData() {
    return {
      posts: this.scrapedData,
      metadata: this.profileMetadata,
      summary: {
        totalPosts: this.scrapedData.length,
        scrapedAt: new Date().toISOString(),
        isAuthenticated: this.isAuthenticated
      }
    };
  }

  async close() {
    try {
      await this.browserManager.close();
      this.logger.info('Scraper closed successfully');
    } catch (error) {
      this.logger.error('Error closing scraper:', error.message);
    }
  }

  // Retry mechanism for failed operations
  async retry(operation, maxRetries = null) {
    const retries = maxRetries || this.options.maxRetries;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${retries} failed:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Record failure for rate limiting
        this.rateLimiter.recordFailure();
      }
    }
  }
}