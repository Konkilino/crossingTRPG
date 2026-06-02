/* ═══════════════════════════════════════════════
   TRPG Crossing Terminal - Character Panel
   ═══════════════════════════════════════════════ */
const ABILITY_IDS = ['str','dex','con','int','wis','cha'];
const ABILITY_NAMES = { str:'STR（力量）', dex:'DEX（敏捷）', con:'CON（体质）', int:'INT（智力）', wis:'WIS（感知）', cha:'CHA（魅力）' };
const ABILITY_SHORT = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };
const BADGE_TIERS = ['一阶铭牌','二阶铭牌','三阶铭牌','四阶铭牌','五阶铭牌','六阶铭牌'];
const SKILL_CATEGORIES = {
  "力量":[
    ["saveStr","力量豁免","str"],
    ["powerStrike","威力","str"],
    ["athCarry","承重","str"],
    ["athJump","跳跃","str"],
    ["athClimb","攀爬","str"],
    ["athSwim","游泳","str"],
    ["athCustom",null,"str"]
  ],
  "敏捷":[
    ["saveDex","敏捷豁免","dex"],
    ["dexGymnastics","体操","dex"],
    ["dexRide","骑乘","dex"],
    ["dexStealth","隐匿","dex"],
    ["sleightSteal","偷窃","dex"],
    ["sleightLock","开锁","dex"],
    ["sleightDisarm","拆除","dex"],
    ["sleightCustom",null,"dex"]
  ],
  "体质":[
    ["saveCon","体质豁免","con"],
    ["dexFocus","专注","con"],
    ["dexEndurance","耐力","con"]
  ],
  "魅力":[
    ["saveCha","魅力豁免","cha"],
    ["socDeceive","欺瞒","cha"],
    ["socIntimidate","恐吓","cha"],
    ["socPersuade","说服","cha"],
    ["perfSing","歌唱","cha"],
    ["perfDance","舞蹈","cha"],
    ["perfCustom",null,"cha"]
  ],
  "智力":[
    ["saveInt","智力豁免","int"],
    ["knoReligion","宗教","int"],
    ["knoInvestigate","调查","int"],
    ["knoAppraise","估价","int"],
    ["knoForge","伪造","int"],
    ["knoLipRead","读唇","int"],
    ["knoLogic","逻辑","int"],
    ["knoLearn","学习","int"],
    ["arcMagic","魔法","int"],
    ["arcAlchemy","炼金","int"],
    ["arcItem","神奇道具","int"],
    ["arcMulti","多元宇宙","int"],
    ["genHistory","历史","int"],
    ["genGeography","地理","int"],
    ["genHumanity","人文","int"],
    ["genPolitics","政治","int"],
    ["genOccult","神秘学","int"],
    ["genEngineer","工程","int"],
    ["genJewelry","珠宝","int"],
    ["genComputer","计算机","int"],
    ["genMedicine","医药","int"],
    ["genCooking","烹饪","int"],
    ["genNature","自然","int"],
    ["genAnimal","驯兽","int"],
    ["genEducation","义务教育","int"],
    ["genCustom",null,"int"]
  ],
  "感知":[
    ["saveWis","感知豁免","wis"],
    ["senInsight","洞悉","wis"],
    ["senListen","聆听","wis"],
    ["senPerception","察觉","wis"]
  ]
};
const CAT_COLORS = {"力量":"#ff6b6b","敏捷":"#69db7c","体质":"#2ed573","魅力":"#74c0fc","智力":"#b197fc","感知":"#f783ac"};

// loadJSON 来自 dataService.js（全局），不再在此定义

let _pageInited = false, _inChange = false;
let _badges = {}; BADGE_TIERS.forEach(t=>_badges[t]=0);
let _mainXp = 0, _mainAp = 0, _xpNext = 100, _currencies = [{name:'银两',amount:0},{name:'铜币',amount:0}];
let _inventory = [], _activeSlots = [], _passiveSlots = [], _talents = [], _enhances = [];
const _skillWidgets = {};

