import os
import xml.etree.ElementTree as ET
import json
import re
import html
import urllib.parse

def normalize_year(year_str):
    if not year_str:
        return 'Unknown'
    year_str = year_str.strip()
    if not any(c.isdigit() for c in year_str):
        return 'Unknown'
    cleaned = year_str.replace('?', '')
    if not cleaned:
        return 'Unknown'
    return cleaned

def normalize_title(t):
    if not t:
        return ''
    t = html.unescape(t)
    t = t.lower()
    t = t.replace('&', 'and')
    # Remove all parentheses and brackets contents
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'\[.*?\]', '', t)
    # Keep only alphanumeric characters
    t = re.sub(r'[^a-z0-9]', '', t)
    return t.strip()

def parse_xml_file(filepath):
    filename = os.path.basename(filepath)
    category = "Other"
    
    if "cass" in filename or "apple1" in filename:
        category = "Cassette"
    elif "flop" in filename or "apple3" in filename:
        if "clcracked" in filename:
            category = "Floppy (Clean Cracked)"
        elif "orig" in filename:
            category = "Floppy (Original)"
        elif "misc" in filename:
            category = "Floppy (Misc)"
        else:
            category = "Floppy"
    elif "rom" in filename:
        category = "ROM"
        
    system = "Apple II"
    if filename.startswith("apple1"):
        system = "Apple I"
    elif filename.startswith("apple2gs"):
        system = "Apple IIgs"
    elif filename.startswith("apple2"):
        system = "Apple II"
    elif filename.startswith("apple3"):
        system = "Apple III"

    print(f"Parsing XML: {filename} ({system} {category})...")
    
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except Exception as e:
        print(f"Error parsing {filename}: {e}")
        return []
    
    db_desc = root.attrib.get('description', '')
    software_list = []
    
    for sw in root.findall('software'):
        name = sw.attrib.get('name', '')
        cloneof = sw.attrib.get('cloneof', None)
        supported = sw.attrib.get('supported', 'yes')
        
        description_elem = sw.find('description')
        description = description_elem.text if description_elem is not None else name
        
        year_elem = sw.find('year')
        year = normalize_year(year_elem.text) if year_elem is not None else 'Unknown'
        
        publisher_elem = sw.find('publisher')
        publisher = publisher_elem.text if publisher_elem is not None else 'Unknown'
        
        # Gather info tags
        alt_title = None
        serial = None
        usage = None
        other_infos = {}
        for info in sw.findall('info'):
            inf_name = info.attrib.get('name')
            inf_val = info.attrib.get('value')
            if inf_name == 'alt_title':
                alt_title = inf_val
            elif inf_name == 'serial':
                serial = inf_val
            elif inf_name == 'usage':
                usage = inf_val
            else:
                other_infos[inf_name] = inf_val
                
        notes_elem = sw.find('notes')
        notes = notes_elem.text if notes_elem is not None else None
        
        # Gather shared features (e.g. compatibility)
        shared_features = {}
        for sf_elem in sw.findall('sharedfeat'):
            sf_name = sf_elem.attrib.get('name')
            sf_val = sf_elem.attrib.get('value')
            shared_features[sf_name] = sf_val
            
        parts = []
        for part in sw.findall('part'):
            part_name = part.attrib.get('name', '')
            part_interface = part.attrib.get('interface', '')
            
            features = {}
            for feature in part.findall('feature'):
                feat_name = feature.attrib.get('name')
                feat_val = feature.attrib.get('value')
                features[feat_name] = feat_val
                
            roms = []
            dataarea = part.find('dataarea')
            if dataarea is not None:
                for rom in dataarea.findall('rom'):
                    roms.append({
                        'name': rom.attrib.get('name', ''),
                        'size': rom.attrib.get('size', ''),
                        'crc': rom.attrib.get('crc', ''),
                        'sha1': rom.attrib.get('sha1', ''),
                        'status': rom.attrib.get('status', 'good')
                    })
                for disk in dataarea.findall('disk'):
                    roms.append({
                        'name': disk.attrib.get('name', ''),
                        'size': disk.attrib.get('size', ''),
                        'crc': disk.attrib.get('crc', ''),
                        'sha1': disk.attrib.get('sha1', ''),
                        'status': disk.attrib.get('status', 'good')
                    })
            
            parts.append({
                'name': part_name,
                'interface': part_interface,
                'features': features,
                'roms': roms
            })
            
        software_list.append({
            'id': name,
            'title': description,
            'year': year,
            'publisher': publisher,
            'system': system,
            'category': category,
            'cloneof': cloneof,
            'supported': supported,
            'alt_title': alt_title,
            'serial': serial,
            'usage': usage,
            'notes': notes,
            'shared_features': shared_features,
            'parts': parts,
            'db_file': filename,
            'db_desc': db_desc
        })
        
    return software_list

