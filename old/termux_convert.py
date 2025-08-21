#!/usr/bin/env python3
"""
Termux-compatible HTML to PNG converter
Creates a simple HTML viewer that you can screenshot
"""

import os
import time
from pathlib import Path
import subprocess
import base64

def create_combined_html():
    """
    Create a single HTML file with all slides for easier screenshotting
    """
    current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
    output_file = current_dir / "all_slides.html"
    
    slide_files = sorted([f for f in current_dir.glob("slide*.html")])
    
    print(f"Found {len(slide_files)} slides")
    print("Creating combined HTML file for easy viewing...")
    
    html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>All Slides</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #222;
        }
        .slide-container {
            width: 1920px;
            height: 1080px;
            margin: 0 auto 40px auto;
            border: 2px solid #444;
            overflow: hidden;
            position: relative;
            background: white;
        }
        .slide-label {
            color: white;
            font-size: 24px;
            margin: 20px auto;
            text-align: center;
            font-family: Arial, sans-serif;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
"""
    
    for slide in slide_files:
        html_content += f"""
    <div class="slide-label">{slide.name}</div>
    <div class="slide-container">
        <iframe src="{slide.name}"></iframe>
    </div>
"""
    
    html_content += """
</body>
</html>
"""
    
    with open(output_file, 'w') as f:
        f.write(html_content)
    
    print(f"✓ Created all_slides.html")
    print(f"  Open this file in a browser to view all slides")
    print(f"  File location: {output_file}")
    
    return output_file

def try_termux_browser(file_path):
    """
    Try to open in Termux browser
    """
    try:
        # Try termux-open
        subprocess.run(['termux-open', str(file_path)], check=True)
        print("✓ Opened in browser via termux-open")
        return True
    except:
        pass
    
    try:
        # Try xdg-open
        subprocess.run(['xdg-open', str(file_path)], check=True)
        print("✓ Opened in browser via xdg-open")
        return True
    except:
        pass
    
    try:
        # Try am command (Android Activity Manager)
        subprocess.run([
            'am', 'start', '-a', 'android.intent.action.VIEW',
            '-d', f'file://{file_path}'
        ], check=True)
        print("✓ Opened in browser via Android")
        return True
    except:
        pass
    
    return False

def create_individual_viewers():
    """
    Create individual HTML files that are self-contained
    """
    current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
    png_dir = current_dir / "png"
    png_dir.mkdir(exist_ok=True)
    
    slide_files = sorted([f for f in current_dir.glob("slide*.html")])
    
    print("\nCreating standalone viewers for each slide...")
    
    for slide in slide_files:
        # Read the slide content
        with open(slide, 'r') as f:
            content = f.read()
        
        # Create a viewer file
        viewer_file = png_dir / f"{slide.stem}_viewer.html"
        
        # Make paths absolute in the content
        content = content.replace('src="fonts/', f'src="../fonts/')
        content = content.replace('src="images/', f'src="../images/')
        content = content.replace("src='fonts/", f"src='../fonts/")
        content = content.replace("src='images/", f"src='../images/")
        content = content.replace('url(\'fonts/', f'url(\'../fonts/')
        content = content.replace('url(\'images/', f'url(\'../images/')
        content = content.replace('url("fonts/', f'url("../fonts/')
        content = content.replace('url("images/', f'url("../images/')
        
        with open(viewer_file, 'w') as f:
            f.write(content)
        
        print(f"  ✓ Created {viewer_file.name}")
    
    print(f"\nStandalone viewers created in: {png_dir}")
    print("You can open these files individually in a browser")

def main():
    """
    Main conversion process for Termux
    """
    print("=" * 50)
    print("HTML to PNG Converter for Termux")
    print("=" * 50)
    
    current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
    
    # Check if we're in the right directory
    if not (current_dir / "slide1.html").exists():
        print("Error: slide1.html not found!")
        print(f"Expected location: {current_dir}")
        return
    
    print("\nSince Termux has limited screenshot capabilities,")
    print("this script will prepare the slides for manual screenshots.\n")
    
    # Create combined viewer
    all_slides_file = create_combined_html()
    
    # Create individual viewers
    create_individual_viewers()
    
    print("\n" + "=" * 50)
    print("NEXT STEPS:")
    print("=" * 50)
    print("\n1. Open the all_slides.html file in your browser")
    print(f"   Location: {all_slides_file}")
    
    print("\n2. Take screenshots of each slide manually")
    print("   - Use your device's screenshot feature")
    print("   - Volume Down + Power button (most Android devices)")
    print("   - Or use the screenshot button in the notification panel")
    
    print("\n3. The individual slide viewers are in the png folder")
    print("   You can open them one by one if preferred")
    
    print("\nTrying to open in browser automatically...")
    if try_termux_browser(all_slides_file):
        print("\nBrowser opened! Take screenshots of each slide.")
    else:
        print("\nCouldn't open browser automatically.")
        print(f"Please manually open: {all_slides_file}")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main()