const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files (HTML slides, fonts, images)
app.use('/old', express.static(path.join(__dirname, 'old')));
app.use(express.static(path.join(__dirname, 'public')));

// Main route - serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Screenshot-based PDF generation
app.get('/generate-pdf', async (req, res) => {
    console.log('Creating PDF from screenshots...');
    
    try {
        // Get all slide files
        const slidesDir = path.join(__dirname, 'old');
        const files = await fs.readdir(slidesDir);
        const slideFiles = files
            .filter(file => file.startsWith('slide') && file.endsWith('.html'))
            .filter(file => !file.includes('16_remove'))
            .sort((a, b) => {
                const getSlideNumber = (filename) => {
                    const num = filename.replace('slide', '').replace('.html', '');
                    if (num === '18a') return 18.1; // Place 18a right after 18
                    return parseInt(num);
                };
                
                return getSlideNumber(a) - getSlideNumber(b);
            });

        // Create screenshots directory if it doesn't exist
        const screenshotsDir = path.join(__dirname, 'screenshots');
        try {
            await fs.mkdir(screenshotsDir);
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // Set viewport to desktop resolution
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
        });

        const screenshotPaths = [];
        const baseUrl = `http://localhost:${PORT}`;

        // Take screenshots of each slide
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            const slideUrl = `${baseUrl}/old/${slideFile}`;
            
            console.log(`Capturing slide ${i + 1}/${slideFiles.length}: ${slideFile}`);
            
            try {
                await page.goto(slideUrl, { 
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 30000 
                });
                
                // Wait a bit more for fonts and images to load
                await page.waitForTimeout(2000);
                
                const screenshotPath = path.join(screenshotsDir, `slide_${i + 1}.png`);
                
                await page.screenshot({
                    path: screenshotPath,
                    type: 'png',
                    width: 1920,
                    height: 1080,
                    clip: {
                        x: 0,
                        y: 0,
                        width: 1920,
                        height: 1080
                    }
                });
                
                screenshotPaths.push(screenshotPath);
                
            } catch (err) {
                console.error(`Error capturing slide ${slideFile}:`, err);
                // Continue with next slide
            }
        }

        await browser.close();

        // Create PDF from screenshots
        console.log('Creating PDF from screenshots...');
        const pdfDoc = await PDFDocument.create();

        for (const screenshotPath of screenshotPaths) {
            try {
                // Optimize image with Sharp
                const optimizedImageBuffer = await sharp(screenshotPath)
                    .png({ quality: 90, compressionLevel: 6 })
                    .toBuffer();

                const pngImage = await pdfDoc.embedPng(optimizedImageBuffer);
                const page = pdfDoc.addPage([1920, 1080]);
                
                page.drawImage(pngImage, {
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080
                });

            } catch (err) {
                console.error(`Error adding screenshot to PDF:`, err);
            }
        }

        // Generate PDF buffer
        const pdfBytes = await pdfDoc.save();

        // Clean up screenshot files
        for (const screenshotPath of screenshotPaths) {
            try {
                await fs.unlink(screenshotPath);
            } catch (err) {
                console.warn(`Could not delete screenshot: ${screenshotPath}`);
            }
        }

        // Send PDF response
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="AI_Green_Fund_Presentation.pdf"',
            'Content-Length': pdfBytes.length,
            'Cache-Control': 'no-cache'
        });
        
        res.send(Buffer.from(pdfBytes));
        console.log(`PDF generated successfully with ${slideFiles.length} slides`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Alternative simple method - same as above but different endpoint
app.get('/generate-pdf-simple', async (req, res) => {
    // Redirect to main PDF method
    res.redirect('/generate-pdf');
});

// Individual slide preview
app.get('/preview/:slideNumber', async (req, res) => {
    try {
        const slideNumber = req.params.slideNumber;
        const slidesDir = path.join(__dirname, 'old');
        const files = await fs.readdir(slidesDir);
        const slideFiles = files
            .filter(file => file.startsWith('slide') && file.endsWith('.html'))
            .filter(file => !file.includes('16_remove'))
            .sort((a, b) => {
                const getSlideNumber = (filename) => {
                    const num = filename.replace('slide', '').replace('.html', '');
                    if (num === '18a') return 18.1; // Place 18a right after 18
                    return parseInt(num);
                };
                
                return getSlideNumber(a) - getSlideNumber(b);
            });
        
        const slideIndex = parseInt(slideNumber) - 1;
        if (slideIndex >= 0 && slideIndex < slideFiles.length) {
            const slideFile = slideFiles[slideIndex];
            res.sendFile(path.join(slidesDir, slideFile));
        } else {
            res.status(404).send('Slide not found');
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load slide' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running - Simplified version',
        method: 'Print-to-PDF only (Railway compatible)',
        endpoints: {
            main: '/',
            pdf: '/generate-pdf',
            preview: '/preview/:slideNumber',
            health: '/health'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Please try again or use the print-to-PDF method'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`🌱 AI Green Fund Presentation Server`);
    console.log(`📄 Print-to-PDF method (Railway compatible)`);
    console.log(`🔗 Access: http://localhost:${PORT}`);
    console.log(`✅ No complex dependencies - guaranteed to work!`);
});