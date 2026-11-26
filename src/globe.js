/* ---------- globe hero: the app's dark map on a globe, real satellites (SGP4), aircraft and ships, the app's day/night ---------- */
(function glInit(tries){
  tries=tries||0;if(!window.THREE)return;
  const hero=document.getElementById('hero'),cv=document.getElementById('globe'),tc=document.getElementById('gltrail'),LB=document.getElementById('gllabels'),panel=document.getElementById('glpanel'),statusEl=document.getElementById('glstatus');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer=null;for(const o of [{antialias:true},{antialias:false},{antialias:false,powerPreference:'low-power'}]){try{renderer=new THREE.WebGLRenderer(Object.assign({canvas:cv},o));break}catch(e){}}
  if(!renderer){if(tries<4)setTimeout(()=>glInit(tries+1),1200*(tries+1));else cv.style.display='none';return}
  cv.style.display='';cv.addEventListener('webglcontextlost',e=>e.preventDefault(),false);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;renderer.setClearColor(0x0d0f14,1);
  const ctx=tc.getContext('2d');let sel=null;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,1,5000);
  const R=100,D2R=Math.PI/180,RE=6371;
  const V=(lat,lon,h=0)=>{const th=(90-lat)*D2R,ph=(lon+180)*D2R,r=R+h;return new THREE.Vector3(-r*Math.cos(ph)*Math.sin(th),r*Math.cos(th),r*Math.sin(ph)*Math.sin(th))};
  let texPending=0;const t0=performance.now();const showGlobe=()=>{const go=()=>{if(window.__hpDrawn||performance.now()-t0>4000){requestAnimationFrame(()=>requestAnimationFrame(()=>hero.classList.add('gl-ready')))}else setTimeout(go,80)};go()};const texDone=()=>{if(--texPending<=0)showGlobe()};setTimeout(()=>hero.classList.add('gl-ready'),6000);
  const tex=src=>{texPending++;const t=new THREE.TextureLoader().load(src,texDone,undefined,texDone);t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t};

  /* the app's day/night: the night side under rgba(10,10,60,0.18) */
  const sunU={value:new THREE.Vector3(1,0,0)};
  function sunVec(date){const d=date/864e5+2440587.5-2451545,g=(357.529+.98560028*d)*D2R,q=280.459+.98564736*d,L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*D2R,e=(23.439-3.6e-7*d)*D2R;
    const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L))/D2R,dec=Math.asin(Math.sin(e)*Math.sin(L))/D2R,gmst=(18.697374558+24.06570982441908*d)%24;
    let lon=ra-gmst*15;lon=((lon+540)%360)-180;return {lat:dec,lon}}
  const shade=map=>new THREE.ShaderMaterial({uniforms:{map:{value:map},sun:sunU},
    vertexShader:'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D map;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;void main(){vec4 t=texture2D(map,vUv);vec3 c=t.rgb;float dd=dot(normalize(vN),sun);float nt=1.-smoothstep(-.16,.04,dd);vec3 ov=vec3(.0012,.0016,.012);c=mix(c,ov,.62*nt);gl_FragColor=vec4(c,1.);\n#include <encodings_fragment>\n}'});
  /* the dark basemap: the app's fiord style colours, through its brightness(0.65) saturate(0.85) filter */
  /* star field: fixed in space, so it turns with the view */
  {const mk=(n,sz,op)=>{const g=new THREE.BufferGeometry(),p=new Float32Array(n*3);let k=0;while(k<n){const x=Math.random()*2-1,y=Math.random()*2-1,z=Math.random()*2-1,l=Math.hypot(x,y,z);if(l>1||l<.1)continue;const r=2600/l;p[k*3]=x*r;p[k*3+1]=y*r;p[k*3+2]=z*r;k++}
     g.setAttribute('position',new THREE.BufferAttribute(p,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:sz,sizeAttenuation:false,transparent:true,opacity:op,depthWrite:false})))};
   mk(2400,1,.6);mk(600,1.6,.75);mk(110,2.2,.95)}
  const baseMesh=new THREE.Mesh(new THREE.SphereGeometry(R,192,96),shade(tex(window.SIMG.fbase)));scene.add(baseMesh);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R+.01,160,128,(-16+180)*D2R,28*D2R,(90-64)*D2R,22*D2R),shade(tex(renderer.capabilities.maxTextureSize>=8192&&window.SIMG.fpatch8?window.SIMG.fpatch8:window.SIMG.fpatch))));

  /* ---- the app's map-label pill (mapLabelParts.ts) ---- */
  const FONT="'Barlow Condensed','Barlow',sans-serif";
  const pill=(bg='#000')=>{const p=document.createElement('div');p.className='mlp';p.style.background=bg;return p};
  const well=(svg,bg)=>`<span class="mlw"${bg?` style="background:${bg}"`:''}>${svg}</span>`;
  const glyph=(shape,rot=0)=>`<svg width="11" height="11" viewBox="0 0 12 12" style="transform:rotate(${rot}deg);transform-origin:center;transform-box:fill-box;display:block;overflow:visible">${shape}</svg>`;
  const arrowShape=c=>`<polygon points="6,1 10,11 6,8.5 2,11" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const vesselShape=c=>`<polygon points="6,1 8.8,4.2 8.8,11 6,9.6 3.2,11 3.2,4.2" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const badge=(t,bg,c)=>`<span class="tb" style="background:${bg};color:${c};font-size:12px;font-weight:700;padding:0 7px;letter-spacing:.05em;align-self:stretch;display:flex;align-items:center">${t}</span>`;
  const nameSeg=(t,side,c='#fff')=>`<span class="mln" style="color:${c};padding:${side==='left'?'3px 6px 3px 12px':'3px 10px 3px 6px'}">${t}</span>`;
  const accent=(t,bg,c)=>`<span class="mla" style="background:${bg};color:${c}">${t}</span>`;
  const dim=(l,v,c)=>`<span class="mld" style="color:${c}"><span>${l}</span>${v}</span>`;
  const leftFacing=b=>{b=((b%360)+360)%360;return b>=1&&b<=189};
  const needFlip=(o,b)=>{if(o.dir===null)return true;if(leftFacing(b)===o.dir)return false;const n=performance.now();if(o.flipT&&n-o.flipT<5000)return false;b=((b%360)+360)%360;const f=Math.min(Math.abs(b-0),Math.abs(b-360),Math.abs(b-180))>28;if(f)o.flipT=n;return f};
  const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

  /* altitude ramp from altitudeColour.ts: hue stops, hsl(h,85%,60%) on the dark map */
  const HUES=[[0,20],[2000,38],[4000,55],[8000,110],[10000,150],[20000,195],[30000,235],[40000,295]];
  function altColor(a){a=Math.min(Math.max(a||0,0),40000);let i=HUES.findIndex(([f])=>f>=a);if(i<=0)i=1;const [f0,h0]=HUES[i-1],[f1,h1]=HUES[i];return `hsl(${Math.round(h0+(a-f0)/(f1-f0)*(h1-h0))}, 85%, 60%)`}

  /* ---- the ISS, propagated with SGP4 from the TLE set, drawn with the app's satellite sprite ---- */
  const TLE=(window.STLE||[]).filter(t=>t[0].startsWith('ISS (ZARYA)')),SL=window.satellite;
  const sats=[];TLE.forEach(([n,l1,l2,c])=>{try{sats.push({kind:'space',name:n,cat:c,rec:SL.twoline2satrec(l1,l2),lat:0,lon:0,alt:0,vel:0,ok:false,trk:0})}catch(e){}});
  /* createSatelliteIcon() from satelliteSprites.ts, shown at icon-size 0.75 */
  const sc=document.createElement('canvas');sc.width=sc.height=96;{const c=sc.getContext('2d'),x=48,y=48;c.beginPath();c.moveTo(x,y-11);c.lineTo(x+9,y);c.lineTo(x,y+11);c.lineTo(x-9,y);c.closePath();c.fillStyle='#fff';c.fill();
    c.fillStyle='rgba(255,255,255,0.6)';c.fillRect(x-28,y-4,15,8);c.fillRect(x+13,y-4,15,8);c.strokeStyle='rgba(255,255,255,0.6)';c.lineWidth=2;c.beginPath();c.moveTo(x,y-11);c.lineTo(x,y-21);c.stroke()}
  function propSat(s,date){if(!SL)return;const pv=SL.propagate(s.rec,date);if(!pv||!pv.position){s.ok=false;return}
    const g=SL.eciToGeodetic(pv.position,SL.gstime(date));s.lat=g.latitude/D2R;s.lon=g.longitude/D2R;s.alt=g.height;const v=pv.velocity;s.vel=v?Math.hypot(v.x,v.y,v.z):0;s.ok=s.alt>80&&s.alt<45000;
    const d2=new Date(+date+20000),p2=SL.propagate(s.rec,d2);if(p2&&p2.position){const g2=SL.eciToGeodetic(p2.position,SL.gstime(d2));s.trk=Math.atan2(((g2.longitude/D2R-s.lon+540)%360-180)*Math.cos(s.lat*D2R),g2.latitude/D2R-s.lat)/D2R}}
  /* the ISS sits on its ground track, as on the app's flat Space map (drawn at the track's height so it never drifts off the line as the globe turns) */
  const satP=s=>V(s.lat,s.lon,.03);
  sats.forEach(s=>{propSat(s,new Date());s.el=document.createElement('div');s.el.className='issw';s.el.innerHTML=`<span class="brk"></span><img src="${sc.toDataURL()}" alt=""><span class="iss-label">${s.name}</span>`;LB.appendChild(s.el);s.el.addEventListener('click',e=>{e.stopPropagation();select(s)})});
  /* its ground track, as the app draws it: previous orbit dashed, then the current and next two orbits fading */
  const ORB=[{o:.35,dash:[1.5,3]},{o:.8},{o:.55},{o:.3}];let orbits=[[],[],[],[]],orbAt=0;
  function buildOrbits(){const s=sats[0];if(!s)return;const per=2*Math.PI/s.rec.no,now=Date.now();orbits=[0,1,2,3].map(k=>{const pts=[];const a0=(k-1)*per,a1=k*per;const add=m=>{const q={rec:s.rec};propSat(q,new Date(now+m*6e4));if(q.ok)pts.push([q.lat,q.lon])};for(let m=a0;m<a1;m+=1)add(m);add(a1);return pts});orbAt=now}
  buildOrbits();
  /* live TLE: re-read the ISS orbit from a JSON file (window.TLE_SOURCES) on load and every TLE_REFRESH_MIN minutes; the embedded set is the fallback */
  function applyTLE(list){const rows=(Array.isArray(list)?list:[]).map(r=>Array.isArray(r)?r:[r.name||r.OBJECT_NAME||'',r.line1||r.TLE_LINE1,r.line2||r.TLE_LINE2]);
    let n=0;sats.forEach(st=>{const r=rows.find(x=>x[0]&&x[1]&&x[2]&&(x[0].trim()===st.name.trim()||x[1].slice(2,7)===String(st.rec.satnum).padStart(5,'0')));if(!r)return;try{const rec=SL.twoline2satrec(r[1].trim(),r[2].trim());if(!rec.error){st.rec=rec;n++}}catch(e){}});
    if(n){sats.forEach(st=>propSat(st,new Date()));buildOrbits();window.TLE_LOADED=new Date()}return n}
  async function loadTLE(){for(const u of (window.TLE_SOURCES||[])){try{const r=await fetch(u+(u.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)continue;if(applyTLE(await r.json()))return true}catch(e){}}return false}
  loadTLE();setInterval(loadTLE,Math.max(1,window.TLE_REFRESH_MIN||30)*60000);

  /* ---- aircraft: live from adsb.lol where the page may reach it, otherwise demo traffic ---- */
  /* start at the visitor's own region, worked out from the browser's time zone (no network lookup); UK and unknown zones use the Isle of Man */
  const TZ={'Europe/Dublin':[53.35,-6.26],'Europe/Paris':[48.86,2.35],'Europe/Brussels':[50.85,4.35],'Europe/Amsterdam':[52.37,4.9],'Europe/Luxembourg':[49.61,6.13],'Europe/Berlin':[52.52,13.4],'Europe/Zurich':[47.37,8.54],'Europe/Vienna':[48.21,16.37],'Europe/Madrid':[40.42,-3.7],'Europe/Lisbon':[38.72,-9.14],'Atlantic/Canary':[28.12,-15.43],'Europe/Rome':[41.9,12.5],'Europe/Copenhagen':[55.68,12.57],'Europe/Oslo':[59.91,10.75],'Europe/Stockholm':[59.33,18.07],'Europe/Helsinki':[60.17,24.94],'Atlantic/Reykjavik':[64.15,-21.94],'Europe/Warsaw':[52.23,21.01],'Europe/Prague':[50.08,14.44],'Europe/Budapest':[47.5,19.04],'Europe/Bucharest':[44.43,26.1],'Europe/Sofia':[42.7,23.32],'Europe/Athens':[37.98,23.73],'Europe/Istanbul':[41.01,28.98],'Europe/Kiev':[50.45,30.52],'Europe/Kyiv':[50.45,30.52],'Europe/Moscow':[55.76,37.62],'Europe/Riga':[56.95,24.11],'Europe/Vilnius':[54.69,25.28],'Europe/Tallinn':[59.44,24.75],'Europe/Belgrade':[44.79,20.45],'Europe/Zagreb':[45.81,15.98],'Europe/Ljubljana':[46.06,14.51],'Europe/Bratislava':[48.15,17.11],'Europe/Malta':[35.9,14.51],
   'America/New_York':[40.71,-74.01],'America/Toronto':[43.65,-79.38],'America/Chicago':[41.88,-87.63],'America/Denver':[39.74,-104.99],'America/Phoenix':[33.45,-112.07],'America/Los_Angeles':[34.05,-118.24],'America/Vancouver':[49.28,-123.12],'America/Anchorage':[61.22,-149.9],'Pacific/Honolulu':[21.31,-157.86],'America/Halifax':[44.65,-63.57],'America/St_Johns':[47.56,-52.71],'America/Mexico_City':[19.43,-99.13],'America/Bogota':[4.71,-74.07],'America/Lima':[-12.05,-77.04],'America/Santiago':[-33.45,-70.67],'America/Sao_Paulo':[-23.55,-46.63],'America/Argentina/Buenos_Aires':[-34.6,-58.38],'America/Caracas':[10.48,-66.9],
   'Africa/Cairo':[30.04,31.24],'Africa/Lagos':[6.52,3.38],'Africa/Johannesburg':[-26.2,28.05],'Africa/Nairobi':[-1.29,36.82],'Africa/Casablanca':[33.57,-7.59],'Africa/Algiers':[36.75,3.06],'Africa/Accra':[5.6,-0.19],
   'Asia/Dubai':[25.2,55.27],'Asia/Qatar':[25.29,51.53],'Asia/Riyadh':[24.71,46.68],'Asia/Jerusalem':[31.77,35.21],'Asia/Tehran':[35.69,51.39],'Asia/Karachi':[24.86,67.01],'Asia/Kolkata':[19.08,72.88],'Asia/Calcutta':[19.08,72.88],'Asia/Dhaka':[23.81,90.41],'Asia/Bangkok':[13.76,100.5],'Asia/Singapore':[1.35,103.82],'Asia/Kuala_Lumpur':[3.14,101.69],'Asia/Jakarta':[-6.2,106.85],'Asia/Manila':[14.6,120.98],'Asia/Hong_Kong':[22.32,114.17],'Asia/Shanghai':[31.23,121.47],'Asia/Taipei':[25.03,121.57],'Asia/Seoul':[37.57,126.98],'Asia/Tokyo':[35.68,139.69],
   'Australia/Perth':[-31.95,115.86],'Australia/Adelaide':[-34.93,138.6],'Australia/Brisbane':[-27.47,153.03],'Australia/Sydney':[-33.87,151.21],'Australia/Melbourne':[-37.81,144.96],'Pacific/Auckland':[-36.85,174.76]};
  let tzName='';try{tzName=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
  const HOME=TZ[tzName]||[54.23,-4.53];

  let planes=[],airLive=false;
  const AP={LHR:[51.47,-.45],LGW:[51.15,-.19],MAN:[53.35,-2.27],EDI:[55.95,-3.36],DUB:[53.42,-6.27],AMS:[52.31,4.76],CDG:[49.01,2.55],FRA:[50.03,8.57],JFK:[40.64,-73.78],BOS:[42.36,-71.01],KEF:[63.98,-22.6],MAD:[40.47,-3.56],BCN:[41.3,2.08],PMI:[39.55,2.73],FCO:[41.8,12.25],OSL:[60.19,11.1],CPH:[55.62,12.65],ARN:[59.65,17.92],IST:[41.26,28.74],DOH:[25.27,51.6],DXB:[25.25,55.36],ZRH:[47.46,8.55],LIS:[38.77,-9.13],BHX:[52.45,-1.75],GLA:[55.87,-4.43],BFS:[54.66,-6.22],YYZ:[43.68,-79.63],ORD:[41.97,-87.9],TLV:[32.01,34.89],ATH:[37.94,23.94]};
  const ROUTES=[['LHR','JFK','BAW117','B77W'],['LHR','DOH','QTR8139','B77L'],['MAN','PMI','EZY57BU','A320'],['DUB','AMS','EIN612','A20N'],['LHR','BOS','VIR11','A35K'],['CDG','EDI','AFR1486','A21N'],['FRA','DUB','DLH978','A320'],['AMS','JFK','KLM641','B789'],['LGW','BCN','EZY8645','A320'],['EDI','LHR','BAW1443','A320'],['OSL','LHR','SAS4605','A20N'],['CPH','MAN','SAS2514','A20N'],['DXB','LHR','UAE1','A388'],['LHR','MAD','IBE3167','A21N'],['KEF','LHR','ICE450','B38M'],['BHX','DUB','RYR48','B38M'],['GLA','LGW','EZY884','A319'],['LHR','YYZ','ACA857','B789'],['ZRH','MAN','SWR350','BCS3'],['LIS','LHR','TAP1366','A20N'],['IST','LHR','THY1979','A333'],['ARN','LHR','BAW777','A320'],['BFS','LGW','EZY828','A20N'],['LHR','ORD','UAL929','B789'],['TLV','LHR','ELY011','B789'],['FCO','LHR','ITY202','A320'],['ATH','LHR','AEE600','A21N'],['AMS','EDI','KLM1281','E190'],['DUB','JFK','EIN105','A333'],['MAN','DXB','UAE18','A388']];
  const slerp=(a,b,t)=>{const A=V(a[0],a[1]).normalize(),B=V(b[0],b[1]).normalize(),w=Math.acos(Math.min(1,A.dot(B)));if(w<1e-6)return A;const s=Math.sin(w);return A.multiplyScalar(Math.sin((1-t)*w)/s).add(B.multiplyScalar(Math.sin(t*w)/s))};
  const toLL=v=>{const n=v.clone().normalize();const lat=90-Math.acos(n.y)/D2R;let lon=Math.atan2(n.z,-n.x)/D2R-180;lon=((lon+540)%360)-180;return [lat,lon]};
  const dist=(a,b)=>Math.acos(Math.min(1,V(a[0],a[1]).normalize().dot(V(b[0],b[1]).normalize())))*3440.065;
  const MIL0=[['RCH','C17'],['ASCOT','A400'],['RRR','A332'],['NATO','E3TF'],['LAGR','K35R'],['HOMER','P8'],['GAF','A400']];
  const rnd=(a,b)=>a+Math.random()*(b-a),shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
  /* demo aircraft: a different random set, direction, position and speed on every page load */
  function demoPlanes(){const pick=shuffle(ROUTES.slice()).slice(0,22+(Math.random()*9|0));return pick.map(([f,t,cs,type])=>{if(Math.random()<.5)[f,t]=[t,f];const a=AP[f],b=AP[t],len=dist(a,b);
    return {kind:'air',name:cs,type,from:f,to:t,a,b,len,p:rnd(.04,.96),kt:Math.round(rnd(420,500)),alt:Math.round(Math.min(41000,Math.max(7000,len*30+rnd(-5000,4000)))/1000)*1000,sq:String(1000+(Math.random()*6777|0)).padStart(4,'0'),hex:(0x400000+(Math.random()*0x3fffff|0)).toString(16).toUpperCase(),demo:true,trail:null}})}
  function planeLL(o){if(o.a){const [la,lo]=toLL(slerp(o.a,o.b,o.p)),[la2,lo2]=toLL(slerp(o.a,o.b,Math.min(1,o.p+.002)));o.lat=la;o.lon=lo;o.hdg=(Math.atan2((lo2-lo)*Math.cos(la*D2R),la2-la)/D2R+360)%360}}
  const HIST_N=100,HIST_DT=40;
  function seedHist(o){o.hist=[];o.hacc=0;if(o.vs===undefined){const r=Math.random();o.vs=r<.3?rnd(1200,2400):r<.5?-rnd(900,1800):0;if(o.vs>0)o.alt=Math.max(4000,Math.round(o.alt*rnd(.35,.7)/100)*100);o.tgt=o.vs>0?Math.round(rnd(33,41))*1000:o.vs<0?Math.round(rnd(2,6))*1000:o.alt}const n=5+(Math.random()*13|0);let back=0;const backs=[];for(let k=0;k<n;k++){back+=rnd(200,420)*(Math.random()<.15?2:1);backs.push(back)}for(let k=n-1;k>=0;k--){const back=backs[k];let la,lo;if(o.a){const pp=o.p-o.kt*back/3600/o.len;if(pp<.01)continue;[la,lo]=toLL(slerp(o.a,o.b,pp))}else{const nm=(o.gs||o.kt)*back/3600,h=o.hdg*D2R;la=o.lat-nm*Math.cos(h)/60;lo=o.lon-nm*Math.sin(h)/(60*Math.cos(o.lat*D2R))}o.hist.push([la,lo,Math.max(500,Math.min(43000,o.alt-o.vs*back/60))])}}
  function recHist(o,dt){if(!o.hist)seedHist(o);if(o.nextRep===undefined)o.nextRep=rnd(200,420);if(o.vs){o.alt+=o.vs*dt/60;if((o.vs>0&&o.alt>=o.tgt)||(o.vs<0&&o.alt<=o.tgt)){o.alt=o.tgt;o.vs=0}const c=altColor(o.alt);if(c!==o.col){o.col=c;o.dir=null}}o.hacc+=dt;if(o.hacc>=o.nextRep){o.hacc=0;o.nextRep=rnd(200,420);o.hist.push([o.lat,o.lon,o.alt]);if(o.hist.length>HIST_N)o.hist.shift()}}
  function movePlane(o,dt){recHist(o,dt);if(o.a){o.p+=o.kt*dt/3600/o.len;if(o.p>=.98){o.p=.02;o.hist=[];o.showAt=performance.now()+2500;/* re-enter at the route start unseen, never sliding backwards */if(o===sel)sel.trail=[]}planeLL(o)}
    else if(o.gs){const nm=o.gs*dt/3600,h=o.hdg*D2R;o.lat+=nm*Math.cos(h)/60;o.lon+=nm*Math.sin(h)/(60*Math.cos(o.lat*D2R))}}
  function setPlanes(list){planes.forEach(p=>p.el&&p.el.remove());planes=list;planes.forEach(o=>{if(o.a)planeLL(o);o.col=altColor(o.alt);o.el=pill();o.el.dataset.k='air';LB.appendChild(o.el);o.dir=null});(document.getElementById('nAir')||{}).textContent=planes.length}
  {const d=demoPlanes();const k=2+(Math.random()*2|0);for(let i=0;i<k&&i<d.length;i++){const m=MIL0[(Math.random()*MIL0.length)|0];const o=d[d.length-1-i];o.mil=true;o.name=m[0]+(10+(Math.random()*890|0));o.type=m[1]}setPlanes(d)}
  /* ---- ships: demo traffic on real UK sea lanes, in the app's vessel family colours ---- */
  const TYPEL={cargo:'CARGO',tanker:'TANKER',passenger:'PASSENGER',fishing:'FISHING',service:'TOWING',pleasure:'PLEASURE',other:'OTHER'};
  const FAM={cargo:'#39d5ff',tanker:'#ffb347',passenger:'#ff7adf',fishing:'#7cff9b',service:'#f7f0a3',pleasure:'#c9c9ff',other:'#9fb3c8'};
  const LANES=[[[51.05,1.45],[51.0,1.75],[50.95,1.85]],[[50.75,-1.3],[50.6,-1.0],[50.3,-.6],[49.7,-.3]],[[51.47,.6],[51.48,1.3],[51.6,2.1]],[[53.62,.25],[53.8,1.5],[54.0,3.0]],[[56.0,-2.6],[56.4,-1.8],[57.2,-1.2],[58.0,-.6]],[[53.32,-4.62],[53.34,-5.3],[53.35,-6.1]],[[53.45,-3.2],[53.8,-3.9],[54.15,-4.48]],[[50.2,-5.4],[49.8,-6.3],[49.4,-7.4]],[[51.35,-3.3],[51.25,-4.4],[51.0,-5.6]],[[55.85,-4.9],[55.55,-5.2],[55.15,-5.5]],[[54.65,-1.05],[54.9,.4],[55.3,2.2]]];
  /* demo vessels: a random set of names on random lanes, at random points and speeds on every page load */
  /* each demo vessel keeps to waters it would really use: [name, type, lane] (lanes above: 0 Dover Strait, 1 Solent, 2 Thames, 3 Humber, 4 Forth, 5 Holyhead–Dublin, 6 Mersey–Isle of Man, 7 Land's End, 8 Bristol Channel, 9 Clyde, 10 Tees) */
  const SPOOL=[['Pride of Kent','passenger',0],['Victoria of Wight','passenger',1,'232015630'],['Hamburg Express','cargo',0],['Norbank','cargo',3],['Stena Adventurer','passenger',5],['Glen Sannox','passenger',9],['Celtic Explorer','fishing',8],['Valiant Spirit','tanker',10],['Thames Star','service',2],['Atlantic Sail','cargo',6],['Ocean Endeavour','pleasure',7],['Manannan','passenger',6],['Fortune Leader','tanker',4],['Maersk Kensington','cargo',2],['Spirit of Discovery','passenger',1]];
  const poolR=shuffle(SPOOL.slice()),nShip=7+(Math.random()*4|0);
  const ships=poolR.slice(0,nShip).map(([n,fam,li,mm])=>{const lane=LANES[li];return {kind:'sea',name:n,fam,col:FAM[fam],lane,seg:Math.random()*(lane.length-1)|0,t:Math.random(),dir:Math.random()<.5?1:-1,kt:+rnd(8,21).toFixed(1),mmsi:mm||String(232000000+(Math.random()*999999|0)),trail:null,lat:0,lon:0,hdg:0}});
  function shipLL(o){const L=o.lane,s=Math.min(o.seg,L.length-2),a=L[s],b=L[s+1];o.lat=a[0]+(b[0]-a[0])*o.t;o.lon=a[1]+(b[1]-a[1])*o.t;const h=Math.atan2((b[1]-a[1])*Math.cos(o.lat*D2R),b[0]-a[0])/D2R;o.hdg=((o.dir>0?h:h+180)+360)%360}
  function moveShip(o,dt){if(o.free){const nm=o.kt*dt/3600,h=o.hdg*D2R,la=o.lat+nm*Math.cos(h)/60,lo=o.lon+nm*Math.sin(h)/(60*Math.cos(o.lat*D2R)),ah=o.lat+.35*Math.cos(h),al=o.lon+.35*Math.sin(h)/Math.cos(o.lat*D2R);if(nearLand(ah,al)){o.kt=0;return}/* kept simple: a vessel heading for the coast just stops there rather than turning on the spot */{o.lat=la;o.lon=((lo+540)%360)-180}return}
const L=o.lane,a=L[o.seg],b=L[o.seg+1],segNm=dist(a,b)||1;o.t+=o.dir*o.kt*dt/3600/segNm;
    if(o.t>1){if(o.seg<L.length-2){o.seg++;o.t=0}else{o.t=1;o.dir=-1}}if(o.t<0){if(o.seg>0){o.seg--;o.t=1}else{o.t=0;o.dir=1}}shipLL(o)}
  /* land mask (0.25°, Natural Earth 50m) so new vessels only appear, and only steer, at sea */
  const LM=(()=>{try{const t=atob(window.SLANDMASK||''),u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u}catch(e){return new Uint8Array(0)}})();
  const isLand=(lat,lon)=>{if(!LM.length)return false;let x=Math.floor((lon+180)/360*1440),y=Math.floor((90-lat)/180*720);x=((x%1440)+1440)%1440;y=Math.max(0,Math.min(719,y));const i=y*1440+x;return (LM[i>>3]>>(7-(i&7)))&1};
  const nearLand=(lat,lon)=>isLand(lat,lon)||isLand(lat+.3,lon)||isLand(lat-.3,lon)||isLand(lat,lon+.4)||isLand(lat,lon-.4);
  ships.forEach(o=>{shipLL(o);o.el=pill();o.el.dataset.k='sea';LB.appendChild(o.el)});(document.getElementById('nSea')||{}).textContent=ships.length;

  /* demo amateur repeaters, drawn as the Land map's pill: white dot well, callsign, band badge in the band colour */
  const BANDC={'2M':'#33c2ff','70CM':'#c8ff00'};
  const RPT=[['GB3CD','Crook','2M',54.72,-1.75,'145.7375'],['GB3MN','Stockport','2M',53.41,-2.15,'145.6125'],['GB3NM','Nottingham','2M',52.95,-1.15,'145.6500'],['GB3WL','London','70CM',51.51,-0.13,'433.1500'],['GB3EK','Kent','2M',51.2,1.1,'145.6750'],['GB3BC','Bristol','70CM',51.45,-2.6,'433.0750'],['GB3ED','Edinburgh','2M',55.95,-3.2,'145.7250'],['GB3GL','Glasgow','70CM',55.86,-4.25,'430.9250'],['GB3LV','Liverpool','70CM',53.4,-2.98,'430.8750'],['GB3IM','Isle of Man','2M',54.2,-4.6,'145.7000'],['GB3YW','Leeds','2M',53.8,-1.55,'145.7750'],['GB3CF','Cardiff','70CM',51.48,-3.18,'433.2500'],['GB3SN','Southampton','2M',50.9,-1.4,'145.7125'],['GB3NI','Belfast','2M',54.6,-5.93,'145.6875']];
  /* networked receivers: other Sentinels and rtl_tcp SDRs feeding this one, linked to your location */
  /* networks: your own (around the home marker) plus other Sentinel networks around the world that appear as the globe turns.
     Each remote network = a host (g) that peers back to yours, with its own rtl_tcp receivers linked to that host. */
  const NETDEF=[[null,[['PI · ROOF','SENTINEL HOST',1.2,2.2],['SENTINEL 2','SENTINEL',-4.5,10],['MAST SDR','RTL_TCP',3.6,-3.5],['LAN SDR','RTL_TCP',-3.2,-1.2]]],
    [[42.4,-71.4],[['BOSTON HOST','SENTINEL HOST',0,0],['CAPE SDR','RTL_TCP',-0.8,1.6],['RIDGE SDR','RTL_TCP',1.6,-2.4]]],
    [[39.7,-105.0],[['DENVER HOST','SENTINEL HOST',0,0],['PEAK SDR','RTL_TCP',-1.4,-2.2],['PLAINS SDR','RTL_TCP',1.2,3]]],
    [[49.3,-122.9],[['VANCOUVER','SENTINEL',0,0],['ISLAND SDR','RTL_TCP',.6,-2.6]]],
    [[-23.5,-46.7],[['SÃO PAULO','SENTINEL HOST',0,0],['COAST SDR','RTL_TCP',-1.4,1.4],['INLAND SDR','RTL_TCP',1.6,-3]]],
    [[-33.9,18.6],[['CAPE TOWN','SENTINEL',0,0],['KAROO SDR','RTL_TCP',1.4,3.2]]],
    [[-1.3,36.8],[['NAIROBI','SENTINEL',0,0],['RIFT SDR','RTL_TCP',-1.2,-1.6]]],
    [[60.2,24.9],[['HELSINKI','SENTINEL',0,0],['LAKE SDR','RTL_TCP',1.6,3]]],
    [[19.1,72.9],[['MUMBAI HOST','SENTINEL HOST',0,0],['DECCAN SDR','RTL_TCP',-1.8,3]]],
    [[35.7,139.7],[['TOKYO HOST','SENTINEL HOST',0,0],['FUJI SDR','RTL_TCP',-.8,-2],['CHIBA SDR','RTL_TCP',.8,1.6]]],
    [[-33.9,151.0],[['SYDNEY HOST','SENTINEL HOST',0,0],['BLUE MTN SDR','RTL_TCP',.2,-2.4],['HUNTER SDR','RTL_TCP',1.3,.6]]],
    [[-37.8,175.3],[['WAIKATO','SENTINEL',0,0]]]];
  const NET=NETDEF.flatMap(([at,ns],gi)=>ns.map(([name,badge,dl,dn],i)=>({name,badge,dl,dn,base:at||HOME,g:gi,host:gi>0&&i===0})))
    .map(o=>{let la0=o.base[0]+o.dl,lo0=o.base[1]+o.dn/Math.cos(o.base[0]*D2R);
      /* receivers sit on land: search outwards from the intended spot for the nearest land cell (well inland, not on the coast) */
      const inland=(la,lo)=>isLand(la,lo)&&isLand(la+.25,lo)&&isLand(la-.25,lo)&&isLand(la,lo+.35)&&isLand(la,lo-.35);
      if(!inland(la0,lo0)){let best=null;for(let r=.25;r<=18&&!best;r+=.25)for(let k=0;k<24;k++){const t=k/24*Math.PI*2,la=la0+r*Math.cos(t),lo=lo0+r*Math.sin(t)/Math.cos(la0*D2R);if(inland(la,lo)){best=[la,lo];break}}if(best){la0=best[0];lo0=best[1]}}
      const n={kind:'net',name:o.name,badge:o.badge,lat:la0,lon:lo0,dir:null,g:o.g,host:o.host};n.el=pill();n.el.dataset.k='net';n.el.style.cursor='default';LB.appendChild(n.el);
      n.el.innerHTML=well('<svg width="11" height="11" viewBox="0 0 12 12" style="display:block"><circle cx="6" cy="6" r="3.5" fill="none" stroke="#c8ff00" stroke-width="1.6"/></svg>','#15171d')+nameSeg(esc(n.name),'right')+`<span style="background:#15171d;color:#c8ff00;font-size:12px;font-weight:700;padding:0 7px;letter-spacing:.05em;display:flex;align-items:center">${n.badge}</span>`;return n});
  const PEER={1:0,7:0,2:1,9:10,11:10,6:5};/* remote host → network it links to (0 = yours); the rest stay standalone */
  NET.forEach(n=>{if(n.host){const t=PEER[n.g];if(t===undefined){n.hub=null;return}if(t===0){n.hub=[HOME[0],HOME[1]];return}const h=NET.find(m=>m.g===t&&m.host);n.hub=[h.lat,h.lon];return}if(n.g===0)n.hub=[HOME[0],HOME[1]];else{const h=NET.find(m=>m.g===n.g&&m.host);n.hub=[h.lat,h.lon]}});
  /* Land: APRS stations round your location, as the app shows them — fixed ones (home stations, digipeaters, weather stations, gateways) and some on the move (cars, vans, cyclists…) */
  const APRS_FIX=[['Home station','HOME'],['Home station','HOME'],['Digipeater','DIGI'],['Weather station','WX'],['Internet gateway','IGATE'],['Home station','HOME'],['Digipeater','DIGI'],['Weather station','WX']];
  const APRS_MOV=[['Car','CAR',38],['Car','CAR',44],['Van','VAN',36],['Truck','TRUCK',32],['Motorcycle','MOTORCYCLE',40],['Bicycle','BICYCLE',11],['Jeep','JEEP',28]];
  const cs=()=>{const p=['M0','M7','2E0','G4','G7','G0','M6','2E1'][Math.random()*8|0],L='ABCDEFGHJKLMNPRSTUWXYZ';return p+L[Math.random()*22|0]+L[Math.random()*22|0]+L[Math.random()*22|0]};
  const landNear=(la0,lo0,rr)=>{for(let k=0;k<60;k++){const la=la0+rnd(-rr,rr),lo=lo0+rnd(-rr,rr)/Math.cos(la0*D2R);if(isLand(la,lo)&&isLand(la+.06,lo)&&isLand(la-.06,lo))return [la,lo]}return null};
  const stations=[];
  APRS_FIX.forEach(([lab,tag],i)=>{const q=landNear(HOME[0],HOME[1],2.6);if(!q)return;const o={kind:'land',name:tag==='IGATE'?'MB7U'+'ABCDEFGHJK'[Math.random()*10|0]:cs()+(tag==='WX'?'-13':tag==='DIGI'?'-10':''),sym:lab,tag,lat:q[0],lon:q[1],hdg:90,dir:null,mv:0};stations.push(o)});
  APRS_MOV.forEach(([lab,tag,kt])=>{const q=landNear(HOME[0],HOME[1],2.2);if(!q)return;const o={kind:'land',name:cs()+(tag==='BICYCLE'?'-7':'-9'),sym:lab,tag,lat:q[0],lon:q[1],hdg:rnd(0,360),dir:null,mv:kt*rnd(.8,1.15)};stations.push(o)});
  /* keep them apart a little so their labels don't stack */
  for(let pass=0;pass<4;pass++)stations.forEach((o,i)=>{stations.forEach((q,j)=>{if(i>=j)return;if(Math.hypot(o.lat-q.lat,(o.lon-q.lon)*Math.cos(o.lat*D2R))<.35){const n=landNear(HOME[0],HOME[1],2.6);if(n){q.lat=n[0];q.lon=n[1]}}})});
  stations.forEach(o=>{o.lat0=o.lat;o.lon0=o.lon;o.el=pill();o.el.dataset.k='land';LB.appendChild(o.el)});
  function moveStation(o,dt){if(!o.mv)return;const nm=o.mv*dt/3600,h=o.hdg*D2R,la=o.lat+nm*Math.cos(h)/60,lo=o.lon+nm*Math.sin(h)/(60*Math.cos(o.lat*D2R));
    const ah=o.lat+.05*Math.cos(h),al=o.lon+.05*Math.sin(h)/Math.cos(o.lat*D2R);if(!isLand(ah,al)){o.mv=0;return}o.lat=la;o.lon=lo}
  const nl=document.getElementById('nLand');if(nl)nl.textContent=stations.length;
  /* country names, as the fiord style sets them (and dimmed with the map) */
  const countries=(window.SCOUNTRIES||[]).map(([n,la,lo,a])=>{const d=document.createElement('div');d.className='ctry';d.textContent=n;LB.appendChild(d);return {d,p:V(la,lo,.02),a}});

  /* range rings round your position: 50 to 250 nm, great circles */
  const RINGS=[50,100,150,200,250].map(nm=>{const d=nm/3440.065,p1=HOME[0]*D2R,l1=HOME[1]*D2R,pts=[];for(let b=0;b<=360;b+=.5){const br=b*D2R,p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(br)),l2=l1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));pts.push([p2/D2R,l2/D2R])}return {nm,pts,top:pts[0]}});
  /* the operator's ⊙, from UserLocationMarker.ts */
  const homeEl=document.createElement('div');homeEl.className='home';homeEl.innerHTML='<svg width="60" height="60" viewBox="0 0 60 60" overflow="visible"><circle cx="30" cy="30" r="13.1" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="30" cy="30" r="5.2" fill="#c8ff00"/></svg>';LB.appendChild(homeEl);const homeP=V(...HOME,.03);

  /* ---- view ---- */
  const view={lat:HOME[0]-14,lon:HOME[1]+2,d:225},goal={lat:HOME[0]-14,lon:HOME[1]+2,d:225},HOMEV={lat:HOME[0]-14,lon:HOME[1]+2,d:225};
  /* small screens: the globe is a fixed picture at your location (no drag, pinch, wheel or spin) */
  const shortL=(t,v)=>v+((((t-v)%360)+540)%360)-180;
  const fwd=(t,v)=>{let d=((((t-v)%360)+360)%360);if(d>340)d-=360;return v+d};/* the globe only ever turns one way (eastward, like its spin) */
  const seaOnLand=(o,t)=>{if(!o.lc||t-o.lc>2000){o.lc=t;o.ol=isLand(o.lat,o.lon)||nearLand(o.lat,o.lon)&&isLand(o.lat,o.lon)}return o.ol};
  const STATIC=()=>false/* every screen size turns the globe now */;let spinK=1;const camV={lat:0,lon:0,d:0,on:false};
  let hoverPause=false,ease=0,fOff=30,follow=null,cyNow=.98;const topRef=()=>(document.querySelector(W()<900?'.gl .gl-copy':'.gl .gl-h')||hero).getBoundingClientRect().bottom+(W()<900?30:0);const spaceD=()=>{const w=W(),h=H();if(w<900)return spaceDm;const t=Math.min(3,(w/h)*Math.tan(cam.fov*D2R/2));return Math.min(ZMAX,R/Math.sin(Math.atan(t))*1.45)};const spaceT=()=>{const sd=spaceD();return Math.max(0,Math.min(1,(view.d-sd)/(ZMAX-sd)))};let overG=false,spin=!reduce,drag=null,moved=0,cy=.66,cxB=.5,cxNow=.5;
  function size(){const w=hero.clientWidth,h=hero.clientHeight;renderer.setSize(w,h,false);tc.width=w*devicePixelRatio;tc.height=h*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    const m=w<900;cxB=.5;cy=m?.97:.98;HOMEV.lat=HOME[0]-14;HOMEV.lon=HOME[1]+(m?0:2);cam.aspect=w/h;cam.fov=m?44:30;cam.updateProjectionMatrix();HOMEV.d=m?360:225;
    /* phones: size the globe to the screen width and sit its top just under the hero copy, so there is no empty band above it */
    /* narrow screens: a globe a little wider than the screen, its top just under the hero copy, still turning as on desktop */
    if(m){cam.fov=30;cam.updateProjectionMatrix();const gc=hero.querySelector('.gl-copy'),hb=hero.getBoundingClientRect();if(gc){const bot=gc.getBoundingClientRect().bottom-hb.top,rp=w*(window.__mRp??.62),k=rp*2*Math.tan(cam.fov*D2R/2)/h;HOMEV.d=Math.max(142,Math.min(ZMAX0,R/Math.sin(Math.atan(k))));cy=Math.min(3,(bot+24+rp)/h);
      {const ty=Math.min(h-60,bot+24+rp*.42),c2=cam.clone(),pt=V(HOME[0],HOME[1],.02);const yAt=off=>{c2.position.copy(V(HOME[0]-off,HOMEV.lon,HOMEV.d-R));c2.up.set(0,1,0);c2.lookAt(0,0,0);c2.setViewOffset(w,h,0,h/2-cy*h,w,h);c2.updateMatrixWorld();const q=pt.clone().project(c2);return (-q.y*.5+.5)*h};
       let lo=-30,hi=60;for(let i=0;i<30;i++){const md=(lo+hi)/2;if(yAt(md)>ty)lo=md;else hi=md}const off=(lo+hi)/2;HOMEV.lat=HOME[0]-off;if(!sel&&!follow&&!zoomed0()){goal.lat=HOMEV.lat;view.lat=HOMEV.lat}}
      const rs=w*.5,ks=rs*2*Math.tan(cam.fov*D2R/2)/h;spaceDm=Math.min(ZMAX0,R/Math.sin(Math.atan(ks)));cySp=Math.min(1.4,(bot+30+rs)/h)}}
    if(!sel&&!zoomed0())goal.d=HOMEV.d}
  let spaceDm=360,cySp=.97;const ZMAX0=620,zoomed0=()=>{try{return zoomed}catch(e){return false}};
  size();addEventListener('resize',size);view.d=HOMEV.d;cyNow=cy;setTimeout(size,250);setTimeout(size,1200);if(document.fonts)document.fonts.ready.then(()=>setTimeout(size,30));
  cv.addEventListener('pointerdown',e=>{if(STATIC())return;if(e.pointerType==='touch'&&tp.size)return;drag={x:e.clientX,y:e.clientY,lat:goal.lat,lon:goal.lon};moved=0;cv.setPointerCapture(e.pointerId);cv.classList.add('drag')});
  cv.addEventListener('pointermove',e=>{if(drag&&!pinch0){if(moved>4)follow=null;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));const k=.18*view.d/390*(e.pointerType==='touch'?2.2:1);goal.lon=drag.lon-dx*k;goal.lat=Math.max(-70,Math.min(80,drag.lat+dy*k));if(e.pointerType==='touch'){view.lon+=(goal.lon-view.lon)*.5;view.lat+=(goal.lat-view.lat)*.5}if(moved>4)spin=false}else hover(e)});
  cv.addEventListener('pointerup',e=>{cv.classList.remove('drag');if(drag&&moved<5)pick(e);drag=null});
  cv.addEventListener('pointerleave',()=>{if(!drag)hov=null});cv.addEventListener('pointercancel',()=>{cv.classList.remove('drag');drag=null});
  /* zoom: scroll wheel on desktop, pinch on touch */
  const ZMIN=122,ZMAX=620;let zoomed=false;const zoomBy=f=>{goal.d=Math.max(ZMIN,Math.min(ZMAX,goal.d*f));spin=false;ease=0};
  const rc=new THREE.Raycaster(),gs=new THREE.Sphere(new THREE.Vector3(),R),gp=new THREE.Vector3(),nd=new THREE.Vector2();
  function llAt(cx,cy2){const r=cv.getBoundingClientRect();nd.set((cx-r.left)/r.width*2-1,-(cy2-r.top)/r.height*2+1);rc.setFromCamera(nd,cam);if(!rc.ray.intersectSphere(gs,gp))return null;return [90-Math.acos(gp.y/R)/D2R,((Math.atan2(gp.z,-gp.x)/D2R-180+540)%360)-180]}
  hero.addEventListener('pointermove',e=>{if(hero.classList.contains('gl-ready'))hoverPause=true;overG=!!e.target.closest('.mlp,.issw')||!!llAt(e.clientX,e.clientY)});hero.addEventListener('pointerleave',()=>overG=false);
  hero.addEventListener('wheel',e=>{if(STATIC())return;if(e.target.closest('#glpanel,.gl-ui'))return;if(scrollY>4||(e.deltaY>0&&(goal.d>=ZMAX-1||(!zoomed&&goal.d>=HOMEV.d-1))))return;if(e.deltaY<0)zoomed=true;e.preventDefault();window.__tourHold&&window.__tourHold();const f=Math.exp(e.deltaY*(e.deltaMode?.05:.0015));const d0=goal.d;goal.d=Math.max(ZMIN,Math.min(ZMAX,goal.d*f));spin=false;
    if(e.deltaY<0){const ll=llAt(e.clientX,e.clientY);if(ll){const k=1-goal.d/d0;let dl=ll[1]-goal.lon;dl=((dl+540)%360)-180;goal.lat=Math.max(-70,Math.min(80,goal.lat+(ll[0]-goal.lat)*k));goal.lon+=dl*k}}},{passive:false});
  const tp=new Map();let pinch0=0;
  cv.addEventListener('pointerdown',e=>{if(STATIC()||e.pointerType!=='touch')return;tp.set(e.pointerId,[e.clientX,e.clientY]);if(tp.size===2){const [a,b]=[...tp.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);drag=null}});
  cv.addEventListener('pointermove',e=>{if(!tp.has(e.pointerId))return;tp.set(e.pointerId,[e.clientX,e.clientY]);if(tp.size===2&&pinch0){const [a,b]=[...tp.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);zoomed=true;zoomBy(Math.pow(pinch0/d,1.8));view.d+=(goal.d-view.d)*.6;pinch0=d;moved=99}});
  const tEnd=e=>{tp.delete(e.pointerId);if(tp.size<2)pinch0=0};cv.addEventListener('pointerup',tEnd);cv.addEventListener('pointercancel',tEnd);

  const zs=()=>W()<900?.6:.75;document.getElementById('glin').onclick=()=>{zoomed=true;zoomBy(zs())};document.getElementById('glout').onclick=()=>zoomBy(1/zs());
  const layer={air:true,space:false,sea:false,land:false,sdr:false};
  window.__scene=scene;window.__net=()=>NET.filter(o=>o.why).map(o=>[o.name,o.el.className,JSON.stringify(o.why)]);window.__pe=()=>planes.filter(o=>o.emerg).map(o=>[o.name,!o.el.classList.contains("off"),o.el.textContent]);window.__pl=()=>planes.map(o=>{const [x,y,b]=screenBearing(o);return [o.name,Math.round(x),Math.round(y),Math.round(b),o.a?1:0,!o.el.classList.contains("off")]});window.__st=()=>stations.map(o=>[+o.lat.toFixed(2),+o.lon.toFixed(2),o.el.className]);window.__gdbg=()=>({view:{...view},goal:{...goal},HOMEV:{...HOMEV},cy,cyNow,follow:!!follow,zoomed});window.__glGoal=(la,lo,d)=>{goal.lat=la;goal.lon=lo;view.lat=la;view.lon=lo;if(d){goal.d=d;view.d=d}};
  window.__globeHome=()=>{follow=null;zoomed=false;if(sel)select(null);if(!layer.air){const ab=document.querySelector('#gllayers button[data-l=air]');if(ab)ab.click()}Object.assign(goal,HOMEV);goal.lon=view.lon+(((HOMEV.lon-view.lon)%360+540)%360)-180};
  /* one domain at a time, as the app's section switcher */
  /* switching sections: what was showing leaves one item at a time, and the new section's items arrive one by one */
  const staggerSwitch=(from,to)=>{const now=performance.now(),lists={air:planes,sea:ships,land:stations};
    const order=l=>l.map(o=>{const p=objPos(o);const [x]=facing(p)?scr(p):[9e9];return [x,o]}).sort((a,b)=>a[0]-b[0]).map(v=>v[1]);
    if(lists[from]){const L=order(lists[from]),st=Math.min(70,1100/Math.max(1,L.length));L.forEach((o,i)=>{o.hideAt=now+i*st;o.showAt=0})}
    if(to==='air'){planes.forEach(p=>{if(p.emerg){p.emerg=false;p.dir=null}});const Wd=W(),cand=order(planes).filter(p=>{const q=objPos(p);if(!facing(q)||p.mil)return false;const [x,y]=scr(q);return x>Wd*.3&&x<Wd*.8&&y>(window.GL_TOP||0)+40&&y<H()-60});void cand}
    if(lists[to]){const L=order(lists[to]),st=Math.min(160,2600/Math.max(1,L.length));L.forEach((o,i)=>{o.showAt=now+450+i*st;o.hideAt=0})}
    if(to==='sdr')NET.map(o=>{const p=V(o.lat,o.lon,.02);return [facing(p)?scr(p)[0]:9e9,o]}).sort((a,b)=>a[0]-b[0]).forEach(([,o],i)=>o.showAt=now+500+i*180);
    layerA[to]=0;window.__secAt=now;window.__arrAt=0};
  /* place the APRS stations spread out over the land currently in view (each goes to the free spot furthest from the others) */
  function spreadLand(){const r0=cv.getBoundingClientRect(),Wd=W(),Ht=H(),t0=Math.max(Ht*.2,window.GL_TOP||0,Math.min(Ht*.6,topRef()-r0.top)),cand=[];
    for(let i=1;i<14;i++)for(let j=0;j<9;j++){const x=r0.left+Wd*i/14,y=r0.top+t0+(Ht-t0-30)*(j+.5)/9,ll=llAt(x,y);if(ll&&V(ll[0],ll[1]).normalize().dot(cam.position.clone().normalize())>.72&&isLand(ll[0],ll[1])&&isLand(ll[0]+.08,ll[1])&&isLand(ll[0]-.08,ll[1]))cand.push([x,y,ll])}
    if(cand.length<4)return;const used=[];stations.forEach(o=>{let best=null,bd=-1;for(let k=0;k<cand.length;k++){const c=cand[k];let md=1e9;used.forEach(u=>{md=Math.min(md,Math.hypot(u[0]-c[0],(u[1]-c[1])*2))});if(md>bd){bd=md;best=c}}if(!best)return;used.push(best);o.lat=best[2][0]+rnd(-.15,.15);o.lon=best[2][1]+rnd(-.2,.2);if(!isLand(o.lat,o.lon)){o.lat=best[2][0];o.lon=best[2][1]}o.dir=null})}
  /* the next stretch of land (forward/eastward only) at your latitude band, so Air and Land never frame open ocean */
  const landFrac=(la,lo)=>{let n=0,k=0;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){k++;if(isLand(la+i*3,lo+j*5))n++}return n/k};
  const landAhead=(la,lo)=>{for(let s=0;s<72;s++){const L=lo+s*5;if(landFrac(la,L)>=.4)return L+((landFrac(la,L+5)>=.4)?5:0)}return lo};
  /* scatter the APRS stations over land around a point (each at the free spot furthest from the others) */
  function placeStationsAt(la,lo){const cand=[];for(let i=-6;i<=6;i++)for(let j=-8;j<=8;j++){const a=la+i*.3,b=lo+j*.62;if(isLand(a,b)&&isLand(a+.08,b)&&isLand(a-.08,b)&&isLand(a,b+.1)&&isLand(a,b-.1))cand.push([a,b])}
    if(cand.length<4)return false;const used=[];stations.forEach(o=>{let best=null,bd=-1;cand.forEach(c=>{let md=1e9;used.forEach(u=>{md=Math.min(md,Math.hypot(u[0]-c[0],(u[1]-c[1])*.62))});if(md>bd){bd=md;best=c}});used.push(best);o.lat=best[0];o.lon=best[1];o.hist=[];o.dir=null});return true}
  const layerA={air:1,space:0,sea:0,land:0,sdr:0};
  let pendZ=null,landZ=null,revealAt=0;['wheel','pointerdown'].forEach(ev=>hero.addEventListener(ev,e=>{if(e.isTrusted&&landZ)landZ.auto=false},{passive:true}));const LZ=[.62,.5,.74,.56];const setLandZ=i=>{goal.d=Math.max(ZMIN+8,HOMEV.d*LZ[i%LZ.length]);goal.lat=HOME[0]-(HOME[0]-HOMEV.lat)*(goal.d-R)/(HOMEV.d-R)+(window.__lzLat??2.2)*(goal.d-R)/(HOMEV.d*.62-R)};document.getElementById('gllayers').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pendZ=null;landZ=null;{const prev=Object.keys(layer).find(k=>layer[k]);if(prev!==b.dataset.l)staggerSwitch(prev,b.dataset.l)}ease=9;const wasSpace=layer.space;e.currentTarget.querySelectorAll('button').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on);layer[x.dataset.l]=on});if(sel&&!layer[sel.kind])select(null);const dLon=HOMEV.lon-HOME[1],cLon=view.lon-dLon,fwdTo=L=>view.lon+((((L-cLon)%360)+360)%360);if((b.dataset.l==='sea'||b.dataset.l==='sdr')&&!STATIC()){/* Sea and SDR are framed on the UK: turn on (forward) to home and hold */follow=null;if(sel)select(null);zoomed=b.dataset.l==='sea';if(zoomed){/* Sea turns at the wide view (quicker) and only moves in on the UK's coasts once it is nearly there */const zd=Math.max(ZMIN+8,HOMEV.d*.6);pendZ={d:zd,lat:HOME[0]-(HOME[0]-HOMEV.lat)*(zd-R)/(HOMEV.d-R)+1.4};goal.d=Math.max(view.d,HOMEV.d);goal.lat=HOMEV.lat+4}else{goal.d=HOMEV.d;goal.lat=HOMEV.lat+7}{const hl=HOMEV.lon-(b.dataset.l==='sdr'?(window.__sdrLon??12):0);/* SDR: the UK sits right of centre, clear of the copy and the next button */goal.lon=wasSpace?shortL(hl,view.lon):fwd(hl,view.lon)}}else if(b.dataset.l==='land'&&!STATIC()){/* APRS stays round your location: turn to home, and move by easing between zoom levels */follow=null;if(sel)select(null);zoomed=true;stations.forEach(o=>{if(o.lat0!==undefined){o.lat=o.lat0;o.lon=o.lon0;o.hist=[];o.dir=null}});landZ={i:0,t:performance.now()+3800,auto:true};setLandZ(0);goal.lon=wasSpace?shortL(HOMEV.lon,view.lon):fwd(HOMEV.lon,view.lon)}else if(b.dataset.l==='air'&&!STATIC()){/* Air is framed on the UK: turn at the wide view, then move in once nearly there */follow=null;if(sel)select(null);zoomed=true;const zd=Math.max(ZMIN+8,HOMEV.d*(window.__airZ??.66));pendZ={d:zd,lat:HOME[0]-(HOME[0]-HOMEV.lat)*(zd-R)/(HOMEV.d-R)+1.6};goal.d=Math.max(view.d,HOMEV.d);goal.lat=HOMEV.lat+4;goal.lon=wasSpace?shortL(HOMEV.lon,view.lon):fwd(HOMEV.lon,view.lon)}else if(window.__autoStep&&!STATIC()&&b.dataset.l!=='space'&&!wasSpace){follow=null;if(sel)select(null)}else if(b.dataset.l==='space'&&STATIC()){follow=null;if(sel)select(null);zoomed=true;if(STATIC()){goal.lat=HOME[0]-12;goal.lon=view.lon+(((HOME[1]-view.lon)%360+540)%360)-180;goal.d=spaceDm}else{/* auto tour: pull back to a wide view where the globe already faces, no long spin round to the ISS */goal.lat=HOMEV.lat+6;goal.lon=view.lon;goal.d=Math.min(ZMAX,HOMEV.d*1.9)}}else if(b.dataset.l==='space'){follow=sats[0]||null;zoomed=true;goal.d=spaceD();
      /* work out the final view up front so the camera glides straight there */
      if(follow&&follow.ok){const w=W(),h=H(),hr=hero.getBoundingClientRect(),tb=topRef()-hr.top,ty=(tb+h)/2,c2=cam.clone(),pt=satP(follow);
        const yAt=off=>{c2.position.copy(V(follow.lat-off,follow.lon,goal.d-R));c2.up.set(0,1,0);c2.lookAt(0,0,0);c2.setViewOffset(w,h,w/2-.5*w,h/2-(w<900?cySp:1)*h,w,h);c2.updateMatrixWorld();const q=pt.clone().project(c2);return (-q.y*.5+.5)*h};
        let lo=0,hi=75;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(yAt(m)>ty)lo=m;else hi=m}fOff=(lo+hi)/2;goal.lat=Math.max(-80,Math.min(80,follow.lat-fOff));goal.lon=shortL(follow.lon,view.lon)}}else if(!window.__autoStep||STATIC()||wasSpace){const wasFar=wasSpace||(!window.__autoStep&&(zoomed||follow));follow=null;zoomed=false;if(sel)select(null);const keep=view.lon;Object.assign(goal,HOMEV);goal.lon=wasFar?(wasSpace?shortL(HOMEV.lon,view.lon):fwd(HOMEV.lon,view.lon)):keep;if(!wasFar){goal.lat=view.lat;ease=6}}});
  let trShow=null,trA=0,hovA=null,pmx=-1,pmy=-1;hero.addEventListener('pointermove',e=>{pmx=e.clientX;pmy=e.clientY},{passive:true});hero.addEventListener('pointerleave',()=>{pmx=-1});
  let hvAt=0,hvX=-9,hvY=-9;const hoverTest=()=>{if(drag){hovA=null;return}const tn=performance.now();if(pmx===hvX&&pmy===hvY&&tn-hvAt<250)return;hvAt=tn;hvX=pmx;hvY=pmy;hovA=null;if(pmx<0)return;const el=document.elementFromPoint(pmx,pmy),p=el&&el.closest&&el.closest('#gllabels .mlp[data-k=air]');if(p)hovA=planes.find(x=>x.el===p)||null};
  LB.addEventListener('click',e=>{const p=e.target.closest('.mlp');if(!p)return;const o=(p.dataset.k==='air'?planes:p.dataset.k==='land'?stations:ships).find(x=>x.el===p);if(o)select(o)});

  /* ---- projection and picking ---- */
  const W=()=>(window.__gW??=hero.clientWidth),H=()=>(window.__gH??=hero.clientHeight);new ResizeObserver(()=>{window.__gW=hero.clientWidth;window.__gH=hero.clientHeight}).observe(hero);
  const v=new THREE.Vector3(),cd=new THREE.Vector3();
  function scr(p){v.copy(p).project(cam);return [(v.x*.5+.5)*W(),(-v.y*.5+.5)*H(),v.z]}
  function facing(p){cd.copy(p).sub(cam.position);const L=cd.length();cd.divideScalar(L);const b=cam.position.dot(cd),c=cam.position.lengthSq()-R*R,disc=b*b-c;if(disc<0)return true;const t1=-b-Math.sqrt(disc);return t1<0||t1>L-.6}
  const objPos=o=>o.kind==='space'?satP(o):o.kind==='air'?V(o.lat,o.lon,.15+o.alt*3e-6):V(o.lat,o.lon,.05);
  function screenBearing(o){const p=objPos(o),[x,y]=scr(p);const h=o.kind==='space'?o.trk:o.hdg;const q=o.kind==='space'?V(o.lat+Math.cos(h*D2R)*.3,o.lon+Math.sin(h*D2R)*.3/Math.cos(o.lat*D2R),.03):V(o.lat+Math.cos(h*D2R)*.3,o.lon+Math.sin(h*D2R)*.3/Math.cos(o.lat*D2R),p.length()-R);const [x2,y2]=scr(q);return [x,y,(Math.atan2(x2-x,-(y2-y))/D2R+360)%360]}
  function nearest(mx,my,max){let best=null,bd=max*max;const test=o=>{if(o.kind==='space'&&!o.ok)return;const p=objPos(o);if(!facing(p))return;const [x,y,z]=scr(p);if(z>1)return;const d=(x-mx)**2+(y-my)**2;if(d<bd){bd=d;best=o}};
    if(layer.space)sats.forEach(test);return best}
  let hov=null;function hover(e){const r=cv.getBoundingClientRect();hov=nearest(e.clientX-r.left,e.clientY-r.top,12)}
  function pick(e){const r=cv.getBoundingClientRect();select(nearest(e.clientX-r.left,e.clientY-r.top,14))}

  /* ---- selection, details panel, trails ---- */
  const fll=(la,lo)=>[Math.abs(la).toFixed(4)+'°'+(la>=0?'N':'S'),Math.abs(lo).toFixed(4)+'°'+(lo>=0?'E':'W')];
  const row=(k,val)=>`<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`;
  function details(o){const [la,lo]=fll(o.lat,o.lon);
    if(o.kind==='air')return {kind:'Aircraft · ADS-B'+(o.demo?' · demo':' · live'),title:o.name||o.hex,sub:[o.hex,o.reg,o.sq&&'SQK '+o.sq].filter(Boolean).join(' · '),sw:o.col,
      body:`<h5>Position</h5><dl>${row('Latitude',la)}${row('Longitude',lo)}${row('Heading',Math.round(o.hdg)+'°')}${row('Altitude',Math.round(o.alt).toLocaleString()+' ft')}${row('Speed',Math.round(o.kt)+' kt')}${row('Squawk',o.sq||'—')}</dl><h5>Flight</h5><dl>${row('Type',o.type||'—')}${o.from?row('From',o.from)+row('To',o.to):row('Category',o.cat||'—')}</dl>`};
    if(o.kind==='land')return {kind:'APRS · demo',title:o.name,sub:o.sym,sw:'#ffffff',body:`<h5>Station</h5><dl>${row('Symbol',o.sym)}${row('Speed',o.mv?Math.round(o.mv)+' kt':'Fixed')}</dl><h5>Location</h5><dl>${row('Latitude',la)}${row('Longitude',lo)}</dl>`};
    if(o.kind==='sea')return {kind:'Vessel · AIS · demo',title:o.name,sub:`${o.fam} · ${o.mmsi}`,sw:o.col,body:`<h5>Vessel</h5><dl>${row('Type',o.fam)}${row('MMSI',o.mmsi)}</dl><h5>Position</h5><dl>${row('Latitude',la)}${row('Longitude',lo)}${row('Course',Math.round(o.hdg)+'°')}${row('Speed',o.kt.toFixed(1)+' kn')}</dl>`};
    return {kind:'Satellite · SGP4 · live',title:o.name,sub:'NORAD '+o.rec.satnum,body:`<h5>Position</h5><dl>${row('Latitude',la)}${row('Longitude',lo)}${row('Altitude',o.alt.toFixed(1)+' km')}${row('Velocity',o.vel.toFixed(3)+' km/s')}</dl><h5>Orbit</h5><dl>${row('Inclination',(o.rec.inclo/D2R).toFixed(2)+'°')}${row('Period',(2*Math.PI/o.rec.no).toFixed(1)+' min')}${row('Group',o.cat)}</dl>`}}
  function renderPanel(){if(!sel||sel.kind!=='space'){panel.classList.remove('open');return}const d=details(sel);
    panel.innerHTML=`<div class="ph"><span class="pk">${d.sw?`<i style="background:${d.sw}"></i>`:''}${d.kind}</span><b>${esc(d.title)}</b><span class="ps">${esc(d.sub)}</span><button class="px" aria-label="Close details">×</button></div><div class="pb">${d.body}</div>`;
    panel.querySelector('.px').onclick=()=>select(null);panel.classList.add('open')}
  function select(o){if(sel)sel.trail=null;sel=o||null;
    if(sel&&sel.kind!=='space')sel.trail=[[sel.lat,sel.lon,sel.alt||0]];
    const sp=!!(sel&&sel.kind==='space');
    if(sel){spin=false;goal.lat=Math.max(-60,Math.min(70,sel.lat+3));goal.lon=sel.lon;goal.d=Math.min(goal.d,sp?330:240)}
    planes.concat(ships).forEach(x=>x.dir=null);renderPanel()}
  setInterval(()=>{if(!sel)return;if(sel.trail)sel.trail.push([sel.lat,sel.lon,sel.alt||0]);renderPanel()},1000);

  function status(){const ep=TLE.length?TLE[0][1].substr(18,14):'';let ed='';if(ep){const d=new Date(Date.UTC(2000+ +ep.substr(0,2),0,1)+(+ep.substr(2)-1)*864e5);ed=d.toUTCString().slice(5,16)}
    if(statusEl)statusEl.innerHTML=`<span><i></i><b>Aircraft · vessels</b> demo traffic at real speed</span><span><i class="live"></i><b>ISS</b> SGP4 from TLE · ${ed}</span><span><i class="live"></i><b>Day / night</b> real Sun</span>`}
  status();(document.getElementById('nSat')||{}).textContent=sats.length;

  /* build or refresh a pill when its direction flips or it is first drawn */
  function airPill(o,b){const lf=(o.dir===null||needFlip(o,b))?leftFacing(b):o.dir;o.el.dataset.lf=lf?1:0;const E=!!o.emerg;const sq=E?`<span style="background:#000;color:#ff2222;font-size:12px;font-weight:700;padding:0 7px;letter-spacing:.05em;display:flex;align-items:center">${o.sq}</span>`:'';const segs=[well(glyph(arrowShape(E?'#ff2222':o.col),b)),nameSeg(esc(o.name||o.hex),lf?'left':'right'),sq+(o.type?badge(o.type.toUpperCase(),E?'#4d0000':o.mil?'#4d6600':'#002244',E?'#ff2222':o.mil?'#c8ff00':'#00aaff'):'')];o.el.innerHTML=(lf?segs.reverse():segs).join('');o.dir=lf}
  function landPill(o,b){/* the app's APRS pill: monochrome — white glyph and callsign on black, symbol chip in charcoal #15171d */
    const chip=`<span style="background:#15171d;color:#fff;font-size:12px;font-weight:700;padding:0 7px;letter-spacing:.05em;display:flex;align-items:center">${o.tag}</span>`;
    if(o.mv){const lf=(o.dir===null||needFlip(o,b))?leftFacing(b):o.dir;o.el.dataset.lf=lf?1:0;const segs=[well(glyph(arrowShape('#ffffff'),b),'#15171d'),nameSeg(esc(o.name),lf?'left':'right'),chip];o.el.innerHTML=(lf?segs.reverse():segs).join('');o.dir=lf;return}
    o.el.innerHTML=well('<svg width="11" height="11" viewBox="0 0 12 12" style="display:block"><circle cx="6" cy="6" r="3.5" fill="#ffffff"/></svg>','#15171d')+nameSeg(esc(o.name),'right')+chip;o.dir=false}
  function seaPill(o,b){const lf=(o.dir===null||needFlip(o,b))?leftFacing(b):o.dir;o.el.dataset.lf=lf?1:0;const segs=[well(glyph(vesselShape(o.col),b),'#15171d'),nameSeg(esc(o.name),lf?'left':'right'),badge(TYPEL[o.fam]||'OTHER','#15171d',o.col)];o.el.innerHTML=(lf?segs.reverse():segs).join('');o.dir=lf}

  /* ---- loop ---- */
  let vis=true,last=performance.now();
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis){last=performance.now();requestAnimationFrame(frame)}},{threshold:0}).observe(hero);
  function frame(t){
    if(!vis)return;const dt=Math.min(1,(t-last)/1000);last=t;
    /* hovering eases the spin down gently instead of stopping it dead; it eases back up on leave */
    spinK+=(((overG&&hoverPause)?0:1)-spinK)*(1-Math.pow(.985,dt*60));
    if(landZ&&layer.land&&landZ.auto&&!drag&&performance.now()>landZ.t){landZ.i++;landZ.t=performance.now()+4200;setLandZ(landZ.i)}
    if(pendZ&&(!(layer.sea||layer.air)||Math.abs(goal.lon-view.lon)<7)){if(layer.sea||layer.air){goal.d=pendZ.d;goal.lat=pendZ.lat;window.__arrAt=0/* fill the closer view once it lands */}pendZ=null}
    if(!reduce&&!STATIC()&&!drag&&!sel&&!follow&&!tp.size&&!layer.sea&&!layer.sdr&&!layer.land){if(view.d>200)goal.lon+=dt*.8*spinK*Math.min(1,(view.d-R)/125)}/* at the close phone map view, hold still on your location */
    if(!sel&&follow&&follow.ok&&!drag){const st=spaceT(),hr=hero.getBoundingClientRect(),tb=topRef()-hr.top,ty=((tb+hr.height)/2)*(1-st)+hr.height*.5*st;
      const [,iy]=scr(satP(follow));if(isFinite(iy)&&Math.abs(view.d-goal.d)<2&&Math.abs(view.lat-goal.lat)<.5&&Math.abs(cyNow-((W()<900?cySp:1)*(1-st)+.5*st))<.01)fOff=Math.max(0,Math.min(70,fOff+(iy-ty)/hr.height*40*dt));
      goal.lat=Math.max(-80,Math.min(80,follow.lat-fOff));goal.lon=shortL(follow.lon,view.lon)}
    {const base=W()<900?.14:.08,u=ease>0?1-ease/9:1,sm=u*u*(3-2*u),k=1-Math.pow(1-(ease>0?.01+(base-.01)*sm*sm:base),dt*60);if(ease>0)ease=Math.max(0,ease-dt);/* after a section change the glide starts slow and only gradually tightens, so it never snaps at the end */if(view.lon>180||view.lon<-180){const sh=view.lon>180?-360:360;view.lon+=sh;goal.lon+=sh}
      if(ease>0||camV.on||(!drag&&!tp.size&&(Math.abs(goal.lon-view.lon)>4||Math.abs(goal.lat-view.lat)>4))){/* long glides (section changes): speed is capped and eased up and down, so even a half-turn of the globe starts gently, cruises and settles */
        camV.on=ease>0||Math.abs(goal.lon-view.lon)>.3||Math.abs(goal.lat-view.lat)>.3;const cap={lat:22,lon:48,d:160},acc=1-Math.pow(.955,dt*60);
        const dc=Math.min(dt,.05),ke=1-Math.pow(1-.05,dc*60);['lat','lon','d'].forEach(c=>{/* speed ramps up from rest, and a step never exceeds an eased share of what's left, so it can't overshoot and correct */const diff=goal[c]-view[c];camV[c]=Math.min(cap[c],camV[c]+(cap[c]-camV[c])*acc);const st=Math.sign(diff)*Math.min(Math.abs(diff)*ke,camV[c]*dc);view[c]+=st});
        if(!camV.on){camV.lat=camV.lon=camV.d=0}}
      else{view.lat+=(goal.lat-view.lat)*k;view.lon+=(goal.lon-view.lon)*k;view.d+=(goal.d-view.d)*k}}
    {const w=W(),h=H(),m=w<900,cg=sel&&!m?.42:cxB;const kk=1-Math.pow(1-(ease>0?.01+.05*Math.pow(1-ease/9,3):.06),dt*60);cxNow+=(cg-cxNow)*(1-Math.pow(.92,dt*60));const zMid=()=>{const hr=hero.getBoundingClientRect(),h=hr.height||1;return Math.min(.9,((topRef()-hr.top)+h)/2/h)};const zt=Math.max(0,Math.min(1,(view.d-HOMEV.d)/(ZMAX-HOMEV.d)));/* zooming out past the home view lifts the globe toward the middle so all of it comes into view */
      cyNow+=(((sel?.58:follow?((m?cySp:1)*(1-spaceT())+.5*spaceT()):(STATIC()&&layer.space)?cySp:cy*(1-zt)+zMid()*zt))-cyNow)*kk;cam.setViewOffset(w,h,w/2-cxNow*w,h/2-cyNow*h,w,h)}
    cam.position.copy(V(view.lat,view.lon,view.d-R));cam.up.set(0,1,0);cam.lookAt(0,0,0);cam.updateMatrixWorld();
    const s=sunVec(Date.now());sunU.value.copy(V(s.lat,s.lon)).normalize();
    sats.forEach(s=>propSat(s,new Date()));if(Date.now()-orbAt>30000)buildOrbits();
    {const sdt=dt*(window.GLOBE_TIME_SCALE||1);planes.forEach(o=>movePlane(o,sdt));ships.forEach(o=>moveShip(o,sdt));stations.forEach(o=>moveStation(o,sdt));parked.forEach(o=>o.parkedAt-=dt*1000*((window.GLOBE_TIME_SCALE||1)-1))}
    const w=W(),h=H();
    /* satellite sprites turn with their ground track, as on the app's Space map */
    if(typeof HP!=='undefined'&&HP)HP(performance.now(),llAt,W(),H());
    if(layer.air||layer.sea||layer.land)spawnTraffic(performance.now(),W(),H());
    renderer.render(scene,cam);
    /* aircraft and vessel pills: the glyph well sits on the position */
    /* pills that have no room show only their glyph well, as the app drops to a bare mark */
    let titleBox=null;const heavy=a=>{const A=(a[2]-a[0])*(a[3]-a[1]);return boxes.some(b=>{const ix=Math.min(a[2],b[2])-Math.max(a[0],b[0]),iy=Math.min(a[3],b[3])-Math.max(a[1],b[1]);return ix>0&&iy>0&&ix*iy>A*.3})};const boxes=[],hit=(a)=>boxes.some(b=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]);
    /* keep labels clear of the controls, the hero copy and the screen edges */
    {const tN=performance.now();if(!window.__uiB||tN-window.__uiB.t>400){const saved=boxes.length;{const hr=hero.getBoundingClientRect();document.querySelectorAll('.gl-ui,.gl-copy .acts,.gl-top .tick .tkp,.gl-top .spec,.nextj.onhero').forEach(el=>{const r=el.getBoundingClientRect();if(r.width)boxes.push([r.left-hr.left-30,r.top-hr.top-22,r.right-hr.left+30,r.bottom-hr.top+22])});
      /* nothing sits behind the SENTINEL title (or the logo/GitHub bar), at any size */
      const t=document.querySelector('.gl .gl-h');if(t){const rg=document.createRange();rg.selectNodeContents(t);const r=rg.getBoundingClientRect(),rb=t.getBoundingClientRect();/* the line box (not the font's descender space) is the title's ink height */titleBox=[r.left-hr.left-16,rb.top-hr.top-10,r.right-hr.left+16,rb.bottom-hr.top+16];boxes.push(titleBox)}
      const hb=document.querySelector('.gl .h3bar');if(hb){const r=hb.getBoundingClientRect();boxes.push([r.left-hr.left,r.top-hr.top-6,r.right-hr.left,r.bottom-hr.top+6])}}
    window.__uiB={t:tN,b:boxes.slice(saved),tb:titleBox}}else{boxes.push(...window.__uiB.b);titleBox=window.__uiB.tb}}
    const vis2=[];
    const camN=cam.position.clone().normalize();let shown={air:0,sea:0,land:0};const nowP=performance.now();const pills=(list,on,build)=>list.forEach(o=>{const p=objPos(o);const onNow=((on&&!(o.showAt&&nowP<o.showAt))||(!on&&o.hideAt&&nowP<o.hideAt))&&!(o.kind==='sea'&&seaOnLand(o,nowP));/* a vessel is never shown over land */if(!onNow||!facing(p)||(o!==sel&&p.clone().normalize().dot(camN)<(o.vis?.24:.3))){o.el.classList.add('off');return}const [x,y,b]=screenBearing(o);if(x<-200||x>w+200||y<(window.GL_TOP||-40)||y>h+40){o.el.classList.add('off');return}
      if(o!==sel&&!o.vis&&!o.emerg&&++shown[o.kind]>(o.kind==='air'?MAX_AIR:o.kind==='sea'?MAX_SEA:99)){o.el.classList.add('off');return}
      if(!o.el.firstChild){build(o,b);o.w=0}o.el.classList.remove('off');if(needFlip(o,b)){build(o,b);o.w=0}else{const sv=o.el.querySelector('.mlw svg');if(sv)sv.style.transform=`rotate(${b}deg)`}
      if(!o.w){o.el.classList.remove('bare');o.w=o.el.offsetWidth||80}vis2.push([o,x,y])});
    {const showNet=layer.sdr,nN=performance.now();NET.forEach(o=>{const p=V(o.lat,o.lon,.02);if(!showNet||(o.showAt&&nN<o.showAt)||!facing(p)){o.el.classList.add('off');return}const [x,y]=scr(p);if(!o.w){o.el.classList.remove('off');o.w=o.el.offsetWidth||120}
      const bad=b=>b[0]<12||b[2]>w-12||b[3]>h-8||hit([b[0]-6,b[1]-4,b[2]+6,b[3]+4]);/* SDR labels: on the right of the receiver, or flipped to its left if that side is taken, never over anything else */let bx=null,left=false,dy=0;for(const [lf,oy] of [[0,0],[1,0],[0,-30],[1,-30],[0,30],[1,30]]){const c=lf?[x+13-o.w,y-13+oy,x+13,y+13+oy]:[x-13,y-13+oy,x-13+o.w,y+13+oy];if(!bad(c)){bx=c;left=!!lf;dy=oy;break}}if(!bx){o.why=[x|0,y|0,o.w,boxes.filter(b=>{const c=[x-19,y-17,x-13+o.w+6,y+17];return c[0]<b[2]&&c[2]>b[0]&&c[1]<b[3]&&c[3]>b[1]}).map(b=>b.map(v=>v|0))];o.el.classList.add('off');o.nv=false;return}if(!o.nv){if(performance.now()-revealAt<190){o.el.classList.add('off');return}revealAt=performance.now();o.nv=true}o.el.classList.remove('off');boxes.push(bx);o.el.style.flexDirection=left?'row-reverse':'';o.el.style.transform=`translate(${bx[0]}px,${y+dy}px) translate(0,-50%)`;o.el.style.zIndex=2})}
    pills(planes,layer.air,airPill);pills(ships,layer.sea,seaPill);pills(stations,layer.land,(o,b)=>landPill(o,b));
    vis2.forEach(v=>{if(v[0].pri===undefined)v[0].pri=Math.random()});vis2.sort((a,b)=>(b[0]===sel)-(a[0]===sel)||(!!b[0].emerg)-(!!a[0].emerg)||(b[0]===hovA)-(a[0]===hovA)||(b[0].kind==='sea')-(a[0].kind==='sea')||(!!b[0].vis)-(!!a[0].vis)||a[0].pri-b[0].pri);
    vis2.forEach(([o,x,y])=>{const full=o.dir?[x+13-o.w,y-13,x+13,y+13]:[x-13,y-13,x-13+o.w,y+13];const bare=o.dir?[x-13,y-13,x+13,y+13]:full.slice(0,1).concat([y-13,x+13,y+13]);
      /* labels that would overlap one already placed are left out: zoom in and more appear */
      const m=4,e=o.vis?28:40;const pad=[full[0]-m,full[1]-m,full[2]+m,full[3]+m];{const nowT=performance.now(),want=!(o!==sel&&o!==hovA&&(hit(pad)||full[0]<e||full[2]>w-e||full[3]>h-(o.vis?6:16)));const edge=full[0]<8||full[2]>w-8||full[3]>h;
       /* a label keeps its state for at least ~1.2s before it may change, so turning the globe doesn't make labels blink */
       /* overlapping labels give way at once; a label only comes back after a short hold, and new labels arrive one at a time */let show=want;if(!o.vis&&want&&o!==sel&&(nowT-(o.tog||0)<1200||nowT-revealAt<190))show=false;if(!o.vis&&show)revealAt=nowT;if(!!o.vis!==show)o.tog=nowT;
       if(!show){o.el.classList.add('off');o.vis=false;return}}o.vis=true;
      o.el.classList.remove('bare');boxes.push(full);
      o.el.style.transform=o.dir?`translate(${x+13}px,${y}px) translate(-100%,-50%)`:`translate(${x-13}px,${y}px) translate(0,-50%)`;o.el.style.opacity=sel&&sel!==o?.5:1;o.el.style.zIndex=sel===o?3:1});
    const cbox=[(()=>{const [x,y]=scr(homeP);return [x-20,y-20,x+20,y+20]})()];countries.forEach(c=>{const ok=facing(c.p);if(!ok){c.d.classList.add('off');return}const [x,y,z]=scr(c.p);const big=c.a>25||view.d<260;if(!big||z>1){c.d.classList.add('off');return}
      if(!c.w)c.w=c.d.offsetWidth||60;const bx=[x-c.w/2,y-8,x+c.w/2,y+8];const ok2=!cbox.some(q=>bx[0]<q[2]&&bx[2]>q[0]&&bx[1]<q[3]&&bx[3]>q[1]);c.d.classList.toggle('off',!ok2);if(ok2)cbox.push(bx);c.d.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`});
    {const ok=facing(homeP);const [x,y]=scr(homeP);homeEl.classList.toggle('off',!ok);homeEl.style.transform=`translate(${x}px,${y}px)`}
    /* the ISS: sprite turned to its track, bracket, name label */
    sats.forEach(s=>{const p=satP(s);if(!layer.space||!s.ok||!facing(p)){s.el.classList.add('off');return}const [x,y,b]=screenBearing(s);s.el.classList.remove('off');s.el.style.transform=`translate(${x}px,${y}px)`;s.el.querySelector('img').style.transform=`rotate(${b}deg)`});
    /* trail of the selected aircraft or vessel, from selection until now */
    ctx.clearRect(0,0,w,h);
    /* range rings, as RangeRingsControlBase draws them on the dark map: black 2.25px dots 7px apart, distance above each ring's top */
    const polyline=(pts,hgt,cb)=>{let run=[];const flush=()=>{if(run.length>1)cb(run);run=[]};pts.forEach(([la,lo])=>{const p=V(la,lo,hgt);if(!facing(p)){flush();return}const [x,y,z]=scr(p);if(z>1){flush();return}if(run.length&&Math.abs(x-run[run.length-1][0])>w/2)flush();run.push([x,y])});flush()};
    ctx.fillStyle='#000';
    /* links from each networked receiver to your location: dashes flowing in towards you */
    Object.keys(layerA).forEach(k=>layerA[k]+=((layer[k]?1:0)-layerA[k])*(1-Math.pow(layer[k]?.975:.94,dt*60)));
    if(layerA.sdr>.01){const hp=[HOME[0],HOME[1]];ctx.save();ctx.strokeStyle='#c8ff00';ctx.lineWidth=1.2;ctx.setLineDash([3,5]);ctx.lineDashOffset=-(performance.now()/60)%8;ctx.globalAlpha=.65;
      NET.forEach(o=>{if(!o.hub)return;const peer=o.host,n=peer?64:24,pts=[];for(let k=0;k<=n;k++){const v=slerp([o.lat,o.lon],o.hub,k/n);const[la,lo]=toLL(v);pts.push([la,lo])}
        ctx.globalAlpha=(peer?.28:.65)*layerA.sdr;if(peer)ctx.setLineDash([2,7]);else ctx.setLineDash([3,5]);
        polyline(pts,peer?.05:.02,run=>{ctx.beginPath();run.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()})});
      ctx.setLineDash([]);ctx.globalAlpha=.9;ctx.fillStyle='#c8ff00';ctx.lineWidth=1.4;NET.forEach(o=>{const p=V(o.lat,o.lon,.02);if(!facing(p))return;const[x,y]=scr(p);ctx.beginPath();ctx.arc(x,y,2.4,0,7);ctx.fill();if(o.host){ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.stroke()}});ctx.restore()}
    ctx.font="9px 'Noto Sans',sans-serif";ctx.textAlign='center';ctx.textBaseline='bottom';if('letterSpacing' in ctx)ctx.letterSpacing='0.9px';
    /* (refuelling areas and AWACS orbits removed from the hero) */
    /* the ISS footprint (rgba(0,0,0,.22) fill, 1.2px black outline) and its lime ground track */
    if(layerA.space>.01)sats.forEach(s=>{if(!s.ok)return;ctx.globalAlpha=layerA.space;const ang=Math.acos(RE/(RE+s.alt)),ring=[];for(let b=0;b<=360;b+=3){const br=b*D2R,p1=s.lat*D2R,l1=s.lon*D2R,p2=Math.asin(Math.sin(p1)*Math.cos(ang)+Math.cos(p1)*Math.sin(ang)*Math.cos(br)),l2=l1+Math.atan2(Math.sin(br)*Math.sin(ang)*Math.cos(p1),Math.cos(ang)-Math.sin(p1)*Math.sin(p2));ring.push([p2/D2R,l2/D2R])}
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.strokeStyle='#000';ctx.lineWidth=1.2;polyline(ring,.03,run=>{ctx.beginPath();run.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.fill();ctx.stroke()});
      ctx.strokeStyle='#c8ff00';ctx.lineWidth=1.5;ctx.lineCap='butt';ORB.forEach((st,k)=>{ctx.globalAlpha=st.o*layerA.space;ctx.setLineDash(st.dash||[]);polyline(orbits[k],.03,run=>{ctx.beginPath();run.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()})});ctx.setLineDash([]);ctx.globalAlpha=1});
    hoverTest();
    /* trail: the hovered aircraft's history (as the app shows it on hover), else the selected item's */
    {const want=null;/* trails removed from the hero */
     if(want!==trShow){trA=Math.max(0,trA-dt*3.5);if(trA===0)trShow=want}else if(trShow)trA=Math.min(1,trA+dt*1.3);
     const tr=trShow&&(planes.includes(trShow)||ships.includes(trShow))?trShow:null,K=trA*trA*(3-2*trA);
     const src=tr?(tr.kind==='air'?(tr.hist||(seedHist(tr),tr.hist)):tr.trail):null;
     if(tr&&src&&src.length){const full=src.concat([[tr.lat,tr.lon,tr.alt||0]]),keep=Math.max(2,Math.ceil(full.length*K));const pts=full.slice(full.length-keep).map(([la,lo,al])=>{const p=tr.kind==='air'?V(la,lo,.15+al*3e-6):V(la,lo,.05);if(!facing(p))return null;const [x,y]=scr(p);return [x,y,al]}).filter(Boolean);
      ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=4;
      if(tr.kind==='air'){const n=pts.length;ctx.lineWidth=2.5;for(let i=1;i<n;i++){ctx.globalAlpha=K*.45*Math.min(1,i/(n*.45));ctx.strokeStyle=altColor(pts[i][2]);ctx.beginPath();ctx.moveTo(pts[i-1][0],pts[i-1][1]);ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke()}
        ctx.lineWidth=0;pts.slice(0,-1).forEach(([x,y,al],i)=>{ctx.globalAlpha=K*.32*(i+1)/(n-1);ctx.fillStyle=altColor(al);ctx.beginPath();ctx.arc(x,y,1.4,0,7);ctx.fill()})}
      else{ctx.globalAlpha=K*.55;const a=pts[0],b=pts[pts.length-1];const g=ctx.createLinearGradient(a[0],a[1],b[0],b[1]);g.addColorStop(0,tr.col+'00');g.addColorStop(1,tr.col);ctx.strokeStyle=g;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
        ctx.fillStyle=tr.col;pts.slice(0,-1).forEach(([x,y],i)=>{ctx.globalAlpha=K*(.25+.6*i/pts.length);ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill()})}
      ctx.globalAlpha=1}}
    requestAnimationFrame(frame);
  }


  /* atmosphere: a thin shell whose glow fades smoothly to nothing at its outer edge (as on the Ares page) */
  {const r=1.022,k=Math.sqrt(1-1/(r*r)).toFixed(4);
   scene.add(new THREE.Mesh(new THREE.SphereGeometry(R*r,192,96),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,
     blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneFactor,
     vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalMatrix*normal;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
     fragmentShader:`varying vec3 vN;varying vec3 vV;void main(){float t=clamp(-dot(normalize(vN),normalize(vV))/${k},0.,1.);float i=pow(t,1.8);float a=i*.42;gl_FragColor=vec4(vec3(.42,.58,1.)*a,a*.8);}`})))}

  /* sharp map: redraw the area in view from Natural Earth vectors (10m round Europe, 50m elsewhere) onto a fixed-size patch */
  const HP=(()=>{try{const VD=window.SVEC;if(!VD)return null;
    const dec=b=>{const t=atob(b),u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return new Int16Array(u.buffer)};
    const parse=(a,sc,poly)=>{const out=[];let cur=[],i=0;while(i<a.length){const n=(a[i]<<15)|a[i+1];i+=2;if(!n){if(poly){out.push(cur);cur=[]}continue}const r=new Float32Array(n*2);let x=0,y=0;for(let k=0;k<n;k++){x+=a[i++];y+=a[i++];r[k*2]=x/sc;r[k*2+1]=y/sc}if(poly)cur.push(r);else out.push([r])}return out};
    const bb=rs=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;rs.forEach(r=>{for(let k=0;k<r.length;k+=2){a=Math.min(a,r[k]);c=Math.max(c,r[k]);b=Math.min(b,r[k+1]);d=Math.max(d,r[k+1])}});return [a,b,c,d]};
    const set=v=>({land:parse(dec(v.land),v.scale,true).map(p=>({p,b:bb(p)})),bor:parse(dec(v.bor),v.scale,false).map(p=>({p,b:bb(p)}))});
    const G=set(VD.g),E=set(VD.e);
    /* rings that cross the date line are unwrapped so they don't fill a band right round the map; a ring that circles a pole is closed through that pole */
    const ringPath=(cx,r,X,Y)=>{const fixed=[r[0],r[1]];let off=0;for(let k=2;k<r.length;k+=2){let lo=r[k]+off;const d=lo-fixed[fixed.length-2];if(d>180){off-=360;lo-=360}else if(d<-180){off+=360;lo+=360}fixed.push(lo,r[k+1])}
      const span=fixed[fixed.length-2]-fixed[0];if(Math.abs(span)>300){const pl=fixed[fixed.length-1]<0?-90:90;fixed.push(fixed[fixed.length-2],pl,fixed[0],pl)}
      let mn=1e9,mx=-1e9;for(let k=0;k<fixed.length;k+=2){mn=Math.min(mn,fixed[k]);mx=Math.max(mx,fixed[k])}
      [0,360,-360].forEach(sh=>{if(mx+sh<-180||mn+sh>180)return;cx.moveTo(X(fixed[0]+sh),Y(fixed[1]));for(let k=2;k<fixed.length;k+=2)cx.lineTo(X(fixed[k]+sh),Y(fixed[k+1]));cx.closePath()})};
    /* polar caps: the base tiles stop short of the poles, so draw both caps once from the vectors in a polar projection and lay them over the globe */
    /* phones (iOS especially) cap total canvas memory, and a canvas over budget silently renders black: keep the caps small there */
    const smallDev=Math.min(screen.width,screen.height)<900||matchMedia('(pointer:coarse)').matches;
    /* redraw the whole base map from the same vectors as the sharp map, so every layer (base, sharp patch, polar caps) shows identical coastlines — the old image lacked Antarctica */
    try{const BW=smallDev?2048:Math.min(4096,renderer.capabilities.maxTextureSize),BH=BW/2,bc=document.createElement('canvas');bc.width=BW;bc.height=BH;const bx=bc.getContext('2d');
      const X=x=>(x+180)/360*BW,Y=y=>(90-y)/180*BH;bx.fillStyle='#252b39';bx.fillRect(0,0,BW,BH);bx.fillStyle='#2e3545';
      G.land.forEach(o=>{bx.beginPath();o.p.forEach(r=>ringPath(bx,r,X,Y));bx.fill('evenodd')});
      bx.strokeStyle='#323c4c';bx.lineWidth=Math.max(1,BW/4096);G.bor.forEach(o=>{const r=o.p[0];bx.beginPath();bx.moveTo(X(r[0]),Y(r[1]));for(let k=2;k<r.length;k+=2)bx.lineTo(X(r[k]),Y(r[k+1]));bx.stroke()});
      if(bx.getImageData(BW>>1,BH>>1,1,1).data[3]){const bt=new THREE.CanvasTexture(bc);bt.encoding=THREE.sRGBEncoding;bt.anisotropy=renderer.capabilities.getMaxAnisotropy();baseMesh.material.uniforms.map.value=bt}}catch(e){}
    [[1,smallDev?2048:Math.min(4096,renderer.capabilities.maxTextureSize)],[-1,smallDev?1024:2048]].forEach(([sg,CN])=>{const SPAN=18,cv2=document.createElement('canvas');cv2.width=cv2.height=CN;const cc=cv2.getContext('2d');
      const P=(lo,la)=>{const r=(90-sg*la)/SPAN*.5,t=lo*D2R*sg;return [(.5+r*Math.cos(t))*CN,(.5+r*Math.sin(t))*CN]};
      const near=q=>sg>0?q[3]>=90-SPAN-2:q[1]<=-(90-SPAN-2);
      cc.fillStyle='#252b39';cc.fillRect(0,0,CN,CN);cc.fillStyle='#2e3545';
      G.land.forEach(o=>{if(!near(o.b))return;cc.beginPath();o.p.forEach(r=>{let [x,y]=P(r[0],r[1]);cc.moveTo(x,y);for(let k=2;k<r.length;k+=2){[x,y]=P(r[k],r[k+1]);cc.lineTo(x,y)}cc.closePath()});cc.fill('evenodd')});
      cc.strokeStyle='#323c4c';cc.lineWidth=Math.max(1,CN/1400);cc.lineJoin='round';
      G.bor.forEach(o=>{if(!near(o.b))return;const r=o.p[0];cc.beginPath();let [x,y]=P(r[0],r[1]);cc.moveTo(x,y);for(let k=2;k<r.length;k+=2){[x,y]=P(r[k],r[k+1]);cc.lineTo(x,y)}cc.stroke()});
      /* if the browser could not back the canvas it reads as empty: skip the cap rather than draw a black disc */
      try{if(cc.getImageData(CN>>1,CN>>1,1,1).data[3]===0)return}catch(e){return}
      const tx=new THREE.CanvasTexture(cv2);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=renderer.capabilities.getMaxAnisotropy();
      const geo=new THREE.SphereGeometry(R+.024,384,24,0,Math.PI*2,sg>0?0:(180-SPAN)*D2R,SPAN*D2R),pos=geo.attributes.position,uv=geo.attributes.uv,v=new THREE.Vector3();
      for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const [la,lo]=toLL(v),[x,y]=P(lo,la);uv.setXY(i,x/CN,1-y/CN)}uv.needsUpdate=true;
      const cm=shade(tx);const cmesh=new THREE.Mesh(geo,cm);scene.add(cmesh)});
    const N=Math.min((Math.min(screen.width,screen.height)<900||matchMedia('(pointer:coarse)').matches)?2048:4096,renderer.capabilities.maxTextureSize),c2v=document.createElement('canvas');c2v.width=c2v.height=N;const c2=c2v.getContext('2d');
    const t2=new THREE.CanvasTexture(c2v);t2.encoding=THREE.sRGBEncoding;t2.anisotropy=renderer.capabilities.getMaxAnisotropy();t2.generateMipmaps=true;
    const mat=shade(t2);let mesh=null,box=null,last=0;
    function draw(b,spd){const [lo0,la0,lo1,la1]=b;const useE=lo0>=-45&&lo1<=60&&la0>=20&&la1<=78,S=useE?E:G;
      const sx=N/(lo1-lo0),sy=N/(la1-la0),X=x=>(x-lo0)*sx,Y=y=>(la1-y)*sy,hit=q=>!(q[2]<lo0||q[0]>lo1||q[3]<la0||q[1]>la1);
      c2.setTransform(1,0,0,1,0,0);c2.fillStyle='#252b39';c2.fillRect(0,0,N,N);c2.fillStyle='#2e3545';
      S.land.forEach(o=>{if(!hit(o.b))return;c2.beginPath();o.p.forEach(r=>ringPath(c2,r,X,Y));c2.fill('evenodd')});
      c2.strokeStyle='#323c4c';c2.lineWidth=Math.max(1,1.2*sy/spd);c2.lineJoin='round';
      S.bor.forEach(o=>{if(!hit(o.b))return;const r=o.p[0];c2.beginPath();c2.moveTo(X(r[0]),Y(r[1]));for(let k=2;k<r.length;k+=2)c2.lineTo(X(r[k]),Y(r[k+1]));c2.stroke()});
      t2.needsUpdate=true;window.__hpDrawn=true;
      const g=new THREE.SphereGeometry(R+.02,128,128,(lo0+180)*D2R,(lo1-lo0)*D2R,(90-la1)*D2R,(la1-la0)*D2R);
      if(mesh){mesh.geometry.dispose();mesh.geometry=g}else{mesh=new THREE.Mesh(g,mat);scene.add(mesh)}box=b}
    return function(now,llAt,Wd,Ht){if(now-last<(window.__hpDrawn?300:0))return;last=now;
      if(view.d>700||Math.abs(view.d-goal.d)>view.d*.03||Math.abs(view.lat-goal.lat)>3||Math.abs(view.lon-goal.lon)>3){return}
      const r0=cv.getBoundingClientRect();let a=1e9,b=1e9,c=-1e9,d=-1e9,n=0,miss=0;
      const cn=cam.position.clone().normalize();const smp=[];for(let i=0;i<=12;i++)for(let j=0;j<=10;j++){const ll=llAt(r0.left+Wd*i/12,r0.top+Ht*j/10);if(ll)smp.push([ll,V(ll[0],ll[1]).normalize().dot(cn)])}
      for(const th of [.35,.55,.7,.82,.9]){a=1e9;b=1e9;c=-1e9;d=-1e9;n=0;smp.forEach(([ll,q])=>{if(q<th)return;n++;a=Math.min(a,ll[1]);c=Math.max(c,ll[1]);b=Math.min(b,ll[0]);d=Math.max(d,ll[0])});if(n&&c-a<=120)break}
      if(!n||c-a>170||b>68||d<-68){if(mesh)mesh.visible=false;return}
      const spd=R*D2R*Ht/(2*Math.tan(cam.fov*D2R/2)*(view.d-R));
      b=Math.max(-74,b);d=Math.min(74,d);const fresh=!box||a<box[0]||c>box[2]||b<box[1]||d>box[3]||(box[2]-box[0])>(c-a)*2.6;
      if(fresh){const pw=(c-a)*.35+.5,ph=(d-b)*.35+.5;const nb=[a-pw,Math.max(-74,b-ph),c+pw,Math.min(74,d+ph)];if(nb[3]-nb[1]<4){if(mesh)mesh.visible=false;return}if(nb[0]<-180||nb[2]>180){if(mesh)mesh.visible=false;return}draw(nb,spd)}
      mesh.visible=true}
  }catch(e){console.warn(e);return null}})();

  /* as the globe turns, fill the view with more demo traffic: aircraft anywhere, vessels only at sea */
  const AL=['BAW','EZY','RYR','DLH','AFR','KLM','UAL','DAL','AAL','UAE','QTR','SIA','CPA','JAL','ANA','QFA','ACA','THY','IBE','SAS','ETD','KAL','CCA','CES','AIC','SVA','ETH','KQA','SAA','LAN','AVA','AMX','WJA','SWA','JBU','VIR','TAP','AZU','GLO','EIN','FIN','LOT','AUA','SWR','ICE','NAX','WZZ','EWG','VLG','TRA'];
  /* demo military traffic, styled as the app styles it (lime type badge on dark olive) */
  const MIL=[['RCH','C17'],['ASCOT','A400'],['RRR','A332'],['NATO','E3TF'],['LAGR','K35R'],['HOMER','P8'],['DUKE','C130'],['TARTN','A332'],['GAF','A400'],['FAF','A310'],['MMF','E3CF'],['IAM','C27J'],['BAF','A400'],['CFC','CC17'],['NCHO','RC35']];
  const UK_ONLY=['TARTN'];/* callsigns only seen round the UK */
  const AT=['A320','A20N','A21N','B738','B38M','A333','A339','A359','B77W','B789','B788','A388','E190','E195','A319','B763','B744','CRJ9','AT76','DH8D','A35K','B39M'];
  const VN=['Nordic Star','Pacific Dawn','Atlantic Pioneer','Ocean Grace','Sea Voyager','Blue Horizon','Polar Wind','Coral Bay','Northern Light','Arctic Fox','Cape Fortune','Golden Tide','Silver Spirit','Aegean Sun','Baltic Trader','Southern Cross','Eastern Promise','Harbour Light','Sea Falcon','Tidal Runner','Morning Glory','Ocean Breeze','Iron Duke','Blue Marlin','Star Navigator','Sea Pearl','Coastal Ranger','Grand Voyager','Stellar Wave','Island Spirit','Ever Bright','Orient Pearl','Cape Horn','Atlantic Eagle','Pacific Jade','North Sea Giant'];
  const VF=[['cargo',30],['tanker',20],['passenger',10],['fishing',22],['service',8],['pleasure',10]];
  const pickF=()=>{let r=Math.random()*100;for(const [f,w] of VF){if((r-=w)<0)return f}return 'cargo'};
  /* the most items shown on the globe at once */
  const MAX_AIR=window.GLOBE_MAX_AIR||40,MAX_SEA=window.GLOBE_MAX_SEA||16;
  let spawnAt=0;const parked=[];
  /* items that turn out of sight are parked (their labels removed) and brought back, moved on by the time they were away, when their area turns back into view */
  const facingC=(o,c)=>V(o.lat,o.lon).normalize().dot(c);
  function parkAndRestore(now){const c=V(view.lat,view.lon).normalize();
    [planes,ships].forEach(list=>{for(let i=list.length-1;i>=0;i--){const o=list[i];if(!(o.free||o.gs)||o===sel||o===hovA)continue;if(facingC(o,c)<.05){o.el.remove();list.splice(i,1);o.parkedAt=now;parked.push(o)}}});
    for(let i=parked.length-1;i>=0;i--){const o=parked[i],away=(now-o.parkedAt)/1000,nm=(o.gs||o.kt)*away/3600,h=o.hdg*D2R;
      const la=o.lat+nm*Math.cos(h)/60,lo=o.lon+nm*Math.sin(h)/(60*Math.cos(o.lat*D2R));const q={lat:Math.max(-80,Math.min(80,la)),lon:((lo+540)%360)-180};
      if(facingC(q,c)>.25){parked.splice(i,1);if(o.kind==='sea'&&nearLand(q.lat,q.lon))continue;o.lat=q.lat;o.lon=q.lon;o.dir=null;o.hist=null;LB.appendChild(o.el);const L=o.kind==='air'?planes:ships;if(!L.includes(o))L.push(o)}}
    if(parked.length>800)parked.splice(0,parked.length-800)}
  function spawnTraffic(now,Wd,Ht){if(now-spawnAt<900)return;spawnAt=now;parkAndRestore(now);
    /* (no emergency squawk on the hero globe) */
    if(false&&layer.air&&now-(window.__secAt||0)>3200&&!planes.some(p=>p.emerg&&p.vis)){const c=planes.filter(p=>p.vis&&!p.mil&&!p.el.classList.contains('off'));if(c.length){planes.forEach(p=>{if(p.emerg){p.emerg=false;p.dir=null}});const Wd=W(),Ht=H();c.sort((a,b)=>{const pa=scr(objPos(a)),pb=scr(objPos(b));return Math.hypot(pa[0]-Wd*.55,pa[1]-Ht*.72)-Math.hypot(pb[0]-Wd*.55,pb[1]-Ht*.72)});const e=c[0];e.emerg=true;e.sq='7700';e.dir=null}}if(Math.abs(view.d-goal.d)>view.d*.05)return;if(!window.__arrAt&&Math.abs(goal.lon-view.lon)<2&&Math.abs(goal.lat-view.lat)<2)window.__arrAt=now;const entry=now-(window.__secAt||0)<4500||(window.__arrAt&&now-window.__arrAt<4000),turning=!layer.sea&&!layer.sdr&&!layer.land&&!drag;if(!entry&&!turning)return;
    const r0=cv.getBoundingClientRect(),hits=[],t0=Math.max(Ht*.2,window.GL_TOP||0,Math.min(Ht*.6,topRef()-r0.top));for(let i=(entry?1:8);i<10;i++)for(let j=0;j<=6;j++){const ll=llAt(r0.left+Wd*i/10,r0.top+t0+(Ht-t0)*(j+.5)/7);if(ll&&V(ll[0],ll[1]).normalize().dot(cam.position.clone().normalize())>.55)hits.push(ll)}if(hits.length<(entry?6:2))return;
    const top=t0;const inView=o=>{const p=objPos(o);if(!facing(p))return false;const [x,y,z]=scr(p);return z<1&&x>0&&x<Wd&&y>top&&y<Ht};
    const area=Math.min(1,Math.max(.3,Wd*(Ht-(window.GL_TOP||0))/(1440*900)));const want=k=>Math.round(k*area*Math.min(1,hits.length/40)*(view.d>420?1.3:1));
    let needE=false,nA=planes.filter(inView).length,nS=ships.filter(inView).length,tries=0;
    /* spread civil traffic across every country in view: each new aircraft goes to the visible spot furthest from the ones already shown */
    const vis=planes.filter(inView).map(o=>V(o.lat,o.lon).normalize());const far=()=>{let best=null,bd=-1;for(let k=0;k<10;k++){const h=hits[Math.random()*hits.length|0],v=V(h[0],h[1]).normalize();let md=9;vis.forEach(q=>{const d=1-q.dot(v);if(d<md)md=d});if(md>bd){bd=md;best=h}}return best};
    while(nA<Math.min(want(MAX_AIR*.85),MAX_AIR)&&tries++<16){const [la,lo]=far();const milArea=(la>34&&la<72&&lo>-25&&lo<32)||(la>15&&la<72&&lo>-170&&lo<-50),mil=milArea&&Math.random()<.18,ukArea=la>48&&la<62&&lo>-12&&lo<4,pool=MIL.filter(m=>ukArea||!UK_ONLY.includes(m[0])),mm=pool[Math.random()*pool.length|0];const o={kind:'air',mil,name:mil?mm[0]+(10+(Math.random()*890|0)):AL[Math.random()*AL.length|0]+(10+(Math.random()*2980|0)),type:mil?mm[1]:AT[Math.random()*AT.length|0],lat:la+rnd(-2,2),lon:lo+rnd(-3,3),hdg:rnd(0,360),gs:Math.round(rnd(380,520)),kt:0,alt:Math.round(rnd(9,41))*1000,sq:String(1000+(Math.random()*6777|0)).padStart(4,'0'),hex:(0x300000+(Math.random()*0x4fffff|0)).toString(16).toUpperCase(),demo:true,trail:null,dir:null};
      if(needE&&!mil){o.emerg=true;o.sq='7700';needE=false}o.kt=o.gs;o.col=altColor(o.alt);o.el=pill();o.el.dataset.k='air';LB.appendChild(o.el);planes.push(o);vis.push(V(o.lat,o.lon).normalize());nA++}
    tries=0;while(nS<Math.min(want(MAX_SEA*(layer.sea?.9:.6)),MAX_SEA)&&tries++<(layer.sea?80:20)){const [la,lo]=hits[Math.random()*hits.length|0];const lat=la+rnd(-1.5,1.5),lon=lo+rnd(-2,2);if(Math.abs(lat)>72||nearLand(lat,lon))continue;
      const fam=pickF(),o={kind:'sea',free:true,name:(()=>{const used=new Set(ships.concat(parked.filter(x=>x.kind==='sea')).map(x=>x.name));const free=VN.filter(n=>!used.has(n));return free.length?free[Math.random()*free.length|0]:VN[Math.random()*VN.length|0]+' II'})(),fam,col:FAM[fam],lat,lon,hdg:rnd(0,360),kt:+rnd(fam==='fishing'?4:10,fam==='passenger'?22:16).toFixed(1),mmsi:String(200000000+(Math.random()*599999999|0)),trail:null,dir:null};
      o.el=pill();o.el.dataset.k='sea';LB.appendChild(o.el);ships.push(o);nS++}
    for(let i=ships.length-1;i>=0;i--){const o=ships[i];if(o.free&&o!==sel&&isLand(o.lat,o.lon)){o.el.remove();ships.splice(i,1)}}
    /* keep the totals bounded: drop the generated ones furthest from the view */
    const cap=(list,max)=>{if(list.length<=max)return;const c=V(view.lat,view.lon).normalize();const gen=list.filter(o=>o.free||o.gs);gen.sort((a,b)=>V(a.lat,a.lon).normalize().dot(c)-V(b.lat,b.lon).normalize().dot(c));
      gen.slice(0,list.length-max).forEach(o=>{if(o===sel)return;o.el.remove();list.splice(list.indexOf(o),1)})};
    cap(planes,MAX_AIR*3);cap(ships,MAX_SEA*3)}
  requestAnimationFrame(frame);
})();

