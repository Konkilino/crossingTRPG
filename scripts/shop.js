/* ═══════════════════════════════════════════════════
   TRPG Crossing Terminal - Shop Panel
   通过世界注册表自动发现和加载所有世界商品
   ═══════════════════════════════════════════════════ */
var _allItems = [];   // { item, _worldId, _worldName, _cat }
var _shopReady = false;

function mapCat(t){ var m={强化:"强化",道具:"道具",技能:"心法",功法:"心法",武器:"其他",防具:"其他",天材地宝:"道具",神兵利器:"其他"}; return m[t]||"其他"; }
function rankW(r){ var w={凡品:0,良品:1,上品:2,极品:3,绝品:4,一阶:5,二阶:6,三阶:7,四阶:8,五阶:9,六阶:10}; return w[r]!=null?w[r]:99; }

// ═════════ INIT ═════════
function initShopPage(){
  var tb=document.getElementById("shopBody");
  if(tb)tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--accent-cyan)">⏳ 加载中…</td></tr>';
  loadAllWorlds();
}

async function loadAllWorlds(){
  _allItems=[];
  try{
    var reg=await loadWorldRegistry();
    var worlds=reg.worlds||{};
    // 遍历注册表中所有世界
    for(var wid in worlds){
      try{
        var data=await loadWorldItems(wid);
        var w=worlds[wid];
        data.forEach(function(it){
          _allItems.push({item:it, _worldId:wid, _worldName:it.sourceWorld||w.name||wid, _cat:mapCat(it.type||"")});
        });
      }catch(e){console.warn("世界 "+wid+" 加载失败",e);}
    }
  }catch(e){console.warn("注册表加载失败",e);}

  // 如果全部加载失败，使用内置兜底
  if(_allItems.length===0){
    _allItems=[
      {item:{type:"强化",rank:"一阶",name:"神经加速·初阶",desc:"反应速度提升50%",xpCost:200,apCost:0,badgeCost:""}, _worldId:"mainspace",_worldName:"主神空间",_cat:"强化"},
      {item:{type:"道具",rank:"一阶",name:"回复药水",desc:"恢复50点生命值",xpCost:30,apCost:0,badgeCost:""}, _worldId:"mainspace",_worldName:"主神空间",_cat:"道具"},
      {item:{type:"心法",rank:"三阶",name:"时空裂隙",desc:"停止时间3秒",xpCost:1000,apCost:50,badgeCost:"白银"}, _worldId:"mainspace",_worldName:"主神空间",_cat:"心法"},
      {item:{type:"其他",rank:"一阶",name:"精钢长剑",desc:"附魔的钢制长剑",xpCost:100,apCost:0,badgeCost:""}, _worldId:"mainspace",_worldName:"主神空间",_cat:"其他"},
    ];
  }
  _shopReady=true;
  refreshShop();

  // 填充世界筛选下拉
  var wf=document.getElementById("shopWorldFilter");
  if(wf){
    var seen={}; wf.innerHTML='<option value="">全部世界</option>';
    _allItems.forEach(function(e){ if(!seen[e._worldName]){seen[e._worldName]=true;wf.innerHTML+='<option value="'+e._worldName+'">'+e._worldName+'</option>';} });
  }
}

var _shopActiveTags = [];

function toggleShopTag(tag){
  var idx=_shopActiveTags.indexOf(tag);
  if(idx>=0)_shopActiveTags.splice(idx,1);
  else _shopActiveTags.push(tag);
  refreshShop();
}

function refreshShop(){
  var s=(document.getElementById("shopSearch")||{}).value||"";
  var cf=(document.getElementById("shopCategoryFilter")||{}).value||"";
  var wf=(document.getElementById("shopWorldFilter")||{}).value||"";
  var rf=(document.getElementById("shopRankFilter")||{}).value||"";
  s=s.trim().toLowerCase();

  // Build tag list from ALL items
  var allTags={};
  _allItems.forEach(function(e){
    var it=e.item;
    if(it.type) allTags[it.type]=true;
    if(it.rank) allTags[it.rank]=true;
    if(it.sourceWorld) allTags[it.sourceWorld]=true;
    if(e._worldName) allTags[e._worldName]=true;
  });
  var tagArea=document.getElementById("shopTagArea");
  if(tagArea){
    var sorted=Object.keys(allTags).sort();
    tagArea.innerHTML='';
    sorted.forEach(function(t){
      var el=document.createElement('span');
      el.className='keyword-tag' + (_shopActiveTags.indexOf(t)>=0?' active':'');
      el.textContent=t;el.onclick=function(){toggleShopTag(t);};
      tagArea.appendChild(el);
    });
  }

  var r=_allItems.filter(function(e){
    var it=e.item;
    if(cf&&e._cat!==cf)return false;
    if(wf&&e._worldName!==wf)return false;
    if(rf&&it.rank!==rf)return false;
    if(s){var n=(it.name||"").toLowerCase(),d=(it.desc||"").toLowerCase();if(n.indexOf(s)<0&&d.indexOf(s)<0&&e._cat.toLowerCase().indexOf(s)<0)return false;}
    // Tag filter
    if(_shopActiveTags.length>0){
      for(var ti=0;ti<_shopActiveTags.length;ti++){
        var t=_shopActiveTags[ti];
        if(t!==it.type&&t!==it.rank&&t!==it.sourceWorld&&t!==e._worldName)return false;
      }
    }
    return true;
  });
  r.sort(function(a,b){return rankW(a.item.rank)-rankW(b.item.rank);});
  renderTable(r);
}

