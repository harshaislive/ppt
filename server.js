const express = require('express');
const wkhtmltopdf = require('wkhtmltopdf');
const PDFMerger = require('pdf-merger-js');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

// PDF generation endpoint using wkhtmltopdf (faster)
app.get('/generate-pdf', async (req, res) => {
    console.log('Starting PDF generation with wkhtmltopdf...');
    
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

        console.log(`Found ${slideFiles.length} slides to process`);

        // Create temporary directory for individual PDFs
        const tempDir = path.join(__dirname, 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        // Generate PDF for each slide
        const pdfPaths = [];
        
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            const slideNumber = i + 1;
            
            console.log(`Processing slide ${slideNumber}/${slideFiles.length}: ${slideFile}`);
            
            const inputPath = path.join(slidesDir, slideFile);
            const outputPath = path.join(tempDir, `slide_${slideNumber.toString().padStart(2, '0')}.pdf`);
            
            try {
                await generateSlidePDF(inputPath, outputPath);
                pdfPaths.push(outputPath);
                console.log(`  ✓ Generated ${slideFile}`);
            } catch (error) {
                console.error(`  ✗ Failed ${slideFile}:`, error.message);
                // Continue with other slides
            }
        }

        if (pdfPaths.length === 0) {
            throw new Error('No PDFs were generated successfully');
        }

        console.log(`Merging ${pdfPaths.length} PDFs...`);

        // Merge all PDFs
        const merger = new PDFMerger();
        
        for (const pdfPath of pdfPaths) {
            await merger.add(pdfPath);
        }

        const finalPdfPath = path.join(tempDir, 'AI_Green_Fund_Complete.pdf');
        await merger.save(finalPdfPath);

        // Read the merged PDF
        const pdfBuffer = await fs.readFile(finalPdfPath);

        // Cleanup temp files
        await cleanupTempFiles(tempDir);

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

// Alternative: Single combined HTML method (faster for Railway)
app.get('/generate-pdf-fast', async (req, res) => {
    console.log('Starting fast PDF generation...');
    
    try {
        // Create combined HTML with all slides
        const combinedHtml = await createCombinedHTML();
        const tempDir = path.join(__dirname, 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        
        const htmlPath = path.join(tempDir, 'combined_slides.html');
        const pdfPath = path.join(tempDir, 'combined_slides.pdf');
        
        // Write combined HTML
        await fs.writeFile(htmlPath, combinedHtml);
        
        // Generate single PDF from combined HTML
        await new Promise((resolve, reject) => {
            const stream = wkhtmltopdf(combinedHtml, {
                pageSize: 'A4',
                orientation: 'Landscape',
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                printMediaType: true,
                enableLocalFileAccess: true,
                javascriptDelay: 2000,
                loadErrorHandling: 'ignore',
                loadMediaErrorHandling: 'ignore'
            });
            
            const chunks = [];
            
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        }).then(pdfBuffer => {
            // Cleanup
            cleanupTempFiles(tempDir);
            
            console.log('Fast PDF generation completed');
            
            // Send PDF
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="AI_Green_Fund_Presentation.pdf"',
                'Content-Length': pdfBuffer.length
            });
            
            res.send(pdfBuffer);
        });

    } catch (error) {
        console.error('Error in fast PDF generation:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            details: error.message 
        });
    }
});

// Helper function to generate PDF for single slide
function generateSlidePDF(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const options = {
            pageSize: 'A4',
            orientation: 'Landscape',
            marginTop: 0,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
            printMediaType: true,
            enableLocalFileAccess: true,
            javascriptDelay: 1500,
            loadErrorHandling: 'ignore'
        };
        
        const stream = wkhtmltopdf(`file://${inputPath}`, options);
        const chunks = [];
        
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', async () => {
            try {
                const pdfBuffer = Buffer.concat(chunks);
                await fs.writeFile(outputPath, pdfBuffer);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        stream.on('error', reject);
    });
}

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
            font-family: 'ABC Arizona Flare Sans', sans-serif;
        }
        
        .slide-page {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
            transform: scale(0.7);
            transform-origin: top left;
        }
        
        .slide-page:last-child {
            page-break-after: auto;
        }
        
        /* Copy font-face declarations */
        @font-face {
            font-family: 'ABC Arizona Flare';
            src: url('old/fonts/ABCArizonaFlare-Regular.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Medium';
            src: url('old/fonts/ABCArizonaFlare-Medium.woff2') format('woff2');
            font-weight: 500;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Light';
            src: url('old/fonts/ABCArizonaFlare-Light.woff2') format('woff2');
            font-weight: 300;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'ABC Arizona Flare Sans';
            src: url('old/fonts/ABCArizonaFlareSans-Regular.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
    </style>
</head>
<body>
`;

    // Read and include each slide's content
    for (const slideFile of slideFiles) {
        try {
            const slideContent = await fs.readFile(path.join(slidesDir, slideFile), 'utf8');
            
            // Extract body content from slide
            const bodyMatch = slideContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
                combinedHTML += `
    <div class="slide-page">
        ${bodyMatch[1]}
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

// Helper function to cleanup temporary files
async function cleanupTempFiles(tempDir) {
    try {
        const files = await fs.readdir(tempDir);
        await Promise.all(files.map(file => 
            fs.unlink(path.join(tempDir, file)).catch(() => {})
        ));
        await fs.rmdir(tempDir).catch(() => {});
        console.log('Temporary files cleaned up');
    } catch (error) {
        console.warn('Warning: Could not cleanup temp files:', error.message);
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running with wkhtmltopdf' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using wkhtmltopdf for faster builds`);
    console.log(`Access the application at http://localhost:${PORT}`);
});