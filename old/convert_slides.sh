#!/bin/bash

# Convert HTML slides to PNG images for Termux
# This script provides multiple methods to convert HTML to PNG

echo "HTML Slides to PNG Converter"
echo "============================"

# Set directories
SCRIPT_DIR="/storage/emulated/0/ai_green_fund/ai_green_fund/ai_green_fund/old"
PNG_DIR="$SCRIPT_DIR/png"

# Create output directory
mkdir -p "$PNG_DIR"
echo "Output directory: $PNG_DIR"

# Method 1: Using wkhtmltoimage (if available)
use_wkhtmltoimage() {
    echo "Method 1: Using wkhtmltoimage..."
    
    if ! command -v wkhtmltoimage &> /dev/null; then
        echo "wkhtmltoimage not found. Install with:"
        echo "pkg install wkhtmltopdf"
        return 1
    fi
    
    for slide in "$SCRIPT_DIR"/slide*.html; do
        if [ -f "$slide" ]; then
            filename=$(basename "$slide" .html)
            output="$PNG_DIR/${filename}.png"
            
            echo "Converting $filename..."
            wkhtmltoimage --width 1920 --height 1080 \
                --javascript-delay 2000 \
                --enable-local-file-access \
                "$slide" "$output"
            
            if [ $? -eq 0 ]; then
                echo "  ✓ Converted to ${filename}.png"
            else
                echo "  ✗ Failed to convert $filename"
            fi
        fi
    done
    
    return 0
}

# Method 2: Using Chromium (recommended for Termux)
use_chromium() {
    echo "Method 2: Using Chromium headless..."
    
    if ! command -v chromium &> /dev/null; then
        echo "Chromium not found. Install with:"
        echo "pkg install chromium"
        return 1
    fi
    
    for slide in "$SCRIPT_DIR"/slide*.html; do
        if [ -f "$slide" ]; then
            filename=$(basename "$slide" .html)
            output="$PNG_DIR/${filename}.png"
            
            echo "Converting $filename..."
            chromium --headless --disable-gpu --no-sandbox \
                --window-size=1920,1080 \
                --screenshot="$output" \
                --virtual-time-budget=3000 \
                "file://$slide" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "  ✓ Converted to ${filename}.png"
            else
                echo "  ✗ Failed to convert $filename"
            fi
            
            sleep 0.5
        fi
    done
    
    return 0
}

# Method 3: Using cutycapt (lightweight option)
use_cutycapt() {
    echo "Method 3: Using cutycapt..."
    
    if ! command -v cutycapt &> /dev/null; then
        echo "cutycapt not found. Install with:"
        echo "pkg install cutycapt"
        return 1
    fi
    
    for slide in "$SCRIPT_DIR"/slide*.html; do
        if [ -f "$slide" ]; then
            filename=$(basename "$slide" .html)
            output="$PNG_DIR/${filename}.png"
            
            echo "Converting $filename..."
            cutycapt --url="file://$slide" \
                --out="$output" \
                --min-width=1920 \
                --min-height=1080 \
                --delay=2000
            
            if [ $? -eq 0 ]; then
                echo "  ✓ Converted to ${filename}.png"
            else
                echo "  ✗ Failed to convert $filename"
            fi
        fi
    done
    
    return 0
}

# Install dependencies function
install_deps() {
    echo "Installing dependencies for Termux..."
    pkg update -y
    
    echo "Choose which tool to install:"
    echo "1) Chromium (recommended, ~100MB)"
    echo "2) wkhtmltopdf (smaller, ~50MB)"
    echo "3) cutycapt (lightweight, ~30MB)"
    echo "4) All of them"
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1) pkg install chromium -y ;;
        2) pkg install wkhtmltopdf -y ;;
        3) pkg install cutycapt -y ;;
        4) pkg install chromium wkhtmltopdf cutycapt -y ;;
        *) echo "Invalid choice" ;;
    esac
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "$SCRIPT_DIR/slide1.html" ]; then
        echo "Warning: slide1.html not found!"
        echo "Current directory: $(pwd)"
        echo "Expected directory: $SCRIPT_DIR"
    fi
    
    # Count slides
    slide_count=$(ls -1 "$SCRIPT_DIR"/slide*.html 2>/dev/null | wc -l)
    echo "Found $slide_count HTML slides to convert"
    
    if [ $slide_count -eq 0 ]; then
        echo "No slide*.html files found!"
        exit 1
    fi
    
    # Try different methods in order of preference
    if use_chromium; then
        echo "Successfully converted slides using Chromium"
    elif use_wkhtmltoimage; then
        echo "Successfully converted slides using wkhtmltoimage"
    elif use_cutycapt; then
        echo "Successfully converted slides using cutycapt"
    else
        echo ""
        echo "No conversion tool found!"
        echo "Would you like to install one? (y/n)"
        read -p "> " install_choice
        
        if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
            install_deps
            echo ""
            echo "Please run this script again after installation"
        fi
        exit 1
    fi
    
    echo ""
    echo "Conversion complete!"
    echo "PNG files saved in: $PNG_DIR"
    echo "Total files converted: $(ls -1 "$PNG_DIR"/*.png 2>/dev/null | wc -l)"
}

# Run main function
main