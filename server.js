const express = require('express');
const { chromium } = require('playwright-core');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

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

// PDF generation endpoint using Playwright (Railway compatible)
app.get('/generate-pdf', async (req, res) => {
    console.log('Starting PDF generation with Playwright...');
    
    let browser;
    try {
        // Launch browser with Railway-compatible settings
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--no-first-run'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 2
        });

        // Get all slide files
        const slidesDir = path.join(__dirname, 'old');
        const files = await fs.readdir(slidesDir);
        const slideFiles = files
            .filter(file => file.startsWith('slide') && file.endsWith('.html'))
            .filter(file => !file.includes('16_remove'))
            .sort((a, b) => {
                const numA = a.replace('slide', '').replace('.html', '');
                const numB = b.replace('slide', '').replace('.html', '');
                
                if (numA === '18a') return 18.5;
                if (numB === '18a') return -18.5;
                
                return parseInt(numA) - parseInt(numB);
            });

        console.log(`Found ${slideFiles.length} slides to process`);

        // Generate PDFs for each slide
        const pdfBuffers = [];
        const page = await context.newPage();

        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            console.log(`Processing slide ${i + 1}/${slideFiles.length}: ${slideFile}`);
            
            try {
                const slideUrl = `file://${path.join(slidesDir, slideFile)}`;
                
                // Navigate to slide
                await page.goto(slideUrl, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });

                // Wait for fonts and images to load
                await page.waitForTimeout(2000);

                // Generate PDF for this slide
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    landscape: true,
                    printBackground: true,
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    preferCSSPageSize: false,
                    scale: 1
                });

                pdfBuffers.push(pdfBuffer);
                console.log(`  ✓ Generated ${slideFile}`);

            } catch (error) {
                console.error(`  ✗ Failed ${slideFile}:`, error.message);
                // Continue with other slides
            }
        }

        await browser.close();

        if (pdfBuffers.length === 0) {
            throw new Error('No PDFs were generated successfully');
        }

        console.log(`Merging ${pdfBuffers.length} PDFs...`);

        // Merge all PDFs using pdf-lib
        const mergedPdf = await PDFDocument.create();

        for (const pdfBuffer of pdfBuffers) {
            try {
                const pdf = await PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (error) {
                console.warn('Warning: Could not merge one PDF:', error.message);
            }
        }

        const finalPdfBytes = await mergedPdf.save();

        console.log('PDF generation completed successfully');

        // Send PDF to client
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="AI_Green_Fund_Presentation.pdf"',
            'Content-Length': finalPdfBytes.length
        });
        
        res.send(Buffer.from(finalPdfBytes));

    } catch (error) {
        console.error('Error generating PDF:', error);
        
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Alternative: Fast single-page PDF method
app.get('/generate-pdf-fast', async (req, res) => {
    console.log('Starting fast PDF generation...');
    
    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        // Create combined HTML
        const combinedHtml = await createCombinedHTML();
        
        // Create a data URL from the HTML
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(combinedHtml)}`;
        
        await page.goto(dataUrl, { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });

        // Wait for everything to load
        await page.waitForTimeout(3000);

        // Generate single PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });

        await browser.close();

        console.log('Fast PDF generation completed');

        // Send PDF
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="AI_Green_Fund_Presentation.pdf"',
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error in fast PDF generation:', error);
        
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Helper function to create combined HTML
async function createCombinedHTML() {
    const slidesDir = path.join(__dirname, 'old');
    const files = await fs.readdir(slidesDir);
    const slideFiles = files
        .filter(file => file.startsWith('slide') && file.endsWith('.html'))
        .filter(file => !file.includes('16_remove'))
        .sort((a, b) => {
            const numA = a.replace('slide', '').replace('.html', '');
            const numB = b.replace('slide', '').replace('.html', '');
            
            if (numA === '18a') return 18.5;
            if (numB === '18a') return -18.5;
            
            return parseInt(numA) - parseInt(numB);
        });

    let combinedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Green Fund - Complete Presentation</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 0;
        }
        
        body {
            margin: 0;
            padding: 0;
        }
        
        .slide-page {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
        }
        
        .slide-page:last-child {
            page-break-after: auto;
        }
        
        .slide-content {
            width: 1920px;
            height: 1080px;
            transform: scale(0.15);
            transform-origin: center;
        }

        /* Include all font-face declarations */
        @font-face {
            font-family: 'ABC Arizona Flare';
            src: url('data:font/woff2;base64,') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Medium';
            src: url('data:font/woff2;base64,') format('woff2');
            font-weight: 500;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Light';
            src: url('data:font/woff2;base64,') format('woff2');
            font-weight: 300;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Sans';
            src: url('data:font/woff2;base64,') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
        
        /* Color variables */
        :root {
            --color-dark-earth: #342e29;
            --color-rich-red: #86312b;
            --color-forest-green: #344736;
            --color-deep-blue: #002140;
            --color-dark-brown: #4b3c35;
            --color-burnt-red: #9e3430;
            --color-olive-green: #415c43;
            --color-dark-blue-secondary: #00385e;
            --color-warm-yellow: #ffc083;
            --color-coral: #ff774a;
            --color-soft-green: #b8dc99;
            --color-light-blue: #b0ddf1;
            --color-black: #000000;
            --color-charcoal: #51514d;
            --color-soft-gray: #e7e4df;
            --color-off-white: #fdfbf7;
        }
    </style>
</head>
<body>
`;

    // Read first slide to extract common CSS
    try {
        const firstSlide = await fs.readFile(path.join(slidesDir, slideFiles[0]), 'utf8');
        const styleMatch = firstSlide.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) {
            combinedHTML = combinedHTML.replace('</style>', styleMatch[1] + '\n</style>');
        }
    } catch (error) {
        console.warn('Could not extract CSS from first slide');
    }

    // Add each slide content
    for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        try {
            const slideContent = await fs.readFile(path.join(slidesDir, slideFile), 'utf8');
            
            // Extract body content from slide
            const bodyMatch = slideContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                combinedHTML += `
    <div class="slide-page">
        <div class="slide-content">
            ${bodyMatch[1]}
        </div>
    </div>
`;
            }
        } catch (error) {
            console.warn(`Warning: Could not read ${slideFile}:`, error.message);
        }
    }

    combinedHTML += `
</body>
</html>`;

    return combinedHTML;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running with Playwright' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using Playwright for PDF generation`);
    console.log(`Access the application at http://localhost:${PORT}`);
});