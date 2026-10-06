import json,math,zipfile,hashlib,html
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[2]/'outputs'/'NeonMind-Stream-Pakete-v1'
manifest=json.loads((ROOT/'Produktionsmanifest.json').read_text(encoding='utf-8'))
font=ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf',26)
small=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',19)
titlefont=ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf',38)
results=[]
def checker(size):
 im=Image.new('RGB',size,(17,23,34));d=ImageDraw.Draw(im)
 for y in range(0,size[1],32):
  for x in range(0,size[0],32):
   if (x//32+y//32)%2:d.rectangle((x,y,x+31,y+31),fill=(25,34,46))
 return im
def fittext(draw,value,x,y,maxwidth,size,color,fontname=r'C:\Windows\Fonts\arialbd.ttf'):
 f=ImageFont.truetype(fontname,size)
 while draw.textlength(value,font=f)>maxwidth and size>10:size-=1;f=ImageFont.truetype(fontname,size)
 draw.text((x,y),value,font=f,fill=color)
def live_mock(v,asset):
 im=Image.open(Path(v['folder'])/'PNG'/'Background.png').convert('RGBA');d=ImageDraw.Draw(im)
 for i,w in enumerate(asset['windows']):
  box=(int(w['x']),int(w['y']),int(w['x']+w['w']),int(w['y']+w['h']))
  d.rectangle(box,fill=(14+8*i,31+9*i,45+9*i))
  for n in range(9):
   x=box[0]+int(n*w['w']/8);d.line((x,box[1],x,box[3]),fill=(45,67,82),width=1)
  for n in range(5):
   y=box[1]+int(n*w['h']/4);d.line((box[0],y,box[2],y),fill=(45,67,82),width=1)
  if 'chat' in w['name'].lower():
   for j in range(6):d.rounded_rectangle((box[0]+24,box[1]+30+j*92,box[2]-24,box[1]+70+j*92),radius=10,fill=(35,48,65))
  fittext(d,w['name'].upper(),box[0]+24,box[1]+int(w['h']/2)-36,w['w']-48,36,(166,192,210))
  fittext(d,'PLATZHALTER / DEMO',box[0]+24,box[1]+int(w['h']/2)+18,w['w']-48,18,(112,144,165))
 im=Image.alpha_composite(im,Image.open(Path(v['folder'])/'PNG'/(asset['name']+'.png')).convert('RGBA'))
 return im.convert('RGB')
for p in manifest:
 folder=Path(p['folder']);previews=folder/'Shop-Vorschauen';previews.mkdir(exist_ok=True)
 total_png=0;total_psd=0;total_text=0;variants_data=[]
 for v in p['variants']:
  vf=Path(v['folder']);pngs=list((vf/'PNG').glob('*.png'));assert len(pngs)==32
  checks=[]
  for a in v['assets']:
   im=Image.open(vf/'PNG'/(a['name']+'.png')).convert('RGBA');assert im.size==(a['width'],a['height'])
   alpha=np.array(im.getchannel('A'))
   if not a['transparent']:assert alpha.min()==255
   for i,w in enumerate(a['windows']):
    x,y=int(w['x'])+26,int(w['y'])+26;right,bottom=int(w['x']+w['w'])-26,int(w['y']+w['h'])-26
    region=alpha[y:bottom,x:right].copy()
    # Gaming camera intentionally sits over the gameplay area; exclude its frame from that area's check.
    for other in a['windows'][i+1:]:
     ox0=max(x,int(other['x'])-18);oy0=max(y,int(other['y'])-18);ox1=min(right,int(other['x']+other['w'])+25);oy1=min(bottom,int(other['y']+other['h'])+25)
     if ox1>ox0 and oy1>oy0:region[oy0-y:oy1-y,ox0-x:ox1-x]=0
    assert region.size and region.max()==0,(p['id'],v['id'],a['name'],w['name'],'transparent window obstructed')
   checks.append({'file':a['name']+'.png','pixels':im.size,'transparentWindows':len(a['windows'])})
  for file in sorted((vf/'PSD').glob('*.psd')):
   doc=PSDImage.open(file);types=[layer for layer in doc.descendants() if layer.kind=='type']
   assert len(doc)==(7 if file.name.startswith('01') else 8 if file.name.startswith('02') else 4)
   assert sum(group.visible for group in doc)==1
   assert all(t.text and t.engine_dict for t in types)
   total_text+=len(types);total_psd+=1
   # Independent reader must recover the rendered composite and native type layers.
   merged=doc.composite(force=True);assert merged is not None and merged.size==doc.size
   expected_name='Starting-Soon' if file.name.startswith('01') else 'Panel-About' if file.name.startswith('02') else 'Lower-Third'
   expected=Image.new('RGBA',doc.size);expected.alpha_composite(Image.open(vf/'PNG'/(expected_name+'.png')).convert('RGBA'))
   actual=np.asarray(merged.convert('RGBA'),dtype=np.int16);reference=np.asarray(expected,dtype=np.int16)
   assert np.abs(actual[:,:,3]-reference[:,:,3]).max()<=2,(file,'PSD alpha composite differs')
   opaque=reference[:,:,3]>250
   assert np.abs(actual[:,:,:3][opaque]-reference[:,:,:3][opaque]).max()<=3,(file,'PSD layer order/composite differs')
  total_png+=len(pngs)
  layout={a['name']:a['windows'] for a in v['assets'] if a['windows']}
  (vf/'OBS-Positionen.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding='utf-8')
  variants_data.append({'id':v['id'],'name':v['name'],'colors':v['colors'],'png':32,'psd':3,'checks':checks})
 first=p['variants'][0];af={a['name']:a for a in first['assets']}
 live=live_mock(first,af['Live-Overlay']);chat=live_mock(first,af['Just-Chatting-Overlay'])
 live.save(previews/'01-Live-Layout.jpg',quality=90);chat.save(previews/'02-Just-Chatting.jpg',quality=90)
 Image.open(Path(first['folder'])/'PNG'/'Starting-Soon.png').convert('RGB').save(previews/'03-Starting-Soon.jpg',quality=90)
 # Three colour variants plus a matching overview of assets.
 variants_sheet=Image.new('RGB',(1440,365),(5,11,21));draw=ImageDraw.Draw(variants_sheet)
 for i,v in enumerate(p['variants']):
  img=Image.open(Path(v['folder'])/'PNG'/'Starting-Soon.png').convert('RGB');img.thumbnail((472,266));variants_sheet.paste(img,(i*480,40));draw.text((i*480+12,317),v['name'],font=small,fill='#d6e0e8')
 variants_sheet.save(previews/'04-Farbvarianten.jpg',quality=91)
 panels_sheet=Image.new('RGB',(1360,330),(5,11,21));draw=ImageDraw.Draw(panels_sheet)
 draw.text((20,18),'8 PANELS · EDITIERBARE TEXTVORLAGEN',font=font,fill='#d6e0e8')
 for i,a in enumerate([a for a in first['assets'] if a['name'].startswith('Panel-')]):panels_sheet.paste(Image.open(Path(first['folder'])/'PNG'/(a['name']+'.png')).convert('RGB'),(20+i%4*335,75+i//4*125))
 panels_sheet.save(previews/'05-Panels.jpg',quality=91)
 camera_sheet=checker((1440,720));draw=ImageDraw.Draw(camera_sheet);draw.text((30,18),'TRANSPARENTE WEBCAM-RAHMEN · 3 FORMATE',font=font,fill='#d6e0e8')
 for name,pos in [('Webcam-16x9',(25,120)),('Webcam-Square',(690,120)),('Webcam-Portrait',(1230,95))]:
  im=Image.open(Path(first['folder'])/'PNG'/(name+'.png')).convert('RGBA');im.thumbnail((640,560) if '16' in name else (500,500) if 'Square' in name else (190,550));camera_sheet.paste(im,pos,im)
 camera_sheet.save(previews/'06-Webcam-Formate.jpg',quality=91)
 overview=Image.new('RGB',(1600,1220),(4,10,19));d=ImageDraw.Draw(overview);d.text((30,22),p['name']+' / '+p['topic'],font=titlefont,fill='#e7eef7');d.text((32,74),'3 FARBEN · 96 PNG · 9 PSD · EDITIERBARE TEXTE · SVG-QUELLEN',font=small,fill='#94b8d1')
 for i,name in enumerate(['01-Live-Layout','02-Just-Chatting','03-Starting-Soon','04-Farbvarianten','05-Panels','06-Webcam-Formate']):
  tile=Image.open(previews/(name+'.jpg'));tile.thumbnail((745,330));x=30+i%2*785;y=130+i//2*355;overview.paste(tile,(x,y));d.text((x,y+330),name[3:].replace('-',' '),font=small,fill='#c2d1df')
 overview.save(folder/'Paket-Uebersicht.jpg',quality=93)
 for file in previews.glob('*.jpg'):
  im=Image.open(file);im.thumbnail((1100,900));d=ImageDraw.Draw(im);d.rectangle((0,im.height-26,im.width,im.height),fill=(3,9,18));d.text((10,im.height-23),'NEONMIND · VORSCHAU · DEMOINHALTE',font=ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf',13),fill='#a5c3d8');im.save(file,quality=90)
 # A clean local visual gallery for reviewing the actual PNGs on transparency checkerboards.
 gallery='<html lang="de"><meta charset="utf-8"><title>'+p['name']+' Vorschau</title><style>body{background:#07101c;color:#eaf2fb;font:16px Arial;padding:25px}h1{font-size:40px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}img{width:100%;background:repeating-conic-gradient(#172130 0% 25%,#243044 0% 50%) 0/24px 24px}.card{border:1px solid #26415a;border-radius:15px;padding:15px}small{color:#95b5ce}</style><h1>'+p['name']+'</h1><p>3 Farben · 96 PNG-Dateien · 9 PSD-Dateien mit getrennten Ebenen und bearbeitbaren Texten.</p>'
 for v in p['variants']:
  gallery+='<h2>'+v['name']+'</h2><div class="grid">'
  for name in ['Starting-Soon','Live-Overlay','Just-Chatting-Overlay','Webcam-16x9','Panel-About','Lower-Third']:
   gallery+='<div class="card"><h3>'+name+'</h3><img src="'+v['id']+'/PNG/'+name+'.png"><small>Originaldatei · native Pixelgröße</small></div>'
  gallery+='</div>'
 (folder/'Vorschau.html').write_text(gallery,encoding='utf-8')
 (folder/'OBS-ANLEITUNG.txt').write_text(f'''{p['name']} – NeonMind Stream Essentials v1

Statisches Grafikpaket für OBS und ähnliche Streaming-Programme.
3 Farbvarianten: {', '.join(v['name'] for v in p['variants'])}.
1920 × 1080 native Szenen, sRGB; keine Audio-/Video-Dateien oder Animationen.

SO STARTET DER TEST
1. ZIP vollständig in einen festen Ordner entpacken. Eine Farbvariante auswählen.
2. OBS: Einstellungen > Video > Basis-Leinwand 1920 × 1080. Bei anderer Leinwand muss die Gestaltung proportional angepasst werden.
3. Szene für Start/Pause/Ende erstellen. Quelle > Bild: jeweilige PNG-Datei wählen, auf die Leinwand einpassen.
4. Live-Szene: Spielaufnahme oder Kamera zuerst anlegen. Die PNG Live-Overlay-Ohne-Text.png darüber als Bildquelle legen. Position des Overlays: x=0, y=0; Größe 1920 × 1080.
5. Kamera und Spielaufnahme auf die Fenster aus OBS-Positionen.json ausrichten. Das Innenmaß ist dort angegeben; Seitenverhältnis erhalten, bei Bedarf bewusst beschneiden. Beim Gaming-Paket überlappt die Webcam absichtlich das Spielbild.
6. Für Chatting: Background.png unten, Kamera darüber, optional eine eigene Browser-Quelle für den Chat in den Chatbereich, Just-Chatting-Overlay-Ohne-Text.png ganz oben. Der Chat ist kein integrierter Dienst: Die URL deines eigenen Chat-Widgets trägst du selbst in OBS ein.
7. Namen, Handle und Infotitel als OBS-Textquellen über dem Overlay hinzufügen. Die Dateien ohne Text lassen sich sofort verwenden. Die Varianten mit KANALNAME/DEINHANDLE sind Vorlagen zum Anpassen.
8. Webcam-Rahmen einzeln über die Kamera legen. Dateien 640 × 360, 512 × 512 oder 360 × 640; transparentes Innenfenster. Kamera proportional auf den Rahmen abstimmen.
9. Panels sind 320 × 120. Für Twitch passende PNGs als Kanal-Panels hochladen; andere Plattformen unterstützen andere Kanalflächen. Keine plattformspezifischen Kanalbanner enthalten.

PSD BEARBEITEN
In jeder Farbe liegen drei PSDs:
01-Szenen.psd: sieben Gruppen. Nur EINE Szenengruppe gleichzeitig sichtbar schalten.
02-Panels.psd: acht Panel-Gruppen, jeweils eine sichtbar. Dokument 320 × 120.
03-Elemente.psd: drei Webcam-Gruppen und eine Lower-Third-Gruppe auf einer 960 × 640 Leinwand. Für einzelne Elemente Exportbereich zuschneiden oder direkt fertige PNGs verwenden.
Texte sind native Textebenen. Doppelklick auf die T-Ebene, Inhalt bearbeiten und bestätigen.
Rahmen, Leisten und Dekoration sind getrennte Pixelebenen. Für vollständig skalierbare Formen/Farben zusätzlich die SVG-Dateien in Quellen-SVG bearbeiten.
Schrift: Arial Regular/Bold. Die Schriftdateien sind NICHT beigelegt. Fehlt Arial, eine eigene verfügbare Schrift wählen und Zeilenbreite prüfen. Bei manchen Editoren/Photoshop-Versionen kann beim ersten Öffnen eine Textaktualisierung verlangt werden; danach neue PNGs exportieren.
PSD-Dateien sind mit einem unabhängigen PSD-Leser geprüft. Vor endgültigem Einsatz im eigenen Editor ansehen und einen Testexport machen.

PSD/SVG > PNG: Transparenz erhalten, 1920 × 1080 für Szenen, sRGB. Keine JPGs für transparente Overlays verwenden. Die JPG-Shopbilder sind nur Vorschauen mit Demo-Inhalten.
Es gibt keine automatische OBS-Installation, importierbare Szenensammlung, dynamischen Alerts, Stinger, Audios oder animierten Overlays in dieser Ausgabe.
''',encoding='utf-8')
 (folder/'NUTZUNG.txt').write_text('NeonMind Stream Essentials v1\n\nErlaubt: Nutzung und Anpassung für den eigenen Twitch-, YouTube- oder sonstigen Streaming-Kanal, einschließlich monetarisierter Streams und eigener Kanalwerbung. Die PSDs/SVGs dürfen für diesen Zweck bearbeitet werden. Kein Weiterverkauf, Verschenken oder öffentliche Weitergabe der Ausgangsdateien/Asset-Sammlung. Keine Exklusivität: Dasselbe Design kann von mehreren Käufern genutzt werden. Eine Käuferlizenz gilt für den eigenen Kanal bzw. die eigenen zugehörigen Plattformauftritte.\n\nKeine fremden Plattformlogos, Spielgrafiken, Musikdateien, Künstlerbilder oder Schriftdateien im Paket. Demoinhalte in Vorschauen sind Platzhalter. Technische Einrichtung, Konto-Verknüpfung und Chat-Dienste erfolgen separat.\n',encoding='utf-8')
 report={'id':p['id'],'name':p['name'],'topic':p['topic'],'png':total_png,'psd':total_psd,'nativeTextLayers':total_text,'variants':variants_data,'transparencyVerified':True}
 (folder/'Paketdaten.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 archive=ROOT/('NeonMind-'+p['id']+'-Stream-v1.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for file in sorted(folder.rglob('*')):
   if file.is_file() and 'PSD-Bausteine' not in file.parts and 'Shop-Vorschauen' not in file.parts:z.write(file,file.relative_to(folder))
 assert archive.stat().st_size<50*1024*1024
 with zipfile.ZipFile(archive) as z:assert z.testzip() is None
 results.append({'id':p['id'],'name':p['name'],'topic':p['topic'],'folder':str(folder),'zip':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'png':total_png,'psd':total_psd,'textLayers':total_text,'gallery':[str(previews/n) for n in ['01-Live-Layout.jpg','02-Just-Chatting.jpg','03-Starting-Soon.jpg','04-Farbvarianten.jpg','05-Panels.jpg','06-Webcam-Formate.jpg']]})
 print(json.dumps({k:v for k,v in results[-1].items() if k not in ['gallery','folder','zip','sha256']}),flush=True)
(ROOT/'Gepruefte-Pakete.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
