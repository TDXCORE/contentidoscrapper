// LinkedIn DOM selectors with fallback options
export const SELECTORS = {
  posts: {
    container: [
      '.feed-shared-update-v2',
      '.feed-shared-article',
      '.feed-shared-video',
      'article[data-urn]',
      '.occludable-update',
      '[data-id^="urn:li:activity"]'
    ],
    content: {
      text: [
        '.feed-shared-text__text-view .attributed-text-segment-list__content',
        '.feed-shared-update-v2__commentary .attributed-text-segment-list__content',
        '.feed-shared-text .break-words',
        '.feed-shared-inline-show-more-text__text-view',
        '.attributed-text-segment-list__content',
        '.feed-shared-text span[dir="ltr"]',
        '.update-components-text span'
      ],
      author: [
        '.feed-shared-actor__name',
        '.feed-shared-actor a[aria-label]',
        '.update-components-actor__name',
        '.feed-shared-actor__title',
        '.feed-shared-update-v2__actor-name',
        'a.app-aware-link .feed-shared-actor__name'
      ],
      authorTitle: [
        '.feed-shared-actor__description',
        '.feed-shared-actor__sub-description:not(:has(time))',
        '.update-components-actor__description'
      ],
      timestamp: [
        '.feed-shared-actor__sub-description time',
        '.feed-shared-update-v2__content time',
        '.update-components-actor time',
        'time[datetime]',
        '.feed-shared-actor time'
      ]
    },
    engagement: {
      reactions: [
        '.social-counts-reactions__count',
        '[data-test-id="social-action-count-reactions"]',
        '.feed-shared-social-action-bar__count-reactions',
        '.social-counts-reactions button span',
        '.reactions-count',
        '.social-counts__count--reactions'
      ],
      comments: [
        '.social-counts-comments a',
        '[data-test-id="social-action-count-comments"]',
        '.feed-shared-social-action-bar__count-comments',
        '.social-counts__count--comments span',
        '.comments-count'
      ],
      shares: [
        '.social-counts__count--reposts',
        '[data-test-id="social-action-count-reposts"]',
        '.feed-shared-social-action-bar__count-shares',
        '.shares-count span',
        '.social-counts-reposts'
      ]
    },
    media: {
      images: [
        '.feed-shared-image img[src]',
        '.feed-shared-update-v2__content img[src]:not([alt*="profile"])',
        '.update-components-image img',
        '.feed-shared-image__container img',
        '.feed-shared-mini-update-v2 img',
        '.feed-shared-linkedin-video__image img',
        'img[src*="media-exp"]',
        'img[src*="media.licdn.com"]'
      ],
      videos: [
        '.feed-shared-video video source[src]',
        '[data-video-url]',
        '.feed-shared-linkedin-video video',
        'video source',
        '.video-player video',
        '.feed-shared-video [data-sources]'
      ],
      documents: [
        '.feed-shared-document a[href*="/document/"]',
        '.feed-shared-article a[href*="/pulse/"]',
        '.feed-shared-external-article a',
        '.feed-shared-document__content a',
        '.document-share a'
      ]
    },
    postUrl: [
      'time[datetime] a',
      '.feed-shared-actor__sub-description a',
      'a[href*="/posts/"]',
      'a[href*="/activity-"]',
      '.feed-shared-control-menu__trigger'
    ]
  },
  profile: {
    name: [
      '.text-heading-xlarge',
      '.pv-text-details__left-panel h1',
      '.text-heading-large',
      '.profile-info__name',
      '.pv-top-card--list h1',
      '.pv-top-card__title'
    ],
    headline: [
      '.text-body-medium.break-words',
      '.pv-text-details__left-panel .text-body-medium',
      '.pv-top-card--list .text-body-medium',
      '.profile-info__headline',
      '.pv-top-card-v2-ctas__headline'
    ],
    followers: [
      '[data-test-id="followers-count"]',
      '.pv-recent-activity-detail__follower-count',
      '.pvs-header__optional-link[href*="followers"] span',
      'a[href*="followers"] .t-bold',
      '.follower-count'
    ],
    connections: [
      '[data-test-id="connections-count"]',
      '.pv-top-card--list-bullet li:contains("connection")',
      'a[href*="connections"] .t-bold',
      '.connections-count'
    ],
    location: [
      '.pv-text-details__left-panel .text-body-small.inline.t-black--light.break-words',
      '.pv-top-card--list .text-body-small.inline',
      '.profile-info__location',
      '.pv-top-card-v2-ctas .text-body-small',
      '.pv-text-details__left-panel .text-body-small:not(.break-words)'
    ],
    industry: [
      '.pv-top-card--experience-list li',
      '.pv-entity__company-summary-info h3',
      '.profile-info__industry',
      '.experience-item__subtitle'
    ]
  },
  navigation: {
    activityTab: [
      'a[href*="/recent-activity/"]',
      '.pv-profile-section__see-more-inline',
      '.pv-recent-activity-section__see-all-link',
      'button[aria-label*="activity"]'
    ],
    showMoreButton: [
      '.feed-shared-inline-show-more-text__see-more-less-toggle',
      '.show-more-less-text__button--more',
      '.feed-shared-text__see-more',
      'button[aria-expanded="false"]'
    ],
    loadMoreButton: [
      '.scaffold-finite-scroll__load-button',
      '.pv-profile-section__see-more',
      '.artdeco-button--muted'
    ]
  },
  auth: {
    loginEmail: '#username',
    loginPassword: '#password',
    loginButton: 'button[type="submit"]',
    twoFactorInput: '#input__phone_number_challenge_answer',
    captchaContainer: '.challenge-form',
    errorMessage: '#error-for-username, #error-for-password'
  }
};

