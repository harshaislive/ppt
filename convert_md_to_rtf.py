#!/usr/bin/env python3
"""
Script to convert all .md files to RTF format
Converts files from root directory and research_angles folder
Saves RTF files in 'rtf' folder with organized subdirectories
"""

import os
import subprocess
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

def check_pandoc():
    """Check if pandoc is installed"""
    try:
        subprocess.run(['pandoc', '--version'], capture_output=True, check=True)
        print("[OK] Pandoc is installed and ready")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[ERROR] Pandoc is not installed or not in PATH")
        print("Please install pandoc from: https://pandoc.org/installing.html")
        return False

def create_rtf_directories(base_path):
    """Create RTF output directories"""
    rtf_path = base_path / 'rtf'
    rtf_root_path = rtf_path / 'root'
    rtf_research_path = rtf_path / 'research_angles'
    
    # Create directories if they don't exist
    rtf_path.mkdir(exist_ok=True)
    rtf_root_path.mkdir(exist_ok=True)
    rtf_research_path.mkdir(exist_ok=True)
    
    return rtf_root_path, rtf_research_path

def convert_md_to_rtf(md_file, output_file):
    """Convert a single markdown file to RTF using pandoc"""
    try:
        # Use pandoc to convert markdown to RTF
        cmd = [
            'pandoc',
            str(md_file),
            '-o', str(output_file),
            '--from=markdown',
            '--to=rtf',
            '--standalone'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"[OK] Converted: {md_file.name} -> {output_file.name}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error converting {md_file.name}: {e}")
        if e.stderr:
            print(f"  Error details: {e.stderr}")
        return False

def find_and_convert_md_files(base_path):
    """Find all .md files and convert them to RTF"""
    base_path = Path(base_path)
    
    # Check if pandoc is available
    if not check_pandoc():
        return
    
    # Create output directories
    rtf_root_path, rtf_research_path = create_rtf_directories(base_path)
    
    converted_count = 0
    total_count = 0
    
    print("\n" + "="*50)
    print("CONVERTING MARKDOWN FILES TO RTF")
    print("="*50)
    
    # Convert files in root directory
    print(f"\n[PROCESSING] Root directory: {base_path}")
    root_md_files = list(base_path.glob('*.md'))
    
    for md_file in root_md_files:
        total_count += 1
        output_file = rtf_root_path / f"{md_file.stem}.rtf"
        if convert_md_to_rtf(md_file, output_file):
            converted_count += 1
    
    # Convert files in research_angles directory
    research_path = base_path / 'research_angles'
    if research_path.exists():
        print(f"\n[PROCESSING] research_angles directory: {research_path}")
        research_md_files = list(research_path.glob('*.md'))
        
        for md_file in research_md_files:
            total_count += 1
            output_file = rtf_research_path / f"{md_file.stem}.rtf"
            if convert_md_to_rtf(md_file, output_file):
                converted_count += 1
    else:
        print(f"\n[WARNING] research_angles directory not found at: {research_path}")
    
    # Summary
    print("\n" + "="*50)
    print("CONVERSION SUMMARY")
    print("="*50)
    print(f"Total files processed: {total_count}")
    print(f"Successfully converted: {converted_count}")
    print(f"Failed conversions: {total_count - converted_count}")
    
    if converted_count > 0:
        print(f"\n[INFO] RTF files saved in:")
        print(f"   Root files: {rtf_root_path}")
        print(f"   Research files: {rtf_research_path}")
    
    return converted_count, total_count

def main():
    """Main function"""
    # Get the current directory (where the script is located)
    current_dir = Path(__file__).parent
    
    print("[START] Starting Markdown to RTF conversion...")
    print(f"[INFO] Working directory: {current_dir}")
    
    try:
        converted, total = find_and_convert_md_files(current_dir)
        
        if converted == total and total > 0:
            print("\n[SUCCESS] All files converted successfully!")
        elif converted > 0:
            print(f"\n[PARTIAL] {converted} out of {total} files converted successfully")
        else:
            print("\n[ERROR] No files were converted")
            
    except Exception as e:
        print(f"\n[ERROR] An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()