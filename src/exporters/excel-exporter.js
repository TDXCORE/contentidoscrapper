import ExcelJS from 'exceljs';
import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';

export class ExcelExporter {
  constructor() {
    this.logger = new Logger('ExcelExporter');
    this.workbook = null;
  }

  async exportToExcel(posts, profileMetadata, filename) {
    try {
      this.logger.info(`Generating Excel report for ${posts.length} posts`);

      this.workbook = new ExcelJS.Workbook();
      this.workbook.creator = 'LinkedIn Content Extractor';
      this.workbook.created = new Date();

      await this.createPostsWorksheet(posts, profileMetadata);
      await this.createSummaryWorksheet(posts, profileMetadata);
      await this.createEngagementWorksheet(posts);

      const outputFilename = filename || this.generateFilename(profileMetadata);
      const outputPath = path.join('./output', outputFilename);

      await fs.mkdir('./output', { recursive: true });
      await this.workbook.xlsx.writeFile(outputPath);
      
      this.logger.info(`Excel report saved: ${outputPath}`);
      return outputPath;

    } catch (error) {
      this.logger.error('Failed to create Excel report:', error.message);
      throw error;
    }
  }

  async createPostsWorksheet(posts, profileMetadata) {
    const worksheet = this.workbook.addWorksheet('Posts Data');

    worksheet.columns = [
      { header: 'Post ID', key: 'id', width: 20 },
      { header: 'Post Type', key: 'type', width: 12 },
      { header: 'Author', key: 'author', width: 25 },
      { header: 'Caption', key: 'caption', width: 60 },
      { header: 'Reactions', key: 'reactions', width: 12 },
      { header: 'Comments', key: 'comments', width: 12 },
      { header: 'Shares', key: 'shares', width: 12 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'URL', key: 'url', width: 40 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };

    posts.forEach(post => {
      worksheet.addRow({
        id: post.id,
        type: post.type,
        author: post.author?.name || profileMetadata.name,
        caption: this.truncateText(post.caption, 500),
        reactions: post.reactions || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        date: this.formatDate(post.publishDate),
        url: post.url
      });
    });

    worksheet.autoFilter = { from: 'A1', to: `I${posts.length + 1}` };
  }

  async createSummaryWorksheet(posts, profileMetadata) {
    const worksheet = this.workbook.addWorksheet('Summary');

    worksheet.addRow(['Profile Summary']).font = { bold: true, size: 16 };
    worksheet.addRow([]);
    worksheet.addRow(['Profile Name:', profileMetadata.name]);
    worksheet.addRow(['Total Posts:', posts.length]);
    worksheet.addRow(['Total Reactions:', posts.reduce((sum, p) => sum + (p.reactions || 0), 0)]);
    worksheet.addRow(['Total Comments:', posts.reduce((sum, p) => sum + (p.comments || 0), 0)]);
    worksheet.addRow(['Scraped At:', new Date().toLocaleString()]);

    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 30;
  }

  async createEngagementWorksheet(posts) {
    const worksheet = this.workbook.addWorksheet('Top Posts');

    const sortedPosts = [...posts].sort((a, b) => 
      ((b.reactions || 0) + (b.comments || 0)) - ((a.reactions || 0) + (a.comments || 0))
    );

    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Post ID', key: 'id', width: 20 },
      { header: 'Total Engagement', key: 'engagement', width: 18 },
      { header: 'Caption Preview', key: 'preview', width: 40 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B35' } };

    sortedPosts.slice(0, 50).forEach((post, index) => {
      worksheet.addRow({
        rank: index + 1,
        id: post.id,
        engagement: (post.reactions || 0) + (post.comments || 0),
        preview: this.truncateText(post.caption, 50)
      });
    });
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  generateFilename(profileMetadata) {
    const name = profileMetadata.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'profile';
    const date = new Date().toISOString().split('T')[0];
    return `linkedin_${name}_${date}.xlsx`;
  }
}