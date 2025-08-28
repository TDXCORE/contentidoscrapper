# LinkedIn Content Extractor Actor

A comprehensive [Apify Actor](https://apify.com/actors) for extracting LinkedIn profile posts and generating detailed reports in multiple formats (Excel, CSV, JSON). This Actor scrapes LinkedIn profiles to collect post data, engagement metrics, media information, hashtags, and generates comprehensive analytics.

## Features

✅ **Complete Post Extraction** - Scrapes all posts from LinkedIn profiles including text, media, and metadata  
✅ **Engagement Analytics** - Tracks reactions, comments, shares, and calculates engagement rates  
✅ **Multiple Export Formats** - Excel (.xlsx), CSV (.csv), and JSON (.json) with rich formatting  
✅ **Media Analysis** - Extracts and analyzes images, videos, and other media files  
✅ **Hashtag Tracking** - Identifies and analyzes hashtag usage patterns  
✅ **Anti-Detection** - Uses stealth techniques and rate limiting to avoid detection  
✅ **Authenticated Scraping** - Supports LinkedIn login for enhanced data access  

## Included Components

- **[Apify SDK](https://docs.apify.com/sdk/js/)** for Node.js - Professional Actor development toolkit
- **[Puppeteer](https://puppeteer.dev/)** with stealth plugins - Advanced browser automation
- **[ExcelJS](https://github.com/exceljs/exceljs)** - Professional Excel report generation with charts and formatting
- **[Input Schema](https://docs.apify.com/platform/actors/development/input-schema)** - Comprehensive input validation
- **[Dataset](https://docs.apify.com/platform/storage/dataset)** - Structured data storage
- **Anti-Detection Suite** - Stealth plugins, rate limiting, and human-like behavior simulation

## How It Works

1. **Initialize**: Actor receives LinkedIn profile URL and configuration via input schema
2. **Authentication**: Optionally logs into LinkedIn for enhanced data access
3. **Navigation**: Navigates to profile and loads all available posts through intelligent scrolling
4. **Extraction**: Extracts comprehensive post data including:
   - Post content and metadata
   - Engagement metrics (reactions, comments, shares)
   - Media files (images, videos, documents)
   - Hashtags and mentions
   - Publication dates and post types
5. **Analysis**: Generates detailed analytics and insights
6. **Export**: Creates professional reports in multiple formats
7. **Storage**: Saves data to Apify dataset and key-value store

## Input Configuration

The Actor accepts the following input parameters:

### Required Parameters

- **Profile URL** (`profileUrl`): LinkedIn profile URL (e.g., `https://www.linkedin.com/in/username/`)

### Optional Parameters

- **LinkedIn Credentials**: Email and password for authenticated scraping (recommended for better data access)
- **Max Posts** (`maxPosts`): Maximum number of posts to scrape (default: unlimited)
- **Export Format** (`exportFormat`): Choose from Excel, CSV, JSON, or all formats
- **Include Options**: Control what data to include (media, engagement, hashtags, mentions)
- **Browser Settings**: Headless mode, delays, timeouts, and anti-detection settings

## Output Data

The Actor provides comprehensive data in multiple formats:

### Excel Report (.xlsx)
- **Posts Data Sheet**: Complete post information with professional formatting
- **Summary Sheet**: Profile overview and key statistics
- **Engagement Analysis**: Top-performing posts and engagement trends
- **Hashtag Analysis**: Usage statistics and performance metrics
- **Media Files**: Comprehensive media inventory

### CSV Export (.csv)
- Customizable field selection
- Option for separate files (posts, media, hashtags, engagement)
- Clean, analysis-ready data format

### JSON Export (.json)
- Structured data with complete metadata
- Rich analytics and insights
- Multiple output formats (full, posts-only, analytics, media-index)

### Dataset Output
- Structured data stored in Apify dataset
- Easy access via Apify API
- Integration-ready format

## Usage Examples

### Basic Profile Scraping
```json
{
  "profileUrl": "https://www.linkedin.com/in/example-profile",
  "maxPosts": 100,
  "exportFormat": "excel"
}
```

### Authenticated Scraping with All Formats
```json
{
  "profileUrl": "https://www.linkedin.com/in/example-profile",
  "email": "your-linkedin-email@example.com",
  "password": "your-password",
  "exportFormat": "all",
  "separateFiles": true,
  "includeMedia": true,
  "includeEngagement": true
}
```

### High-Volume Scraping
```json
{
  "profileUrl": "https://www.linkedin.com/in/example-profile",
  "maxPosts": 1000,
  "delay": 3000,
  "maxRetries": 5,
  "antiDetection": true,
  "exportFormat": "json"
}
```

## Data Schema

### Post Object
```json
{
  "id": "unique-post-identifier",
  "type": "article|video|image|carousel",
  "caption": "Post text content",
  "author": {
    "name": "Author Name",
    "profile": "Profile URL",
    "title": "Professional Title"
  },
  "engagement": {
    "reactions": 150,
    "comments": 25,
    "shares": 12,
    "score": 187,
    "rate": 0.15
  },
  "publishDate": "2024-01-15T10:30:00Z",
  "url": "Post URL",
  "mediaFiles": [...],
  "hashtags": ["#tag1", "#tag2"],
  "mentions": ["@user1", "@user2"]
}
```

## Best Practices

1. **Use Authentication**: Provide LinkedIn credentials for better data access and higher rate limits
2. **Respect Rate Limits**: Use appropriate delays (2000ms+) to avoid detection
3. **Monitor Resource Usage**: Large profiles may require significant memory and time
4. **Handle Errors**: The Actor includes retry mechanisms and error handling
5. **Data Privacy**: Ensure compliance with LinkedIn's terms of service and data privacy regulations

## Technical Architecture

The Actor is built with a modular architecture:

- **Core Scraper** (`src/core/scraper.js`): Main scraping orchestration
- **Browser Manager** (`src/core/browser-manager.js`): Puppeteer browser management with anti-detection
- **Content Extractor** (`src/core/content-extractor.js`): LinkedIn-specific data extraction
- **Export System** (`src/exporters/`): Multi-format export generation
- **Utilities** (`src/utils/`): Rate limiting, logging, and helper functions

## Limitations and Considerations

- **LinkedIn Terms of Service**: Ensure compliance with LinkedIn's terms of service
- **Rate Limiting**: LinkedIn may implement rate limits; the Actor includes respect mechanisms
- **Profile Accessibility**: Some profiles may have restricted access or require authentication
- **Data Completeness**: Results depend on profile visibility settings and LinkedIn's current UI
- **Resource Requirements**: Large profiles may require significant computational resources

## Support and Development

- Built for Apify platform compatibility
- Comprehensive error handling and logging
- Configurable for various use cases
- Regular updates for LinkedIn UI changes

For issues, feature requests, or customizations, please refer to the Actor's support channels on the Apify platform.