import urllib.request
import urllib.parse
import re
import os
import json
import time

DIRECTORY = "/home/meesokim/apple2-database"
CACHE_FILE = os.path.join(DIRECTORY, "flickr_screenshots.json")

def fetch_page(page_num):
    if page_num == 1:
        url = "https://www.flickr.com/photos/textfiles/albums/72157646736116682/"
    else:
        url = f"https://www.flickr.com/photos/textfiles/albums/72157646736116682/page{page_num}/"
        
    print(f"Fetching page {page_num}: {url}...")
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8', errors='ignore')
        return html
    except Exception as e:
        print(f"Error fetching page {page_num}: {e}")
        return None

def parse_photos(html_content):
    # We want to find pattern like:
    # src="//live.staticflickr.com/3885/15002896975_90d6c53725.jpg"
    # and title="a2_Advanced_Blackjack_1983_Muse_cr_Whip"
    # Note that in the page HTML they might be in separate tags, but we can match them using card boundaries.
    
    # Each photo card looks like:
    # <div class="photo-card ..."> ... src="//live.staticflickr.com/..." ... title="..." ... </div>
    # Let's extract the div segments or match photo-card-content blocks.
    
    cards = re.findall(r'<div class="photo-card-photo\b[^>]*>.*?</a>', html_content, re.DOTALL)
    photos = []
    
    for card in cards:
        img_match = re.search(r'src="([^"]+)"', card)
        title_match = re.search(r'title="([^"]+)"', card)
        
        if img_match and title_match:
            img_url = img_match.group(1).strip()
            title = title_match.group(1).strip()
            
            # Ensure protocol
            if img_url.startswith('//'):
                img_url = 'https:' + img_url
                
            photos.append({
                'title': title,
                'url': img_url
            })
            
    return photos

def main():
    page = 1
    all_photos = []
    
    while True:
        html_content = fetch_page(page)
        if not html_content:
            break
            
        photos = parse_photos(html_content)
        print(f"Found {len(photos)} photos on page {page}.")
        
        if not photos:
            # If no photos found on this page, we've reached the end
            break
            
        all_photos.extend(photos)
        
        # Check if there's a next page link in the HTML
        # e.g., href="/photos/textfiles/albums/72157646736116682/page3/"
        next_page_str = f"/page{page + 1}/"
        if next_page_str not in html_content:
            print("No next page link found.")
            break
            
        page += 1
        time.sleep(1.0)
        
    print(f"Scraped {len(all_photos)} total photos.")
    
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(all_photos, f, ensure_ascii=False, indent=2)
        
    print(f"Saved {len(all_photos)} screenshots list to {CACHE_FILE}")

if __name__ == "__main__":
    main()