def abbreviate(item, translations_cache):
    abb = {}
    if item.get('id'): abb['i'] = item['id']
    if item.get('title'):
        title = item['title']
        abb['t'] = title
        if title in translations_cache:
            abb['kt'] = translations_cache[title]
    if item.get('sf'): abb['sf'] = item['sf']
    if item.get('yt'): abb['yt'] = item['yt']
    if item.get('year'): abb['y'] = item['year']
    if item.get('publisher'): abb['p'] = item['publisher']
    if item.get('system'): abb['s'] = item['system']
    if item.get('category'): abb['c'] = item['category']
    if item.get('cloneof'): abb['cl'] = item['cloneof']
    if item.get('supported') and item['supported'] != 'yes': abb['sp'] = item['supported']
    if item.get('alt_title'): abb['a'] = item['alt_title']
    if item.get('serial'): abb['sr'] = item['serial']
    if item.get('usage'): abb['u'] = item['usage']
    if item.get('notes'): abb['n'] = item['notes']
    if item.get('shared_features'): abb['shf'] = item['shared_features']
    if item.get('db_file'): abb['df'] = item['db_file']
    if item.get('db_desc'): abb['dd'] = item['db_desc']
    
    parts = []
    for p in item.get('parts', []):
        part_abb = {}
        if p.get('name'): part_abb['n'] = p['name']
        if p.get('interface'): part_abb['i'] = p['interface']
        if p.get('features'): part_abb['f'] = p['features']
        
        roms = []
        for r in p.get('roms', []):
            rom_abb = {}
            if r.get('name'): rom_abb['n'] = r['name']
            if r.get('size'): rom_abb['sz'] = r['size']
            if r.get('crc'): rom_abb['c'] = r['crc']
            if r.get('sha1'): rom_abb['sh'] = r['sha1']
            if r.get('status') and r['status'] != 'good': rom_abb['st'] = r['status']
            roms.append(rom_abb)
            
        if roms:
            part_abb['r'] = roms
        parts.append(part_abb)
        
    if parts:
        abb['pt'] = parts
    return abb

def main():
    directory = "/home/meesokim/apple2-database"
    
    # Load translation cache if exists
    translations_cache = {}
    cache_path = os.path.join(directory, "title_translations.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as cache_f:
                translations_cache = json.load(cache_f)
            print(f"Loaded {len(translations_cache)} translations from cache.")
        except Exception as e:
            print(f"Error loading translations cache: {e}")
            
    # Load YouTube links cache if exists
    youtube_links = {}
    yt_links_path = os.path.join(directory, "youtube_links.json")
    if os.path.exists(yt_links_path):
        try:
            with open(yt_links_path, "r", encoding="utf-8") as yt_f:
                youtube_links = json.load(yt_f)
            print(f"Loaded {len(youtube_links)} YouTube links from cache.")
        except Exception as e:
            print(f"Error loading YouTube links cache: {e}")

    # Load screenshot mappings if exists
    screenshot_map = {}
    screenshot_map_path = os.path.join(directory, "screenshot_map.json")
    if os.path.exists(screenshot_map_path):
        try:
            with open(screenshot_map_path, "r", encoding="utf-8") as sf_f:
                screenshot_map = json.load(sf_f)
            print(f"Loaded {len(screenshot_map)} screenshot mappings from cache.")
        except Exception as e:
            print(f"Error loading screenshot map: {e}")

    # Build a normalized YouTube lookup
    yt_lookup = {}
    for yt_title, yt_id in youtube_links.items():
        norm_yt = normalize_title(yt_title)
        if norm_yt:
            yt_lookup[norm_yt] = yt_id

    all_software = []
    
    files = sorted(os.listdir(directory))
    for f in files:
        if not f.endswith(".xml"):
            continue
        filepath = os.path.join(directory, f)
        all_software.extend(parse_xml_file(filepath))
            
    print(f"Total software entries collected: {len(all_software)}")
    
    # Map software entries to YouTube videos and screenshots
    yt_mapped_count = 0
    sf_mapped_count = 0
    for item in all_software:
        title = item.get('title', '')
        norm = normalize_title(title)
        
        # Screenshot mapping
        if title in screenshot_map:
            item['sf'] = True
            sf_mapped_count += 1
        
        # YouTube mapping
        yt = None
        if norm in yt_lookup:
            yt = yt_lookup[norm]
        else:
            if len(norm) > 4:
                for yt_norm, yt_id in yt_lookup.items():
                    if len(yt_norm) > 4:
                        if norm in yt_norm or yt_norm in norm:
                            yt = yt_id
                            break
        if yt:
            item['yt'] = yt
            yt_mapped_count += 1
            
    print(f"Mapped {sf_mapped_count} screenshots and {yt_mapped_count} / {len(all_software)} software entries to YouTube gameplay videos.")

    # Abbreviate entries to save file size
    abbreviated_software = [abbreviate(item, translations_cache) for item in all_software]
    
    output_js_path = os.path.join(directory, "apple2_data.js")
    with open(output_js_path, "w", encoding="utf-8") as out:
        out.write("// Automatically generated Apple II Database file (abbreviated)\n")
        out.write("const APPLE2_RAW_DATA = ")
        json.dump(abbreviated_software, out, ensure_ascii=False)
        out.write(";\n")
        
    print(f"Optimized dataset written to {output_js_path}")

if __name__ == "__main__":
    main()