function renderTable(items){
  var tb=document.getElementById("shopBody"),cnt=document.getElementById("shopCount");
  if(!tb)return; tb.innerHTML="";
  if(items.length===0){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:60px;color:var(--text-muted)">📭 无匹配</td></tr>';if(cnt)cnt.textContent="0 件";return;}

  var owned={};
  if(window.currentCharName&&window.characters&&window.characters[currentCharName]){
    var c=window.characters[currentCharName];
    (c.inventory||[]).forEach(function(iv){owned[iv.name]=true;});
    (c.enhances||[]).forEach(function(e){owned[e]=true;});
    (c.activeSlots||[]).forEach(function(s){if(s.name)owned[s.name]=true;});
    (c.passiveSlots||[]).forEach(function(s){if(s.name)owned[s.name]=true;});
    if(c.equipment){
      if(c.equipment.weaponMain)owned[c.equipment.weaponMain]=true;
      if(c.equipment.weaponOff)owned[c.equipment.weaponOff]=true;
      if(c.equipment.armor)owned[c.equipment.armor]=true;
    }
  }
  var catCol={强化:"#ffa94d",道具:"#74c0fc",心法:"#b197fc",其他:"#888"};
  var rkCol={凡品:"#8899aa",良品:"#66bb6a",上品:"#74c0fc",极品:"#b197fc",绝品:"#ef5350",一阶:"#66bb6a",二阶:"#74c0fc",三阶:"#b197fc",四阶:"#ffa94d"};
  var worldCol={"主神空间":"var(--accent-cyan)","剑侠情缘":"var(--accent-orange)","迷雾岛":"#a0a0ff","十全十美动物园":"#ffa94d"};

  items.forEach(function(e){var it=e.item;
    var tr=document.createElement("tr");
    var wc=worldCol[e._worldName]||"var(--accent-cyan)";
    var typeTag=(it.type&&it.type!==e._cat)?' <span style="display:inline-block;padding:1px 4px;border-radius:2px;font-size:9px;background:rgba(255,255,255,.04);color:var(--text-muted)">'+it.type+'</span>':'';
    tr.innerHTML=
      '<td><span style="display:inline-block;padding:1px 8px;border-radius:3px;font-size:11px;font-weight:600;background:'+(catCol[e._cat]||"#888")+'22;color:'+(catCol[e._cat]||"#888")+'">'+e._cat+'</span></td>'+
      '<td style="font-size:11px;color:'+wc+'">'+e._worldName+'</td>'+
      '<td><span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;background:'+(rkCol[it.rank]||"#888")+'18;color:'+(rkCol[it.rank]||"#888")+'">'+(it.rank||"一阶")+'</span></td>'+
      '<td style="font-weight:600">'+(it.name||"-")+'</td>'+
      '<td style="font-size:10px"><span style="display:inline-block;padding:1px 4px;border-radius:2px;font-size:9px;background:'+(catCol[e._cat]||"#888")+'18;color:'+(catCol[e._cat]||"#888")+'">'+e._cat+'</span>'+typeTag+'</td>'+
      '<td style="font-size:12px;color:var(--text-secondary)">'+(it.desc||"")+'</td>'+
      '<td style="font-size:12px;color:#6a8ac4;font-weight:600;font-family:var(--font-mono)">'+(function(){var p=[];if(it.xpCost)p.push(it.xpCost+"EXP");if(it.apCost)p.push(it.apCost+"AP");if(it.badgeCost)p.push(it.badgeCost);return p.length?p.join("+"):"免费";})()+'</td>'+
      '<td>'+(function(){
        if(window.currentCharName&&e._worldId==="mainspace"){
          if(owned[it.name]) return '<button onclick="cancelPurchase(\x27'+it.name+'\x27)" style="background:transparent;border:1px solid #ef5350;border-radius:4px;color:#ef5350;cursor:pointer;font-size:11px;padding:2px 10px">取消</button>';
          return '<button onclick="buyShopItem(\x27'+it.name+'\x27)" style="background:transparent;border:1px solid var(--accent-cyan);border-radius:4px;color:var(--accent-cyan);cursor:pointer;font-size:11px;padding:2px 10px">购买</button>';
        }
        return '-';
      })()+'</td>';
    tb.appendChild(tr);
  });
  if(cnt)cnt.textContent=items.length+" / "+_allItems.length+" 件";
}

// ═══════ 购买 / 取消 ═══════
function buyShopItem(name){
  if(!currentCharName||!characters||!characters[currentCharName]){showToast("请先选择角色");return;}
  var match=_allItems.find(function(e){return e.item.name===name;});
  if(!match)return; var it=match.item;
  var c=characters[currentCharName];
  var xp=c.property?c.property.mainXp||0:0, ap=c.property?c.property.mainAp||0:0;
  if(xp<(it.xpCost||0)){showToast("经验值不足");return;}
  if(ap<(it.apCost||0)){showToast("成就点不足");return;}
  c.property.mainXp=xp-(it.xpCost||0); c.property.mainAp=ap-(it.apCost||0);

  var cat=mapCat(it.type||"");
  // 根据类别分别处理
  if(cat==="强化"){
    if(!c.enhances)c.enhances=[];
    if(c.enhances.indexOf(it.name)<0) c.enhances.push(it.name);
  } else if(cat==="其他" && (it.type==="武器"||it.type==="防具")){
    // 装备类：优先填装备槽，否则放物品栏
    if(!c.inventory)c.inventory=[];
    c.inventory.push({name:it.name,qty:1,weight:1.0});
    if(it.type==="武器"&&(!c.equipment||!c.equipment.weaponMain)){
      if(!c.equipment)c.equipment={}; c.equipment.weaponMain=it.name;
    } else if(it.type==="防具"&&(!c.equipment||!c.equipment.armor)){
      if(!c.equipment)c.equipment={}; c.equipment.armor=it.name;
    }
  } else if(cat==="心法"){
    // 技能类：加入技能槽
    if(!c.activeSlots)c.activeSlots=[];
    c.activeSlots.push({name:it.name,category:"商店技能",cost:0});
  } else {
    // 道具类：加入物品清单
    if(!c.inventory)c.inventory=[];
    c.inventory.push({name:it.name,qty:1,weight:0.5});
  }
  if(typeof autoSave==="function")autoSave();
  showToast("✅ 已购买 "+it.name); refreshShop();
}
function cancelPurchase(name){
  if(!currentCharName||!characters||!characters[currentCharName])return;
  var c=characters[currentCharName];
  var match=_allItems.find(function(e){return e.item.name===name;});
  if(!match)return; var it=match.item;
  var cat=mapCat(it.type||"");
  var found=false;
  // 从各位置移除
  if(cat==="强化"&&c.enhances){
    var ei=c.enhances.indexOf(it.name);
    if(ei>=0){c.enhances.splice(ei,1);found=true;}
  }
  if(cat==="心法"&&c.activeSlots){
    for(var i=c.activeSlots.length-1;i>=0;i--){
      if(c.activeSlots[i].name===name){c.activeSlots.splice(i,1);found=true;break;}
    }
  }
  if(c.inventory){
    for(var i=c.inventory.length-1;i>=0;i--){
      if(c.inventory[i].name===name){c.inventory.splice(i,1);found=true;break;}
    }
  }
  // 卸下装备
  if(c.equipment){
    if(c.equipment.weaponMain===name){c.equipment.weaponMain="";found=true;}
    if(c.equipment.weaponOff===name){c.equipment.weaponOff="";found=true;}
    if(c.equipment.armor===name){c.equipment.armor="";found=true;}
  }
  if(match&&c.property&&found){
    c.property.mainXp=(c.property.mainXp||0)+Math.floor((match.item.xpCost||0)*0.7);
    c.property.mainAp=(c.property.mainAp||0)+Math.floor((match.item.apCost||0)*0.7);
  }
  if(typeof autoSave==="function")autoSave();
  showToast("↩ 已取消 "+name); refreshShop();
}

// ═══════ 剑侠情缘页面 ═══════
function loadJianxiaData(){
  var tb=document.getElementById("jxBody");if(!tb)return;
  tb.innerHTML='<tr><td colspan="13" style="text-align:center;padding:60px;color:var(--accent-cyan)">⏳ 加载中…</td></tr>';
  loadWorldItems("jianxia").then(function(items){
    _jxItems = items;
    filterJianxia();
  }).catch(function(){_jxItems = []; filterJianxia();});
}

var _jxItems = [];
var _jxActiveKeywords = [];

function toggleJxKeyword(kw){
  var idx=_jxActiveKeywords.indexOf(kw);
  if(idx>=0)_jxActiveKeywords.splice(idx,1);
  else _jxActiveKeywords.push(kw);
  filterJianxia();
}

function filterJianxia(){
  var tb=document.getElementById("jxBody"),cnt=document.getElementById("jxCount");if(!tb||!cnt)return;
  var s=document.getElementById("jxSearch"),tf=document.getElementById("jxTypeFilter"),rf=document.getElementById("jxRankFilter");
  var q=(s?s.value:"").trim().toLowerCase(),tv=tf?tf.value:"",rv=rf?rf.value:"";
  var items = _jxItems;

  // Build keyword tags from ALL items (not filtered)
  var allKeywords={};
  items.forEach(function(it){
    (it.keywords||"").split("·").forEach(function(k){k=k.trim();if(k)allKeywords[k]=true;});
  });
  var kwSorted=Object.keys(allKeywords).sort();
  var kwArea=document.getElementById("jxKeywordTags");
  if(kwArea){
    kwArea.innerHTML='';
    kwSorted.forEach(function(kw){
      var tag=document.createElement("span");
      tag.className='keyword-tag' + (_jxActiveKeywords.indexOf(kw)>=0?' active':'');
      tag.textContent=kw;
      tag.onclick=function(){toggleJxKeyword(kw);};
      kwArea.appendChild(tag);
    });
  }

  var r=items.filter(function(it){
    if(tv && it.type !== tv) return false;
    if(rv && (it.name||"").indexOf(rv) !== 0) return false;
    if(q){
      var n=(it.name||"").toLowerCase(),d=(it.desc||"").toLowerCase(),e=(it.effect||"").toLowerCase(),k=(it.keywords||"").toLowerCase();
      if(n.indexOf(q)<0 && d.indexOf(q)<0 && e.indexOf(q)<0 && k.indexOf(q)<0) return false;
    }
    // 关键词 tag 筛选
    if(_jxActiveKeywords.length>0){
      var itemKws=(it.keywords||"").split("·").map(function(x){return x.trim();});
      for(var ki=0;ki<_jxActiveKeywords.length;ki++){
        if(itemKws.indexOf(_jxActiveKeywords[ki])<0) return false;
      }
    }
    return true;
  });
  tb.innerHTML=r.length===0?'<tr><td colspan="13" style="text-align:center;padding:60px;color:var(--text-muted)">📭 无匹配</td></tr>':"";
  r.forEach(function(it){
    var tr=document.createElement("tr");
    var costParts=[];
    if(it.xpCost) costParts.push(it.xpCost+"EXP");
    if(it.apCost) costParts.push(it.apCost+"AP");
    tr.innerHTML=
      '<td style=color:#ef5350;font-weight:600;font-size:12px>'+(it.type||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--accent-orange)>'+(it.sect||"-")+'</td>'+
      '<td style=font-weight:600>'+(it.name||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--text-secondary)>'+(it.castTime||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--text-secondary)>'+(it.range||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--text-secondary)>'+(it.duration||"-")+'</td>'+
      '<td style=font-size:12px;font-weight:600;color:var(--accent-cyan)>'+(it.qiCost||0)+'</td>'+
      '<td style=font-size:10px;color:var(--text-muted)>'+(it.keywords||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--text-secondary)>'+(it.condition||"-")+'</td>'+
      '<td style=font-size:11px;color:var(--text-secondary)>'+(it.limit||"-")+'</td>'+
      '<td style=font-size:12px;color:#6a8ac4;font-weight:600;font-family:var(--font-mono)>'+(costParts.length?costParts.join("+"):"免费")+'</td>'+
      '<td style=font-size:12px;color:var(--text-secondary)>'+(it.desc||"")+'</td>'+
      '<td style=font-size:12px;color:var(--text-secondary)>'+(it.effect||"")+'</td>';
    tb.appendChild(tr);
  });
  cnt.textContent=r.length+" / "+(items.length)+" 项";
}
