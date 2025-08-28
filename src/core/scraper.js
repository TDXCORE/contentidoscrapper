import { BrowserManager } from './browser-manager.js';
import { ContentExtractor } from './content-extractor.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { Logger } from '../utils/logger.js';
import { ExportManager } from '../exporters/export-manager.js';

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
    this.isAuthenticated = false;
    this.scrapedData = [];
    this.profileMetadata = {};
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
      this.logger.info('Attempting to log in to LinkedIn...');

      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required for LinkedIn login');
      }

      // Navigate to LinkedIn login page
      await this.browserManager.navigateToPage('https://www.linkedin.com/login');
      
      // Wait for login form
      await this.browserManager.waitForSelector('#username', { timeout: 10000 });
      
      // Fill in credentials
      await this.browserManager.page.type('#username', credentials.email, { delay: 100 });
      await this.browserManager.humanLikeDelay(500, 1500);
      
      await this.browserManager.page.type('#password', credentials.password, { delay: 100 });
      await this.browserManager.humanLikeDelay(500, 1500);
      
      // Click login button
      await this.browserManager.page.click('button[type="submit"]');
      
      // Wait for navigation or CAPTCHA/2FA
      await this.browserManager.humanLikeDelay(3000, 5000);
      
      const currentUrl = await this.browserManager.getCurrentUrl();
      
      // Check if login was successful
      if (currentUrl.includes('/feed') || currentUrl.includes('/in/')) {
        this.isAuthenticated = true;
        this.logger.info('Successfully logged in to LinkedIn');
        return true;
      } else if (currentUrl.includes('challenge')) {
        throw new Error('CAPTCHA or security challenge detected. Please solve manually or use a different account.');
      } else if (currentUrl.includes('login')) {
        throw new Error('Login failed. Please check your credentials.');
      }
      
      // Handle potential 2FA or additional verification
      await this.browserManager.humanLikeDelay(5000);
      const finalUrl = await this.browserManager.getCurrentUrl();
      
      if (finalUrl.includes('/feed') || finalUrl.includes('/in/')) {
        this.isAuthenticated = true;
        this.logger.info('Successfully logged in to LinkedIn (with additional verification)');
        return true;
      }
      
      throw new Error('Login process completed but authentication status unclear');
      
    } catch (error) {
      this.logger.error('LinkedIn login failed:', error.message);
      throw error;
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

      // Navigate to profile
      await this.browserManager.navigateToPage(profileUrl);
      await this.rateLimiter.delay();

      // Extract profile metadata
      this.profileMetadata = await this.contentExtractor.extractProfileMetadata(this.browserManager.page);
      
      // Navigate to recent activity/posts
      const activityUrl = profileUrl.replace(/\/$/, '') + '/recent-activity/all/';
      await this.browserManager.navigateToPage(activityUrl);
      await this.rateLimiter.delay();

      // Scroll and load all posts
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
      throw error;
    }
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