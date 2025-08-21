const express = require('express');
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

// Simple PDF generation - creates a print-ready page
app.get('/generate-pdf', async (req, res) => {
    console.log('Creating print-ready PDF page...');
    
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

        // Create a comprehensive PDF-ready page that preserves desktop browser appearance
        const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Green Fund - Complete Presentation</title>
    <style>
        /* Desktop browser dimensions for PDF - 1920x1080 */
        @page {
            size: 1920px 1080px;
            margin: 0;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: 1920px;
        }
        
        .pdf-header {
            background: #002140;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .instructions {
            background: #e8f4ff;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px;
            text-align: center;
        }
        
        .print-btn {
            background: #0066cc;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 18px;
            margin: 10px;
        }
        
        .print-btn:hover {
            background: #0052a3;
        }
        
        /* Each slide container matches desktop browser viewport exactly */
        .slide-container {
            page-break-after: always;
            page-break-inside: avoid;
            width: 1920px;
            height: 1080px;
            position: relative;
            overflow: hidden;
            display: block;
            background: white;
        }
        
        .slide-container:last-child {
            page-break-after: auto;
        }
        
        .slide-frame {
            width: 1920px;
            height: 1080px;
            border: none;
            display: block;
            transform: scale(1);
            transform-origin: top left;
        }
        
        .slide-number {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 14px;
            z-index: 1000;
        }
        
        .loading-message {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 9999;
        }
        
        /* Print styles to preserve desktop appearance */
        @media print {
            .pdf-header,
            .instructions,
            .slide-number { 
                display: none !important; 
            }
            
            body {
                width: 1920px;
                margin: 0;
                padding: 0;
            }
            
            .slide-container {
                margin: 0;
                padding: 0;
                width: 1920px;
                height: 1080px;
                page-break-after: always;
                page-break-inside: avoid;
                display: block;
            }
            
            .slide-frame {
                width: 1920px;
                height: 1080px;
                border: none;
                margin: 0;
                padding: 0;
                transform: scale(1);
                display: block;
            }
            
            .loading-message {
                display: none !important;
            }
        }
        
        /* Screen styles for preview */
        @media screen {
            .slide-container {
                margin: 20px auto;
                border: 2px solid #ccc;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                transform: scale(0.5);
                transform-origin: center top;
            }
            
            body {
                width: auto;
                background: #f5f5f5;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-header">
        <h1>🌱 AI Green Fund - Complete Presentation</h1>
        <p>All ${slideFiles.length} slides ready for PDF export</p>
    </div>
    
    <div class="instructions">
        <h2>📄 Create PDF Instructions</h2>
        <p><strong>Step 1:</strong> Click the button below to start printing</p>
        <button class="print-btn" onclick="window.print()">🖨️ Print to PDF</button>
        
        <p><strong>Step 2:</strong> In the print dialog:</p>
        <ul style="text-align: left; max-width: 600px; margin: 0 auto;">
            <li>Select <strong>"Save as PDF"</strong> as destination</li>
            <li>Choose <strong>"More settings"</strong></li>
            <li><strong>IMPORTANT:</strong> Set paper size to <strong>"Custom"</strong></li>
            <li>Enter dimensions: <strong>Width: 1920px, Height: 1080px</strong></li>
            <li>Or select <strong>"Fit to page"</strong> if custom size not available</li>
            <li>Set margins to <strong>"None"</strong></li>
            <li>Ensure <strong>"Background graphics"</strong> is enabled</li>
        </ul>
        
        <p><strong>Step 3:</strong> Click <strong>"Save"</strong> to download your PDF!</p>
        
        <div style="margin-top: 20px; font-size: 14px; color: #666;">
            <p><strong>📏 Desktop View:</strong> Each slide will appear exactly as it looks in full desktop browser (1920x1080)</p>
            <p><strong>⏳ Loading:</strong> Wait for all slides to load before printing (about 10-15 seconds)</p>
            <p><strong>🖥️ Preview:</strong> On screen, slides are scaled down 50% for easier viewing, but PDF will be full size</p>
        </div>
    </div>
    
    <div class="loading-message" id="loadingMsg">
        <p>⏳ Loading all ${slideFiles.length} slides...</p>
        <p>Please wait before printing to ensure all content loads properly.</p>
    </div>

    ${slideFiles.map((slideFile, index) => `
    <div class="slide-container" id="slide-${index + 1}">
        <div class="slide-number">Slide ${index + 1}/${slideFiles.length}</div>
        <iframe 
            class="slide-frame" 
            src="/old/${slideFile}"
            onload="slideLoaded(${index + 1}, ${slideFiles.length})"
            title="Slide ${index + 1} - ${slideFile}"
        ></iframe>
    </div>
    `).join('')}

    <script>
        let loadedSlides = 0;
        const totalSlides = ${slideFiles.length};
        
        function slideLoaded(slideNum, total) {
            loadedSlides++;
            console.log(\`Loaded slide \${slideNum}/\${total}\`);
            
            if (loadedSlides >= total) {
                setTimeout(() => {
                    document.getElementById('loadingMsg').style.display = 'none';
                    console.log('All slides loaded! Ready to print.');
                }, 1000);
            }
        }
        
        // Auto-hide loading message after 30 seconds regardless
        setTimeout(() => {
            document.getElementById('loadingMsg').style.display = 'none';
        }, 30000);
        
        // Add print shortcut
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
        
        console.log('PDF page loaded. Total slides: ${slideFiles.length}');
    </script>
</body>
</html>`;

        res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        });
        
        res.send(pdfHtml);

    } catch (error) {
        console.error('Error creating PDF page:', error);
        res.status(500).json({ 
            error: 'Failed to create PDF page', 
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
                const numA = a.replace('slide', '').replace('.html', '');
                const numB = b.replace('slide', '').replace('.html', '');
                
                if (numA === '18a') return 18.5;
                if (numB === '18a') return -18.5;
                
                return parseInt(numA) - parseInt(numB);
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