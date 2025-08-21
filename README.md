# AI Green Fund Presentation - PDF Export Service

A web service that converts HTML presentation slides to high-quality PDF format while preserving design integrity.

## Features

- 🎨 **Design Preservation**: Maintains fonts, colors, and layout quality
- 📄 **Complete PDF Export**: All 26 slides in one downloadable PDF
- ⚡ **Fast Generation**: Optimized for quick PDF creation
- 🌐 **Web Interface**: Simple one-click download button
- 🚀 **Railway Ready**: Configured for easy deployment

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Server**
   ```bash
   npm start
   ```

3. **Access Application**
   ```
   http://localhost:3000
   ```

## Railway Deployment

1. **Connect Repository**
   - Link this GitHub repository to Railway
   - Railway will auto-detect Node.js project

2. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   ```

3. **Deploy**
   - Railway will automatically build and deploy
   - Uses `railway.json` configuration

## API Endpoints

- `GET /` - Main web interface
- `GET /generate-pdf` - Generate and download PDF
- `GET /health` - Health check
- `GET /old/{slide}.html` - Individual slide access

## Technical Details

### PDF Generation
- Uses Puppeteer for HTML rendering
- High-resolution output (1920x1080)
- Preserves CSS styling and fonts
- Optimized for print quality

### File Structure
```
├── server.js           # Express server
├── public/
│   └── index.html     # Frontend interface
├── old/               # HTML slides
│   ├── slide1.html
│   ├── slide2.html
│   └── ...
├── package.json       # Dependencies
└── railway.json       # Railway config
```

### Dependencies
- `express` - Web server
- `puppeteer` - HTML to PDF conversion
- `pdf-lib` - PDF manipulation
- `cors` - Cross-origin requests

## Performance

- **PDF Size**: ~5-8MB for complete presentation
- **Generation Time**: 10-30 seconds depending on server
- **Memory Usage**: ~200MB during generation

## Railway Optimization

The service is optimized for Railway deployment:
- Minimal memory footprint
- Fast startup time
- Graceful error handling
- Health check endpoint

## Usage

1. Visit the deployed URL
2. Click "Generate & Download PDF"
3. Wait for processing (progress indicator shown)
4. PDF downloads automatically

## Troubleshooting

**PDF Generation Fails**
- Check server logs for Puppeteer errors
- Ensure sufficient memory allocation
- Verify all slide files are accessible

**Slow Performance**
- Railway cold starts may cause initial delay
- PDF generation is CPU intensive
- Consider upgrading Railway plan for better performance

## Development Notes

- Font files must be accessible via static serving
- Image paths should be relative to slide files
- CSS print styles are respected in PDF output
- Puppeteer requires specific flags for Railway environment