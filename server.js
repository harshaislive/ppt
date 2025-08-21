const express = require('express');
const chromeLambda = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
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

// Get browser instance optimized for Railway/serverless
async function getBrowser() {
    let browser;
    
    try {
        // Try chrome-aws-lambda first (works on most cloud platforms)
        browser = await puppeteer.launch({
            args: chromeLambda.args,
            defaultViewport: chromeLambda.defaultViewport,
            executablePath: await chromeLambda.executablePath,
            headless: chromeLambda.headless,
            ignoreHTTPSErrors: true,
        });
        console.log('Using chrome-aws-lambda browser');
        return browser;
    } catch (error) {
        console.log('chrome-aws-lambda failed, trying puppeteer-core...');
    }
    
    try {
        // Fallback to puppeteer-core with system Chrome
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            ignoreHTTPSErrors: true,
        });
        console.log('Using puppeteer-core with system browser');
        return browser;
    } catch (error) {
        console.log('puppeteer-core failed, trying basic launch...');
    }
    
    // Last resort - basic launch
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Using basic puppeteer launch');
        return browser;
    } catch (error) {
        throw new Error(`All browser launch methods failed: ${error.message}`);
    }
}

// PDF generation endpoint
app.get('/generate-pdf', async (req, res) => {
    console.log('Starting PDF generation...');
    
    let browser;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();
        
        // Set viewport for high quality
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1
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

        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            console.log(`Processing slide ${i + 1}/${slideFiles.length}: ${slideFile}`);
            
            try {
                const slideUrl = `file://${path.join(slidesDir, slideFile)}`;
                
                await page.goto(slideUrl, { 
                    waitUntil: 'networkidle0',
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
                    preferCSSPageSize: false
                });

                pdfBuffers.push(pdfBuffer);
                console.log(`  ✓ Generated ${slideFile}`);

            } catch (error) {
                console.error(`  ✗ Failed ${slideFile}:`, error.message);
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
            details: error.message,
            suggestion: 'Try the /generate-pdf-simple endpoint for a fallback method'
        });
    }
});

// Simple fallback method - creates a preview page with download instructions
app.get('/generate-pdf-simple', async (req, res) => {
    console.log('Using simple PDF method - creating preview page...');
    
    try {
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

        // Create a preview page with all slides
        const previewHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Green Fund - Presentation Preview</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .slide-container {
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .slide-label {
            background: #002140;
            color: white;
            padding: 10px 20px;
            font-weight: bold;
        }
        iframe {
            width: 100%;
            height: 500px;
            border: none;
            display: block;
        }
        .print-instructions {
            background: #e8f4ff;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .print-btn {
            background: #0066cc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
        }
        .print-btn:hover {
            background: #0052a3;
        }
        @media print {
            .header, .print-instructions { display: none; }
            .slide-container { page-break-after: always; margin: 0; box-shadow: none; }
            iframe { height: 100vh; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Green Fund - Complete Presentation</h1>
        <p>All ${slideFiles.length} slides ready for viewing and printing</p>
    </div>
    
    <div class="print-instructions">
        <h3>📄 How to Create PDF:</h3>
        <p><strong>Method 1:</strong> Use your browser's print function:</p>
        <button class="print-btn" onclick="window.print()">🖨️ Print to PDF</button>
        <span>Then select "Save as PDF" in your browser's print dialog</span>
        
        <p style="margin-top: 15px;"><strong>Method 2:</strong> Use browser's built-in PDF export:</p>
        <ul>
            <li><strong>Chrome:</strong> Menu → Print → Destination: Save as PDF</li>
            <li><strong>Firefox:</strong> Menu → Print → Save to PDF</li>
            <li><strong>Safari:</strong> File → Export as PDF</li>
        </ul>
    </div>

    ${slideFiles.map((slideFile, index) => `
    <div class="slide-container">
        <div class="slide-label">Slide ${index + 1} - ${slideFile}</div>
        <iframe src="/old/${slideFile}"></iframe>
    </div>
    `).join('')}

</body>
</html>`;

        res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        });
        
        res.send(previewHtml);

    } catch (error) {
        console.error('Error creating preview:', error);
        res.status(500).json({ 
            error: 'Failed to create preview', 
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        browserSupport: 'chrome-aws-lambda + puppeteer-core fallback'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using chrome-aws-lambda for Railway compatibility`);
    console.log(`Main PDF endpoint: /generate-pdf`);
    console.log(`Fallback endpoint: /generate-pdf-simple`);
    console.log(`Access the application at http://localhost:${PORT}`);
});