function initCharacterPage() {
  if (Object.keys(characters).length === 0) {
    showCreateGuide();
    return;
  }
  if (_pageInited && currentCharName) {
    if (currentCharName && characters[currentCharName]) loadCharacterIntoUI(currentCharName, characters[currentCharName]);
    return;
  }
  _pageInited = true;
  buildIdentityGrid(); buildStatsGrid(); buildDerivedGrid(); buildStatusDisplay();
  buildSkillLists(); buildBackgroundFields(); buildBadgeGrid(); buildCurrencyGrid();
  loadStatusRefs().then(function(){
    refreshCharSelector();
    if (!currentCharName) { const n = Object.keys(characters); if (n.length) currentCharName = n[0]; }
    if (currentCharName && characters[currentCharName]) loadCharacterIntoUI(currentCharName, characters[currentCharName]);
    else showCreateGuide();
  });
}
function restoreCharSections(){
  var guide=document.getElementById('createGuide');
  if(guide){guide.remove();}
}
function buildIdentityGrid() {
  const grid = document.getElementById('identityGrid');
  grid.innerHTML = '';
  [['playerName','玩家名称','text'],['charName','角色名称','text'],['race','种族','text'],['gender','性别','text'],['age','年龄','number',1,999,20],['height','身高(cm)','number',1,300,170],['weight','体重(kg)','number',1,500,65],['eyeColor','瞳色','text'],['skinColor','肤色','text'],['hairColor','发色','text']].forEach(f=>{
    const[key,label,type,...args]=f;
    const div=document.createElement('div'); div.className='id-field';
    const lbl=document.createElement('label'); lbl.textContent=label; div.appendChild(lbl);
    if(type==='number'){
      const w=document.createElement('div'); w.className='stepper';
      const bm=document.createElement('button'); bm.textContent='−'; bm.onclick=()=>{const n=w.querySelector('input'); n.value=Math.max(parseInt(n.value)-1,args[0]); onCharFieldChange(key);}; w.appendChild(bm);
      const inp=document.createElement('input'); inp.type='number'; inp.value=args[2]||0; inp.min=args[0]; inp.max=args[1]; inp.oninput=()=>onCharFieldChange(key); inp.dataset.save=key; w.appendChild(inp);
      const bp=document.createElement('button'); bp.textContent='+'; bp.onclick=()=>{const n=w.querySelector('input'); n.value=Math.min(parseInt(n.value)+1,args[1]); onCharFieldChange(key);}; w.appendChild(bp);
      div.appendChild(w);
    } else {
      const inp=document.createElement('input'); inp.type='text'; inp.placeholder='输入'+label+'…'; inp.oninput=()=>onCharFieldChange(key); inp.dataset.save=key; div.appendChild(inp);
    }
    grid.appendChild(div);
  });
}
function buildStatsGrid() {
  const grid=document.getElementById('statsGrid'); grid.innerHTML='';
  ABILITY_IDS.forEach(id=>{
    const c=document.createElement('div'); c.className='stat-card';
    c.innerHTML=`<div class="stat-label">${ABILITY_NAMES[id]}</div><div style="margin:4px 0"><div class="stepper"><button onclick="statStep('${id}',-1)">-</button><input type="number" id="stat_${id}" value="10" min="1" max="30" oninput="onStatChange('${id}')" style="width:50px;text-align:center;border-radius:0;padding:2px;font-size:14px;font-weight:700"><button onclick="statStep('${id}',1)">+</button></div></div><div class="stat-mod" id="mod_${id}">+0</div>`;
    grid.appendChild(c);
  });
}
function statStep(id,d){const inp=document.getElementById('stat_'+id);if(!inp)return;let v=parseInt(inp.value)||10;v=Math.max(1,Math.min(30,v+d));inp.value=v;onStatChange(id);}
function calcMod(v){return Math.floor((v-10)/2);}
function fmtMod(v){return v>=0?'+'+v:''+v;}
function onStatChange(id){const inp=document.getElementById('stat_'+id),me=document.getElementById('mod_'+id);if(inp&&me){const v=parseInt(inp.value)||10;me.textContent=fmtMod(calcMod(v));}onCharFieldChange('stats.'+id);updateLoadCalc();}
function buildDerivedGrid() {
  const grid=document.getElementById('derivedGrid'); grid.innerHTML='';
  [['level','穿越者等级',1,999,1],['ac','护甲等级AC',0,999,10],['initiative','先攻值',-99,99,0],['speed','移动速度',0,999,30],['attackBonus','命中加值',-99,99,0],['vigilance','警惕值',0,99,10],['will','意志',1,10,1],['luck','幸运',1,10,1],['enlightenment','悟性',1,10,1]].forEach(([k,l,mi,ma,v])=>{
    const d=document.createElement('div'); d.className='derived-item';
    d.innerHTML='<label>'+l+'</label>';
    const inp=document.createElement('input'); inp.type='number'; inp.value=v; inp.min=mi; inp.max=ma; inp.oninput=()=>onCharFieldChange('derived.'+k); inp.dataset.save=k; d.appendChild(inp); grid.appendChild(d);
  });
}
function buildStatusDisplay() {
  try {
    updateStatusIcons('hp');
    updateStatusIcons('fatigue');
    updateXpBar();
  } catch(e) { console.warn('Status init:', e); }
}
function onStatusChange(k){updateStatusIcons(k);onCharFieldChange('status.'+k);}
function onFatigueLabelChange(){
  var inp=document.getElementById('fatigueLabel');
  if(inp&&currentCharName&&characters[currentCharName]){
    if(!characters[currentCharName].derived)characters[currentCharName].derived={};
    characters[currentCharName].derived.fatigueLabel=inp.value;
  }
  autoSave();
}
function updateStatusIcons(k){
  var cur=parseInt(document.getElementById('st_'+k+'Cur').value)||0;
  var maxEl=document.getElementById('st_'+k+'Max');
  var max=(maxEl?parseInt(maxEl.value)||1:1);
  var icons=document.getElementById(k+'Icons'),pct=document.getElementById(k+'Pct');if(!icons)return;
  if(k==='hp'){
    var full=Math.floor(cur/10),part=cur%10,total=Math.ceil(max/10);icons.innerHTML='';
    for(var i=0;i<total;i++){
      var h=document.createElement('span');h.className='heart-ico';
      var fill=i<full?100:i===full?Math.round(part/10*100):0;
      var uid='hc_'+k+'_'+i+'_'+Math.random().toString(36).substr(2,6);
      h.innerHTML='<svg viewBox="0 0 24 24"><defs><clipPath id="'+uid+'"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></clipPath></defs><rect x="0" y="0" width="24" height="24" fill="#3a1a2a" clip-path="url(#'+uid+')"/><rect x="0" y="'+(24-fill*24/100)+'" width="24" height="'+(fill*24/100)+'" fill="#ff4757" clip-path="url(#'+uid+')"/></svg>';
      icons.appendChild(h);
    }
    if(pct)pct.textContent='('+cur+'/'+max+' '+(max?Math.round(cur/max*100):0)+'%)';
    var container=document.querySelector('.si-'+k);
    if(container){
      var ratio=max?cur/max:1;
      if(k==='hp'&&ratio<0.3)container.classList.add('warning');
      else if(k==='fatigue'&&ratio>0.8)container.classList.add('warning');
      else container.classList.remove('warning');
    }
  }else if(k==='fatigue'){
    var full=Math.floor(cur/2),part=cur%2,total=Math.ceil(max/2);icons.innerHTML='';
    for(var i=0;i<total;i++){
      var l=document.createElement('span');l.className='leaf-ico';
      var fill=i<full?100:i===full?Math.round(part/2*100):0;
      var uid='lc_'+k+'_'+i+'_'+Math.random().toString(36).substr(2,6);
      l.innerHTML='<svg viewBox="0 0 24 24"><defs><clipPath id="'+uid+'"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8-2 8-7 0-2-1-3-2-4m-2 5a3 3 0 01-3 3c-.36 0-.72 0-1-.13a9.9 9.9 0 001.45-2.87C13.1 12.41 14 13.54 15 14"/></clipPath></defs><rect x="0" y="0" width="24" height="24" fill="#1a3a2a" clip-path="url(#'+uid+')"/><rect x="0" y="'+(24-fill*24/100)+'" width="24" height="'+(fill*24/100)+'" fill="#2ed573" clip-path="url(#'+uid+')"/></svg>';
      icons.appendChild(l);
    }
    if(pct)pct.textContent='('+cur+'/'+max+' '+(max?Math.round(cur/max*100):0)+'%)';
  }
}
function updateXpBar(curVal,nextVal){
  var cur=curVal!==undefined?curVal:(parseInt(document.getElementById('st_xpCur')&&document.getElementById('st_xpCur').value)||0);
  var next=nextVal!==undefined?nextVal:(parseInt(document.getElementById('st_xpMax')&&document.getElementById('st_xpMax').value)||100);
  var fill=document.getElementById('xpBarFill'),txt=document.getElementById('xpText');
  if(fill)fill.style.width=Math.min(100,(next?cur/next:0)*100)+'%';
  if(txt)txt.textContent=cur+' / '+next;
}
function buildSkillLists(){
  const l=document.getElementById('skillLeft'),r=document.getElementById('skillRight');l.innerHTML='';r.innerHTML='';
  const cats=Object.entries(SKILL_CATEGORIES),mid=Math.ceil(cats.length/2);
  [l,r].forEach((col,ci)=>{
    const slice=ci===0?cats.slice(0,mid):cats.slice(mid);
    slice.forEach(([cn,sk])=>{
      const g=document.createElement('div');g.className='skill-cat';
      const t=document.createElement('div');t.className='cat-title';t.style.color=CAT_COLORS[cn]||'#888';t.textContent=cn;g.appendChild(t);
      sk.forEach(([id,label,stat])=>{
        const row=document.createElement('div');row.className='skill-row';
        _skillWidgets[id]={};
        const cb=document.createElement('input');cb.type='checkbox';cb.onchange=()=>autoSave();row.appendChild(cb);_skillWidgets[id].check=cb;
        if(label===null){
          const inp=document.createElement('input');inp.className='sk-custom';inp.placeholder='自定义…';inp.oninput=()=>autoSave();row.appendChild(inp);_skillWidgets[id].customInput=inp;
        }else{
          const nm=document.createElement('span');nm.className='sk-name';nm.textContent=label;row.appendChild(nm);
          const dm=document.createElement('input');dm.className='sk-name-dm';dm.value=label;dm.oninput=()=>autoSave();row.appendChild(dm);_skillWidgets[id].labelEl={label,dm};
        }
        const val=document.createElement('input');val.type='number';val.value=0;val.style.width='32px';val.oninput=function(){autoSave();if(id==='athCarry')updateLoadCalc();};row.appendChild(val);_skillWidgets[id].value=val;
const sdec=document.createElement('button');sdec.textContent='−';sdec.className='skill-step';sdec.onclick=function(){var v=parseInt(val.value)||0;val.value=Math.max(0,v-1);val.dispatchEvent(new Event('input'));};row.insertBefore(sdec,val);
const sinc=document.createElement('button');sinc.textContent='+';sinc.className='skill-step';sinc.onclick=function(){var v=parseInt(val.value)||0;val.value=v+1;val.dispatchEvent(new Event('input'));};row.insertBefore(sinc,val.nextSibling);
        const hint=document.createElement('span');hint.className='sk-stat';hint.textContent=ABILITY_SHORT[stat]||stat;row.appendChild(hint);
        g.appendChild(row);
      });
      col.appendChild(g);
    });
  });
  const od=document.createElement('div');od.className='skill-cat';
  od.innerHTML='<div class="cat-title" style="color:#888">其他熟练项</div><div class="other-profs" id="otherProfsDiv"></div><span class="add-prof-btn" onclick="addOtherProf()">+ 添加熟练项</span>';
  r.appendChild(od);
}
function addOtherProf(){
  const d=document.getElementById('otherProfsDiv');
  const t=document.createElement('span');t.className='other-prof';t.contentEditable=true;t.textContent='新熟练项';
  t.onblur=function(){if(!this.textContent.trim())this.remove();autoSave();};
  t.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();this.blur();}};
  d.appendChild(t);t.focus();
  const s=window.getSelection(),r=document.createRange();r.selectNodeContents(t);r.collapse(false);s.removeAllRanges();s.addRange(r);autoSave();
}
function buildBackgroundFields(){
  var grid=document.getElementById('bgGrid');grid.innerHTML='';
  var fields=[
    ['bgPersonality','个性背景','personality'],
    ['bgTraits','个人特点','traits'],
    ['bgIdeals','理念','ideals'],
    ['bgBonds','牵绊','bonds'],
    ['bgFlaws','缺点','flaws']
  ];
  fields.forEach(function(f){
    var k=f[0],l=f[1],ek=f[2];
    var row=document.createElement('div');row.className='bg-row';
    var lb=document.createElement('div');lb.className='bg-label';lb.textContent=l;row.appendChild(lb);
    var ta=document.createElement('textarea');
    ta.oninput=function(){onCharFieldChange('bg.'+k);};
    ta.dataset.save=k;ta.placeholder=l;ta.style.minHeight='36px';
    row.appendChild(ta);
    // 效果列
    var eff=document.createElement('textarea');
    eff.className='bg-effect';
    eff.placeholder='特质效果（可选）';
    eff.style.minHeight='36px';
    eff.style.color='var(--accent-gold)';
    eff.style.fontSize='11px';
    eff.dataset.effectKey=ek;
    eff.oninput=function(){onBgEffectChange(ek,this.value);};
    row.appendChild(eff);
    grid.appendChild(row);
  });
}
function onBgEffectChange(key,val){
  if(!currentCharName||!characters[currentCharName])return;
  if(!characters[currentCharName].background.bgEffects)characters[currentCharName].background.bgEffects={};
  characters[currentCharName].background.bgEffects[key]=val;
  autoSave();
}
function addTalent(){const inp=document.getElementById('talentInput'),val=inp.value.trim();if(!val)return;if(!_talents.includes(val))_talents.push(val);inp.value='';renderTags('talentArea',_talents,'removeTalent');autoSave();}
function removeTalent(val){_talents=_talents.filter(t=>t!==val);renderTags('talentArea',_talents,'removeTalent');autoSave();}
function addEnhance(){const inp=document.getElementById('enhanceInput'),val=inp.value.trim();if(!val)return;if(!_enhances.includes(val))_enhances.push(val);inp.value='';renderTags('enhanceArea',_enhances,'removeEnhance');autoSave();}
function removeEnhance(val){_enhances=_enhances.filter(t=>t!==val);renderTags('enhanceArea',_enhances,'removeEnhance');autoSave();}
function renderTags(aid,items,fn){
  const a=document.getElementById(aid),inp=a.querySelector('.tag-input');
  a.querySelectorAll('.tag').forEach(t=>t.remove());
  items.forEach(v=>{const t=document.createElement('span');t.className='tag';t.innerHTML=v+' <span class="remove" onclick="'+fn+"('"+v+"')"+'">x</span>';a.insertBefore(t,inp);});
}
function buildBadgeGrid(){
  const grid=document.getElementById('badgeGrid');grid.innerHTML='';
  const tc=['#69db7c','#74c0fc','#b197fc','#ffa94d','#ff6b6b','#ff6b6b'];
  BADGE_TIERS.forEach((t,i)=>{
    const s=document.createElement('div');s.style.cssText='background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:6px 12px;text-align:center;min-width:80px';
    s.innerHTML='<div style="font-size:9px;color:'+tc[i]+';font-weight:600">'+t+'</div><input type="number" id="badge_'+i+'" value="'+(_badges[t]||0)+'" min="0" onchange="updateBadge('+i+',this.value)" style="width:50px;text-align:center;font-size:14px;font-weight:700;color:'+tc[i]+';margin-top:2px">';
    grid.appendChild(s);
  });
}
function updateBadge(i,v){_badges[BADGE_TIERS[i]]=parseInt(v)||0;autoSave();}
function convertBadgeUp(){
  for(let i=BADGE_TIERS.length-2;i>=0;i--){
    if((_badges[BADGE_TIERS[i]]||0)>=3&&_mainXp>=20){
      _badges[BADGE_TIERS[i]]-=3;_badges[BADGE_TIERS[i+1]]=(_badges[BADGE_TIERS[i+1]]||0)+1;_mainXp-=20;
      document.getElementById('mainXp').value=_mainXp;buildBadgeGrid();autoSave();showToast('合成成功！获得'+BADGE_TIERS[i+1]);return;
    }
  }
  showToast('材料不足：需要3个同阶铭牌+20经验值');
}
function convertBadgeDown(){
  for(let i=1;i<BADGE_TIERS.length;i++){
    if((_badges[BADGE_TIERS[i]]||0)>=1){
      _badges[BADGE_TIERS[i]]-=1;_badges[BADGE_TIERS[i-1]]=(_badges[BADGE_TIERS[i-1]]||0)+3;
      buildBadgeGrid();autoSave();showToast('拆分成功！获得3个'+BADGE_TIERS[i-1]);return;
    }
  }
  showToast('没有可拆分的铭牌');
}
function showToast(msg){
  const el=document.getElementById('saveFeedback');if(!el)return;
  el.textContent=msg;el.classList.add('show');
  clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>el.classList.remove('show'),2000);
}
function buildCurrencyGrid(d){
  const grid=document.getElementById('currencyGrid');grid.innerHTML='';
  const data=d||_currencies;
  data.forEach((c,i)=>{
    const s=document.createElement('div');s.className='cur-slot';
    s.innerHTML='<div class="cur-name">'+c.name+'</div>';
    const inp=document.createElement('input');inp.type='number';inp.value=c.amount||0;inp.min=0;
    inp.oninput=function(){_currencies[i].amount=parseInt(this.value)||0;autoSave();};s.appendChild(inp);grid.appendChild(s);
  });
}
function updateLoadCalc(){
  const strEl=document.getElementById('stat_str'),strVal=strEl?parseInt(strEl.value)||10:10;
  let carryProf=0;
  const cc=_skillWidgets['athCarry']&&_skillWidgets['athCarry'].check,cv=_skillWidgets['athCarry']&&_skillWidgets['athCarry'].value;
  if(cc&&cc.checked&&cv)carryProf=parseInt(cv.value)||0;
  const base=strVal+carryProf;
  document.getElementById('loadNormal').value=base*5;
  document.getElementById('loadMax').value=base*10;
  document.getElementById('loadLimit').value=base*15;
  let cur=0;_inventory.forEach(i=>{cur+=(i.weight||0)*(i.qty||0);});
  document.getElementById('loadCurrent').value=cur;
  const pct=Math.min(100,(cur/(base*15))*100),bar=document.getElementById('loadBar'),st=document.getElementById('loadStatus');
  if(bar)bar.style.width=pct+'%';
  if(!st)return;
  const nl=base*5,ml=base*10;
  if(cur<=nl){st.textContent='轻载';bar.style.background='var(--accent-green)';}
  else if(cur<=ml){st.textContent='中载（敏捷-2）';bar.style.background='var(--accent-orange)';}
  else if(cur<=base*15){st.textContent='重载（敏捷-5，速度减半）';bar.style.background='var(--accent-red)';}
  else{st.textContent='超载（无法移动）';bar.style.background='#ff0000';}
}
function addInvItem(){_inventory.push({name:'新物品',qty:1,weight:0});renderInventory();autoSave();}
function renderInventory(){
  const tb=document.getElementById('invBody');tb.innerHTML='';
  _inventory.forEach((item,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td><input value="'+item.name+'" onchange="updInv('+i+',\'name\',this.value)"></td><td><input type="number" value="'+item.qty+'" min="1" onchange="updInv('+i+',\'qty\',parseInt(this.value)||1);updateLoadOnInvChange()"></td><td><input type="number" value="'+item.weight+'" min="0" step="0.1" onchange="updInv('+i+',\'weight\',parseFloat(this.value)||0);updateLoadOnInvChange()"></td><td><span style="color:var(--accent-red);cursor:pointer;font-size:16px" onclick="delInv('+i+')">x</span></td>';
    tb.appendChild(tr);
  });
  updateLoadCalc();
}
function updInv(i,f,v){_inventory[i][f]=v;autoSave();}
function delInv(i){_inventory.splice(i,1);renderInventory();autoSave();}
function updateLoadOnInvChange(){updateLoadCalc();}
function renderActiveSlots(){
  const c=document.getElementById('activeSlots');c.innerHTML='';
  _activeSlots.forEach((s,i)=>{
    const card=document.createElement('div');card.className='slot-card';
    card.innerHTML='<div class="slot-hdr"><input value="'+(s.name||'')+'" placeholder="技能名称" onchange="updActive('+i+',\'name\',this.value)"><span class="slot-del" onclick="delActive('+i+')">x</span></div><div class="slot-details"><div class="detail-field"><label>施展时间</label><input value="'+(s.castTime||'')+'" onchange="updActive('+i+',\'castTime\',this.value)"></div><div class="detail-field"><label>施展距离</label><input value="'+(s.range||'')+'" onchange="updActive('+i+',\'range\',this.value)"></div><div class="detail-field"><label>持续时间</label><input value="'+(s.duration||'')+'" onchange="updActive('+i+',\'duration\',this.value)"></div><div class="detail-field"><label>疲劳消耗</label><input type="number" value="'+(s.cost||0)+'" onchange="updActive('+i+',\'cost\',parseInt(this.value)||0)"></div><div class="detail-field"><label>类别</label><input value="'+(s.category||'')+'" onchange="updActive('+i+',\'category\',this.value)"></div></div>';
    c.appendChild(card);
  });
}
function addActiveSlot(){if(_activeSlots.length>=4)return;_activeSlots.push({name:'',castTime:'',range:'',duration:'',cost:0,category:''});renderActiveSlots();autoSave();}
function updActive(i,f,v){_activeSlots[i][f]=v;autoSave();}
function delActive(i){_activeSlots.splice(i,1);renderActiveSlots();autoSave();}
function renderPassiveSlots(){
  const c=document.getElementById('passiveSlots');c.innerHTML='';
  _passiveSlots.forEach((s,i)=>{
    const card=document.createElement('div');card.className='slot-card';
    card.innerHTML='<div class="slot-hdr"><input value="'+(s.name||'')+'" placeholder="技能名称" onchange="updPassive('+i+',\'name\',this.value)"><span class="slot-del" onclick="delPassive('+i+')">x</span></div><div class="slot-details"><div class="detail-field"><label>类别</label><input value="'+(s.category||'')+'" onchange="updPassive('+i+',\'category\',this.value)"></div><div class="detail-field"><label>阶段</label><input value="'+(s.stage||'')+'" onchange="updPassive('+i+',\'stage\',this.value)"></div></div>';
    c.appendChild(card);
  });
}
function addPassiveSlot(){if(_passiveSlots.length>=2)return;_passiveSlots.push({name:'',category:'',stage:''});renderPassiveSlots();autoSave();}
function updPassive(i,f,v){_passiveSlots[i][f]=v;autoSave();}
function delPassive(i){_passiveSlots.splice(i,1);renderPassiveSlots();autoSave();}

