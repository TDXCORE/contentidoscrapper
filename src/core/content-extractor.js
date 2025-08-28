import { Logger } from '../utils/logger.js';
import { SELECTORS } from '../config/selectors.js';

export class ContentExtractor {
  constructor() {
    this.logger = new Logger('ContentExtractor');
  }

  async extractProfileMetadata(page) {
    try {
      this.logger.info('Extracting profile metadata...');

      const metadata = await page.evaluate((selectors) => {
        const getTextBySelectors = (selectorArray) => {
          for (const selector of selectorArray) {
            const element = document.querySelector(selector);
            if (element) return element.textContent?.trim() || '';
          }
          return '';
        };

        const getNumberBySelectors = (selectorArray) => {
          const text = getTextBySelectors(selectorArray);
          const match = text.match(/(\d+(?:,\d+)*)/);
          return match ? parseInt(match[1].replace(/,/g, '')) : 0;
        };

        return {
          url: window.location.href,
          name: getTextBySelectors(selectors.profile.name),
          headline: getTextBySelectors(selectors.profile.headline),
          followers: getNumberBySelectors(selectors.profile.followers),
          connections: getNumberBySelectors(selectors.profile.connections),
          location: getTextBySelectors(selectors.profile.location),
          industry: getTextBySelectors(selectors.profile.industry),
          scrapedAt: new Date().toISOString()
        };
      }, SELECTORS);

      this.logger.info(`Profile metadata extracted for: ${metadata.name}`);
      return metadata;
    } catch (error) {
      this.logger.error('Failed to extract profile metadata:', error.message);
      return {
        url: await page.url(),
        name: 'Unknown',
        headline: '',
        followers: 0,
        connections: 0,
        location: '',
        industry: '',
        scrapedAt: new Date().toISOString()
      };
    }
  }

  async extractPosts(page, maxPosts = null) {
    try {
      this.logger.info('Extracting posts from page...');

      const posts = await page.evaluate((selectors, limit) => {
        const posts = [];
        const postElements = document.querySelectorAll(selectors.posts.container.join(', '));

        const getTextBySelectors = (element, selectorArray) => {
          for (const selector of selectorArray) {
            const found = element.querySelector(selector);
            if (found) return found.textContent?.trim() || '';
          }
          return '';
        };

        const getNumberBySelectors = (element, selectorArray) => {
          for (const selector of selectorArray) {
            const found = element.querySelector(selector);
            if (found) {
              const text = found.textContent?.trim() || '0';
              const match = text.match(/(\d+(?:,\d+)*)/);
              return match ? parseInt(match[1].replace(/,/g, '')) : 0;
            }
          }
          return 0;
        };

        const getUrlBySelectors = (element, selectorArray) => {
          for (const selector of selectorArray) {
            const found = element.querySelector(selector);
            if (found) {
              return found.href || found.src || found.getAttribute('data-url') || '';
            }
          }
          return '';
        };

        const extractMediaUrls = (element) => {
          const mediaUrls = [];
          
          // Extract image URLs
          const images = element.querySelectorAll(selectors.posts.media.images.join(', '));
          images.forEach(img => {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-delayed-url');
            if (src && !src.includes('data:image') && !src.includes('profile')) {
              mediaUrls.push({
                type: 'image',
                url: src,
                filename: src.split('/').pop()?.split('?')[0] || 'image'
              });
            }
          });

          // Extract video URLs
          const videos = element.querySelectorAll(selectors.posts.media.videos.join(', '));
          videos.forEach(video => {
            const src = video.src || video.getAttribute('data-video-url') || video.getAttribute('data-src');
            if (src) {
              mediaUrls.push({
                type: 'video',
                url: src,
                filename: src.split('/').pop()?.split('?')[0] || 'video'
              });
            }
          });

          // Extract document URLs
          const documents = element.querySelectorAll(selectors.posts.media.documents.join(', '));
          documents.forEach(doc => {
            if (doc.href) {
              mediaUrls.push({
                type: 'document',
                url: doc.href,
                filename: doc.textContent?.trim() || 'document'
              });
            }
          });

          return mediaUrls;
        };

        const extractHashtags = (text) => {
          const hashtags = text.match(/#[\w-]+/g);
          return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
        };

        const extractMentions = (text) => {
          const mentions = text.match(/@[\w-]+/g);
          return mentions ? mentions.map(mention => mention.substring(1)) : [];
        };

        const determinePostType = (element, caption) => {
          if (element.querySelector('video, [data-video-url]')) return 'video';
          if (element.querySelector('img[src*="media"]')) return 'image';
          if (element.querySelector('a[href*="document"], a[href*="pulse"]')) return 'document';
          if (element.querySelector('[data-test-id*="newsletter"]')) return 'newsletter';
          if (element.querySelector('[data-test-id*="event"]')) return 'event';
          if (caption.toLowerCase().includes('poll')) return 'poll';
          return 'post';
        };

        const extractPostUrl = (element) => {
          // Try to find post URL from various possible locations
          const timeElement = element.querySelector('time');
          if (timeElement && timeElement.parentElement?.href) {
            return timeElement.parentElement.href;
          }
          
          const postLink = element.querySelector('a[href*="/posts/"], a[href*="/activity-"]');
          if (postLink) return postLink.href;
          
          return window.location.href;
        };

        // Process each post element
        for (let i = 0; i < postElements.length && (limit === null || posts.length < limit); i++) {
          const element = postElements[i];
          
          try {
            const caption = getTextBySelectors(element, selectors.posts.content.text);
            const authorName = getTextBySelectors(element, selectors.posts.content.author);
            const timestamp = element.querySelector('time')?.getAttribute('datetime') || 
                            element.querySelector('time')?.textContent || '';

            const postData = {
              id: `post_${i}_${Date.now()}`,
              type: determinePostType(element, caption),
              url: extractPostUrl(element),
              caption: caption,
              reactions: getNumberBySelectors(element, selectors.posts.engagement.reactions),
              comments: getNumberBySelectors(element, selectors.posts.engagement.comments),
              shares: getNumberBySelectors(element, selectors.posts.engagement.shares),
              publishDate: timestamp,
              author: {
                name: authorName,
                profile: '', // Will be filled by scraper context
                title: getTextBySelectors(element, selectors.posts.content.authorTitle)
              },
              mediaFiles: extractMediaUrls(element),
              hashtags: extractHashtags(caption),
              mentions: extractMentions(caption),
              engagement: {
                rate: 0, // Will be calculated later
                score: 0 // Will be calculated later
              }
            };

            // Skip posts with no meaningful content
            if (postData.caption || postData.mediaFiles.length > 0) {
              posts.push(postData);
            }

          } catch (error) {
            console.warn('Error processing post element:', error);
          }
        }

        return posts;
      }, SELECTORS, maxPosts);

      // Post-process the extracted data
      const processedPosts = this.postProcessPosts(posts);
      
      this.logger.info(`Successfully extracted ${processedPosts.length} posts`);
      return processedPosts;

    } catch (error) {
      this.logger.error('Failed to extract posts:', error.message);
      return [];
    }
  }

  postProcessPosts(posts) {
    return posts.map(post => {
      // Calculate engagement rate
      const totalEngagement = post.reactions + post.comments + (post.shares || 0);
      post.engagement.rate = totalEngagement > 0 ? 
        Math.round((totalEngagement / Math.max(post.reactions, 1)) * 100) / 100 : 0;
      
      // Calculate engagement score (weighted)
      post.engagement.score = (post.reactions * 1) + (post.comments * 3) + (post.shares * 5);

      // Clean caption text
      post.caption = this.cleanText(post.caption);

      // Format publish date
      post.publishDate = this.formatDate(post.publishDate);

      // Validate media URLs
      post.mediaFiles = post.mediaFiles.filter(media => 
        media.url && media.url.startsWith('http')
      );

      return post;
    });
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
      .replace(/…$/, '') // Remove trailing ellipsis
      .trim();
  }

  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      // Try to parse ISO datetime first
      if (dateString.includes('T')) {
        return new Date(dateString).toISOString();
      }
      
      // Handle relative dates like "2h", "1d", "1w"
      const relativeMatch = dateString.match(/(\d+)([hdwm])/);
      if (relativeMatch) {
        const value = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        const now = new Date();
        
        switch (unit) {
          case 'h': // hours
            now.setHours(now.getHours() - value);
            break;
          case 'd': // days
            now.setDate(now.getDate() - value);
            break;
          case 'w': // weeks
            now.setDate(now.getDate() - (value * 7));
            break;
          case 'm': // months
            now.setMonth(now.getMonth() - value);
            break;
        }
        
        return now.toISOString();
      }
      
      // Try to parse other date formats
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toISOString();
      
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }

