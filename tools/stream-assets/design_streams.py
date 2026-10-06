import json,math,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'outputs'/'NeonMind-Stream-Pakete-v1'
ROOT.mkdir(parents=True,exist_ok=True)
PACKS=[
 {'id':'studio-orbit','name':'Studio Orbit','topic':'Allgemein','tag':'YOUR SPACE. YOUR STORY.','variants':[('Cyan Violet','#23dcf5','#a576ff','#050c19'),('Coral Gold','#ff8b80','#efcd87','#161019'),('Ice Blue','#a7dfff','#709fff','#080e1c')]},
 {'id':'voltage-arena','name':'Voltage Arena','topic':'Gaming','tag':'PLAY WITH PRESENCE.','variants':[('Acid Lime','#baf438','#45e3da','#0a100f'),('Cyber Pink','#2de7fa','#f56dce','#070a19'),('Lava Orange','#ff9445','#ff5268','#140b10')]},
 {'id':'prism-sessions','name':'Prism Sessions','topic':'Musik','tag':'FEEL THE FREQUENCY.','variants':[('Lavender Rose','#b7a4ff','#ff95bb','#110b22'),('Sapphire Gold','#69aaff','#f2d08a','#060d20'),('Mint Coral','#8ce4cf','#ff9e92','#08191a')]},
 {'id':'afterhours-deck','name':'Afterhours Deck','topic':'DJ','tag':'IN THE MIX.','variants':[('Electric Cyan','#35e4f7','#e86edc','#050b18'),('Amber Red','#ffb950','#ff6565','#160b0c'),('Ultraviolet','#bb94ff','#7fbcff','#0e0822')]},
 {'id':'slow-brew','name':'Slow Brew','topic':'Coffee Chill','tag':'A LITTLE ROOM TO UNWIND.','variants':[('Oat Espresso','#d3ae7b','#efe1c8','#201a16'),('Sage Cream','#aac3a1','#f1e4ca','#18211b'),('Terracotta Sand','#d8987e','#ead4b0','#291d1a')]}
]
manifest=[]
def esc(s):return html.escape(str(s))
def rect(x,y,w,h,fill,stroke='none',sw=1,rx=18):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def line(x1,y1,x2,y2,c,sw=2,opacity=1):return f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{c}" stroke-width="{sw}" opacity="{opacity}"/>'
def circle(x,y,r,c,sw=1,fill='none',opacity=1):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{c}" stroke-width="{sw}" opacity="{opacity}"/>'
def text(value,x,y,size=32,color='#f2f5f9',bold=True):
 return {'name':value,'value':value,'x':x,'y':y,'size':size,'color':color,'bold':bold}
def textsvg(t):return f'<text x="{t["x"]}" y="{t["y"]}" font-family="Arial" font-size="{t["size"]}" font-weight="{700 if t["bold"] else 400}" fill="{t["color"]}">{esc(t["value"])}</text>'
def svg(w,h,parts):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><linearGradient id="accent"><stop stop-color="{A}"/><stop offset="1" stop-color="{B}"/></linearGradient><radialGradient id="ambient"><stop stop-color="{A}" stop-opacity=".16"/><stop offset="1" stop-color="{A}" stop-opacity="0"/></radialGradient></defs>'+''.join(parts)+'</svg>'
def background(theme):
 parts=[rect(0,0,1920,1080,D,rx=0),'<ellipse cx="1590" cy="460" rx="850" ry="720" fill="url(#ambient)"/>',line(96,980,1824,980,A,1,.18)]
 if theme=='studio-orbit':
  for r in [140,260,385,520]:parts.append(circle(1505,495,r,A,1,opacity=.23))
  for x,y,r in [(1600,340,10),(1142,495,8),(1505,755,13)]:parts.append(circle(x,y,r,B,0,fill=B,opacity=.8))
  parts.append(line(1280,100,1750,840,B,2,.2))
 elif theme=='voltage-arena':
  for i in range(10):
   x=900+i*105;parts.append(f'<path d="M{x} 80L{x-480} 1000" stroke="{A}" stroke-width="{4 if i%3==0 else 1}" opacity="{.16 if i%3==0 else .08}"/>')
  parts.append(f'<path d="M1390 290H1740L1580 640H1250Z" fill="{A}" fill-opacity=".07" stroke="{A}" stroke-width="3"/>')
  parts.append(f'<path d="M1490 390H1600L1495 580H1370Z" fill="{B}" fill-opacity=".1"/>')
 elif theme=='prism-sessions':
  for i in range(64):
   height=70+200*(.5+.5*math.sin(i*.26))*abs(math.sin(i*.91))
   parts.append(rect(1060+i*11,540-height/2,4,height,A if i<32 else B,rx=2))
  for r in [220,265,310]:parts.append(circle(1410,540,r,B,1,opacity=.16))
 elif theme=='afterhours-deck':
  for cx in [1240,1635]:
   parts.append(circle(cx,610,170,A,3,fill=D,opacity=.9))
   for r in range(65,158,14):parts.append(circle(cx,610,r,B,1,opacity=.16))
   parts.append(circle(cx,610,43,A,2,opacity=.8));parts.append(circle(cx,610,6,B,0,fill=B))
  for i in range(9):parts.append(rect(1432,490+i*28,22,10,A if i<6 else B,rx=2))
  parts.extend([line(1390,440,1390,795,A,1,.3),line(1475,440,1475,795,B,1,.3)])
 else:
  for r in [245,290,335]:parts.append(circle(1480,535,r,A,1,opacity=.15))
  parts.append(rect(1300,465,245,160,D,A,4,rx=45));parts.append('<path d="M1545 492C1660 465 1660 618 1545 600" fill="none" stroke="'+A+'" stroke-width="7"/>')
  parts.append('<ellipse cx="1422" cy="644" rx="170" ry="20" fill="'+A+'" opacity=".13"/>')
  for x in [1360,1420,1480]:parts.append(f'<path d="M{x} 432C{x-32} 398 {x+30} 368 {x} 328" fill="none" stroke="{B}" stroke-width="4" stroke-linecap="round" opacity=".45"/>')
  for i in range(8):
   y=810-i*52;parts.append(f'<ellipse cx="{1750+(-25 if i%2 else 25)}" cy="{y}" rx="38" ry="11" transform="rotate({-30 if i%2 else 30} 1750 {y})" fill="{A}" opacity=".3"/>')
  parts.append(line(1750,440,1750,860,A,2,.4))
 return ''.join(parts)