function loadCharacterIntoUI(name,data){
  currentCharName=name;if(!data)return;_inChange=true;
  document.querySelectorAll('#identityGrid [data-save]').forEach(inp=>{const k=inp.dataset.save;if(k&&data.identity&&k in data.identity)inp.value=data.identity[k];});
  // 回填职业和基因锁字段
  ['mainClass','subClass'].forEach(function(k){var el=document.getElementById('id'+k.charAt(0).toUpperCase()+k.slice(1));if(el&&data.identity)el.value=data.identity[k]||'';});
  ['mainClassLevel','subClassLevel'].forEach(function(k){var el=document.getElementById('id'+k.charAt(0).toUpperCase()+k.slice(1));if(el&&data.identity)el.value=data.identity[k]||1;});
  var glEl=document.getElementById('idGeneLockLevel');if(glEl&&data.identity)glEl.value=data.identity.geneLockLevel||'未开启';
  // 基因锁开关状态
  var glBtn=document.getElementById('geneLockToggle'),glProf=document.getElementById('idGeneLockProf');
  var glEnabled=data.identity&&data.identity.geneLockEnabled!==false;
  if(glBtn){
    if(glEnabled){glBtn.textContent='✓';glBtn.style.background='var(--accent-green)';}
    else{glBtn.textContent='✗';glBtn.style.background='var(--accent-red)';}
  }
  if(glEl){glEl.disabled=!glEnabled;}
  if(glProf){
    glProf.disabled=!glEnabled;
    // 从 geneLockProfs 加载当前阶的熟练度
    var profs=data.identity.geneLockProfs||{};
    var curTier=data.identity.geneLockLevel||'未开启';
    glProf.value=curTier!=='未开启'?profs[curTier]||0:0;
  }
  updateGeneLockTierOptions();
  // 基因锁可见性（仅人类）
  updateGeneLockVisibility();
  ABILITY_IDS.forEach(id=>{const inp=document.getElementById('stat_'+id);if(inp){inp.value=(data.stats&&data.stats[id])||10;onStatChange(id);}});
  document.querySelectorAll('#derivedGrid input').forEach(inp=>{const k=inp.dataset.save;if(k&&data.derived&&k in data.derived)inp.value=data.derived[k];});
  ['hp','fatigue'].forEach(k=>{const cur=document.getElementById('st_'+k+'Cur'),mx=document.getElementById('st_'+k+'Max');if(cur&&data.derived)cur.value=data.derived[k+'Current']||(k==='hp'?10:0);if(mx&&data.derived)mx.value=data.derived[k+'Max']||10;onStatusChange(k);});
  var fl=document.getElementById('fatigueLabel');if(fl)fl.value=(data.derived&&data.derived.fatigueLabel)||'🍃 疲劳值';
  const sk=data.skills||{};
  Object.entries(_skillWidgets).forEach(([id,w])=>{const sd=sk[id]||{};if(w.check)w.check.checked=!!sd.checked;if(w.value)w.value.value=sd.value||0;if(w.customInput)w.customInput.value=(data.customNames&&data.customNames[id])||'';});
  const pd=document.getElementById('otherProfsDiv');
  if(pd){pd.innerHTML='';(data.otherProfs||['通用语']).forEach(p=>{const t=document.createElement('span');t.className='other-prof';t.contentEditable=true;t.textContent=p;t.onblur=function(){if(!this.textContent.trim())this.remove();autoSave();};t.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();this.blur();}};pd.appendChild(t);});}
  ['bgPersonality','bgTraits','bgIdeals','bgBonds','bgFlaws'].forEach(k=>{const ta=document.querySelector('[data-save="'+k+'"]');if(ta&&data.background)ta.value=data.background[k]||'';});
  // 回填特质效果
  document.querySelectorAll('.bg-effect').forEach(function(el){el.value='';});
  var effs=data.background&&data.background.bgEffects;
  if(effs){
    document.querySelectorAll('.bg-effect').forEach(function(el){
      var ek=el.dataset.effectKey;
      if(ek&&effs[ek])el.value=effs[ek];
    });
  }
  const bgm=document.getElementById('bgMechanics');if(bgm)bgm.value=(data.background&&data.background.bgMechanics)||'';
  _talents=data.talents||[];_enhances=data.enhances||[];renderTags('talentArea',_talents,'removeTalent');renderTags('enhanceArea',_enhances,'removeEnhance');
  _mainXp=(data.property&&data.property.mainXp)||0;
  _mainAp=0;
  if(data.property&&data.property.mainAp)_mainAp=data.property.mainAp;
  else if(data.wealth&&data.wealth.achievePoints)_mainAp=data.wealth.achievePoints;
  _xpNext=100;
  if(data.derived)_xpNext=data.derived.xpMax||data.derived.xpNext||100;
  document.getElementById('mainXp').value=_mainXp;document.getElementById('mainAp').value=_mainAp;
  updateXpBar(_mainXp,_xpNext);
  _badges={};BADGE_TIERS.forEach(t=>_badges[t]=0);if(data.property&&data.property.badges)Object.assign(_badges,data.property.badges);
  buildBadgeGrid();
  const eq=data.equipment||{};['weaponMain','weaponOff','armor'].forEach(k=>{const el=document.getElementById(k);if(el)el.value=eq[k]||'';});
  _currencies=(data.wealth&&data.wealth.currencies)||_currencies;buildCurrencyGrid(_currencies);
  _inventory=data.inventory||[];renderInventory();
  _activeSlots=data.activeSlots||[];_passiveSlots=data.passiveSlots||[];renderActiveSlots();renderPassiveSlots();
  if(!data.statusDetail){
    data.statusDetail={
      bloodline:"人类",
      race:data.identity&&data.identity.race||"人类",
      baseClass:"学生",
      promotion:"无",
      promoState:"未转职"
    };
  }
  if(data.statusDetail){
    ["bloodline","race","baseClass","promotion"].forEach(function(k){
      var el=document.getElementById("char"+k.charAt(0).toUpperCase()+k.slice(1));
      if(el&&data.statusDetail[k]){el.value=data.statusDetail[k];el.setAttribute("data-current",data.statusDetail[k]);}
    });
    var ps=document.getElementById("charPromoState");
    if(ps&&data.statusDetail.promoState){ps.value=data.statusDetail.promoState;ps.setAttribute("data-current",data.statusDetail.promoState);}
    updateStatusEffect();
  }
  updateLoadCalc();_inChange=false;
}

