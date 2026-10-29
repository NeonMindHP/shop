"""Build reduced public motif previews; never modify buyer packages or source images."""
from pathlib import Path
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('F:/Projekte/OnlineShop')
OUT = ROOT / 'dist/assets/package-previews'
manifest = {}
extras = {
 'aurora': ('Aurora Nights - Polar Silence', 'Download-JPG', 12),
 'flow': ('Neon Flow - Liquid Spectrum', 'Download-JPG', 12),
 'autumn-reverie': ('Autumn Reverie - Golden Worlds', 'Download-JPG', 12),
 'amber-atelier': ('Amber Atelier - Autumn Editions', 'Download-JPG', 12),
 'celestial-echoes': ('Celestial Echoes - Otherworldly Prints', 'Download-JPG', 12),
 'neo-deco': ('Neo Deco - Midnight Geometry', 'Download-JPG', 12),
 'redline-garage': ('Redline Garage - 18 Wallpaper & Poster', 'Redline-Garage/Wallpaper', 18),
}
packages = []
for folder in sorted(SOURCE.iterdir()):
    metadata = folder / 'Produkt.json'
    if not metadata.exists():
        continue
    data = json.loads(metadata.read_text(encoding='utf-8-sig'))
    if data.get('category') not in ('Wallpaper', 'Poster'):
        continue
    candidates = [folder/'Kaeuferpaket/Wallpaper', folder/'Kaeuferpaket/Motive', folder/'Wallpaper']
    files = next((sorted(d.iterdir()) for d in candidates if d.is_dir()), [])
    packages.append((data['id'], files, data['count'], data.get('galleryTitles', [])))
for id, (folder, subdir, count) in extras.items():
    packages.append((id, sorted((SOURCE/folder/subdir).iterdir()), count, []))
for id, files, count, titles in packages:
    files = [f for f in files if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')]
    assert len(files) == count, (id, len(files), count)
    assert id not in manifest, id
    target = OUT/id
    target.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, file in enumerate(files, 1):
        with Image.open(file) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
            image.thumbnail((960, 960), Image.Resampling.LANCZOS)
            image.save(target/f'{i:02}.jpg', quality=78, optimize=True)
        entries.append({'title': titles[i-1] if i <= len(titles) else f'Motiv {i:02}',
                        'image': f'/assets/package-previews/{id}/{i:02}.jpg', 'clean': True})
    manifest[id] = entries
(ROOT/'dist/package-previews.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'packages': len(manifest), 'motifs': sum(map(len, manifest.values())),
                  'bytes': sum(p.stat().st_size for p in OUT.rglob('*.jpg'))}))
