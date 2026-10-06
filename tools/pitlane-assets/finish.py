import json,hashlib,zipfile,uuid,subprocess,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
from psd_tools import PSDImage

ROOT=Path(os.environ.get('NEONMIND_PITLANE_ROOT',Path(__file__).resolve().parents[2]/'outputs'/'NeonMind-Pitlane-v1'))
manifest=json.loads((ROOT/'Asset-Manifest.json').read_text(encoding='utf-8'))
for a in manifest:a['folder']=Path(a['file']).parent.name
font=ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf',28)
small=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',17)
text_count=0
reports=[]
for file in sorted((ROOT/'PSD').glob('*.psd')):
    doc=PSDImage.open(file)
    typed=[l for l in doc.descendants() if l.kind=='type']
    assert typed and all(l.engine_dict for l in typed),file.name
    assert all('joel' not in l.text.lower() for l in typed)
    text_count+=len(typed)
    asset=next((a for a in manifest if a['name']==file.stem),None)
    composite=doc.composite(force=True).convert('RGBA')
    if asset:
        if file.stem in ['Starting-Soon','Be-Right-Back','Stream-Ended','Offline']:
            assert sum(len(l.effects) for l in typed)==6
            # Floating-point compositing can round opaque alpha to 254.
            assert np.array(composite)[:,:,3].min()>=254
            composite=composite.convert('RGB').convert('RGBA')
            composite.save(ROOT/asset['file'])
        else:
            expected=np.array(Image.open(ROOT/asset['file']).convert('RGBA')).astype(int)
            actual=np.array(composite).astype(int)
            assert np.abs(expected[:,:,3]-actual[:,:,3]).max()<=2,file.name
            opaque=(expected[:,:,3]>250)&(actual[:,:,3]>250)
            assert np.abs(expected[:,:,:3]-actual[:,:,:3])[opaque].max()<=4,file.name
    reports.append({'file':file.name,'width':doc.width,'height':doc.height,'nativeTextLayers':len(typed),'effects':sum(len(l.effects) for l in typed),'independentComposite':True})
    print('PSD verified: '+file.name,flush=True)

# Update merged PSD previews after applying their real, editable Photoshop text effects.
subprocess.run([r'C:\Program Files\nodejs\node.exe',str(Path(__file__).with_name('refresh_cache.cjs'))],check=True)

for a in manifest:
    im=Image.open(ROOT/a['file']).convert('RGBA');assert im.size==(a['width'],a['height'])
    pixels=np.array(im)
    for r in a['windows']:
        alpha=pixels[r['y']:r['y']+r['h'],r['x']:r['x']+r['w'],3]
        assert alpha.shape==(r['h'],r['w']) and not alpha.any(),a['name']+' aperture'
    if a['folder']=='Szenen':assert pixels[:,:,3].min()==255,a['name']
    if a['noText']:assert Image.open(ROOT/a['noText']).size==im.size
    assert not any('joel' in t.lower() for t in a['texts'])

def preview(a):
    image=Image.open(ROOT/a['file']).convert('RGBA')
    if a['windows']:
        bg=Image.new('RGBA',image.size,(8,9,12,255));d=ImageDraw.Draw(bg)
        for i,r in enumerate(a['windows']):
            x,y,w,h=[r[k] for k in ('x','y','w','h')]
            d.rectangle((x,y,x+w-1,y+h-1),fill=(17,21,27,255))
            d.line((x,y+h,x+w,y),fill=(40,46,56,255),width=1)
            label='SPIEL / KAMERA' if i==0 else 'LIVE CHAT' if h>w else 'WEBCAM'
            d.text((x+25,y+h/2-20),label,font=font,fill='#b3bac4')
            d.text((x+25,y+h/2+20),'DEMO-PLATZHALTER',font=small,fill='#777f89')
        bg.alpha_composite(image);image=bg
    image=image.convert('RGB');image.thumbnail((1100,1000))
    return image

