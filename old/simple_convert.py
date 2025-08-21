#!/usr/bin/env python3
"""
Simple HTML to PNG converter for Termux
Uses html2image which works with Chrome/Chromium if available
"""

import os
import time
from pathlib import Path

def convert_with_html2image():
    """
    Convert using html2image package (works on Termux)
    """
    try:
        from html2image import Html2Image
        hti = Html2Image(output_path='png', size=(1920, 1080))
        
        current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
        slide_files = sorted([f for f in current_dir.glob("slide*.html")])
        
        print(f"Found {len(slide_files)} slides to convert")
        
        for slide in slide_files:
            print(f"Converting {slide.name}...")
            hti.screenshot(
                html_file=str(slide),
                save_as=f"{slide.stem}.png"
            )
            print(f"  ✓ Saved {slide.stem}.png")
            time.sleep(1)
            
        print("Done! Check the png folder")
        return True
        
    except ImportError:
        print("html2image not installed. Installing...")
        os.system("pip install html2image")
        return False
    except Exception as e:
        print(f"Error with html2image: {e}")
        return False

def convert_with_weasyprint():
    """
    Alternative: Convert using WeasyPrint (creates PDF then PNG)
    """
    try:
        import weasyprint
        from PIL import Image
        import io
        
        current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
        png_dir = current_dir / "png"
        png_dir.mkdir(exist_ok=True)
        
        slide_files = sorted([f for f in current_dir.glob("slide*.html")])
        
        print(f"Converting {len(slide_files)} slides with WeasyPrint...")
        
        for slide in slide_files:
            print(f"Converting {slide.name}...")
            
            # Convert HTML to PDF bytes
            pdf_bytes = weasyprint.HTML(filename=str(slide)).write_pdf()
            
            # Note: PDF to PNG conversion requires additional tools
            output_path = png_dir / f"{slide.stem}.pdf"
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"  ✓ Saved as PDF: {slide.stem}.pdf")
            
        print("Note: WeasyPrint creates PDFs. Use a PDF viewer to convert to PNG.")
        return True
        
    except ImportError:
        print("WeasyPrint not installed. Try: pip install weasyprint")
        return False
    except Exception as e:
        print(f"Error with WeasyPrint: {e}")
        return False

def simple_screenshot_method():
    """
    Simplest method: Open in browser and take screenshots
    """
    import webbrowser
    
    current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
    slide_files = sorted([f for f in current_dir.glob("slide*.html")])
    
    print("Opening slides in browser for manual screenshots...")
    print("You'll need to take screenshots manually.")
    
    for i, slide in enumerate(slide_files, 1):
        print(f"\n{i}. Opening {slide.name}")
        webbrowser.open(f"file://{slide}")
        
        if i < len(slide_files):
            input("Take screenshot, then press Enter for next slide...")
    
    print("\nAll slides opened. Take screenshots using your device's screenshot feature.")
    return True

def main():
    """
    Try different methods to convert HTML to PNG
    """
    print("HTML to PNG Converter for Termux")
    print("=" * 40)
    
    # Create png directory
    png_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old/png")
    png_dir.mkdir(exist_ok=True)
    
    print("\nAttempting conversion methods...\n")
    
    # Try html2image first
    if convert_with_html2image():
        return
    
    print("\nhtml2image failed. Trying alternative methods...")
    
    # Try WeasyPrint
    if convert_with_weasyprint():
        return
    
    # Last resort: manual method
    print("\nAutomated methods failed. Using manual browser method...")
    simple_screenshot_method()

if __name__ == "__main__":
    main()