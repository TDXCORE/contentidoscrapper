#!/usr/bin/env node

// Simple test to verify Actor structure and imports
import { Logger } from './src/utils/logger.js';
import { LinkedInScraper } from './src/core/scraper.js';
import { ExportManager } from './src/exporters/export-manager.js';

const logger = new Logger('ActorTest');

async function testActorStructure() {
  try {
    logger.info('Testing Actor structure and imports...');

    // Test logger
    logger.info('✅ Logger works');

    // Test scraper initialization
    const scraper = new LinkedInScraper({
      headless: true,
      maxPosts: 5
    });
    logger.info('✅ LinkedInScraper initialized');

    // Test export manager
    const exportManager = new ExportManager();
    logger.info('✅ ExportManager initialized');

    // Test scraper methods exist
    if (typeof scraper.initialize !== 'function') {
      throw new Error('scraper.initialize is not a function');
    }
    if (typeof scraper.export !== 'function') {
      throw new Error('scraper.export is not a function');
    }
    logger.info('✅ Scraper methods exist');

    // Test export manager methods
    if (typeof exportManager.export !== 'function') {
      throw new Error('exportManager.export is not a function');
    }
    logger.info('✅ Export manager methods exist');

    logger.info('🎉 All Actor structure tests passed!');
    return true;

  } catch (error) {
    logger.error('❌ Actor structure test failed:', error.message);
    console.error(error);
    return false;
  }
}

async function testApifyCompatibility() {
  try {
    logger.info('Testing Apify compatibility...');

    // Try to import Apify (won't work without installation, but will test the import)
    try {
      const { Actor } = await import('apify');
      logger.info('✅ Apify SDK import successful');
    } catch (error) {
      logger.warn('⚠️  Apify SDK not installed locally (expected in development)');
    }

    // Test input schema exists
    const fs = await import('fs/promises');
    try {
      await fs.access('./input_schema.json');
      logger.info('✅ input_schema.json exists');
    } catch (error) {
      throw new Error('input_schema.json is missing');
    }

    // Test actor.json exists
    try {
      await fs.access('./actor.json');
      logger.info('✅ actor.json exists');
    } catch (error) {
      throw new Error('actor.json is missing');
    }

    // Test main.js exists
    try {
      await fs.access('./src/main.js');
      logger.info('✅ src/main.js exists');
    } catch (error) {
      throw new Error('src/main.js is missing');
    }

    logger.info('🎉 Apify compatibility tests passed!');
    return true;

  } catch (error) {
    logger.error('❌ Apify compatibility test failed:', error.message);
    console.error(error);
    return false;
  }
}

// Run tests
async function runTests() {
  try {
    const structureTest = await testActorStructure();
    const compatibilityTest = await testApifyCompatibility();
    
    if (structureTest && compatibilityTest) {
      logger.info('🏆 All Actor tests passed! Ready for Apify deployment.');
      process.exit(0);
    } else {
      logger.error('❌ Some tests failed.');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testActorStructure, testApifyCompatibility };