import { LinkedInScraper } from './src/core/scraper.js';

async function testEnhancedScraper() {
    console.log('🚀 Testing enhanced LinkedIn scraper with authentication...\n');
    
    const scraper = new LinkedInScraper({
        headless: false, // Show browser for debugging
        timeout: 45000,
        delay: 3000,
        maxRetries: 5,
        maxPosts: 10,
        antiDetection: true
    });

    try {
        // Initialize browser
        console.log('📱 Initializing browser...');
        await scraper.initialize();
        
        // Login with provided credentials
        console.log('🔐 Attempting LinkedIn login...');
        await scraper.login({
            email: 'freddyrincones@gmail.com',
            password: '050986Fers*.'
        });
        
        console.log('✅ Login successful! Now testing profile scraping...');
        
        // Test with a sample profile
        const profileUrl = 'https://www.linkedin.com/in/satyanadella/';
        console.log(`📊 Scraping profile: ${profileUrl}`);
        
        const posts = await scraper.scrapeProfile(profileUrl);
        
        console.log(`\n📈 Scraping Results:`);
        console.log(`- Posts extracted: ${posts.length}`);
        console.log(`- Authentication status: ${scraper.getScrapedData().summary.isAuthenticated}`);
        
        if (posts.length > 0) {
            console.log(`\n📝 Sample post data:`);
            console.log(`- First post: ${posts[0].content?.substring(0, 100) || 'No content'}...`);
            console.log(`- Published: ${posts[0].publishDate || 'Unknown'}`);
            console.log(`- Reactions: ${posts[0].reactions || 0}`);
        }
        
        console.log('\n✅ Enhanced scraper test completed successfully!');
        
    } catch (error) {
        console.error('❌ Enhanced scraper test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await scraper.close();
        console.log('🔐 Browser closed');
    }
}

// Run the test
testEnhancedScraper().catch(console.error);