function gatherCharData(){
  const data={identity:{},stats:{},derived:{},skills:{},otherProfs:[],background:{},equipment:{},wealth:{currencies:[]},inventory:[],activeSlots:[],passiveSlots:[],talents:[],enhances:[],customNames:{},property:{}};
  document.querySelectorAll('#identityGrid [data-save]').forEach(inp=>{data.identity[inp.dataset.save]=inp.type==='number'?(parseFloat(inp.value)||0):inp.value;});
  ABILITY_IDS.forEach(id=>{const inp=document.getElementById('stat_'+id);data.stats[id]=inp?parseInt(inp.value)||10:10;});
  document.querySelectorAll('#derivedGrid input').forEach(inp=>{const k=inp.dataset.save;if(k)data.derived[k]=parseInt(inp.value)||0;});
  ['hp','fatigue'].forEach(k=>{const c=document.getElementById('st_'+k+'Cur'),m=document.getElementById('st_'+k+'Max');data.derived[k+'Current']=c?parseInt(c.value)||0:0;data.derived[k+'Max']=m?parseInt(m.value)||1:1;});
  data.derived.fatigueLabel=document.getElementById('fatigueLabel')?document.getElementById('fatigueLabel').value:'';
  data.derived.xpCurrent=_mainXp;data.derived.xpMax=_xpNext;data.derived.xpNext=_xpNext;
  Object.entries(_skillWidgets).forEach(([id,w])=>{data.skills[id]={checked:w.check?w.check.checked:false,value:w.value?parseInt(w.value.value)||0:0};if(w.customInput)data.customNames[id]=w.customInput.value;});
  const pd=document.getElementById('otherProfsDiv');if(pd)data.otherProfs=Array.from(pd.querySelectorAll('.other-prof')).map(el=>el.textContent.trim()).filter(Boolean);
  ['bgPersonality','bgTraits','bgIdeals','bgBonds','bgFlaws'].forEach(k=>{const ta=document.querySelector('[data-save="'+k+'"]');data.background[k]=ta?ta.value:'';});
  // 收集特质效果
  var effs={};
  document.querySelectorAll('.bg-effect').forEach(function(el){
    var ek=el.dataset.effectKey; if(ek&&el.value.trim()) effs[ek]=el.value.trim();
  });
  if(Object.keys(effs).length>0) data.background.bgEffects=effs;
  const bgm=document.getElementById('bgMechanics');data.background.bgMechanics=bgm?bgm.value:'';
  data.talents=[..._talents];data.enhances=[..._enhances];
  data.property.mainXp=_mainXp;data.property.mainAp=_mainAp;data.property.badges=Object.assign({},_badges);
  if(data.wealth)data.wealth.achievePoints=_mainAp;
  data.statusDetail={bloodline:document.getElementById('charBloodline')?document.getElementById('charBloodline').value:'',race:document.getElementById('charRace')?document.getElementById('charRace').value:'',baseClass:'',promotion:'',promoState:''};
  // 收集基础身份中的职业和基因锁字段
  ['mainClass','subClass'].forEach(function(k){var el=document.getElementById('id'+k.charAt(0).toUpperCase()+k.slice(1));data.identity[k]=el?el.value:'';});
  ['mainClassLevel','subClassLevel','geneLockProf'].forEach(function(k){var el=document.getElementById('id'+k.charAt(0).toUpperCase()+k.slice(1));data.identity[k]=el?parseInt(el.value)||0:0;});
  var glEl=document.getElementById('idGeneLockLevel');data.identity.geneLockLevel=glEl?glEl.value:'未开启';
  var glBtn=document.getElementById('geneLockToggle');data.identity.geneLockEnabled=glBtn?glBtn.textContent==='✓':true;
  // 保存当前阶熟练度到 geneLockProfs（继承已有数据）
  if(!data.identity.geneLockProfs){
    data.identity.geneLockProfs=currentCharName&&characters[currentCharName]?Object.assign({},characters[currentCharName].identity.geneLockProfs||{}):{};
  }
  var curTier=data.identity.geneLockLevel;
  if(curTier!=='未开启'){
    data.identity.geneLockProfs[curTier]=parseInt(document.getElementById('idGeneLockProf')?document.getElementById('idGeneLockProf').value:0)||0;
  }
  data.identity.geneLockProf=curTier!=='未开启'?(data.identity.geneLockProfs||{})[curTier]||0:0;
  ['weaponMain','weaponOff','armor'].forEach(k=>{const el=document.getElementById(k);data.equipment[k]=el?el.value:'';});
  data.wealth.currencies=_currencies.map(c=>({name:c.name,amount:c.amount}));
  data.inventory=_inventory.map(i=>({name:i.name,qty:i.qty,weight:i.weight}));
  data.activeSlots=_activeSlots.map(s=>(Object.assign({},s)));data.passiveSlots=_passiveSlots.map(s=>(Object.assign({},s)));
  return data;
}
function onCharFieldChange(key){
  var mxp=document.getElementById('mainXp'),map=document.getElementById('mainAp');
  if(mxp)_mainXp=parseInt(mxp.value)||0;if(map)_mainAp=parseInt(map.value)||0;
  updateXpBar(_mainXp,_xpNext);
  if(_inChange)return;
  if(currentCharName&&characters[currentCharName]){
    var data=gatherCharData();
    var newName=data.identity&&data.identity.charName&&data.identity.charName.trim();
    if(key==='charName'&&newName&&newName!==currentCharName){
      if(characters[newName]){showToast('角色 "'+newName+'" 已存在，无法改名');return;}
      delete characters[currentCharName];
      characters[newName]=data;
      currentCharName=newName;
      refreshCharSelector();
    }else{
      characters[currentCharName]=data;
    }
    autoSave();
  }
}
function toggleCharacterDM(enabled){
  document.body.classList.toggle('dm-mode',enabled);
  if(enabled){document.querySelectorAll('.skill-row').forEach(r=>{const n=r.querySelector('.sk-name'),dm=r.querySelector('.sk-name-dm');if(n&&dm)dm.value=n.textContent;});}
}

