import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';

export class CsvExporter {
  constructor() {
    this.logger = new Logger('CsvExporter');
  }

  async exportToCsv(posts, profileMetadata, options = {}) {
    try {
      this.logger.info(`Generating CSV report for ${posts.length} posts`);

      const filename = options.filename || this.generateFilename(profileMetadata);
      const outputPath = path.join('./output', filename);

      await fs.mkdir('./output', { recursive: true });

      const fields = options.fields || this.getDefaultFields();
      const csvData = this.transformPostsForCsv(posts, profileMetadata, fields);

      const csvWriter = createObjectCsvWriter({
        path: outputPath,
        header: this.buildCsvHeader(fields),
        encoding: 'utf8'
      });

      await csvWriter.writeRecords(csvData);
      
      this.logger.info(`CSV report saved: ${outputPath}`);
      return outputPath;

    } catch (error) {
      this.logger.error('Failed to create CSV report:', error.message);
      throw error;
    }
  }

  async exportMultipleCsvFiles(posts, profileMetadata, options = {}) {
    try {
      const results = {};

      // Main posts CSV
      results.posts = await this.exportToCsv(posts, profileMetadata, {
        ...options,
        filename: options.postsFilename || this.generateFilename(profileMetadata, 'posts')
      });

      // Media files CSV
      if (options.includeMedia !== false) {
        results.media = await this.exportMediaToCsv(posts, profileMetadata, {
          filename: options.mediaFilename || this.generateFilename(profileMetadata, 'media')
        });
      }

      // Hashtags CSV
      if (options.includeHashtags !== false) {
        results.hashtags = await this.exportHashtagsToCsv(posts, profileMetadata, {
          filename: options.hashtagsFilename || this.generateFilename(profileMetadata, 'hashtags')
        });
      }

      // Engagement summary CSV
      if (options.includeEngagement !== false) {
        results.engagement = await this.exportEngagementToCsv(posts, profileMetadata, {
          filename: options.engagementFilename || this.generateFilename(profileMetadata, 'engagement')
        });
      }

      return results;

    } catch (error) {
      this.logger.error('Failed to create multiple CSV files:', error.message);
      throw error;
    }
  }

