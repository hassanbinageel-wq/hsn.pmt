window.App = window.App || {};
(function(A){
  A.$  = function(s,r){return (r||document).querySelector(s);};
  A.$$ = function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  A.uid = function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);};
  A.esc = function(s){s=(s==null?'':String(s));return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  A.todayISO = function(){var d=new Date();return d.toISOString().slice(0,10);};
  A.parseNum = function(v){if(v==null||v==='')return 0;var n=parseFloat(String(v).replace(/[,\s]/g,''));return isNaN(n)?0:n;};

  A.CURRENCIES = {
    USD:{code:'USD',label:'$',ar:'دولار'},
    SAR:{code:'SAR',label:'ر.س',ar:'ريال سعودي'},
    AED:{code:'AED',label:'د.إ',ar:'درهم إماراتي'},
    QAR:{code:'QAR',label:'ر.ق',ar:'ريال قطري'},
    OMR:{code:'OMR',label:'ر.ع',ar:'ريال عماني'},
    YER:{code:'YER',label:'ر.ي',ar:'ريال يمني'}
  };
  A.CUR_LIST = ['USD','SAR','AED','QAR','OMR','YER'];
  A.worksWord = function(n){ n=+n||0; if(n===1)return 'عمل واحد'; if(n===2)return 'عملان'; return n+' '+((n>=3&&n<=10)?'أعمال':'عمل'); };
  A.rateKey = function(cur){ return 'usdTo'+cur.charAt(0)+cur.slice(1).toLowerCase(); }; // USD->usdToUsd (unused), SAR->usdToSar ...

  A.groupNum = function(n){
    if(n==null||isNaN(n)) return '0';
    var neg = n<0; n=Math.abs(n);
    var hasFrac = Math.round(n*100)%100 !== 0;
    var s = hasFrac ? n.toFixed(2) : Math.round(n).toString();
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return (neg?'-':'')+parts.join('.');
  };
  // returns HTML span
  A.money = function(amount, cur, opts){
    opts=opts||{};
    var c = A.CURRENCIES[cur]||{label:cur||''};
    var cls='money'+(opts.cls?(' '+opts.cls):'');
    if(opts.color){ if(amount>0)cls+=' pos'; else if(amount<0)cls+=' neg'; }
    return '<span class="'+cls+'">'+A.esc(A.groupNum(amount))+'<span class="cur">'+A.esc(c.label)+'</span></span>';
  };
  A.moneyText = function(amount,cur){var c=A.CURRENCIES[cur]||{label:cur||''};return A.groupNum(amount)+' '+c.label;};

  A.fmtDate = function(iso){
    if(!iso) return '—';
    try{ var d=new Date(iso+'T00:00:00'); if(isNaN(d))return iso;
      var m=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      return d.getDate()+' '+m[d.getMonth()]+' '+d.getFullYear();
    }catch(e){return iso;}
  };
  A.fmtDateShort = function(iso){if(!iso)return '—';return iso.split('-').reverse().join('/');};

  A.WORK_STATUS = {'new':{ar:'جديد',cls:'b-new'},'progress':{ar:'قيد التنفيذ',cls:'b-prog'},'waiting':{ar:'بانتظار العميل',cls:'b-wait'},'done':{ar:'مكتمل',cls:'b-done'},'cancel':{ar:'ملغي',cls:'b-cancel'}};
  A.WORK_TYPE = {'img':'صور AI','vid':'فيديو AI','both':'صور وفيديو','custom':'مخصص'};
  A.PAY_STATUS = {'unpaid':{ar:'غير مدفوع',cls:'b-unpaid'},'partial':{ar:'مدفوع جزئيًا',cls:'b-partial'},'paid':{ar:'مدفوع',cls:'b-paid'}};
  A.INV_STATUS = {'draft':{ar:'مسودة',cls:'b-draft'},'issued':{ar:'مُصدرة',cls:'b-new'},'partial':{ar:'مدفوعة جزئيًا',cls:'b-partial'},'paid':{ar:'مدفوعة',cls:'b-paid'},'overdue':{ar:'متأخرة',cls:'b-overdue'}};
  A.ITEM_TYPE = {'shot':'لقطة فيديو','image':'صورة','frame':'فريم','custom':'مخصص'};

  A.badge = function(map,key){var it=map[key]||{ar:key,cls:'b-draft'};return '<span class="badge '+it.cls+'">'+A.esc(it.ar)+'</span>';};

  // ---- Toast ----
  A.toast = function(msg,type){
    var w=A.$('#toasts'); if(!w){w=document.createElement('div');w.id='toasts';document.body.appendChild(w);}
    var t=document.createElement('div'); t.className='toast '+(type||''); t.textContent=msg; w.appendChild(t);
    setTimeout(function(){t.style.transition='.3s';t.style.opacity='0';t.style.transform='translateY(-10px)';setTimeout(function(){t.remove();},300);},2200);
  };

  // ---- Modal / sheet ----
  A.closeSheet = function(){var o=A.$('.overlay');if(o){o.style.animation='fade .12s reverse';setTimeout(function(){o.remove();},110);}};
  A.sheet = function(html,opts){
    opts=opts||{};
    var olds=document.querySelectorAll('.overlay'); for(var i=0;i<olds.length;i++) olds[i].remove(); // remove instantly (no lingering duplicate)
    var ov=document.createElement('div'); ov.className='overlay';
    var sh=document.createElement('div'); sh.className='sheet'+(opts.center?' center':'');
    sh.innerHTML=(opts.center?'':'<div class="handle"></div>')+html;
    ov.appendChild(sh); document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov && opts.dismiss!==false)A.closeSheet();});
    return sh;
  };
  A.confirm = function(title,msg,opts){
    opts=opts||{};
    return new Promise(function(res){
      var sh=A.sheet(
        '<div class="dtitle">'+A.esc(title)+'</div>'+
        (msg?'<div class="dmsg">'+A.esc(msg)+'</div>':'')+
        '<div class="btn-row">'+
        '<button class="btn ghost" data-c="0">'+A.esc(opts.cancel||'إلغاء')+'</button>'+
        '<button class="btn '+(opts.danger?'danger':'')+'" data-c="1">'+A.esc(opts.ok||'تأكيد')+'</button>'+
        '</div>',{center:true});
      sh.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;A.closeSheet();res(b.getAttribute('data-c')==='1');});
    });
  };
  A.prompt = function(title,opts){
    opts=opts||{};
    return new Promise(function(res){
      var sh=A.sheet('<div class="dtitle">'+A.esc(title)+'</div>'+(opts.msg?'<div class="dmsg">'+A.esc(opts.msg)+'</div>':'')+
        '<div class="field"><input class="input" id="pIn" type="'+(opts.type||'text')+'" placeholder="'+A.esc(opts.placeholder||'')+'" value="'+A.esc(opts.value||'')+'"></div>'+
        '<div class="btn-row"><button class="btn ghost" data-c="0">إلغاء</button><button class="btn" data-c="1">'+A.esc(opts.ok||'حفظ')+'</button></div>',{center:true});
      var inp=A.$('#pIn',sh); setTimeout(function(){inp.focus();},60);
      sh.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;var v=inp.value;A.closeSheet();res(b.getAttribute('data-c')==='1'?v:null);});
    });
  };

  // read image file -> dataURL (compressed)
  A.pickImage = function(maxW){
    maxW=maxW||900;
    return new Promise(function(res){
      var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
      inp.onchange=function(){var f=inp.files[0];if(!f){res(null);return;}
        var rd=new FileReader();rd.onload=function(){
          var img=new Image();img.onload=function(){
            var scale=Math.min(1,maxW/img.width);var w=Math.round(img.width*scale),hh=Math.round(img.height*scale);
            var cv=document.createElement('canvas');cv.width=w;cv.height=hh;
            cv.getContext('2d').drawImage(img,0,0,w,hh);
            res(cv.toDataURL('image/jpeg',0.82));
          };img.onerror=function(){res(rd.result);};img.src=rd.result;
        };rd.readAsDataURL(f);
      };
      inp.click();
    });
  };

  A.debounce=function(fn,ms){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},ms);};};
})(App);
