const origin='https://shop.neonmind-ai.com';
const single=(value,max=180)=>String(value??'').replace(/[\r\n\x00-\x1f\x7f]/g,' ').slice(0,max);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export function customerMessage(kind,p){
 const reference=single(p.reference,80),short=reference.slice(0,8);
 let title,subject,paragraphs,link,label;
 if(kind==='inquiry'){
  title='Deine Anfrage ist angekommen.';subject='Eingangsbestätigung · '+short;
  paragraphs=[p.name?'Hallo '+single(p.name,100)+',':'Hallo,','vielen Dank für deine Nachricht an NeonMind. Wir haben deine '+(p.inquiryKind==='wish'?'Wunschanfrage':'Kontaktanfrage')+' erhalten und melden uns nach der Prüfung bei dir.','Deine Referenznummer: '+reference,'Diese Eingangsbestätigung ist keine Bestellung und keine Zusage zu Preis oder Liefertermin. Bewahre die Referenz für Rückfragen auf.'];
  link=origin;label='Zum NeonMind Shop';
 }else if(kind==='order'||kind==='payment'){
  const paid=kind==='payment';title=paid?'Deine Zahlung ist bestätigt.':'Deine Bestellung ist eingegangen.';subject=(paid?'Zahlungsbestätigung':'Bestelleingang')+' · '+short;
  paragraphs=['Hallo,',paid?'vielen Dank! Die Zahlung für deine Bestellung wurde erfolgreich bestätigt.':'vielen Dank für deine Bestellung bei NeonMind. Diese Nachricht bestätigt den Eingang deiner Bestellung; sie ist noch keine Zahlungsbestätigung.','Bestellnummer: '+reference,'Deine Bestellung:\n'+p.items.map(i=>single(i.name,160)+' — '+euro(i.price)).join('\n'),'Gesamtbetrag: '+euro(p.amount)];
  if(paid){
   const downloads=p.items.some(i=>!i.service),services=p.items.some(i=>i.service);
   if(downloads)paragraphs.push('Deine gekauften Downloadpakete sind im geschützten Bestellbereich verfügbar.');
   if(services)paragraphs.push('Enthaltene persönliche Designleistungen werden nach der vereinbarten Bearbeitung geliefert. Dafür steht noch kein sofort fertiges Downloadpaket bereit.');
  }else paragraphs.push('Zahlungsstatus bei der Bestellaufnahme: noch nicht bestätigt. Nach erfolgreicher Zahlungsprüfung erhältst du eine weitere Nachricht.');
  if(p.purchaseMode==='guest')paragraphs.push('Bei einem Gastkauf öffnest du deine Bestellung mit der Bestellnummer und dem vertraulichen Bestellschlüssel aus dem Kaufabschluss. Der Schlüssel wird in dieser E-Mail nicht mitgeschickt.');
  link=origin+(p.purchaseMode==='guest'?'/guest':'/downloads');label=p.purchaseMode==='guest'?'Gastbestellung öffnen':'Meine Käufe & Downloads';
 }else throw new Error('Unbekannte Kundenmail');
 paragraphs.push('Bei Fragen antworte einfach auf diese E-Mail.','Viele Grüße\nDein NeonMind-Team');
 const text=title+'\n\n'+paragraphs.join('\n\n')+'\n\n'+label+': '+link+'\n\nNeonMind · neonmind-ai.com';
 const html='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#020914;color:#eaf4ff;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:30px 14px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#061323;border:1px solid #19cce5;border-radius:16px"><tr><td style="padding:28px"><div style="font-size:22px;letter-spacing:3px;font-weight:bold;color:#19e7ff">NEON<span style="color:#e84be6">MIND</span></div><div style="color:#94b4da;font-size:11px;letter-spacing:2px;margin-top:5px">DEIN SHOP. DEINE DESIGNWELT.</div><h1 style="font-size:27px;line-height:1.3;margin:28px 0 22px;color:#f3f7ff">'+esc(title)+'</h1>'+paragraphs.map(t=>'<p style="font-size:15px;line-height:1.7;color:#c7d9ee;margin:0 0 17px">'+esc(t).replace(/\n/g,'<br>')+'</p>').join('')+'<p style="margin:28px 0"><a href="'+link+'" style="display:inline-block;background:#19dff0;color:#03111e;font-weight:bold;padding:14px 20px;border-radius:9px;text-decoration:none">'+esc(label)+'</a></p><div style="border-top:1px solid #644a97;padding-top:18px;font-size:12px;color:#8eaccf">NeonMind · <a href="https://neonmind-ai.com" style="color:#19e7ff">neonmind-ai.com</a><br><a href="'+origin+'/impressum" style="color:#9ac4ea">Impressum</a> · <a href="'+origin+'/datenschutz" style="color:#9ac4ea">Datenschutz</a></div></td></tr></table></td></tr></table></body></html>';
 return {subject:'NeonMind Shop · '+subject,text,html};
}