  async exportMediaToCsv(posts, profileMetadata, options = {}) {
    const mediaData = [];
    
    posts.forEach(post => {
      if (post.mediaFiles && post.mediaFiles.length > 0) {
        post.mediaFiles.forEach(media => {
          mediaData.push({
            postId: post.id,
            postType: post.type,
            mediaType: media.type,
            mediaUrl: media.url,
            filename: media.filename || '',
            postCaption: this.cleanText(post.caption, 200),
            postDate: this.formatDate(post.publishDate),
            postReactions: post.reactions || 0,
            postComments: post.comments || 0
          });
        });
      }
    });

    const filename = options.filename || this.generateFilename(profileMetadata, 'media');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'postId', title: 'Post ID' },
        { id: 'postType', title: 'Post Type' },
        { id: 'mediaType', title: 'Media Type' },
        { id: 'mediaUrl', title: 'Media URL' },
        { id: 'filename', title: 'Filename' },
        { id: 'postCaption', title: 'Post Caption' },
        { id: 'postDate', title: 'Post Date' },
        { id: 'postReactions', title: 'Post Reactions' },
        { id: 'postComments', title: 'Post Comments' }
      ]
    });

    await csvWriter.writeRecords(mediaData);
    this.logger.info(`Media CSV saved: ${outputPath}`);
    return outputPath;
  }

  async exportHashtagsToCsv(posts, profileMetadata, options = {}) {
    const hashtagStats = {};
    
    posts.forEach(post => {
      if (post.hashtags && post.hashtags.length > 0) {
        post.hashtags.forEach(hashtag => {
          if (!hashtagStats[hashtag]) {
            hashtagStats[hashtag] = {
              hashtag: hashtag,
              count: 0,
              totalReactions: 0,
              totalComments: 0,
              postIds: []
            };
          }
          hashtagStats[hashtag].count++;
          hashtagStats[hashtag].totalReactions += post.reactions || 0;
          hashtagStats[hashtag].totalComments += post.comments || 0;
          hashtagStats[hashtag].postIds.push(post.id);
        });
      }
    });

    const hashtagData = Object.values(hashtagStats)
      .map(stat => ({
        ...stat,
        avgReactions: Math.round(stat.totalReactions / stat.count),
        avgComments: Math.round(stat.totalComments / stat.count),
        postIds: stat.postIds.join('; ')
      }))
      .sort((a, b) => b.count - a.count);

    const filename = options.filename || this.generateFilename(profileMetadata, 'hashtags');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'hashtag', title: 'Hashtag' },
        { id: 'count', title: 'Usage Count' },
        { id: 'totalReactions', title: 'Total Reactions' },
        { id: 'totalComments', title: 'Total Comments' },
        { id: 'avgReactions', title: 'Avg Reactions' },
        { id: 'avgComments', title: 'Avg Comments' },
        { id: 'postIds', title: 'Post IDs' }
      ]
    });

    await csvWriter.writeRecords(hashtagData);
    this.logger.info(`Hashtags CSV saved: ${outputPath}`);
    return outputPath;
  }

  async exportEngagementToCsv(posts, profileMetadata, options = {}) {
    const sortedPosts = [...posts]
      .sort((a, b) => ((b.reactions || 0) + (b.comments || 0)) - ((a.reactions || 0) + (a.comments || 0)))
      .slice(0, options.topCount || 100);

    const engagementData = sortedPosts.map((post, index) => ({
      rank: index + 1,
      postId: post.id,
      postType: post.type,
      reactions: post.reactions || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
      totalEngagement: (post.reactions || 0) + (post.comments || 0) + (post.shares || 0),
      hasMedia: (post.mediaFiles && post.mediaFiles.length > 0) ? 'Yes' : 'No',
      hashtagCount: post.hashtags ? post.hashtags.length : 0,
      publishDate: this.formatDate(post.publishDate),
      captionPreview: this.cleanText(post.caption, 100),
      postUrl: post.url || ''
    }));

    const filename = options.filename || this.generateFilename(profileMetadata, 'engagement');
    const outputPath = path.join('./output', filename);

    await fs.mkdir('./output', { recursive: true });

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'rank', title: 'Rank' },
        { id: 'postId', title: 'Post ID' },
        { id: 'postType', title: 'Post Type' },
        { id: 'reactions', title: 'Reactions' },
        { id: 'comments', title: 'Comments' },
        { id: 'shares', title: 'Shares' },
        { id: 'totalEngagement', title: 'Total Engagement' },
        { id: 'hasMedia', title: 'Has Media' },
        { id: 'hashtagCount', title: 'Hashtag Count' },
        { id: 'publishDate', title: 'Publish Date' },
        { id: 'captionPreview', title: 'Caption Preview' },
        { id: 'postUrl', title: 'Post URL' }
      ]
    });

    await csvWriter.writeRecords(engagementData);
    this.logger.info(`Engagement CSV saved: ${outputPath}`);
    return outputPath;
  }

  transformPostsForCsv(posts, profileMetadata, fields) {
    return posts.map(post => {
      const csvRow = {};
      
      fields.forEach(field => {
        switch (field) {
          case 'id':
            csvRow.id = post.id;
            break;
          case 'type':
            csvRow.type = post.type;
            break;
          case 'author':
            csvRow.author = post.author?.name || profileMetadata.name;
            break;
          case 'authorProfile':
            csvRow.authorProfile = post.author?.profile || profileMetadata.url || '';
            break;
          case 'caption':
            csvRow.caption = this.cleanText(post.caption);
            break;
          case 'reactions':
            csvRow.reactions = post.reactions || 0;
            break;
          case 'comments':
            csvRow.comments = post.comments || 0;
            break;
          case 'shares':
            csvRow.shares = post.shares || 0;
            break;
          case 'publishDate':
            csvRow.publishDate = this.formatDate(post.publishDate);
            break;
          case 'url':
            csvRow.url = post.url || '';
            break;
          case 'mediaCount':
            csvRow.mediaCount = post.mediaFiles ? post.mediaFiles.length : 0;
            break;
          case 'mediaUrls':
            csvRow.mediaUrls = post.mediaFiles ? 
              post.mediaFiles.map(m => m.url).join('; ') : '';
            break;
          case 'hashtags':
            csvRow.hashtags = post.hashtags ? post.hashtags.join(', ') : '';
            break;
          case 'mentions':
            csvRow.mentions = post.mentions ? post.mentions.join(', ') : '';
            break;
          case 'engagementScore':
            csvRow.engagementScore = post.engagement?.score || 0;
            break;
          case 'engagementRate':
            csvRow.engagementRate = post.engagement?.rate || 0;
            break;
          case 'totalEngagement':
            csvRow.totalEngagement = (post.reactions || 0) + (post.comments || 0) + (post.shares || 0);
            break;
        }
      });
      
      return csvRow;
    });
  }

  buildCsvHeader(fields) {
    const fieldTitles = {
      id: 'Post ID',
      type: 'Post Type',
      author: 'Author',
      authorProfile: 'Author Profile',
      caption: 'Caption',
      reactions: 'Reactions',
      comments: 'Comments',
      shares: 'Shares',
      publishDate: 'Publish Date',
      url: 'Post URL',
      mediaCount: 'Media Count',
      mediaUrls: 'Media URLs',
      hashtags: 'Hashtags',
      mentions: 'Mentions',
      engagementScore: 'Engagement Score',
      engagementRate: 'Engagement Rate',
      totalEngagement: 'Total Engagement'
    };

    return fields.map(field => ({
      id: field,
      title: fieldTitles[field] || field.charAt(0).toUpperCase() + field.slice(1)
    }));
  }

  getDefaultFields() {
    return [
      'id', 'type', 'author', 'caption', 'reactions', 
      'comments', 'shares', 'publishDate', 'url', 
      'mediaCount', 'hashtags', 'totalEngagement'
    ];
  }

  cleanText(text, maxLength = 1000) {
    if (!text) return '';
    
    // Remove newlines and excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Remove or escape CSV-problematic characters
    cleaned = cleaned.replace(/"/g, '""'); // Escape quotes
    
    // Truncate if necessary
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }
    
    return cleaned;
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (error) {
      return dateString;
    }
  }

  generateFilename(profileMetadata, suffix = '') {
    const name = profileMetadata.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'profile';
    const date = new Date().toISOString().split('T')[0];
    const suffixPart = suffix ? `_${suffix}` : '';
    return `linkedin_${name}${suffixPart}_${date}.csv`;
  }
}