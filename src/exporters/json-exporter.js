import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

export class JsonExporter {
  constructor() {
    this.logger = new Logger('JsonExporter');
  }

  async exportToJson(posts, profileMetadata, options = {}) {
    try {
      this.logger.info(`Generating JSON report for ${posts.length} posts`);

      const exportData = this.buildExportStructure(posts, profileMetadata, options);
      const filename = options.filename || this.generateFilename(profileMetadata);
      const outputPath = path.join('./output', filename);

      await fs.mkdir('./output', { recursive: true });
      
      const jsonString = JSON.stringify(exportData, null, options.minify ? 0 : 2);
      await fs.writeFile(outputPath, jsonString, 'utf8');
      
      this.logger.info(`JSON report saved: ${outputPath}`);
      return outputPath;

    } catch (error) {
      this.logger.error('Failed to create JSON report:', error.message);
      throw error;
    }
  }

  async exportSeparateJsonFiles(posts, profileMetadata, options = {}) {
    try {
      const results = {};

      // Main structured export
      results.full = await this.exportToJson(posts, profileMetadata, {
        ...options,
        filename: options.fullFilename || this.generateFilename(profileMetadata, 'full')
      });

      // Posts only (lightweight)
      results.postsOnly = await this.exportPostsOnly(posts, profileMetadata, {
        filename: options.postsFilename || this.generateFilename(profileMetadata, 'posts')
      });

      // Analytics summary
      results.analytics = await this.exportAnalytics(posts, profileMetadata, {
        filename: options.analyticsFilename || this.generateFilename(profileMetadata, 'analytics')
      });

      // Media index
      if (options.includeMediaIndex !== false) {
        results.mediaIndex = await this.exportMediaIndex(posts, profileMetadata, {
          filename: options.mediaFilename || this.generateFilename(profileMetadata, 'media_index')
        });
      }

      return results;

    } catch (error) {
      this.logger.error('Failed to create separate JSON files:', error.message);
      throw error;
    }
  }

  async exportPostsOnly(posts, profileMetadata, options = {}) {
    const postsData = {
      metadata: {
        exportType: 'posts_only',
        exportedAt: new Date().toISOString(),
        totalPosts: posts.length,
        profile: {
          name: profileMetadata.name,
          url: profileMetadata.url,
          scrapedAt: profileMetadata.scrapedAt
        }
      },
      posts: posts.map(post => this.cleanPostForExport(post, options.includeFullText !== false))
    };

    const filename = options.filename || this.generateFilename(profileMetadata, 'posts');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(postsData, null, 2), 'utf8');
    