byname={a['name']:a for a in manifest}
gallery=[('Live-Overlay','01-Live.jpg'),('Starting-Soon','02-Starting-Soon.jpg'),('Just-Chatting-Overlay','03-Chatting.jpg'),('Be-Right-Back','04-Pause.jpg')]
for name,file in gallery:preview(byname[name]).save(ROOT/'Shop-Vorschauen'/file,quality=92)
for file in (ROOT/'Shop-Vorschauen').glob('*.jpg'):
    im=Image.open(file).convert('RGB');d=ImageDraw.Draw(im)
    d.rectangle((0,im.height-25,im.width,im.height),fill='#08090c')
    d.text((10,im.height-23),'NEONMIND PITLANE · VORSCHAU · DEMOINHALTE',font=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',12),fill='#b8bdc5')
    im.save(file,quality=92)

# A customer gallery reviews actual original PNG exports, including their alpha.
html='''<!doctype html><html lang="de"><meta charset="utf-8"><title>NeonMind Pitlane</title><style>body{background:#08090b;color:#eee;font:16px Arial;margin:30px}h1{font-size:38px}a{color:#f34b4b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.card{border:1px solid #48494b;border-radius:10px;padding:15px}img{max-width:100%;background:repeating-conic-gradient(#17191d 0% 25%,#292d33 0% 50%) 0/24px 24px}</style><h1>NEONMIND / PITLANE</h1><p>Originale PNG-Dateien · Schachbrett = echte Transparenz. Texte in PSD bearbeiten oder die Dateien ohne Text mit OBS-Textquellen verwenden.</p><div class="grid">'''
for a in manifest:
    html+=f'<div class="card"><h2>{a["name"]}</h2><a href="{a["file"]}"><img src="{a["file"]}" loading="lazy"></a><p>{a["width"]} × {a["height"]}</p></div>'
(ROOT/'Vorschau.html').write_text(html+'</div>',encoding='utf-8')

overview=Image.new('RGB',(1600,1300),'#08090b');d=ImageDraw.Draw(overview)
d.text((30,20),'NEONMIND / PITLANE',font=ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf',42),fill='#eeeeef')
d.text((32,78),'Gaming Stream-Paket · Rot / Carbon / Metall · echte Exporte',font=font,fill='#ec373c')
for i,file in enumerate(['01-Live.jpg','02-Starting-Soon.jpg','03-Chatting.jpg','04-Pause.jpg','05-Panels.jpg','06-Webcam.jpg']):
    im=Image.open(ROOT/'Shop-Vorschauen'/file);im.thumbnail((745,350))
    x=30+(i%2)*785;y=140+(i//2)*380;overview.paste(im,(x,y));d.text((x,y+350),file[3:-4],font=small,fill='#cbd0d8')
overview.save(ROOT/'Paket-Uebersicht.jpg',quality=94)

instructions='''NEONMIND PITLANE – Gaming Stream-Paket v1

1. ZIP vollständig in einen festen Ordner entpacken. Vorschau.html zeigt alle Originalgrafiken.
2. OBS-Leinwand auf 1920 × 1080 einstellen. Bei anderen Größen die komplette Gestaltung proportional skalieren.
3. Die Szenen unter PNG/Szenen als Bildquelle verwenden. Für eigene Namen die jeweilige PSD öffnen, Texte bearbeiten und neu als PNG exportieren. Alternativ die Datei ohne Text verwenden und eigene OBS-Textquellen hinzufügen.
4. Live-Overlay als Bildquelle oben anlegen. Darunter Spielaufnahme, Kamera und eigenen Chat platzieren. Die Fenster sind echte transparente Ausschnitte. Maße und Positionen stehen in OBS-Positionen.json. Rechtsklick auf die Aufnahme > Transformieren > Transformation bearbeiten. Seitenverhältnis erhalten; gegebenenfalls bewusst beschneiden.
5. Just Chatting verwendet die große Fläche für die Kamera und rechts den Chat. Gameplay-Overlay ist ein freier Rahmen ohne Hintergrund; der Hintergrund wird durch das eigene Spiel gefüllt.
6. Die Webcam-Dateien haben transparente Innenflächen in 16:9, Quadrat und 9:16. Mit dem Rahmen gemeinsam skalieren; Aufnahme darunterlegen.
7. Die zwölf Panels liegen in 640 × 160 und zusätzlich in 320 × 80 für den Kanal bereit. Texte und Symbole sind getrennte Ebenen in Panels.psd.
8. Alert-Karten sind statische Grafiken. In einem eigenen Alert-Dienst als Hintergrund verwenden und Namen/Texte dort ergänzen. Sie lösen selbst keine Ereignisse aus und enthalten keine Sounds.

OBS-IMPORT (WINDOWS, OPTIONAL)
OBS-Import-vorbereiten.ps1 im entpackten Paket ausführen. Das Skript erstellt ausschließlich NeonMind-Pitlane-OBS.json in diesem Ordner und setzt die Bildpfade passend zum Entpackort. Es ändert weder OBS-Einstellungen noch vorhandene Szenen.
Danach in OBS: Szenensammlung > Importieren > NeonMind-Pitlane-OBS.json auswählen. Die importierte Sammlung enthält die sieben Bildszenen. Spiel, Kamera, Chat und eigene Textquellen anschließend selbst ergänzen. Der Import legt keine Kamera-/Mikrofonverbindungen und keine Streaming-Zugangsdaten an. Den Paketordner danach am gleichen Ort lassen oder den Import erneut vorbereiten.
Die Sammlung ist strukturell gegen das lokal vorhandene OBS-Szenenformat geprüft, aber nicht in einer laufenden OBS-Sitzung mit deinen Geräten getestet.

PSD BEARBEITEN
Sieben einzelne Szenen-/Overlay-PSDs, Panels.psd und Elemente.psd. Texte sind native Textebenen (T), einschließlich editierbarer Chrom-/Rotverläufe auf den großen Überschriften. Artwork, Rahmen, Leisten und Symbole sind getrennte Pixelebenen. Generierte Materialien sind Rastergrafik, keine frei parametrisierbaren 3D-Objekte.
Panels.psd und Elemente.psd enthalten Gruppen: nur die gewünschte Gruppe sichtbar schalten. Elemente.psd ist 960 × 704; für einzelne Elemente den Exportbereich beschneiden oder die fertigen PNGs verwenden.
Schrift: Arial Regular, Bold und Bold Italic. Schriftdateien sind nicht beigefügt. Falls dein Editor Arial nicht findet, eine eigene verfügbare Schrift wählen, Breite prüfen und neu exportieren. PSD-Texte/Effekte können beim ersten Öffnen eine Aktualisierung verlangen. Als PNG in sRGB exportieren; für Overlays Transparenz erhalten. JPGs sind nur Vorschauen.

GRAFIKUMFANG
Statische Ausgabe in einer roten Farbwelt. Kein Countdown, keine Stinger-Animation, keine Audio-Dateien und keine automatische Konto-/Chat-Anbindung. Die Grafikexporte sind 1920 × 1080; das generierte Garagen-Artwork hat 1672 × 941 Ausgangspixel und wird in den Szenen passend skaliert. Es wird keine native 4K-Auflösung behauptet.
'''
(ROOT/'START-HIER.txt').write_text(instructions,encoding='utf-8')
(ROOT/'NUTZUNG.txt').write_text('''NeonMind Pitlane – Nutzung

Anpassung und Verwendung für den eigenen Streaming-Kanal, einschließlich monetarisierter Streams und der zugehörigen eigenen Kanalwerbung, erlaubt. Die PSDs dürfen hierfür bearbeitet werden. Die Lizenz ist nicht exklusiv. Kein Weiterverkauf oder öffentliche Weitergabe der Vorlagendateien/Asset-Sammlung. Drittanbieter-Programme, Plattformkonten, Chat-, Musik- und Alert-Dienste sind nicht Bestandteil des Pakets.
Garagen-, Rahmen- und Panel-Artwork wurde KI-gestützt anhand der vom Shop-Betreiber bereitgestellten Gestaltungsreferenzen erstellt. Vorschauen enthalten ausdrücklich gekennzeichnete Demo-Flächen. Es werden keine Personenbilder und keine Schriftdateien mitgeliefert.
''',encoding='utf-8')
(ROOT/'Quellen/PRODUKTION.txt').write_text('''Bildbausteine erstellt mit der eingebauten Bildgenerierung anhand der freigegebenen NeonMind-Pitlane-Vorschau.
Garagen-Prompt: fotorealistische schwarze Rennsport-Garage, rotes LED-Licht, nasser Boden, schwarzer Rennwagen rechts, links Platz für Überschriften; keine Personen, keine Wörter, kein Joel und kein Portrait-Ring.
Rahmen-Prompt: einzelner freigestellter rechteckiger Metall-/Carbonrahmen mit echten transparenten Innen-/Außenflächen, silbernen Fasen und roten LED-Segmenten; keine Texte, Personen oder Logos.
Panel-Prompt: einzelne schwarze Glas-/Metallkarte mit silbernen Fasen, roten LEDs und Garagenmotiv rechts, links freier Platz für Texte und Icons.
Die drei Ausgangsdateien liegen hier bei. Die endgültige Komposition, Fenster und Texte werden aus getrennten Bausteinen hergestellt. Die freigegebene Konzeptgrafik dient nur als Gestaltungsreferenz und ist kein fertiges OBS-Overlay.
''',encoding='utf-8')

def uid():return str(uuid.uuid4())
def source(name,kind,settings):return {'name':name,'uuid':uid(),'id':kind,'versioned_id':kind,'settings':settings,'mixers':0,'sync':0,'flags':0,'volume':1.,'balance':.5,'enabled':True,'muted':False,'hotkeys':{},'private_settings':{}}
sources=[];order=[]
scene_names=[('Starting-Soon','01 – Start'),('Live-Overlay','02 – Live'),('Gameplay-Overlay','03 – Gameplay'),('Just-Chatting-Overlay','04 – Just Chatting'),('Be-Right-Back','05 – Pause'),('Stream-Ended','06 – Ende'),('Offline','07 – Offline')]
for asset_name,scene_name in scene_names:
    a=byname[asset_name];image=source('Pitlane Bild – '+asset_name,'image_source',{'file':'__PAKETPFAD__/'+a['file'],'unload':False});sources.append(image)
    item={'name':image['name'],'source_uuid':image['uuid'],'visible':True,'locked':True,'rot':0.,'pos':{'x':0.,'y':0.},'scale':{'x':1.,'y':1.},'align':5,'bounds_type':0,'bounds_align':0,'bounds':{'x':0.,'y':0.},'crop_left':0,'crop_top':0,'crop_right':0,'crop_bottom':0,'id':1}
    scene=source(scene_name,'scene',{'id_counter':1,'items':[item]});sources.append(scene);order.append({'name':scene_name})
collection={'name':'NeonMind Pitlane','sources':sources,'groups':[],'scene_order':order,'current_scene':order[0]['name'],'current_program_scene':order[0]['name'],'current_transition':'Fade','transition_duration':300,'transitions':[],'quick_transitions':[],'saved_projectors':[],'preview_locked':False,'scaling_enabled':False,'scaling_level':0,'scaling_off_x':0.,'scaling_off_y':0.,'virtual-camera':{'type':2},'modules':{},'resolution':{'x':1920,'y':1080},'version':2}
(ROOT/'OBS-Sammlung-Vorlage.json').write_text(json.dumps(collection,ensure_ascii=False,indent=2),encoding='utf-8')
assert len([s for s in collection['sources'] if s['id']=='scene'])==7
for s in collection['sources']:
    if s['id']=='image_source':assert (ROOT/s['settings']['file'].split('__PAKETPFAD__/')[1]).exists()
(ROOT/'OBS-Import-vorbereiten.ps1').write_text('''$ErrorActionPreference = 'Stop'
$packageRoot = $PSScriptRoot.Replace('\\','/')
$templateFile = Join-Path $PSScriptRoot 'OBS-Sammlung-Vorlage.json'
$outputFile = Join-Path $PSScriptRoot 'NeonMind-Pitlane-OBS.json'
$collection = Get-Content -LiteralPath $templateFile -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($source in $collection.sources) {
    if ($source.id -eq 'image_source') {
        $source.settings.file = $source.settings.file.Replace('__PAKETPFAD__', $packageRoot)
        if (-not (Test-Path -LiteralPath $source.settings.file)) { throw 'Bilddatei fehlt: ' + $source.settings.file }
    }
}
$json = $collection | ConvertTo-Json -Depth 30
[IO.File]::WriteAllText($outputFile, $json, [Text.UTF8Encoding]::new($false))
Write-Host 'Fertig. In OBS unter Szenensammlung > Importieren diese Datei waehlen:'
Write-Host $outputFile
''',encoding='utf-8')

# Avoid four identical copies of the blank state artwork in the customer archive.
seen={}
for a in manifest:
    if a['folder']=='Szenen' and a['noText'] and a['name'] in dict((x[0],x) for x in scene_names):
        p=ROOT/a['noText'];digest=hashlib.sha256(p.read_bytes()).hexdigest()
        if digest in seen:a['noText']=seen[digest]
        else:seen[digest]=a['noText']
(ROOT/'Asset-Manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
report={'name':'NeonMind Pitlane','psd':len(reports),'nativeTextLayers':text_count,'pngFiles':len(list((ROOT/'PNG').rglob('*.png'))),'alphaVerified':True,'psdCompositesVerified':True,'obsSceneCount':7,'obsLiveSessionTested':False,'psdReport':reports}
(ROOT/'Pruefbericht.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
archive=ROOT.parent/'NeonMind-Pitlane-Gaming-v1.zip'
skip={'Starting-PSD-Probe.png','NeonMind-Pitlane-OBS.json'}
used_bare=set(a['noText'] for a in manifest if a['noText'])
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in sorted(ROOT.rglob('*')):
        if not file.is_file() or 'Shop-Vorschauen' in file.parts or file.name in skip:continue
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith('PNG/Szenen/') and '-Ohne-Text' in file.name and rel not in used_bare:continue
        z.write(file,rel)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    report['customerPngFiles']=sum(n.startswith('PNG/') and n.endswith('.png') for n in z.namelist())
report.update({'zip':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'gallery':[str(p) for p in sorted((ROOT/'Shop-Vorschauen').glob('*.jpg'))]})
(ROOT.parent/'Pitlane-Publish.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['psdReport','gallery']},ensure_ascii=False),flush=True)
