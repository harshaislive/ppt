#!/usr/bin/env python3
"""
Simple Markdown to RTF Converter
Converts .md files to .rtf format without requiring pandoc
Handles basic markdown formatting: headers, bold, italic, lists, links
"""

import os
import re
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach(), errors='replace')
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach(), errors='replace')

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

def markdown_to_rtf(markdown_text):
    """Convert markdown text to RTF format"""
    
    # RTF header
    rtf_content = [
        r'{\rtf1\ansi\deff0',
        r'{\fonttbl{\f0 Times New Roman;}}',
        r'{\colortbl;\red0\green0\blue0;\red0\green0\blue255;}',
        r'\f0\fs24'
    ]
    
    lines = markdown_text.split('\n')
    
    for line in lines:
        line = line.strip()
        
        if not line:
            # Empty line - add paragraph break
            rtf_content.append(r'\par')
            continue
            
        # Headers
        if line.startswith('#'):
            header_level = len(line) - len(line.lstrip('#'))
            header_text = line.lstrip('# ').strip()
            header_text = escape_rtf_text(header_text)
            
            if header_level == 1:
                rtf_content.append(f'\\fs32\\b {header_text}\\b0\\fs24\\par')
            elif header_level == 2:
                rtf_content.append(f'\\fs28\\b {header_text}\\b0\\fs24\\par')
            elif header_level == 3:
                rtf_content.append(f'\\fs26\\b {header_text}\\b0\\fs24\\par')
            else:
                rtf_content.append(f'\\fs24\\b {header_text}\\b0\\par')
            continue
        
        # Bullet points
        if line.startswith('- ') or line.startswith('* '):
            bullet_text = line[2:].strip()
            bullet_text = process_inline_formatting(bullet_text)
            rtf_content.append(f'\\bullet {bullet_text}\\par')
            continue
            
        # Numbered lists
        if re.match(r'^\d+\.\s', line):
            list_text = re.sub(r'^\d+\.\s', '', line)
            list_text = process_inline_formatting(list_text)
            rtf_content.append(f'{list_text}\\par')
            continue
        
        # Regular paragraph
        processed_line = process_inline_formatting(line)
        rtf_content.append(f'{processed_line}\\par')
    
    # RTF footer
    rtf_content.append('}')
    
    return '\n'.join(rtf_content)

def escape_rtf_text(text):
    """Escape special RTF characters"""
    # Replace backslashes first
    text = text.replace('\\', '\\\\')
    # Replace curly braces
    text = text.replace('{', '\\{')
    text = text.replace('}', '\\}')
    return text

def process_inline_formatting(text):
    """Process inline markdown formatting (bold, italic, links)"""
    text = escape_rtf_text(text)
    
    # Bold text (**text** or __text__)
    text = re.sub(r'\*\*(.*?)\*\*', r'\\b \1\\b0', text)
    text = re.sub(r'__(.*?)__', r'\\b \1\\b0', text)
    
    # Italic text (*text* or _text_)
    text = re.sub(r'\*(.*?)\*', r'\\i \1\\i0', text)
    text = re.sub(r'_(.*?)_', r'\\i \1\\i0', text)
    
    # Links [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\\ul\\cf2 \1\\ul0\\cf1', text)
    
    # Inline code `code`
    text = re.sub(r'`([^`]+)`', r'\\f1 \1\\f0', text)
    
    return text

def convert_md_file_to_rtf(md_file_path, rtf_file_path):
    """Convert a single markdown file to RTF"""
    try:
        # Read markdown file
        with open(md_file_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        # Convert to RTF
        rtf_content = markdown_to_rtf(markdown_content)
        
        # Write RTF file
        with open(rtf_file_path, 'w', encoding='utf-8') as f:
            f.write(rtf_content)
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to convert {md_file_path.name}: {e}")
        return False

def find_and_convert_md_files(base_path):
    """Find all .md files and convert them to RTF"""
    base_path = Path(base_path)
    
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
        print(f"Converting: {md_file.name}")
        
        if convert_md_file_to_rtf(md_file, output_file):
            converted_count += 1
            print(f"[OK] -> {output_file.name}")
        else:
            print(f"[FAILED] {md_file.name}")
    
    # Convert files in research_angles directory
    research_path = base_path / 'research_angles'
    if research_path.exists():
        print(f"\n[PROCESSING] research_angles directory: {research_path}")
        research_md_files = list(research_path.glob('*.md'))
        
        for md_file in research_md_files:
            total_count += 1
            output_file = rtf_research_path / f"{md_file.stem}.rtf"
            print(f"Converting: {md_file.name}")
            
            if convert_md_file_to_rtf(md_file, output_file):
                converted_count += 1
                print(f"[OK] -> {output_file.name}")
            else:
                print(f"[FAILED] {md_file.name}")
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
    
    print("[START] Simple Markdown to RTF Converter")
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
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()