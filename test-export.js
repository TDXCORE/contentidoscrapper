#!/usr/bin/env node

import { ExportManager } from './src/exporters/export-manager.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger('ExportTest');

// Sample test data
const samplePosts = [
  {
    id: 'post_1',
    type: 'article',
    caption: 'This is a sample LinkedIn post about technology trends and innovation in 2024.',
    author: {
      name: 'John Doe',
      profile: 'https://linkedin.com/in/johndoe',
      title: 'Senior Software Engineer'
    },
    reactions: 150,
    comments: 25,
    shares: 12,
    publishDate: '2024-01-15T10:30:00Z',
    url: 'https://linkedin.com/posts/johndoe_tech-trends-post',
    mediaFiles: [
      {
        type: 'image',
        url: 'https://example.com/image1.jpg',
        filename: 'tech-trends.jpg'
      }
    ],
    hashtags: ['#technology', '#innovation', '#2024trends'],
    mentions: ['@linkedin', '@microsoft'],
    engagement: {
      score: 187,
      rate: 0.15
    }
  },
  {
    id: 'post_2',
    type: 'video',
    caption: 'Excited to share our latest project milestone! 🚀',
    author: {
      name: 'Jane Smith',
      profile: 'https://linkedin.com/in/janesmith',
      title: 'Product Manager'
    },
    reactions: 89,
    comments: 15,
    shares: 8,
    publishDate: '2024-01-10T14:20:00Z',
    url: 'https://linkedin.com/posts/janesmith_project-milestone',
    mediaFiles: [
      {
        type: 'video',
        url: 'https://example.com/video1.mp4',
        filename: 'milestone-video.mp4'
      }
    ],
    hashtags: ['#project', '#milestone', '#teamwork'],
    mentions: ['@company'],
    engagement: {
      score: 112,
      rate: 0.12
    }
  }
];

const sampleProfileMetadata = {
  name: 'Test Profile',
  url: 'https://linkedin.com/in/testprofile',
  headline: 'Software Engineer | Tech Enthusiast',
  location: 'San Francisco, CA',
  industry: 'Information Technology',
  followers: 5000,
  connections: 500,
  scrapedAt: new Date().toISOString()
};

async function testExportFormats() {
  const exportManager = new ExportManager();
  
  try {
    logger.info('Starting export format tests...');

    // Test Excel export
    logger.info('Testing Excel export...');
    const excelResult = await exportManager.export(samplePosts, sampleProfileMetadata, {
      format: 'excel',
      filename: 'test-export.xlsx'
    });
    logger.info(`Excel export completed: ${excelResult.excel}`);

    // Test CSV export
    logger.info('Testing CSV export...');
    const csvResult = await exportManager.export(samplePosts, sampleProfileMetadata, {
      format: 'csv',
      filename: 'test-export.csv'
    });
    logger.info(`CSV export completed: ${csvResult.csv}`);

    // Test JSON export
    logger.info('Testing JSON export...');
    const jsonResult = await exportManager.export(samplePosts, sampleProfileMetadata, {
      format: 'json',
      filename: 'test-export.json'
    });
    logger.info(`JSON export completed: ${jsonResult.json}`);

    // Test all formats
    logger.info('Testing all formats export...');
    const allResult = await exportManager.export(samplePosts, sampleProfileMetadata, {
      format: 'all'
    });
    logger.info('All formats export completed:', allResult);

    logger.info('All export tests completed successfully! ✅');

  } catch (error) {
    logger.error('Export test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function testSeparateFiles() {
  const exportManager = new ExportManager();
  
  try {
    logger.info('Testing separate files export...');

    const results = await exportManager.export(samplePosts, sampleProfileMetadata, {
      format: 'all',
      separateFiles: true
    });

    logger.info('Separate files export completed:', results);

  } catch (error) {
    logger.error('Separate files test failed:', error.message);
    console.error(error);
  }
}

// Run tests
async function runTests() {
  try {
    await testExportFormats();
    await testSeparateFiles();
    
    logger.info('🎉 All export tests passed!');
    
  } catch (error) {
    logger.error('Tests failed:', error.message);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}