def frame(x,y,w,h,style):
 radius=24 if style=='slow-brew' else 4 if style=='voltage-arena' else 18
 parts=[rect(x-5,y-5,w+10,h+10,'none',A,2,rx=radius),rect(x-10,y-10,w+20,h+20,'none',A,1,rx=radius+4)]
 if style=='voltage-arena':
  for xx,yy,sx,sy in [(x,y,1,1),(x+w,y,-1,1),(x,y+h,1,-1),(x+w,y+h,-1,-1)]:parts.append(f'<path d="M{xx+sx*45} {yy-7*sy}H{xx-7*sx}V{yy+sy*45}" fill="none" stroke="{B}" stroke-width="5"/>')
 elif style=='studio-orbit':parts.extend([circle(x+w-20,y-5,5,B,0,fill=B),circle(x+20,y+h+5,5,B,0,fill=B)])
 elif style in ['prism-sessions','afterhours-deck']:
  for i in range(20):
   height=3+8*abs(math.sin(i*.72));parts.append(line(x+i*9+24,y+h+8,x+i*9+24,y+h+8+height,B,2,.7))
 return ''.join(parts)
def deco_badge(x,y,w=170):return rect(x,y,w,36,A,rx=18 if current['id']=='slow-brew' else 6)

for current in PACKS:
 folder=ROOT/current['id'];folder.mkdir(exist_ok=True)
 pack={'id':current['id'],'name':current['name'],'topic':current['topic'],'folder':str(folder),'variants':[]}
 for label,A,B,D in current['variants']:
  variant=label.lower().replace(' ','-');vdir=folder/variant
  src=vdir/'Quellen-SVG';src.mkdir(parents=True,exist_ok=True)
  layerdir=vdir/'PSD-Bausteine';layerdir.mkdir(exist_ok=True)
  assets=[]
  def asset(name,w,h,parts,texts=None,transparent=False,windows=None,master=True):
   texts=texts or [];layers=[]
   for i,(lname,body) in enumerate(parts):
    file=layerdir/(name+f'-{i:02}.svg');file.write_text(svg(w,h,[body]),encoding='utf-8');layers.append({'name':lname,'svg':str(file)})
   allparts=[body for _,body in parts]+[textsvg(t) for t in texts]
   file=src/(name+'.svg');file.write_text(svg(w,h,allparts),encoding='utf-8')
   assets.append({'name':name,'width':w,'height':h,'svg':str(file),'layers':layers,'texts':texts,'transparent':transparent,'windows':windows or [],'master':master})
  theme=current['id'];bg=background(theme)
  asset('Background',1920,1080,[('Hintergrund und Themenmotiv',bg)],master=False)
  states=[('Starting-Soon','GLEICH GEHT’S LOS','Mach es dir bequem. Wir starten in Kürze.'),('Be-Right-Back','KURZE PAUSE','Wir sind gleich wieder für dich da.'),('Stream-Ended','DANKE FÜRS DABEISEIN','Bis zum nächsten Stream.'),('Offline','GERADE OFFLINE','Der nächste Stream kommt. Bleib verbunden.')]
  for name,title,subtitle in states:
   parts=[('Hintergrund',bg),('Akzent und Status',line(96,323,280,323,A,5)+deco_badge(96,130,192))]
   texts=[text(current['topic'].upper()+' / LIVE',112,155,17,D),text('KANALNAME',96,276,44,B),text(title,96,450,72),text(subtitle,99,523,27,'#d4d7de',False),text('@DEINHANDLE',99,870,25,B),text(current['tag'],99,947,18,'#a8adb8',False)]
   asset(name,1920,1080,parts,texts)
  if theme=='voltage-arena':windows=[{'name':'Gameplay','x':40,'y':112,'w':1536,'h':864},{'name':'Webcam','x':72,'y':680,'w':480,'h':270}];infobox=(1620,155,260,560)
  elif theme=='prism-sessions':windows=[{'name':'Performance','x':64,'y':150,'w':1120,'h':630},{'name':'Webcam','x':1264,'y':150,'w':592,'h':333}];infobox=(1264,570,592,240)
  elif theme=='afterhours-deck':windows=[{'name':'Deck-Kamera','x':64,'y':132,'w':1260,'h':708},{'name':'DJ-Kamera','x':1388,'y':132,'w':468,'h':263}];infobox=(1388,500,468,310)
  elif theme=='slow-brew':windows=[{'name':'Hauptkamera','x':84,'y':156,'w':1120,'h':630},{'name':'Zweitkamera','x':1284,'y':156,'w':552,'h':310.5}];infobox=(1284,558,552,230)
  else:windows=[{'name':'Gameplay oder Kamera','x':64,'y':140,'w':1320,'h':742.5},{'name':'Webcam','x':1450,'y':140,'w':400,'h':225}];infobox=(1450,465,400,360)
  top=rect(0,0,1920,94,D,rx=0)+line(64,94,1856,94,A,2,.8)
  bottom=rect(0,1005,1920,75,D,rx=0)+line(64,1005,1856,1005,A,1,.5)
  liveparts=[('Kopfleiste',top),('Fußleiste',bottom)]
  for win in windows:liveparts.append((win['name']+' – Rahmen',frame(win['x'],win['y'],win['w'],win['h'],theme)))
  ix,iy,iw,ih=infobox;liveparts.append(('Infofläche',rect(ix,iy,iw,ih,D,A,1,rx=20)))
  extra='NOW PLAYING' if theme in ['prism-sessions','afterhours-deck'] else 'TAKE A BREATH' if theme=='slow-brew' else 'STREAM INFO'
  live_text=[text('KANALNAME',64,60,30),text('LIVE',1740,58,22,A),text('@DEINHANDLE',64,1053,22,B),text(current['tag'],1000,1053,19,'#c8ccd4',False),text(extra,ix+24,iy+48,20,A),text('DEIN TITEL',ix+24,iy+100,24),text('DEINE INFO',ix+24,iy+149,18,'#c8ccd4',False)]
  asset('Live-Overlay',1920,1080,liveparts,live_text,True,windows)
  asset('Minimal-Overlay',1920,1080,[('Kopfleiste',top),('Fußleiste',bottom)],[text('KANALNAME',64,60,30),text('LIVE',1740,58,22,A),text('@DEINHANDLE',64,1053,22,B)],True,[{'name':'Freie Spielfläche','x':0,'y':96,'w':1920,'h':907}])
  chatwins=[{'name':'Kamera','x':80,'y':164,'w':1200,'h':675},{'name':'Chat','x':1392,'y':164,'w':448,'h':752}]
  chatparts=[('Kopfleiste',top),('Fußleiste',bottom),('Kamerarahmen',frame(80,164,1200,675,theme)),('Chatrahmen',frame(1392,164,448,752,theme))]
  asset('Just-Chatting-Overlay',1920,1080,chatparts,[text('KANALNAME',64,60,30),text('JUST CHATTING',80,127,25,A),text('CHAT',1392,127,24,B),text('@DEINHANDLE',64,1053,22,B)],True,chatwins)
  for name,w,h in [('Webcam-16x9',640,360),('Webcam-Square',512,512),('Webcam-Portrait',360,640)]:
   asset(name,w,h,[('Kamerarahmen',frame(14,14,w-28,h-28,theme))],transparent=True,windows=[{'name':'Kamera','x':18,'y':18,'w':w-36,'h':h-36}],master=False)
  asset('Lower-Third',960,160,[('Leiste',rect(4,4,952,152,D,A,2,rx=26)),('Akzent',rect(4,4,12,152,A,rx=3))],[text('KANALNAME',42,69,31),text('@DEINHANDLE',44,114,24,B,False)],True,master=False)
  panel_labels=[('About','ÜBER MICH'),('Schedule','ZEITPLAN'),('Socials','SOCIALS'),('Support','SUPPORT'),('Rules','REGELN'),('Equipment','SETUP'),('Music','MUSIK'),('Contact','KONTAKT')]
  for index,(pname,caption) in enumerate(panel_labels):
   design=rect(2,2,316,116,D,A,1,rx=20 if theme=='slow-brew' else 8)+rect(2,2,7,116,A,rx=2)+circle(42,59,16,B,2)+line(34,59,50,59,B,2)+line(42,51,42,67,B,2)
   asset('Panel-'+pname,320,120,[('Panel und Symbol',design)],[text(caption,78,67,23)],True,master=False)
  desc={'name':label,'id':variant,'colors':{'accent':A,'secondary':B,'background':D},'folder':str(vdir),'assets':assets}
  pack['variants'].append(desc)
 manifest.append(pack)
(ROOT/'Produktionsmanifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'packs':len(manifest),'variants':15,'pngPlanned':sum(len(v['assets']) for p in manifest for v in p['variants'])}))
