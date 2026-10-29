// /podcast/redaktion: login-formular, eller (når man er logget ind) listen over afsnit,
// hvor redaktøren kan lægge et billede op til hvert afsnit eller fjerne sit eget.

const login = require('../lib/login');
const { hentAlt, sikkert, esc, danskDato } = require('../lib/podcast');
const { egneBilleder } = require('../lib/billeder');
const side = require('../lib/side');

const EKSTRA_CSS = `<style>
.raekke { display:flex; gap:12px; align-items:center; background:#fff; border-radius:12px; padding:10px; margin-bottom:10px; box-shadow:0 3px 10px rgba(18,58,100,.08); }
.raekke img { width:112px; aspect-ratio:16/9; object-fit:cover; border-radius:8px; flex-shrink:0; background:#f4efe6; }
.raekke .info { flex:1; min-width:0; }
.raekke .info b { display:block; }
.raekke .info small { color:#5a6b80; }
.raekke .valg { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.raekke label, .raekke button { font:600 14px/1 -apple-system,Helvetica,Arial,sans-serif; padding:9px 12px; border-radius:999px; cursor:pointer; }
.raekke label { background:#123a64; color:#fff; }
.raekke button { background:#fff; color:#123a64; border:1px solid #123a64; }
.raekke input[type=file] { display:none; }
.status { font-size:13px; color:#5a6b80; }
form.login input { display:block; width:100%; padding:12px 14px; border-radius:12px; border:1px solid #c9c2b4; font:inherit; margin:6px 0 12px; }
form.login button { padding:12px 18px; border-radius:999px; border:0; background:#123a64; color:#fff; font:600 16px/1 -apple-system,Helvetica,Arial,sans-serif; cursor:pointer; }
</style>`;

const SCRIPT = `<script>
(function(){
function status(r,t){r.querySelector('.status').textContent=t;}
function formindsk(fil){return new Promise(function(ok,fejl){var img=new Image();img.onload=function(){var m=1600,s=Math.min(1,m/Math.max(img.width,img.height));var c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(function(b){b?ok(b):fejl();},'image/jpeg',0.86);};img.onerror=fejl;img.src=URL.createObjectURL(fil);});}
document.querySelectorAll('.raekke').forEach(function(r){
var id=r.getAttribute('data-id');
r.querySelector('input[type=file]').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;status(r,'Lægger billedet op …');
formindsk(f).then(function(b){return fetch('/api/upload?id='+id,{method:'POST',headers:{'Content-Type':'image/jpeg','X-Podcast':'1'},body:b});})
.then(function(s){return s.json().then(function(j){if(!s.ok)throw new Error(j.fejl||'Fejl');r.querySelector('img').src=j.url;status(r,'Gemt. Vises på siden inden for 15 minutter.');var k=r.querySelector('button');if(k)k.hidden=false;});})
.catch(function(x){status(r,(x&&x.message)||'Billedet kunne ikke lægges op.');});});
var knap=r.querySelector('button');if(knap)knap.addEventListener('click',function(){if(!confirm('Fjern dit billede fra dette afsnit?'))return;status(r,'Fjerner …');
fetch('/api/upload?id='+id,{method:'DELETE',headers:{'X-Podcast':'1'}}).then(function(s){if(!s.ok)throw new Error();knap.hidden=true;status(r,'Fjernet. Afsnittet viser igen YouTube-billedet eller coveret.');}).catch(function(){status(r,'Det lykkedes ikke. Prøv igen.');});});
});})();
</script>`;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const mail = login.redaktoer(req);

  if (!mail) {
    return res.status(200).send(side.ramme({
      titel: 'Redaktion – log ind', beskrivelse: '', sti: '/podcast/redaktion', ikkeIndeks: true,
      indhold: `${EKSTRA_CSS}${side.banner()}<h2>Redaktion</h2>
<form class="login" method="post" action="/api/login">
<label for="mail">Din mailadresse</label><input id="mail" name="mail" type="email" autocomplete="email" required>
<button type="submit">Send login-link</button></form>`,
    }));
  }

  const egne = await sikkert(egneBilleder, {});
  const { afsnit, show } = await hentAlt(egne);
  const raekker = afsnit.map((a) => `<div class="raekke" data-id="${esc(a.id)}">
<img src="${esc(a.billede || show.cover)}" alt="" loading="lazy">
<div class="info"><b>${esc(a.titel)}</b><small>${esc(danskDato(a.dato))} · ${a.egetBillede ? 'eget billede' : a.youtube ? 'billede fra YouTube' : 'podcastens cover'}</small>
<div class="valg"><label>Vælg billede<input type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button"${a.egetBillede ? '' : ' hidden'}>Fjern eget billede</button></div>
<span class="status"></span></div></div>`).join('\n');

  return res.status(200).send(side.ramme({
    titel: 'Redaktion', beskrivelse: '', sti: '/podcast/redaktion', ikkeIndeks: true,
    indhold: `${EKSTRA_CSS}${side.banner()}<h2>Redaktion</h2>
<p>Logget ind som ${esc(mail)}. <a href="/api/login?ud=1">Log ud</a></p>
<p>Vælg et billede til et afsnit. Det erstatter YouTube-billedet eller coveret på podcastsiderne.</p>
${raekker || '<p>Afsnittene kunne ikke hentes lige nu.</p>'}${SCRIPT}`,
  }));
};