    this.logger.info(`Posts-only JSON saved: ${outputPath}`);
    return outputPath;
  }

  async exportAnalytics(posts, profileMetadata, options = {}) {
    const analytics = this.generateAnalytics(posts, profileMetadata);
    
    const analyticsData = {
      metadata: {
        exportType: 'analytics',
        exportedAt: new Date().toISOString(),
        profile: {
          name: profileMetadata.name,
          url: profileMetadata.url
        }
      },
      analytics
    };

    const filename = options.filename || this.generateFilename(profileMetadata, 'analytics');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(analyticsData, null, 2), 'utf8');
    
    this.logger.info(`Analytics JSON saved: ${outputPath}`);
    return outputPath;
  }

  async exportMediaIndex(posts, profileMetadata, options = {}) {
    const mediaIndex = {
      metadata: {
        exportType: 'media_index',
        exportedAt: new Date().toISOString(),
        profile: {
          name: profileMetadata.name,
          url: profileMetadata.url
        }
      },
      mediaFiles: [],
      summary: {
        totalMediaFiles: 0,
        mediaTypes: {},
        postsWithMedia: 0
      }
    };

    posts.forEach(post => {
      if (post.mediaFiles && post.mediaFiles.length > 0) {
        mediaIndex.summary.postsWithMedia++;
        
        post.mediaFiles.forEach(media => {
          mediaIndex.mediaFiles.push({
            postId: post.id,
            postType: post.type,
            postDate: post.publishDate,
            postReactions: post.reactions || 0,
            postComments: post.comments || 0,
            mediaType: media.type,
            mediaUrl: media.url,
            filename: media.filename,
            postCaption: post.caption ? post.caption.substring(0, 200) + '...' : null
          });

          // Count media types
          mediaIndex.summary.mediaTypes[media.type] = 
            (mediaIndex.summary.mediaTypes[media.type] || 0) + 1;
          mediaIndex.summary.totalMediaFiles++;
        });
      }
    });

    const filename = options.filename || this.generateFilename(profileMetadata, 'media_index');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(mediaIndex, null, 2), 'utf8');
    
    this.logger.info(`Media index JSON saved: ${outputPath}`);
    return outputPath;
  }

  buildExportStructure(posts, profileMetadata, options = {}) {
    const exportData = {
      metadata: {
        exportType: 'full',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalPosts: posts.length,
        profile: {
          name: profileMetadata.name,
          url: profileMetadata.url,
          headline: profileMetadata.headline,
          location: profileMetadata.location,
          industry: profileMetadata.industry,
          followers: profileMetadata.followers,
          connections: profileMetadata.connections,
          scrapedAt: profileMetadata.scrapedAt
        },
        exportOptions: {
          includeMedia: options.includeMedia !== false,
          includeEngagement: options.includeEngagement !== false,
          includeHashtags: options.includeHashtags !== false,
          includeMentions: options.includeMentions !== false
        }
      },
      analytics: this.generateAnalytics(posts, profileMetadata),
      posts: posts.map(post => this.cleanPostForExport(post, true))
    };

    return exportData;
  }

  cleanPostForExport(post, includeFullText = true) {
    const cleanedPost = {
      id: post.id,
      type: post.type,
      url: post.url,
      publishDate: post.publishDate,
      engagement: {
        reactions: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        total: (post.reactions || 0) + (post.comments || 0) + (post.shares || 0),
        score: post.engagement?.score || 0,
        rate: post.engagement?.rate || 0
      }
    };

    // Add caption (with optional truncation)
    if (post.caption) {
      cleanedPost.caption = includeFullText ? 
        post.caption : 
        post.caption.length > 500 ? post.caption.substring(0, 500) + '...' : post.caption;
    }

    // Add author information if available
    if (post.author) {
      cleanedPost.author = {
        name: post.author.name,
        profile: post.author.profile,
        title: post.author.title
      };
    }

    // Add media files if present
    if (post.mediaFiles && post.mediaFiles.length > 0) {
      cleanedPost.mediaFiles = post.mediaFiles.map(media => ({
        type: media.type,
        url: media.url,
        filename: media.filename,
        size: media.size,
        dimensions: media.dimensions
      }));
    }

    // Add hashtags if present
    if (post.hashtags && post.hashtags.length > 0) {
      cleanedPost.hashtags = post.hashtags;
    }

    // Add mentions if present
    if (post.mentions && post.mentions.length > 0) {
      cleanedPost.mentions = post.mentions;
    }

    // Add any additional metadata
    if (post.metadata) {
      cleanedPost.metadata = post.metadata;
    }

    return cleanedPost;
  }

  generateAnalytics(posts, profileMetadata) {
    const analytics = {
      summary: {
        totalPosts: posts.length,
        totalReactions: 0,
        totalComments: 0,
        totalShares: 0,
        postsWithMedia: 0,
        uniqueHashtags: new Set(),
        dateRange: {
          earliest: null,
          latest: null
        }
      },
      postTypes: {},
      engagement: {
        averageReactionsPerPost: 0,
        averageCommentsPerPost: 0,
        averageSharesPerPost: 0,
        topPerformingPosts: [],
        engagementByType: {}
      },
      hashtags: {
        mostUsed: [],
        totalUnique: 0
      },
      mediaAnalysis: {
        totalFiles: 0,
        typeDistribution: {},
        postsWithMedia: 0
      },
      timeAnalysis: {
        postsByMonth: {},
        postsByDayOfWeek: {},
        postsByHour: {}
      }
    };

    const hashtagCounts = {};

    posts.forEach(post => {
      // Basic stats
      analytics.summary.totalReactions += post.reactions || 0;
      analytics.summary.totalComments += post.comments || 0;
      analytics.summary.totalShares += post.shares || 0;

      // Post types
      analytics.postTypes[post.type] = (analytics.postTypes[post.type] || 0) + 1;

      // Engagement by type
      if (!analytics.engagement.engagementByType[post.type]) {
        analytics.engagement.engagementByType[post.type] = {
          totalReactions: 0,
          totalComments: 0,
          totalShares: 0,
          postCount: 0
        };
      }
      analytics.engagement.engagementByType[post.type].totalReactions += post.reactions || 0;
      analytics.engagement.engagementByType[post.type].totalComments += post.comments || 0;
      analytics.engagement.engagementByType[post.type].totalShares += post.shares || 0;
      analytics.engagement.engagementByType[post.type].postCount++;

      // Media analysis
      if (post.mediaFiles && post.mediaFiles.length > 0) {
        analytics.summary.postsWithMedia++;
        analytics.mediaAnalysis.postsWithMedia++;
        analytics.mediaAnalysis.totalFiles += post.mediaFiles.length;
        
        post.mediaFiles.forEach(media => {
          analytics.mediaAnalysis.typeDistribution[media.type] = 
            (analytics.mediaAnalysis.typeDistribution[media.type] || 0) + 1;
        });
      }

      // Hashtags
      if (post.hashtags) {
        post.hashtags.forEach(hashtag => {
          analytics.summary.uniqueHashtags.add(hashtag);
          hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
        });
      }

      // Date analysis
      if (post.publishDate) {
        const date = new Date(post.publishDate);
        
        // Date range
        if (!analytics.summary.dateRange.earliest || date < new Date(analytics.summary.dateRange.earliest)) {
          analytics.summary.dateRange.earliest = post.publishDate;
        }
        if (!analytics.summary.dateRange.latest || date > new Date(analytics.summary.dateRange.latest)) {
          analytics.summary.dateRange.latest = post.publishDate;
        }

        // Time analysis
        const month = date.toISOString().substring(0, 7); // YYYY-MM
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        analytics.timeAnalysis.postsByMonth[month] = (analytics.timeAnalysis.postsByMonth[month] || 0) + 1;
        analytics.timeAnalysis.postsByDayOfWeek[dayOfWeek] = (analytics.timeAnalysis.postsByDayOfWeek[dayOfWeek] || 0) + 1;
        analytics.timeAnalysis.postsByHour[hour] = (analytics.timeAnalysis.postsByHour[hour] || 0) + 1;
      }
    });

    // Calculate averages
    if (posts.length > 0) {
      analytics.engagement.averageReactionsPerPost = analytics.summary.totalReactions / posts.length;
      analytics.engagement.averageCommentsPerPost = analytics.summary.totalComments / posts.length;
      analytics.engagement.averageSharesPerPost = analytics.summary.totalShares / posts.length;
    }

    // Top performing posts
    analytics.engagement.topPerformingPosts = [...posts]
      .sort((a, b) => ((b.reactions || 0) + (b.comments || 0)) - ((a.reactions || 0) + (a.comments || 0)))
      .slice(0, 10)
      .map(post => ({
        id: post.id,
        type: post.type,
        reactions: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        totalEngagement: (post.reactions || 0) + (post.comments || 0) + (post.shares || 0),
        caption: post.caption ? post.caption.substring(0, 100) + '...' : null,
        url: post.url
      }));

    // Top hashtags
    analytics.hashtags.mostUsed = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([hashtag, count]) => ({ hashtag, count }));

    analytics.hashtags.totalUnique = analytics.summary.uniqueHashtags.size;
    analytics.summary.uniqueHashtags = analytics.summary.uniqueHashtags.size; // Convert Set to number

    return analytics;
  }

  generateFilename(profileMetadata, suffix = '') {
    const name = profileMetadata.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'profile';
    const date = new Date().toISOString().split('T')[0];
    const suffixPart = suffix ? `_${suffix}` : '';
    return `linkedin_${name}${suffixPart}_${date}.json`;
  }
}