// Main entry point for the Apify Actor
import { Actor } from 'apify';
import { LinkedInScraper } from './core/scraper.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('Actor');

// Main Actor function
Actor.main(async () => {
    const input = await Actor.getInput();
    
    // Validate required inputs
    if (!input) {
        throw new Error('No input provided');
    }

    if (!input.profileUrl) {
        throw new Error('Profile URL is required');
    }

    // Validate LinkedIn profile URL format
    const linkedinUrlPattern = /^https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
    if (!linkedinUrlPattern.test(input.profileUrl)) {
        throw new Error('Invalid LinkedIn profile URL format');
    }

    logger.info('Starting LinkedIn profile scraping', {
        profileUrl: input.profileUrl,
        maxPosts: input.maxPosts || 'unlimited'
    });

    // Configure scraper options
    const scraperOptions = {
        headless: input.headless ?? true,
        maxPosts: input.maxPosts || null,
        delay: input.delay || 2000,
        maxRetries: input.maxRetries || 3,
        timeout: input.timeout || 30000,
        antiDetection: input.antiDetection ?? true
    };

    const scraper = new LinkedInScraper(scraperOptions);

    try {
        // Initialize the scraper
        await scraper.initialize();

        // Login if credentials are provided
        if (input.email && input.password) {
            logger.info('Logging into LinkedIn...');
            await scraper.login({
                email: input.email,
                password: input.password
            });
        } else {
            logger.warn('No LinkedIn credentials provided - scraping in anonymous mode (limited data)');
        }

        // Scrape the profile
        const posts = await scraper.scrapeProfile(input.profileUrl);
        
        logger.info(`Successfully scraped ${posts.length} posts`);

        // Get scraped data with metadata
        const scrapedData = scraper.getScrapedData();

        // Push basic data to Apify dataset
        await Actor.pushData({
            profileUrl: input.profileUrl,
            scrapedAt: new Date().toISOString(),
            totalPosts: posts.length,
            posts: posts.slice(0, 10), // First 10 posts for preview
            profileMetadata: scrapedData.metadata
        });

        // Export data in requested formats
        const exportOptions = {
            format: input.exportFormat || 'all',
            includeMedia: input.includeMedia ?? true,
            includeEngagement: input.includeEngagement ?? true,
            includeHashtags: input.includeHashtags ?? true,
            includeMentions: input.includeMentions ?? true,
            separateFiles: input.separateFiles ?? false
        };

        logger.info('Exporting scraped data...', exportOptions);
        const exportResults = await scraper.export(exportOptions);

        // Save export files to Apify key-value store
        for (const [format, filePath] of Object.entries(exportResults)) {
            if (typeof filePath === 'string') {
                // Single file
                await Actor.setValue(`export_${format}`, null, { contentType: 'application/octet-stream' });
                logger.info(`Saved ${format} export to key-value store`);
            } else if (typeof filePath === 'object') {
                // Multiple files
                for (const [subType, subFilePath] of Object.entries(filePath)) {
                    await Actor.setValue(`export_${format}_${subType}`, null, { contentType: 'application/octet-stream' });
                    logger.info(`Saved ${format}_${subType} export to key-value store`);
                }
            }
        }

        // Save summary statistics
        const summary = {
            profileUrl: input.profileUrl,
            profileName: scrapedData.metadata.name,
            totalPosts: posts.length,
            exportFormats: Object.keys(exportResults),
            scrapingDuration: Date.now() - Actor.getEnv().startedAt,
            completedAt: new Date().toISOString(),
            statistics: {
                totalReactions: posts.reduce((sum, post) => sum + (post.reactions || 0), 0),
                totalComments: posts.reduce((sum, post) => sum + (post.comments || 0), 0),
                totalShares: posts.reduce((sum, post) => sum + (post.shares || 0), 0),
                postsWithMedia: posts.filter(post => post.mediaFiles && post.mediaFiles.length > 0).length,
                uniqueHashtags: [...new Set(posts.flatMap(post => post.hashtags || []))].length,
                dateRange: {
                    earliest: posts.reduce((earliest, post) => {
                        if (!post.publishDate) return earliest;
                        const postDate = new Date(post.publishDate);
                        return !earliest || postDate < earliest ? postDate : earliest;
                    }, null),
                    latest: posts.reduce((latest, post) => {
                        if (!post.publishDate) return latest;
                        const postDate = new Date(post.publishDate);
                        return !latest || postDate > latest ? postDate : latest;
                    }, null)
                }
            }
        };

        await Actor.setValue('scraping_summary', summary);

        logger.info('LinkedIn scraping completed successfully', {
            totalPosts: posts.length,
            exportFormats: Object.keys(exportResults),
            profileName: scrapedData.metadata.name
        });

        // Final data push with complete results
        await Actor.pushData(summary);

    } catch (error) {
        logger.error('LinkedIn scraping failed:', error.message);
        
        // Push error data for debugging
        await Actor.pushData({
            error: true,
            message: error.message,
            stack: error.stack,
            profileUrl: input.profileUrl,
            failedAt: new Date().toISOString()
        });

        throw error;
    } finally {
        // Always close the scraper
        await scraper.close();
    }
});