function renderDmDashboard(){
  var body=document.getElementById('dmDashBody');
  if(!body)return;
  var names=Object.keys(characters);
  if(names.length===0){body.innerHTML='<span style="color:var(--text-muted)">暂无角色数据</span>';return;}
  var warnOnly=document.getElementById('dmWarnOnly')&&document.getElementById('dmWarnOnly').checked;
  var html='<div class="dm-actions"><span style="font-size:11px;color:var(--text-muted);margin-right:4px">全团发放:</span><input id="dmDistXp" type="number" value="100" min="1" style="width:56px;font-size:11px;padding:2px 4px"> EXP <button onclick="adjAllXp(parseInt(document.getElementById(\'dmDistXp\').value)||0)">发放</button><span style="margin:0 6px">|</span><input id="dmDistAp" type="number" value="10" min="1" style="width:56px;font-size:11px;padding:2px 4px"> AP <button onclick="adjAllAp(parseInt(document.getElementById(\'dmDistAp\').value)||0)">发放</button><span style="margin:0 6px">|</span><select id="dmDistBadgeTier" style="width:80px;font-size:11px;padding:2px 4px"><option value="一阶铭牌">一阶</option><option value="二阶铭牌">二阶</option><option value="三阶铭牌">三阶</option><option value="四阶铭牌">四阶</option></select> <input id="dmDistBadge" type="number" value="1" min="1" style="width:46px;font-size:11px;padding:2px 4px"> <button onclick="adjAllBadge(document.getElementById(\'dmDistBadgeTier\').value,parseInt(document.getElementById(\'dmDistBadge\').value)||0)">发放铭牌</button></div><div class="dm-dash-grid">';
  names.forEach(function(nm){
    var c=characters[nm];
    if(!c)return;
    var hp=c.derived?c.derived.hpCurrent:0,hpMax=c.derived?c.derived.hpMax:1;
    var lv=c.derived?c.derived.level:'?';
    var pct=hpMax?Math.round(hp/hpMax*100):0;
    var bl=c.statusDetail?c.statusDetail.bloodline:'';
    var mc=c.identity?c.identity.mainClass:'';
    var sc=c.identity?c.identity.subClass:'';
    var gl=c.identity?c.identity.geneLockLevel:'';
    var warn=pct<30;
    var caution=pct<60&&pct>=30;
    if(warnOnly&&!warn&&!caution)return;
    var cls='dm-dash-card';
    if(warn)cls+=' warning';else if(caution)cls+=' caution';
    var hpCls=pct>=60?'high':pct>=30?'mid':'low';
    html+='<div class="'+cls+'"><div class="dd-name">'+nm+'</div>';
    html+='<div class="dd-line"><span class="dd-label">等级</span>Lv.'+lv+'</div>';
    if(bl)html+='<div class="dd-line"><span class="dd-label">血脉</span>'+bl+'</div>';
    if(mc)html+='<div class="dd-line"><span class="dd-label">主职业</span>'+mc+' Lv.'+(c.identity.mainClassLevel||1)+'</div>';
    if(sc)html+='<div class="dd-line"><span class="dd-label">子职业</span>'+sc+' Lv.'+(c.identity.subClassLevel||1)+'</div>';
    if(gl&&gl!=='未开启')html+='<div class="dd-line"><span class="dd-label">基因锁</span>'+gl+' ('+((c.identity.geneLockProfs||{})[gl]||0)+')</div>';
    html+='<div class="dd-line"><span class="dd-label">HP</span>'+hp+'/'+hpMax+' ('+pct+'%)</div>';
    html+='<div class="dd-hp"><div class="dd-hp-fill '+hpCls+'" style="width:'+pct+'%"></div></div>';
    var sk=c.skills||{};
    var skillParts=[];
    Object.keys(sk).forEach(function(k){var s=sk[k];if(s.checked&&(s.value||0)>0){var label=getSkillLabel(k);skillParts.push(label+' '+s.value);}});
    if(skillParts.length>0)html+='<div class="dd-line"><span class="dd-label">⚡ 熟练</span><span style="font-size:10px;color:#b0b0d0">'+skillParts.join(', ')+'</span></div>';
    html+='</div>';
  });
  html+='</div>';
  body.innerHTML=html;
}

function adjAllXp(delta){
  Object.keys(characters).forEach(function(nm){
    var c=characters[nm];
    if(c&&c.property)c.property.mainXp=Math.max(0,(c.property.mainXp||0)+delta);
  });
  autoSave();
  renderDmDashboard();
  if(currentCharName&&characters[currentCharName])loadCharacterIntoUI(currentCharName,characters[currentCharName]);
  if(document.getElementById('dmPage')&&document.getElementById('dmPage').classList.contains('active'))renderDmOverview();
}

function showCreateGuide(){
  if (typeof navigateTo === 'function') {
    navigateTo('creation');
  }
}

