const express = require('express');
const puppeteer = require('puppeteer');
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

// PDF generation endpoint
app.get('/generate-pdf', async (req, res) => {
    console.log('Starting PDF generation...');
    
    try {
        // Launch Puppeteer with optimized settings for Railway
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for high quality rendering
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });

        // Get all slide files
        const slidesDir = path.join(__dirname, 'old');
        const files = await fs.readdir(slidesDir);
        const slideFiles = files
            .filter(file => file.startsWith('slide') && file.endsWith('.html'))
            .sort((a, b) => {
                // Custom sort to handle slide18a
                const numA = a.replace('slide', '').replace('.html', '').replace('_remove', '');
                const numB = b.replace('slide', '').replace('.html', '').replace('_remove', '');
                
                if (numA === '18a') return 18.5;
                if (numB === '18a') return -18.5;
                
                return parseInt(numA) - parseInt(numB);
            });

        console.log(`Found ${slideFiles.length} slides to process`);

        // Create combined HTML with all slides
        let combinedHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Green Fund - Complete Presentation</title>
    <style>
        @page {
            size: 1920px 1080px;
            margin: 0;
        }
        
        body {
            margin: 0;
            padding: 0;
            width: 1920px;
        }
        
        .slide-wrapper {
            width: 1920px;
            height: 1080px;
            page-break-after: always;
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
        }
        
        .slide-wrapper:last-child {
            page-break-after: auto;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
    </style>
</head>
<body>
`;

        // Add each slide as an iframe
        for (const slideFile of slideFiles) {
            // Skip slide16_remove if needed
            if (slideFile.includes('16_remove')) continue;
            
            const slideUrl = `file://${path.join(slidesDir, slideFile)}`;
            combinedHTML += `
    <div class="slide-wrapper">
        <iframe src="${slideUrl}"></iframe>
    </div>
`;
        }

        combinedHTML += `
</body>
</html>`;

        // Create temporary combined file
        const tempFile = path.join(__dirname, 'temp_combined.html');
        await fs.writeFile(tempFile, combinedHTML);

        // Navigate to the combined HTML
        await page.goto(`file://${tempFile}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for fonts and images to load
        await page.waitForTimeout(3000);

        // Generate PDF with high quality settings
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
            margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            },
            scale: 1
        });

        await browser.close();

        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        console.log('PDF generation completed successfully');

        // Send PDF to client
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="AI_Green_Fund_Presentation.pdf"',
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Alternative method using direct slide combination
app.get('/generate-pdf-v2', async (req, res) => {
    console.log('Starting PDF generation (Method 2)...');
    
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        const pdfs = [];

        // Get all slide files
        const slidesDir = path.join(__dirname, 'old');
        const files = await fs.readdir(slidesDir);
        const slideFiles = files
            .filter(file => file.startsWith('slide') && file.endsWith('.html'))
            .filter(file => !file.includes('16_remove'))
            .sort((a, b) => {
                const numA = a.replace('slide', '').replace('.html', '');
                const numB = b.replace('slide', '').replace('.html', '');
                
                if (numA === '18a') return 19;
                if (numB === '18a') return -19;
                
                return parseInt(numA) - parseInt(numB);
            });

        console.log(`Processing ${slideFiles.length} slides individually...`);

        // Process each slide
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            console.log(`Processing slide ${i + 1}/${slideFiles.length}: ${slideFile}`);
            
            const slideUrl = `file://${path.join(slidesDir, slideFile)}`;
            
            await page.goto(slideUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for content to render
            await page.waitForTimeout(2000);

            // Generate PDF for this slide
            const pdfBuffer = await page.pdf({
                width: '1920px',
                height: '1080px',
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });

            pdfs.push(pdfBuffer);
        }

        await browser.close();

        // Note: Combining PDFs requires additional library like pdf-lib
        // For now, we'll return the first slide as proof of concept
        console.log('Individual PDFs generated. Sending first slide...');
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="AI_Green_Fund_Slide1.pdf"'
        });
        
        res.send(pdfs[0]);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});