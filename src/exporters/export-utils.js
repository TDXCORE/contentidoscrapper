import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

export class ExportUtils {
  static logger = new Logger('ExportUtils');

  /**
   * Validate export format
   */
  static validateFormat(format) {
    const validFormats = ['excel', 'csv', 'json', 'all'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(`Invalid export format: ${format}. Valid formats: ${validFormats.join(', ')}`);
    }
    return format.toLowerCase();
  }

  /**
   * Sanitize filename for different operating systems
   */
  static sanitizeFilename(filename) {
    // Remove or replace invalid characters for Windows/Linux/Mac
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 200); // Limit length
  }

  /**
   * Generate timestamp-based filename
   */
  static generateTimestampedFilename(prefix, extension, includeTime = false) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = includeTime ? '_' + now.toTimeString().split(' ')[0].replace(/:/g, '-') : '';
    return `${prefix}_${date}${time}.${extension}`;
  }

  /**
   * Ensure output directory exists
   */
  static async ensureOutputDirectory(outputPath = './output') {
    try {
      await fs.mkdir(outputPath, { recursive: true });
      this.logger.info(`Output directory ready: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to create output directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean and validate post data before export
   */
  static cleanPostData(posts) {
    if (!Array.isArray(posts)) {
      throw new Error('Posts data must be an array');
    }

    return posts.map((post, index) => {
      if (!post || typeof post !== 'object') {
        this.logger.warn(`Invalid post data at index ${index}, skipping`);
        return null;
      }

      return {
        id: post.id || `post_${index}`,
        type: post.type || 'unknown',
        caption: this.sanitizeText(post.caption),
        author: post.author ? {
          name: this.sanitizeText(post.author.name),
          profile: post.author.profile,
          title: this.sanitizeText(post.author.title)
        } : null,
        reactions: this.sanitizeNumber(post.reactions),
        comments: this.sanitizeNumber(post.comments),
        shares: this.sanitizeNumber(post.shares),
        publishDate: this.sanitizeDate(post.publishDate),
        url: post.url,
        mediaFiles: post.mediaFiles ? post.mediaFiles.map(media => ({
          type: media.type,
          url: media.url,
          filename: this.sanitizeFilename(media.filename || ''),
          size: this.sanitizeNumber(media.size),
          dimensions: media.dimensions
        })) : [],
        hashtags: Array.isArray(post.hashtags) ? post.hashtags.map(h => this.sanitizeText(h)) : [],
        mentions: Array.isArray(post.mentions) ? post.mentions.map(m => this.sanitizeText(m)) : [],
        engagement: post.engagement ? {
          score: this.sanitizeNumber(post.engagement.score),
          rate: this.sanitizeNumber(post.engagement.rate)
        } : { score: 0, rate: 0 },
        metadata: post.metadata || {}
      };
    }).filter(Boolean); // Remove null entries
  }

  /**
   * Clean and validate profile metadata
   */
  static cleanProfileMetadata(profileMetadata) {
    if (!profileMetadata || typeof profileMetadata !== 'object') {
      return {
        name: 'Unknown Profile',
        url: '',
        headline: '',
        location: '',
        industry: '',
        followers: 0,
        connections: 0,
        scrapedAt: new Date().toISOString()
      };
    }

    return {
      name: this.sanitizeText(profileMetadata.name) || 'Unknown Profile',
      url: profileMetadata.url || '',
      headline: this.sanitizeText(profileMetadata.headline) || '',
      location: this.sanitizeText(profileMetadata.location) || '',
      industry: this.sanitizeText(profileMetadata.industry) || '',
      followers: this.sanitizeNumber(profileMetadata.followers),
      connections: this.sanitizeNumber(profileMetadata.connections),
      scrapedAt: this.sanitizeDate(profileMetadata.scrapedAt) || new Date().toISOString()
    };
  }

  /**
   * Sanitize text content
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Sanitize and validate numbers
   */
  static sanitizeNumber(value) {
    if (typeof value === 'number' && !isNaN(value)) {
      return Math.max(0, Math.round(value));
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return 0;
  }

  /**
   * Sanitize and validate dates
   */
  static sanitizeDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate file size in human readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file info (size, creation date, etc.)
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      this.logger.error(`Failed to get file info for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Create export summary
   */
  static createExportSummary(exportResults, posts, profileMetadata, options = {}) {
    const summary = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        profile: profileMetadata.name,
        totalPosts: posts.length,
        exportOptions: options
      },
      files: [],
      stats: {
        totalFiles: 0,
        totalSize: 0,
        formats: {}
      }
    };

    // Process export results
    Object.entries(exportResults).forEach(([format, result]) => {
      if (typeof result === 'string') {
        // Single file result
        summary.files.push({
          format,
          path: result,
          filename: path.basename(result)
        });
        summary.stats.formats[format] = 1;
      } else if (typeof result === 'object') {
        // Multiple files result
        Object.entries(result).forEach(([subType, filePath]) => {
          summary.files.push({
            format: `${format}_${subType}`,
            path: filePath,
            filename: path.basename(filePath)
          });
          summary.stats.formats[format] = (summary.stats.formats[format] || 0) + 1;
        });
      }
    });

    summary.stats.totalFiles = summary.files.length;
    
    return summary;
  }

  /**
   * Save export summary to file
   */
  static async saveExportSummary(exportSummary, outputDir = './output') {
    try {
      const summaryPath = path.join(outputDir, 'export_summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(exportSummary, null, 2), 'utf8');
      this.logger.info(`Export summary saved: ${summaryPath}`);
      return summaryPath;
    } catch (error) {
      this.logger.error('Failed to save export summary:', error.message);
      throw error;
    }
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options = {}) {
    const defaultOptions = {
      format: 'all',
      includeMedia: true,
      includeEngagement: true,
      includeHashtags: true,
      includeMentions: true,
      minify: false,
      separateFiles: false,
      outputDir: './output'
    };

    const validatedOptions = { ...defaultOptions, ...options };

    // Validate format
    validatedOptions.format = this.validateFormat(validatedOptions.format);

    // Ensure boolean values
    ['includeMedia', 'includeEngagement', 'includeHashtags', 'includeMentions', 'minify', 'separateFiles']
      .forEach(key => {
        validatedOptions[key] = Boolean(validatedOptions[key]);
      });

    // Validate output directory
    if (!validatedOptions.outputDir || typeof validatedOptions.outputDir !== 'string') {
      validatedOptions.outputDir = './output';
    }

    return validatedOptions;
  }

  /**
   * Progress tracking utility
   */
  static createProgressTracker(total, label = 'Progress') {
    let current = 0;
    let lastReported = 0;
    
    return {
      increment: () => {
        current++;
        const percentage = Math.floor((current / total) * 100);
        
        // Report every 10% or at the end
        if (percentage >= lastReported + 10 || current === total) {
          this.logger.info(`${label}: ${current}/${total} (${percentage}%)`);
          lastReported = percentage;
        }
      },
      getCurrentProgress: () => ({
        current,
        total,
        percentage: Math.floor((current / total) * 100)
      })
    };
  }

  /**
   * Batch process posts for large datasets
   */
  static async batchProcess(posts, batchSize = 100, processingFn) {
    const results = [];
    const progress = this.createProgressTracker(posts.length, 'Processing posts');
    
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      const batchResults = await processingFn(batch, i);
      results.push(...batchResults);
      
      // Update progress
      for (let j = 0; j < batch.length; j++) {
        progress.increment();
      }
    }
    
    return results;
  }

  /**
   * Check if file exists and get alternative name if needed
   */
  static async getUniqueFilename(filePath) {
    let counter = 1;
    let uniquePath = filePath;
    
    try {
      while (await fs.access(uniquePath).then(() => true).catch(() => false)) {
        const parsedPath = path.parse(filePath);
        uniquePath = path.join(
          parsedPath.dir,
          `${parsedPath.name}_${counter}${parsedPath.ext}`
        );
        counter++;
      }
      
      return uniquePath;
    } catch (error) {
      return filePath;
    }
  }

  /**
   * Create backup of existing file
   */
  static async createBackup(filePath) {
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!exists) return null;
      
      const parsedPath = path.parse(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}_backup_${timestamp}${parsedPath.ext}`
      );
      
      await fs.copyFile(filePath, backupPath);
      this.logger.info(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error(`Failed to create backup for ${filePath}:`, error.message);
      return null;
    }
  }
}