import os
import xml.etree.ElementTree as ET
import json
import re
import urllib.request
import urllib.parse
import time

DIRECTORY = "/home/meesokim/apple2-database"
FLICKR_FILE = os.path.join(DIRECTORY, "flickr_screenshots.json")
SCREENSHOTS_DIR = os.path.join(DIRECTORY, "screenshots")
MAP_OUTPUT_FILE = os.path.join(DIRECTORY, "screenshot_map.json")

def sanitize_filename(filename):
    return re.sub(r'[\\/*?:"<>|]', "", filename)

def normalize_title(t):
    if not t:
        return ''
    t = t.lower()
    t = t.replace('&', 'and')
    # Remove parentheses and brackets
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'\[.*?\]', '', t)
    # Keep alphanumeric characters and spaces
    t = re.sub(r'[^a-z0-9\s]', '', t)
    # Collapse multiple spaces
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def normalize_flickr_title(t):
    if not t:
        return ''
    t = t.lower()
    if t.startswith('a2_'):
        t = t[3:]
    t = t.replace('_', ' ')
    t = re.sub(r'[^a-z0-9\s]', '', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def extract_all_game_titles():
    titles = set()
    files = sorted(os.listdir(DIRECTORY))
    for f in files:
        if not f.endswith(".xml"):
            continue
        filepath = os.path.join(DIRECTORY, f)
        try:
            tree = ET.parse(filepath)
            for sw in tree.getroot().findall('software'):
                desc_el = sw.find('description')
                if desc_el is not None and desc_el.text:
                    titles.add(desc_el.text.strip())
        except Exception as e:
            print(f"Error parsing XML: {f}: {e}")
    return sorted(list(titles))

def main():
    if not os.path.exists(SCREENSHOTS_DIR):
        os.makedirs(SCREENSHOTS_DIR)
        print(f"Created screenshots directory: {SCREENSHOTS_DIR}")
        
    if not os.path.exists(FLICKR_FILE):
        print(f"Flickr metadata file not found: {FLICKR_FILE}")
        return
        
    with open(FLICKR_FILE, "r", encoding="utf-8") as f:
        flickr_data = json.load(f)
        
    print(f"Loaded {len(flickr_data)} Flickr photo records.")
    
    game_titles = extract_all_game_titles()
    print(f"Extracted {len(game_titles)} game titles from XML databases.")
    
    # Pre-normalize game titles for fast lookup
    normalized_games = []
    for g in game_titles:
        norm = normalize_title(g)
        if len(norm) > 2: # ignore too short titles to avoid false positives
            normalized_games.append((g, norm))
            
    matched_map = {}
    download_count = 0
    
    print("Matching Flickr screenshots to game database and downloading...")
    
    for item in flickr_data:
        flickr_orig = item['title']
        flickr_url = item['url']
        flickr_norm = normalize_flickr_title(flickr_orig)
        
        # Find matches
        best_match = None
        # We look for a normalized game title that is contained within the normalized flickr title
        # prioritizing longer matches to prevent false positives (e.g. 'Adventure' matching 'Adventure to Atlantis')
        matches = []
        for g_title, g_norm in normalized_games:
            # Check if game title is a substring of the Flickr title
            if g_norm in flickr_norm:
                matches.append((g_title, g_norm))
                
        if matches:
            # Sort matches by length of normalized title descending to get the most specific match
            matches.sort(key=lambda x: len(x[1]), reverse=True)
            best_match = matches[0][0]
            
        if best_match:
            print(f"Match: '{flickr_orig}' -> '{best_match}'")
            safe_name = sanitize_filename(best_match)
            local_filename = f"{safe_name}.png"
            local_path = os.path.join(SCREENSHOTS_DIR, local_filename)
            
            # Download image
            try:
                if not os.path.exists(local_path):
                    print(f"  Downloading image to {local_path}...")
                    urllib.request.urlretrieve(flickr_url, local_path)
                    download_count += 1
                    time.sleep(0.5) # Polite delay
                else:
                    print(f"  Image already exists: {local_filename}")
                
                # Add to mapped dictionary
                matched_map[best_match] = f"screenshots/{local_filename}"
            except Exception as e:
                print(f"  Error downloading screenshot for '{best_match}': {e}")
        else:
            print(f"No match found for: '{flickr_orig}' (Normalized: '{flickr_norm}')")
            
    # Save the screenshot mapping
    with open(MAP_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(matched_map, f, ensure_ascii=False, indent=2)
        
    print(f"Matching finished. Downloaded {download_count} new images.")
    print(f"Saved mapping for {len(matched_map)} screenshots to {MAP_OUTPUT_FILE}")

if __name__ == "__main__":
    main()