// Selector utility functions
export class SelectorEngine {
  static async findElement(page, selectors, timeout = 5000) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorArray) {
      try {
        const element = await page.waitForSelector(selector, {
          timeout: Math.floor(timeout / selectorArray.length),
          visible: true
        });
        if (element) return element;
      } catch (error) {
        continue; // Try next selector
      }
    }
    return null;
  }

  static async findElements(page, selectors) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorArray) {
      try {
        const elements = await page.$$(selector);
        if (elements && elements.length > 0) return elements;
      } catch (error) {
        continue; // Try next selector
      }
    }
    return [];
  }

  static async getText(page, selectors) {
    const element = await this.findElement(page, selectors);
    if (element) {
      return await page.evaluate(el => el.textContent?.trim() || '', element);
    }
    return '';
  }

  static async getAttribute(page, selectors, attribute) {
    const element = await this.findElement(page, selectors);
    if (element) {
      return await page.evaluate((el, attr) => el.getAttribute(attr), element, attribute);
    }
    return '';
  }

  static async click(page, selectors) {
    const element = await this.findElement(page, selectors);
    if (element) {
      await element.click();
      return true;
    }
    return false;
  }

  static async type(page, selectors, text, options = {}) {
    const element = await this.findElement(page, selectors);
    if (element) {
      await element.type(text, { delay: 100, ...options });
      return true;
    }
    return false;
  }

  static async isVisible(page, selectors) {
    const element = await this.findElement(page, selectors, 1000);
    if (element) {
      return await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, element);
    }
    return false;
  }

  static async waitForAnySelector(page, selectors, timeout = 10000) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Timeout waiting for selectors: ' + selectors.join(', ')));
        }
      }, timeout);

      const promises = selectorArray.map(selector =>
        page.waitForSelector(selector, { timeout, visible: true })
          .then(element => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              resolve({ element, selector });
            }
          })
          .catch(() => {}) // Ignore individual failures
      );

      Promise.allSettled(promises).then(results => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          reject(new Error('None of the selectors were found: ' + selectorArray.join(', ')));
        }
      });
    });
  }
}

// Dynamic selector updates based on LinkedIn layout changes
export class SelectorUpdater {
  constructor() {
    this.customSelectors = {};
    this.selectorPerformance = {};
  }

  addCustomSelector(category, key, selector) {
    if (!this.customSelectors[category]) {
      this.customSelectors[category] = {};
    }
    this.customSelectors[category][key] = selector;
  }

  recordSelectorSuccess(selector) {
    if (!this.selectorPerformance[selector]) {
      this.selectorPerformance[selector] = { success: 0, failure: 0 };
    }
    this.selectorPerformance[selector].success++;
  }

  recordSelectorFailure(selector) {
    if (!this.selectorPerformance[selector]) {
      this.selectorPerformance[selector] = { success: 0, failure: 0 };
    }
    this.selectorPerformance[selector].failure++;
  }

  getOptimizedSelectors(category, key) {
    const defaultSelectors = SELECTORS[category]?.[key] || [];
    const customSelectors = this.customSelectors[category]?.[key] || [];
    
    const allSelectors = [...customSelectors, ...defaultSelectors];
    
    // Sort by success rate
    return allSelectors.sort((a, b) => {
      const aPerf = this.selectorPerformance[a] || { success: 0, failure: 0 };
      const bPerf = this.selectorPerformance[b] || { success: 0, failure: 0 };
      
      const aRate = aPerf.success / (aPerf.success + aPerf.failure + 1);
      const bRate = bPerf.success / (bPerf.success + bPerf.failure + 1);
      
      return bRate - aRate;
    });
  }

  exportPerformanceData() {
    return {
      customSelectors: this.customSelectors,
      performance: this.selectorPerformance,
      timestamp: new Date().toISOString()
    };
  }
}