function createNewCharacter(){
  var names=Object.keys(characters);
  var baseName='新穿越者';
  var idx=1;
  while(characters[baseName+(idx>1?idx:'')])idx++;
  var name=baseName+(idx>1?idx:'');
  characters[name]={
    identity:{playerName:'',charName:name,mainClass:'',mainClassLevel:1,subClass:'',subClassLevel:1,geneLockLevel:'未开启',geneLockProf:0,geneLockEnabled:true,geneLockProfs:{}},
    stats:{str:10,dex:10,con:10,int:10,wis:10,cha:10},
    derived:{level:1,ac:10,initiative:0,speed:30,attackBonus:0,vigilance:10,hpCurrent:10,hpMax:10,fatigueCurrent:0,fatigueMax:10,xpCurrent:0,xpMax:100,will:1,luck:1,enlightenment:1,fatigueLabel:'🍃 疲劳值'},
    skills:{},customNames:{},otherProfs:['通用语'],
    background:{},talents:[],enhances:[],
    equipment:{},wealth:{currencies:[{name:'银两',amount:0},{name:'铜币',amount:0}]},
    inventory:[],activeSlots:[],passiveSlots:[],
    property:{mainXp:0,mainAp:0,badges:{}},
    statusDetail:{bloodline:'人类',race:'人类',baseClass:'学生',promotion:'无',promoState:'未转职'}
  };
  currentCharName=name;
  refreshCharSelector();
  _pageInited = false;
  if (typeof navigateTo === 'function') {
    navigateTo('character');
  }
  autoSave();
}

function adjAllBadge(tier,delta){
  Object.keys(characters).forEach(function(nm){
    var c=characters[nm];
    if(c&&c.property){
      if(!c.property.badges)c.property.badges={};
      c.property.badges[tier]=Math.max(0,(c.property.badges[tier]||0)+delta);
    }
  });
  autoSave();
  renderDmDashboard();
  if(currentCharName&&characters[currentCharName])loadCharacterIntoUI(currentCharName,characters[currentCharName]);
  if(document.getElementById('dmPage')&&document.getElementById('dmPage').classList.contains('active'))renderDmOverview();
}

function adjAllAp(delta){
  Object.keys(characters).forEach(function(nm){
    var c=characters[nm];
    if(c&&c.property)c.property.mainAp=Math.max(0,(c.property.mainAp||0)+delta);
  });
  autoSave();
  renderDmDashboard();
  if(currentCharName&&characters[currentCharName])loadCharacterIntoUI(currentCharName,characters[currentCharName]);
  if(document.getElementById('dmPage')&&document.getElementById('dmPage').classList.contains('active'))renderDmOverview();
}

function renderDmOverview(){
  var body=document.getElementById('dmOverviewBody');
  if(!body)return;
  var names=Object.keys(characters);
  if(names.length===0){body.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">暂无角色数据</div>';return;}
  var html='';
  // 全团发放栏 + 目标角色选择
  html+='<div class="dm-actions" style="margin-bottom:12px;flex-wrap:wrap;align-items:center">';
  html+='<span style="font-size:11px;color:var(--text-muted);margin-right:4px">目标:</span>';
  html+='<select id="dmTargetChar" style="width:100px;font-size:11px;padding:2px 4px"><option value="">全团</option>';
  names.forEach(function(n){html+='<option value="'+n+'">'+n+'</option>';});
  html+='</select><span style="margin:0 6px">|</span>';
  html+='<input id="dmDistXp2" type="number" value="100" min="1" style="width:56px;font-size:11px;padding:2px 4px"> EXP ';
  html+='<button onclick="dmDistributeXp()">发放</button><span style="margin:0 6px">|</span>';
  html+='<input id="dmDistAp2" type="number" value="10" min="1" style="width:56px;font-size:11px;padding:2px 4px"> AP ';
  html+='<button onclick="dmDistributeAp()">发放</button><span style="margin:0 6px">|</span>';
  html+='<select id="dmDistBadgeTier2" style="width:80px;font-size:11px;padding:2px 4px"><option value="一阶铭牌">一阶</option><option value="二阶铭牌">二阶</option><option value="三阶铭牌">三阶</option><option value="四阶铭牌">四阶</option></select> ';
  html+='<input id="dmDistBadge2" type="number" value="1" min="1" style="width:46px;font-size:11px;padding:2px 4px"> ';
  html+='<button onclick="dmDistributeBadge()">发放铭牌</button><span style="margin:0 6px">|</span>';
  html+='<button onclick="dmBulkImport()" style="border-color:var(--accent-cyan);color:var(--accent-cyan)">📥 批量导入</button></div>';
  // 快速切换导航
  html+='<div class="dm-quick-nav">';
  names.forEach(function(nm){ html+='<span class="dm-nav-chip" onclick="dmScrollTo(\x27'+nm+'\x27)">'+nm+'</span>'; });
  html+='</div>';
  // Track hidden characters
  if(!window._dmHiddenChars) window._dmHiddenChars = {};
  names.forEach(function(nm){
    var c=characters[nm];
    if(!c)return;
    var hidden = window._dmHiddenChars[nm];
    var id=c.identity||{},st=c.stats||{},dr=c.derived||{},sd=c.statusDetail||{},sk=c.skills||{},eq=c.equipment||{},pr=c.property||{};
    var hp=dr.hpCurrent||0,hpMax=dr.hpMax||1,xp=pr.mainXp||0;
    var pct=hpMax?Math.round(hp/hpMax*100):0;
    var hpCls=pct>=60?'high':pct>=30?'mid':'low';
    html+='<div class="dm-char-card" id="dmCard_'+nm+'" style="'+(hidden?'opacity:0.4':'')+'"><div class="dm-char-hdr"><span class="dm-char-name">'+nm+'</span><span class="dm-char-lv">Lv.'+(dr.level||'?')+'</span><button onclick="dmToggleHide(\x27'+nm+'\x27)" style="background:transparent;border:1px solid var(--border);border-radius:3px;color:var(--text-muted);cursor:pointer;font-size:10px;padding:1px 6px;margin-left:8px">'+(hidden?'👁 显示':'👁 隐藏')+'</button></div>';
    html+='<div class="dm-char-body">';
    html+='<div class="dm-info-grid">';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">🧬 血脉</span><span>'+(sd.bloodline||'-')+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">🌍 种族</span><span>'+(id.race||sd.race||'-')+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">💼 主职业</span><span>'+(id.mainClass||'-')+' Lv.'+(id.mainClassLevel||1)+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">🎯 子职业</span><span>'+(id.subClass? id.subClass+' Lv.'+(id.subClassLevel||1) : '-')+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">🔒 基因锁</span><span>'+(id.geneLockLevel||'未开启')+(id.geneLockLevel&&id.geneLockLevel!=='未开启'?' ('+((id.geneLockProfs||{})[id.geneLockLevel]||0)+')':'')+'</span></div>';
    html+='</div>';
    html+='<div class="dm-hp-row"><span class="dm-info-lbl">❤️ HP</span><span>'+hp+'/'+hpMax+' ('+pct+'%)</span><div class="dm-hp-bar"><div class="dm-hp-fill '+hpCls+'" style="width:'+pct+'%"></div></div></div>';
    // 疲劳值
    var fat=dr.fatigueCurrent||0,fatMax=dr.fatigueMax||10;
    var fatLabel=dr.fatigueLabel||'疲劳值';
    var fatPct=fatMax?Math.round(fat/fatMax*100):0;
    html+='<div class="dm-hp-row"><span class="dm-info-lbl" style="color:#66bb6a">🍃 '+fatLabel+'</span><span style="color:#66bb6a">'+fat+'/'+fatMax+' ('+fatPct+'%)</span><div class="dm-hp-bar"><div class="dm-hp-fill" style="width:'+fatPct+'%;background:var(--accent-green)"></div></div></div>';
    html+='<div class="dm-stats-row">';
    var abv={str:'力量',dex:'敏捷',con:'体质',int:'智力',wis:'感知',cha:'魅力'};
    Object.keys(abv).forEach(function(k){var v=st[k]||10;var mod=Math.floor((v-10)/2);html+='<div class="dm-stat"><span class="dm-stat-val">'+abv[k]+' '+v+'</span><span class="dm-stat-mod">'+(mod>=0?'+'+mod:mod)+'</span></div>';});
    html+='</div>';
    html+='<div class="dm-info-grid">';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">AC</span><span>'+(dr.ac||10)+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">先攻</span><span>'+(dr.initiative||0)+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">速度</span><span>'+(dr.speed||30)+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">命中</span><span>'+(dr.attackBonus||0)+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">✨ EXP</span><span style="color:#6a8ac4;font-weight:600">'+xp+'</span></div>';
    html+='<div class="dm-info-item"><span class="dm-info-lbl">🏆 AP</span><span style="color:#e0c060;font-weight:600">'+(pr.mainAp||0)+'</span></div>';
    html+='</div>';
    // 熟练项
    var skillParts=[];
    try{
      Object.keys(sk).forEach(function(k){var s=sk[k];if(s&&s.checked&&(s.value||0)>0){var label=getSkillLabel(k);skillParts.push(label+' +'+s.value);}});
    }catch(e){}
    if(skillParts.length>0)html+='<div class="dm-skills-row"><span class="dm-info-lbl">⚡ 熟练项</span><span class="dm-skills-text">'+skillParts.join(', ')+'</span></div>';
    // 装备
    var eqParts=[];
    if(eq.weaponMain)eqParts.push('⚔️ '+eq.weaponMain);if(eq.weaponOff)eqParts.push('🛡️ '+eq.weaponOff);if(eq.armor)eqParts.push('🪖 '+eq.armor);
    if(eqParts.length>0)html+='<div class="dm-skills-row"><span class="dm-info-lbl">🎒 装备</span><span class="dm-skills-text">'+eqParts.join(' | ')+'</span></div>';
    // 特质效果（橙色框机械效果，非背景故事原文）
    var bg=c.background||{},effs=bg.bgEffects||{};
    var traitParts=[];
    if(effs.personality&&effs.personality.trim()) traitParts.push("个性: "+effs.personality.trim());
    if(effs.traits&&effs.traits.trim()) traitParts.push("特点: "+effs.traits.trim());
    if(effs.ideals&&effs.ideals.trim()) traitParts.push("理念: "+effs.ideals.trim());
    if(effs.bonds&&effs.bonds.trim()) traitParts.push("牵绊: "+effs.bonds.trim());
    if(effs.flaws&&effs.flaws.trim()) traitParts.push("缺点: "+effs.flaws.trim());
    if(traitParts.length>0)html+="<div class=\"dm-skills-row\"><span class=\"dm-info-lbl\">📜 特质效果</span><span class=\"dm-skills-text\" style=\"font-size:10px\">"+traitParts.join("；")+"</span></div>";
    // 已经历强化
    var enhList = c.enhances || [];
    if (enhList.length > 0) {
        html += '<div class="dm-skills-row"><span class="dm-info-lbl">已经历强化</span><span class="dm-skills-text" style="font-size:10px">' + enhList.join('；') + '</span></div>';
    }

    // 单独发放按钮
    html+='<div class="dm-actions" style="margin-top:6px;border-top:1px solid rgba(255,255,255,.04);padding-top:6px">';
    html+='<span style="font-size:10px;color:var(--text-muted)">发放:</span>';
    html+='<button onclick="adjOneXp(\''+nm+'\',100)">+100 EXP</button>';
    html+='<button onclick="adjOneXp(\''+nm+'\',500)">+500 EXP</button>';
    html+='<button onclick="adjOneAp(\''+nm+'\',10)">+10 AP</button>';
    html+='</div>';
    html+='</div></div>';
  });
  body.innerHTML=html;
}

// 单角色发放函数
function adjOneXp(name,delta){
  var c=characters[name];if(!c||!c.property)return;
  c.property.mainXp=Math.max(0,(c.property.mainXp||0)+delta);
  autoSave();renderDmOverview();
  if(currentCharName===name&&typeof loadCharacterIntoUI==='function')loadCharacterIntoUI(name,c);
}
function adjOneAp(name,delta){
  var c=characters[name];if(!c||!c.property)return;
  c.property.mainAp=Math.max(0,(c.property.mainAp||0)+delta);
  autoSave();renderDmOverview();
  if(currentCharName===name&&typeof loadCharacterIntoUI==='function')loadCharacterIntoUI(name,c);
}
// DM 面板发放（支持目标角色选择）
function dmDistributeXp(){
  var target=document.getElementById('dmTargetChar');
  var amt=parseInt(document.getElementById('dmDistXp2').value)||0;
  var nm=target&&target.value?target.value:null;
  if(nm){adjOneXp(nm,amt);}else{adjAllXp(amt);}
}
function dmDistributeAp(){
  var target=document.getElementById('dmTargetChar');
  var amt=parseInt(document.getElementById('dmDistAp2').value)||0;
  var nm=target&&target.value?target.value:null;
  if(nm){adjOneAp(nm,amt);}else{adjAllAp(amt);}
}
function dmDistributeBadge(){
  var target=document.getElementById('dmTargetChar');
  var tier=document.getElementById('dmDistBadgeTier2').value;
  var amt=parseInt(document.getElementById('dmDistBadge2').value)||0;
  var nm=target&&target.value?target.value:null;
  if(nm){adjOneBadge(nm,tier,amt);}else{adjAllBadge(tier,amt);}
}
function adjOneBadge(name,tier,delta){
  var c=characters[name];if(!c||!c.property)return;
  if(!c.property.badges)c.property.badges={};
  c.property.badges[tier]=Math.max(0,(c.property.badges[tier]||0)+delta);
  autoSave();renderDmOverview();
  if(currentCharName===name&&typeof loadCharacterIntoUI==='function')loadCharacterIntoUI(name,c);
}

// DM 批量导入
function dmBulkImport(){
  var input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.multiple = true;
  input.onchange = function(e){
    var files = e.target.files;
    if (!files || files.length === 0) return;
    var processed = 0;
    Array.from(files).forEach(function(file){
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          var data = JSON.parse(ev.target.result);
          if (!data || !data.characters) return;
          var imported = data.characters;
          var added = 0;
          Object.keys(imported).forEach(function(name) {
            if (!characters[name]) { characters[name] = imported[name]; added++; }
            else { characters[name] = imported[name]; }
          });
          processed++;
          if (processed === files.length) {
            saveAllData();
            _pageInited = false; currentCharName = null;
            renderDmOverview();
            if (typeof refreshCharSelector === 'function' && document.getElementById('characterPage').classList.contains('active')) {
              if (typeof navigateTo === 'function') navigateTo('character');
            }
            if (typeof showToast === 'function') showToast('✅ 导入 ' + files.length + ' 个文件');
          }
        } catch(ex) { processed++; }
      };
      reader.readAsText(file);
    });
  };
  input.click();
}

