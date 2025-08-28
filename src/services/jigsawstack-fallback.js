import { JigsawStack } from 'jigsawstack';
import { Logger } from '../utils/logger.js';

export class JigsawStackFallback {
  constructor(options = {}) {
    this.logger = new Logger('JigsawStackFallback');
    this.apiKey = options.apiKey || process.env.JIGSAWSTACK_API_KEY;
    this.jigsaw = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        throw new Error('JigsawStack API key not provided. Set JIGSAWSTACK_API_KEY environment variable.');
      }

      this.jigsaw = JigsawStack({ apiKey: this.apiKey });
      this.initialized = true;
      this.logger.info('JigsawStack fallback service initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize JigsawStack:', error.message);
      return false;
    }
  }

  async scrapeLinkedInProfile(profileUrl) {
    try {
      if (!this.initialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) {
          throw new Error('JigsawStack initialization failed');
        }
      }

      this.logger.info(`Attempting LinkedIn profile scrape with JigsawStack: ${profileUrl}`);

      // Define what data we want to extract from LinkedIn profile
      const profilePrompts = [
        "full name",
        "professional headline", 
        "current company",
        "current job title",
        "location",
        "about section",
        "experience list",
        "education list",
        "skills list",
        "profile image url",
        "contact info",
        "follower count",
        "connection count"
      ];

      // Extract profile data
      const profileResponse = await this.jigsaw.web.ai_scrape({
        url: profileUrl,
        element_prompts: profilePrompts
      });

      this.logger.info('Profile data extracted successfully');

      // Try to get recent activity/posts
      const activityUrl = profileUrl.replace(/\/$/, '') + '/recent-activity/all/';
      
      let postsData = [];
      try {
        const postPrompts = [
          "post content text",
          "post date",
          "like count",
          "comment count", 
          "share count",
          "post media urls",
          "hashtags",
          "mentions"
        ];

        this.logger.info(`Attempting to extract posts from: ${activityUrl}`);
        
        const postsResponse = await this.jigsaw.web.ai_scrape({
          url: activityUrl,
          element_prompts: postPrompts
        });

        postsData = this.parsePostsData(postsResponse);
        this.logger.info(`Extracted ${postsData.length} posts from activity page`);
        
      } catch (postsError) {
        this.logger.warn('Could not extract posts data:', postsError.message);
        // Continue with just profile data if posts fail
      }

      // Structure the data in our expected format
      const structuredData = this.structureProfileData(profileResponse, postsData, profileUrl);
      
      return {
        success: true,
        profileMetadata: structuredData.profile,
        posts: structuredData.posts,
        source: 'jigsawstack'
      };

    } catch (error) {
      this.logger.error('JigsawStack LinkedIn scraping failed:', error.message);
      return {
        success: false,
        error: error.message,
        source: 'jigsawstack'
      };
    }
  }

  parsePostsData(postsResponse) {
    try {
      // JigsawStack returns data in different formats
      // We need to parse and structure it into our post format
      const posts = [];
      
      if (postsResponse && postsResponse.data) {
        const data = postsResponse.data;
        
        // Handle different response structures
        if (Array.isArray(data)) {
          // Multiple posts found
          for (const post of data) {
            posts.push(this.createPostObject(post));
          }
        } else {
          // Single post or grouped data
          posts.push(this.createPostObject(data));
        }
      }
      
      return posts;
    } catch (error) {
      this.logger.warn('Error parsing posts data:', error.message);
      return [];
    }
  }

  createPostObject(postData) {
    return {
      id: `jigsawstack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: postData['post content text'] || postData.content || '',
      publishDate: postData['post date'] || postData.date || null,
      reactions: this.parseNumber(postData['like count'] || postData.likes),
      comments: this.parseNumber(postData['comment count'] || postData.comments),
      shares: this.parseNumber(postData['share count'] || postData.shares),
      mediaFiles: this.parseMediaUrls(postData['post media urls'] || postData.media),
      hashtags: this.parseHashtags(postData.hashtags || postData['hashtags']),
      mentions: this.parseMentions(postData.mentions || postData['mentions']),
      source: 'jigsawstack',
      rawData: postData
    };
  }

  structureProfileData(profileResponse, postsData, profileUrl) {
    const profile = {
      name: profileResponse.data?.['full name'] || 'Unknown',
      headline: profileResponse.data?.['professional headline'] || '',
      company: profileResponse.data?.['current company'] || '',
      jobTitle: profileResponse.data?.['current job title'] || '',
      location: profileResponse.data?.location || '',
      about: profileResponse.data?.['about section'] || '',
      experience: this.parseExperience(profileResponse.data?.['experience list']),
      education: this.parseEducation(profileResponse.data?.['education list']),
      skills: this.parseSkills(profileResponse.data?.['skills list']),
      profileImage: profileResponse.data?.['profile image url'] || '',
      contactInfo: profileResponse.data?.['contact info'] || {},
      followers: this.parseNumber(profileResponse.data?.['follower count']),
      connections: this.parseNumber(profileResponse.data?.['connection count']),
      url: profileUrl,
      scrapedBy: 'jigsawstack',
      scrapedAt: new Date().toISOString()
    };

    return {
      profile,
      posts: postsData
    };
  }

  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle formats like "1.2K", "500+", etc.
      const cleanValue = value.replace(/[^\d.]/g, '');
      const num = parseFloat(cleanValue);
      
      if (value.toLowerCase().includes('k')) return Math.floor(num * 1000);
      if (value.toLowerCase().includes('m')) return Math.floor(num * 1000000);
      
      return isNaN(num) ? 0 : Math.floor(num);
    }
    return 0;
  }

  parseMediaUrls(mediaData) {
    if (!mediaData) return [];
    if (Array.isArray(mediaData)) return mediaData;
    if (typeof mediaData === 'string') {
      // Try to parse URLs from string
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return mediaData.match(urlRegex) || [];
    }
    return [];
  }

  parseHashtags(hashtagData) {
    if (!hashtagData) return [];
    if (Array.isArray(hashtagData)) return hashtagData;
    if (typeof hashtagData === 'string') {
      // Extract hashtags from string
      const hashtagRegex = /#\w+/g;
      return hashtagData.match(hashtagRegex) || [];
    }
    return [];
  }

  parseMentions(mentionData) {
    if (!mentionData) return [];
    if (Array.isArray(mentionData)) return mentionData;
    if (typeof mentionData === 'string') {
      // Extract mentions from string
      const mentionRegex = /@\w+/g;
      return mentionData.match(mentionRegex) || [];
    }
    return [];
  }

  parseExperience(experienceData) {
    if (!experienceData) return [];
    if (Array.isArray(experienceData)) return experienceData;
    if (typeof experienceData === 'string') {
      // Try to parse structured experience data
      return [{ title: 'Experience', description: experienceData }];
    }
    return [];
  }

  parseEducation(educationData) {
    if (!educationData) return [];
    if (Array.isArray(educationData)) return educationData;
    if (typeof educationData === 'string') {
      return [{ institution: 'Education', description: educationData }];
    }
    return [];
  }

  parseSkills(skillsData) {
    if (!skillsData) return [];
    if (Array.isArray(skillsData)) return skillsData;
    if (typeof skillsData === 'string') {
      // Split skills by common separators
      return skillsData.split(/[,;•]/).map(skill => skill.trim()).filter(skill => skill);
    }
    return [];
  }

  async testConnection() {
    try {
      if (!this.initialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) return false;
      }

      // Test with a simple public page
      const testResponse = await this.jigsaw.web.ai_scrape({
        url: 'https://example.com',
        element_prompts: ['title']
      });

      return testResponse && testResponse.data;
    } catch (error) {
      this.logger.error('JigsawStack connection test failed:', error.message);
      return false;
    }
  }
}