  async extractSpecificPost(page, postUrl) {
    try {
      this.logger.info(`Extracting specific post: ${postUrl}`);
      
      await page.goto(postUrl, { waitUntil: 'networkidle2' });
      
      // Wait for post content to load
      await page.waitForSelector('.feed-shared-update-v2, article[data-urn]', { timeout: 10000 });
      
      const posts = await this.extractPosts(page, 1);
      return posts.length > 0 ? posts[0] : null;
      
    } catch (error) {
      this.logger.error(`Failed to extract specific post ${postUrl}:`, error.message);
      return null;
    }
  }

  // Helper method to validate extracted data
  validatePostData(post) {
    const required = ['id', 'type', 'url', 'author'];
    const missing = required.filter(field => !post[field]);
    
    if (missing.length > 0) {
      this.logger.warn(`Post validation failed. Missing fields: ${missing.join(', ')}`);
      return false;
    }
    
    return true;
  }

  // Get summary statistics of extracted posts
  getExtractionSummary(posts) {
    const summary = {
      totalPosts: posts.length,
      postTypes: {},
      totalReactions: 0,
      totalComments: 0,
      totalShares: 0,
      postsWithMedia: 0,
      hashtagsUsed: new Set(),
      mentionsUsed: new Set()
    };

    posts.forEach(post => {
      // Count post types
      summary.postTypes[post.type] = (summary.postTypes[post.type] || 0) + 1;
      
      // Sum engagement
      summary.totalReactions += post.reactions || 0;
      summary.totalComments += post.comments || 0;
      summary.totalShares += post.shares || 0;
      
      // Count media posts
      if (post.mediaFiles && post.mediaFiles.length > 0) {
        summary.postsWithMedia++;
      }
      
      // Collect hashtags and mentions
      post.hashtags?.forEach(tag => summary.hashtagsUsed.add(tag));
      post.mentions?.forEach(mention => summary.mentionsUsed.add(mention));
    });

    // Convert sets to arrays for JSON serialization
    summary.hashtagsUsed = Array.from(summary.hashtagsUsed);
    summary.mentionsUsed = Array.from(summary.mentionsUsed);

    return summary;
  }
}