// DM 隐藏/显示角色卡片
function dmToggleHide(name){
  if (!window._dmHiddenChars) window._dmHiddenChars = {};
  window._dmHiddenChars[name] = !window._dmHiddenChars[name];
  var card = document.getElementById('dmCard_' + name);
  if (card) {
    if (window._dmHiddenChars[name]) { card.style.opacity = '0.25'; card.style.display = 'none'; }
    else { card.style.opacity = '1'; card.style.display = ''; }
  }
}

// DM 快速跳转到指定角色卡片
function dmScrollTo(name){
  var card = document.getElementById('dmCard_' + name);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.style.boxShadow = '0 0 16px var(--accent-cyan)';
    setTimeout(function(){ card.style.boxShadow = ''; }, 1500);
  }
}

function adjXp(delta){var inp=document.getElementById('mainXp');if(inp){var v=parseInt(inp.value)||0;inp.value=Math.max(0,v+delta);inp.dispatchEvent(new Event('input'));updateXpBar(parseInt(inp.value)||0,_xpNext);}}
function adjAp(delta){var inp=document.getElementById('mainAp');if(inp){var v=parseInt(inp.value)||0;inp.value=Math.max(0,v+delta);inp.dispatchEvent(new Event('input'));}}
// 技能标签映射（独立于 _skillWidgets，确保 DM 页面始终可用）
var _skillLabelMap = {};
(function buildSkillLabelMap(){
  var cats = Object.entries(SKILL_CATEGORIES);
  for(var ci=0;ci<cats.length;ci++){
    var sk=cats[ci][1];
    for(var si=0;si<sk.length;si++){
      if(sk[si][1]!==null) _skillLabelMap[sk[si][0]]=sk[si][1];
    }
  }
})();

function getSkillLabel(id){
  // 优先从静态映射取
  if(_skillLabelMap[id]) return _skillLabelMap[id];
  // 其次从 _skillWidgets 取（包含 DM 模式下可能自定义的名称）
  if(_skillWidgets[id]&&_skillWidgets[id].labelEl) return _skillWidgets[id].labelEl.label;
  return id;
}
function filterSkills(){
  var q=document.getElementById("skillFilter").value.trim().toLowerCase();
  var hideEmpty=document.getElementById("hideEmptyCats")&&document.getElementById("hideEmptyCats").checked;
  document.querySelectorAll(".skill-row").forEach(function(row){
    var name=row.querySelector(".sk-name");
    var custom=row.querySelector(".sk-custom");
    var txt=(name?name.textContent:"")+(custom?custom.value:"");
    if(!q||txt.toLowerCase().indexOf(q)>=0||!name){row.style.display="flex";}
    else{row.style.display="none";}
  });
  document.querySelectorAll(".skill-cat").forEach(function(cat){
    if(hideEmpty){
      var vis=Array.from(cat.querySelectorAll(".skill-row")).some(function(r){return r.style.display!=="none";});
      cat.style.display=vis?"":"none";
    }else{
      cat.style.display="";
      cat.querySelectorAll(".skill-row").forEach(function(r){
        if(r.style.display==="none")r.style.display="flex";
      });
    }
  });
}


// Status Reference Data
var _bloodlineData=[],_raceData=[],_classData=[],_promoData=[];

