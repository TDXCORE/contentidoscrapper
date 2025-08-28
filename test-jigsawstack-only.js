import { JigsawStackFallback } from './src/services/jigsawstack-fallback.js';

async function testJigsawStackOnly() {
    console.log('🧩 Testing JigsawStack LinkedIn Scraping Only...\n');
    
    const jigsawStack = new JigsawStackFallback({
        apiKey: process.env.JIGSAWSTACK_API_KEY // Set this in your environment
    });

    try {
        // Test connection first
        console.log('🔗 Testing JigsawStack connection...');
        const connectionTest = await jigsawStack.testConnection();
        
        if (!connectionTest) {
            throw new Error('JigsawStack connection test failed. Check your API key.');
        }
        
        console.log('✅ JigsawStack connection successful!\n');
        
        // Test LinkedIn profile scraping
        const profileUrl = 'https://www.linkedin.com/in/satyanadella/';
        console.log(`📊 Scraping LinkedIn profile with JigsawStack: ${profileUrl}`);
        
        const result = await jigsawStack.scrapeLinkedInProfile(profileUrl);
        
        if (result.success) {
            console.log('\n🎉 JigsawStack LinkedIn scraping successful!');
            console.log(`📝 Profile: ${result.profileMetadata.name}`);
            console.log(`🏢 Company: ${result.profileMetadata.company}`);
            console.log(`💼 Title: ${result.profileMetadata.jobTitle}`);
            console.log(`📍 Location: ${result.profileMetadata.location}`);
            console.log(`📊 Posts extracted: ${result.posts.length}`);
            console.log(`👥 Connections: ${result.profileMetadata.connections}`);
            console.log(`👥 Followers: ${result.profileMetadata.followers}`);
            
            if (result.posts.length > 0) {
                console.log('\n📄 Sample post data:');
                const firstPost = result.posts[0];
                console.log(`- Content: ${(firstPost.content || 'No content').substring(0, 100)}...`);
                console.log(`- Date: ${firstPost.publishDate || 'Unknown'}`);
                console.log(`- Reactions: ${firstPost.reactions || 0}`);
                console.log(`- Comments: ${firstPost.comments || 0}`);
                console.log(`- Shares: ${firstPost.shares || 0}`);
                console.log(`- Hashtags: ${firstPost.hashtags?.length || 0}`);
            }
            
            console.log(`\n🔧 Scraped via: ${result.source}`);
            console.log(`⏰ Scraped at: ${result.profileMetadata.scrapedAt}`);
            
        } else {
            console.error('❌ JigsawStack scraping failed:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 To fix this:');
            console.log('1. Sign up at https://jigsawstack.com/dashboard');
            console.log('2. Get your API key');
            console.log('3. Set environment variable: JIGSAWSTACK_API_KEY=your_key_here');
            console.log('4. Or pass it directly in the constructor');
        }
    }
}

// Check if API key is provided
if (!process.env.JIGSAWSTACK_API_KEY) {
    console.log('⚠️  JIGSAWSTACK_API_KEY not found in environment variables');
    console.log('Please set your API key to test JigsawStack functionality');
    console.log('Example: export JIGSAWSTACK_API_KEY=js_your_api_key_here');
    process.exit(1);
}

// Run the test
testJigsawStackOnly().catch(console.error);