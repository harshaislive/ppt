#!/usr/bin/env python3
"""
Convert HTML slides to PNG images
For Termux mobile environment
"""

import os
import subprocess
import time
from pathlib import Path

def setup_termux_dependencies():
    """
    Install required packages for Termux
    Run these commands manually if the script fails:
    pkg install chromium
    pip install playwright
    """
    print("Setting up dependencies for Termux...")
    commands = [
        "pkg update -y",
        "pkg install chromium -y",
        "pip install playwright"
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        try:
            subprocess.run(cmd, shell=True, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Warning: Command failed: {cmd}")
            print("Please run it manually if needed")

def convert_with_chromium():
    """
    Convert HTML slides to PNG using Chromium headless
    This method works best on Termux
    """
    # Get current directory
    current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
    png_dir = current_dir / "png"
    
    # Create png directory if it doesn't exist
    png_dir.mkdir(exist_ok=True)
    print(f"Created/verified PNG output directory: {png_dir}")
    
    # Get all HTML slide files
    slide_files = sorted([f for f in current_dir.glob("slide*.html")])
    
    if not slide_files:
        print("No slide HTML files found!")
        return
    
    print(f"Found {len(slide_files)} slide files to convert")
    
    # Convert each slide
    for slide_file in slide_files:
        output_name = slide_file.stem + ".png"
        output_path = png_dir / output_name
        
        # Chromium command for screenshot
        # --virtual-time-budget helps with animations/fonts loading
        cmd = [
            "chromium",
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
            "--screenshot=" + str(output_path),
            "--virtual-time-budget=5000",
            "file://" + str(slide_file.absolute())
        ]
        
        print(f"Converting {slide_file.name} -> {output_name}")
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            print(f"  ✓ Successfully converted {slide_file.name}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ Failed to convert {slide_file.name}")
            print(f"    Error: {e.stderr if e.stderr else 'Unknown error'}")
        except FileNotFoundError:
            print("  ✗ Chromium not found. Please install it with: pkg install chromium")
            return
        
        # Small delay between conversions
        time.sleep(0.5)
    
    print(f"\nConversion complete! PNG files saved in: {png_dir}")

def alternative_simple_method():
    """
    Alternative method using Python with Selenium if available
    This requires more setup but provides more control
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        
        current_dir = Path("/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old")
        png_dir = current_dir / "png"
        png_dir.mkdir(exist_ok=True)
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Initialize driver
        driver = webdriver.Chrome(options=chrome_options)
        
        # Convert each slide
        slide_files = sorted([f for f in current_dir.glob("slide*.html")])
        
        for slide_file in slide_files:
            output_path = png_dir / (slide_file.stem + ".png")
            
            print(f"Converting {slide_file.name}...")
            driver.get(f"file://{slide_file.absolute()}")
            time.sleep(2)  # Wait for page to load
            driver.save_screenshot(str(output_path))
            print(f"  ✓ Saved to {output_path.name}")
        
        driver.quit()
        print(f"\nAll slides converted! Check {png_dir}")
        
    except ImportError:
        print("Selenium not installed. To use this method:")
        print("pip install selenium")
        print("You'll also need ChromeDriver for Termux")
        return False
    except Exception as e:
        print(f"Selenium method failed: {e}")
        return False
    
    return True

def main():
    """
    Main function to convert HTML slides to PNG
    """
    print("HTML to PNG Converter for Termux")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("slide1.html").exists():
        print("Warning: slide1.html not found in current directory")
        print("Make sure you're in the /old directory with the HTML files")
    
    # Try the chromium method first (most reliable on Termux)
    print("\nUsing Chromium headless browser method...")
    convert_with_chromium()
    
    # Uncomment below to try alternative method
    # print("\nTrying alternative Selenium method...")
    # if not alternative_simple_method():
    #     print("Falling back to Chromium method...")
    #     convert_with_chromium()

if __name__ == "__main__":
    # Uncomment to auto-install dependencies (run once)
    # setup_termux_dependencies()
    
    main()