const DEFAULT_BLOODLINES = [
  {name:"人类",effect:"无特殊血脉效果"},
  {name:"畸变兽",effect:"基础生命值+10，体质+1"}
];
const DEFAULT_RACES = [
  {name:"人类",effect:"无特殊种族效果"},
  {name:"畸变兽",effect:"黑暗视觉30尺，嗅觉灵敏"}
];
const DEFAULT_CLASSES = [
  {name:"教师",effect:"教学相长：指导他人时，双方技能判定+1"},
  {name:"学生",effect:"快速学习：技能熟练速度翻倍"},
  {name:"记者",effect:"信息敏锐：调查类判定+2"},
  {name:"侦探",effect:"推理思维：逻辑与调查判定+2"},
  {name:"医生",effect:"急救知识：医疗判定+3，可使用急救包"},
  {name:"艺人",effect:"舞台技艺：表演与欺瞒判定+2"},
  {name:"消防员",effect:"英勇无畏：恐惧豁免+2，体能判定+1"}
];
const DEFAULT_PROMOTIONS = [
  {name:"无",effect:"未选择一转职业",condition:"-"},
  {name:"斥候",effect:"隐匿判定+3，移动速度+10",condition:"敏捷13+、隐匿熟练"},
  {name:"僧侣",effect:"徒手攻击伤害提升至1d8，专注判定+2",condition:"感知13+、专注熟练"},
  {name:"枪神",effect:"远程攻击命中+2，换弹动作减半",condition:"敏捷15+、任意射击武器熟练"},
  {name:"医生",effect:"医疗效率翻倍，可使用高级药剂",condition:"智力13+、医药熟练"},
  {name:"迷途者",effect:"获得一个额外被动技能槽位",condition:"任意属性13+、经历过一次重大抉择"},
  {name:"战士",effect:"近战攻击命中+2，生命值上限+15",condition:"力量或体质14+、运动熟练"},
  {name:"武僧",effect:"徒手攻击变为1d10，可徒手格挡远程攻击",condition:"力量与感知均13+、体操熟练"}
];

// 加载状态参照：使用全局 loadJSON（来自 dataService.js）
// 修复：populateSelect 不再 dispatch change 事件，避免过早触发保存
function loadStatusRefs(){
  return Promise.all([
    loadJSON("data/status_refs/bloodline.json").then(function(d){_bloodlineData=d;}).catch(function(e){console.warn('bloodline load fail, using defaults',e);_bloodlineData=DEFAULT_BLOODLINES;}).then(function(){populateSelect("charBloodline",_bloodlineData);}),
    loadJSON("data/status_refs/race.json").then(function(d){_raceData=d;}).catch(function(e){console.warn('race load fail, using defaults',e);_raceData=DEFAULT_RACES;}).then(function(){populateSelect("charRace",_raceData);}),
    loadJSON("data/status_refs/base_class.json").then(function(d){_classData=d;}).catch(function(e){console.warn('class load fail, using defaults',e);_classData=DEFAULT_CLASSES;}).then(function(){populateSelect("charBaseClass",_classData);}),
    loadJSON("data/status_refs/promotion.json").then(function(d){_promoData=d;}).catch(function(e){console.warn('promotion load fail, using defaults',e);_promoData=DEFAULT_PROMOTIONS;}).then(function(){populateSelect("charPromotion",_promoData);})
  ]);
}

// populateSelect：只构建选项，不触发 change 事件（修复过早保存的 bug）
function populateSelect(id, data){
  var sel=document.getElementById(id);
  if(!sel)return;
  var currentVal=sel.getAttribute("data-current")||"";
  sel.innerHTML="";
  data.forEach(function(item){
    var opt=document.createElement("option");
    opt.value=item.name;opt.textContent=item.name;
    sel.appendChild(opt);
  });
  if(currentVal)sel.value=currentVal;
  sel.onchange=function(){onCharFieldChange("statusDetail");updateStatusEffect();};
  // 不再 dispatchEvent("change") —— 由 loadCharacterIntoUI 统一触发更新
}

function updateStatusEffect(){
  try{
    var get=function(id){var el=document.getElementById(id);return el?el.value:"";};
    var bl=get("charBloodline"),rc=get("charRace");
    var fbl=_bloodlineData.find(function(x){return x.name===bl;});
    var frc=_raceData.find(function(x){return x.name===rc;});
    var blEl=document.getElementById("bloodlineEffect"),rcEl=document.getElementById("raceEffect");
    if(blEl)blEl.textContent=fbl?'🧬 血脉效果：'+fbl.effect:'请选择血脉查看效果';
    if(rcEl)rcEl.textContent=frc?'🌍 种族效果：'+frc.effect:'请选择种族查看效果';
    updateGeneLockVisibility();
  }catch(e){}
}
function onPromotionChange(){
  onCharFieldChange("promotion");
  updateStatusEffect();
}
// 基因锁解锁阈值：一阶满10，二阶满20，三阶满30，四阶满40
var GENE_LOCK_MAX = { '一阶': 10, '二阶': 20, '三阶': 30, '四阶': 40 };
var GENE_UNLOCK_NEED = { '二阶': 10, '三阶': 20, '四阶': 30 };
var _inGeneLockUpdate = false;
function onGeneLockLevelChange(){
  if(_inGeneLockUpdate||_inChange)return;
  var sel=document.getElementById('idGeneLockLevel');
  var prof=document.getElementById('idGeneLockProf');
  if(!sel||!prof)return;
  var newTier=sel.value;
  if(currentCharName&&characters[currentCharName]){
    var c=characters[currentCharName];
    if(!c.identity.geneLockProfs)c.identity.geneLockProfs={};
    var curStoredTier=c.identity.geneLockLevel||'未开启';
    // 保存旧阶：直接用 DOM 值（gatherCharData 已从角色数据继承 geneLockProfs）
    if(curStoredTier!=='未开启'){
      c.identity.geneLockProfs[curStoredTier]=parseInt(prof.value)||0;
    }
    c.identity.geneLockLevel=newTier;
    if(newTier!=='未开启'){
      prof.value=c.identity.geneLockProfs[newTier]||0;
    }else{
      prof.value=0;
    }
  }
  _inGeneLockUpdate = true;
  updateGeneLockTierOptions();
  _inGeneLockUpdate = false;
  onCharFieldChange('geneLockLevel');
}

// 更新基因锁等级选项：前一阶熟练度≥50才解锁后一阶
function updateGeneLockTierOptions(){
  var sel=document.getElementById('idGeneLockLevel');
  if(!sel)return;
  var tiers=['未开启','一阶','二阶','三阶','四阶'];
  var profs=currentCharName&&characters[currentCharName]?characters[currentCharName].identity.geneLockProfs||{}:{};
  var currentVal=sel.value;
  sel.innerHTML='';
  for(var i=0;i<tiers.length;i++){
    var t=tiers[i];
    var opt=document.createElement('option');
    opt.value=t;
    if(t==='未开启'||t==='一阶'){
      opt.textContent=t;
    }else{
      var need=GENE_UNLOCK_NEED[t]||10;
      var prevProf=profs[tiers[i-1]]||0;
      if(prevProf>=need){
        opt.textContent=t;
      }else{
        opt.textContent=t+' (需'+tiers[i-1]+'熟练≥'+need+')';
        opt.disabled=true;
      }
    }
    sel.appendChild(opt);
  }
  // 恢复之前选中的值（如果仍可选）
  var found=false;
  for(var j=0;j<sel.options.length;j++){if(sel.options[j].value===currentVal&&!sel.options[j].disabled){found=true;break;}}
  if(found)sel.value=currentVal;
  else if(sel.options.length>0)sel.value=sel.options[0].value;
}
function stepIdNum(id,delta,min,max){
  var el=document.getElementById(id);if(!el)return;
  var v=(parseInt(el.value)||min)+delta;
  el.value=Math.max(min,Math.min(max,v));
  el.dispatchEvent(new Event('input'));
}
function toggleGeneLock(){
  var btn=document.getElementById('geneLockToggle');
  var sel=document.getElementById('idGeneLockLevel');
  var prof=document.getElementById('idGeneLockProf');
  if(!btn||!sel)return;
  if(btn.textContent==='✓'){
    btn.textContent='✗';btn.style.background='var(--accent-red)';
    sel.value='未开启';sel.disabled=true;if(prof)prof.disabled=true;
  }else{
    btn.textContent='✓';btn.style.background='var(--accent-green)';
    sel.disabled=false;if(prof)prof.disabled=false;
    // 恢复当前等级
    if(currentCharName&&characters[currentCharName]){
      var lv=characters[currentCharName].identity.geneLockLevel||'未开启';
      sel.value=lv;
      var profs=characters[currentCharName].identity.geneLockProfs||{};
      if(prof&&lv!=='未开启')prof.value=profs[lv]||0;
    }
    updateGeneLockTierOptions();
  }
  onCharFieldChange('geneLockEnabled');
}
function updateGeneLockVisibility(){
  var raceEl=document.getElementById('charRace');
  var race=raceEl?raceEl.value:'';
  var section=document.getElementById('possessionSection');
  var glField=document.getElementById('geneLockField');
  var glProfField=document.getElementById('geneLockProfField');
  var isHuman=!race||race==='人类';
  if(glField)glField.style.display=isHuman?'':'none';
  if(glProfField)glProfField.style.display=isHuman?'':'none';
}
