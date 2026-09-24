/* التقارير — شهري / سنوي / فترة مخصصة • الأعمال / الجهات / الكل • تصدير Excel */
window.App = window.App || {};
(function(A){
  var MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var SCOPE_AR={works:'الأعمال',groups:'الجهات',all:'الكل'};
  var st={ptype:'month', month:null, year:null, from:'', to:'', scope:'all'}; // التقرير دائمًا كامل

  function pad2(n){return (n<10?'0':'')+n;}
  function lastDay(y,m){return new Date(y,m,0).getDate();} // m: 1..12
  function workKey(w){return w.startDate||(w.createdAt||'').slice(0,10);}

  function period(){
    var now=new Date(), y=st.year||now.getFullYear(), m=st.month||(now.getMonth()+1);
    if(st.ptype==='month') return {from:y+'-'+pad2(m)+'-01', to:y+'-'+pad2(m)+'-'+pad2(lastDay(y,m)), label:MONTHS[m-1]+' '+y, file:y+'-'+pad2(m)};
    if(st.ptype==='year')  return {from:y+'-01-01', to:y+'-12-31', label:'سنة '+y, file:String(y)};
    var f=st.from||(y+'-'+pad2(m)+'-01'), t=st.to||A.todayISO(); if(f>t){var x=f;f=t;t=x;}
    return {from:f, to:t, label:'من '+f+' إلى '+t, file:f+'_'+t};
  }

  // ---------------- data ----------------
  function build(){
    var p=period(), base=A.Store.base(), cancelled=0;
    var works=A.Store.works().filter(function(w){var k=workKey(w);return k>=p.from&&k<=p.to;})
      .filter(function(w){if(w.status==='cancel'){cancelled++;return false;}return true;})
      .sort(function(a,b){return workKey(b).localeCompare(workKey(a));});
    var rows=works.map(function(w){
      var f=A.Store.workFinance(w), g=w.groupId?A.Store.getGroup(w.groupId):null, cl=A.Store.getClient(w.clientId);
      return {w:w,f:f,group:g?g.name:'بدون جهة',client:cl?cl.name:'',
        agreed:f.agreedBase, cost:f.itemsCost, profit:f.agreedBase-f.itemsCost, received:f.receivedBase,
        remaining:f.agreedBase-f.receivedBase, credits:f.videoCredits+f.imageCredits};
    });
    // groups
    var gmap={}, gorder=[];
    rows.forEach(function(r){
      if(!gmap[r.group]){gmap[r.group]={name:r.group,count:0,done:0,agreed:0,cost:0,profit:0,received:0,remaining:0,credits:0,first:'',last:''};gorder.push(r.group);}
      var g=gmap[r.group], k=workKey(r.w);
      g.count++; if(r.w.status==='done')g.done++;
      g.agreed+=r.agreed; g.cost+=r.cost; g.profit+=r.profit; g.received+=r.received; g.remaining+=r.remaining; g.credits+=r.credits;
      if(!g.first||k<g.first)g.first=k; if(!g.last||k>g.last)g.last=k;
    });
    var groups=gorder.map(function(n){return gmap[n];}).sort(function(a,b){ if(a.name==='بدون جهة')return 1; if(b.name==='بدون جهة')return -1; return b.profit-a.profit; });
    // subscriptions entries in period
    var subs=[];
    A.Store.subscriptions().forEach(function(s){(s.entries||[]).forEach(function(e){
      if(e.date>=p.from&&e.date<=p.to){ var b=A.Store.convert(A.parseNum(e.amount),s.currency,base);
        subs.push({tool:s.name,date:e.date,amount:A.parseNum(e.amount),currency:s.currency,base:b==null?0:b,credits:A.parseNum(e.credits),note:e.note||''}); }
    });});
    subs.sort(function(a,b){return b.date.localeCompare(a.date);});
    var T={count:rows.length,done:0,agreed:0,cost:0,profit:0,received:0,remaining:0,credits:0,subsPaid:0,subsCredits:0};
    rows.forEach(function(r){if(r.w.status==='done')T.done++;T.agreed+=r.agreed;T.cost+=r.cost;T.profit+=r.profit;T.received+=r.received;T.remaining+=r.remaining;T.credits+=r.credits;});
    subs.forEach(function(s){T.subsPaid+=s.base;T.subsCredits+=s.credits;});
    T.margin=T.agreed>0?T.profit/T.agreed:0;
    T.groups=groups.filter(function(g){return g.name!=='بدون جهة';}).length;
    return {p:p,base:base,scope:st.scope,rows:rows,groups:groups,subs:subs,T:T,cancelled:cancelled};
  }

  // ---------------- Excel ----------------
  var FONT='Arial', BR={style:'thin',color:{rgb:'D5DED9'}}, BORDER={top:BR,bottom:BR,left:BR,right:BR};
  function sty(o){o=o||{};var s={font:{name:FONT,sz:o.sz||10,bold:!!o.bold,color:{rgb:o.color||'1A1F1C'}},
      alignment:{horizontal:o.h||'right',vertical:'center',wrapText:!!o.wrap,readingOrder:2}};
    if(o.border!==false)s.border=BORDER; if(o.fill)s.fill={patternType:'solid',fgColor:{rgb:o.fill}}; if(o.fmt)s.numFmt=o.fmt; return s;}
  var HEAD=sty({bold:true,color:'FFFFFF',fill:'097A54',h:'center',wrap:true});
  var NUM='#,##0.00', INT='#,##0', PCT='0.0%';
  function colL(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}

  function Sheet(){this.ws={};this.maxR=0;this.maxC=0;this.merges=[];this.widths={};this.heights={};}
  Sheet.prototype.put=function(r,c,cell){this.ws[colL(c)+(r+1)]=cell;if(r>this.maxR)this.maxR=r;if(c>this.maxC)this.maxC=c;
    var len=String(cell.w||(cell.t==='n'?A.groupNum(cell.v):cell.v)||'').length; if(!cell.noW) this.widths[c]=Math.max(this.widths[c]||0,len);};
  Sheet.prototype.s=function(r,c,v,o){this.put(r,c,{t:'s',v:v==null?'':String(v),s:sty(o),noW:!!(o&&o.noW)});};
  Sheet.prototype.n=function(r,c,v,o){o=o||{};o.fmt=o.fmt||NUM;o.h=o.h||'center';this.put(r,c,{t:'n',v:+v||0,z:o.fmt,s:sty(o)});};
  Sheet.prototype.f=function(r,c,f,v,o){o=o||{};o.fmt=o.fmt||NUM;o.h=o.h||'center';this.put(r,c,{t:'n',f:f,v:+v||0,z:o.fmt,s:sty(o)});};
  Sheet.prototype.title=function(r,text,sub,ncol){
    this.put(r,0,{t:'s',v:text,s:sty({bold:true,sz:15,color:'0B110E',border:false}),noW:true});
    this.merges.push({s:{r:r,c:0},e:{r:r,c:ncol-1}}); this.heights[r]=28;
    if(sub){this.put(r+1,0,{t:'s',v:sub,s:sty({sz:10,color:'5A6B63',border:false}),noW:true});this.merges.push({s:{r:r+1,c:0},e:{r:r+1,c:ncol-1}});}
  };
  Sheet.prototype.header=function(r,cols){var self=this;cols.forEach(function(h,c){self.put(r,c,{t:'s',v:h,s:HEAD});});this.heights[r]=32;};
  Sheet.prototype.done=function(){
    var ws=this.ws; ws['!ref']='A1:'+colL(this.maxC)+(this.maxR+1); ws['!merges']=this.merges;
    var cols=[]; for(var c=0;c<=this.maxC;c++){cols.push({wch:Math.min(42,Math.max(10,(this.widths[c]||8)+4))});} ws['!cols']=cols;
    var rows=[]; for(var r=0;r<=this.maxR;r++){rows.push(this.heights[r]?{hpt:this.heights[r]}:{hpt:20});} ws['!rows']=rows;
    return ws;
  };
  function alt(i){return i%2?'F4F8F6':null;}

  var WS='الأعمال', GS='الجهات', SS='الاشتراكات';
  function q(name){return "'"+name+"'";}

  function worksSheet(R){
    var sh=new Sheet(), b=R.base, H=['م','العمل','الجهة','العميل','المنفّذ','النوع','الحالة','تاريخ البدء','تاريخ التسليم',
      'المتفق عليه (أصلي)','العملة','المتفق عليه ('+b+')','رصيد الفيديو','عدد اللقطات','رصيد الصور','عدد الصور','إجمالي الرصيد',
      'تكلفة الإنتاج ('+b+')','الربح ('+b+')','الهامش','المستلم ('+b+')','المتبقي ('+b+')','حالة الدفع'];
    sh.title(0,'تقرير الأعمال — '+R.p.label,'الفترة: '+R.p.from+' إلى '+R.p.to+' • المبالغ بعملة '+b+' • حسب تاريخ بدء العمل',H.length);
    sh.header(3,H);
    var first=4, r=first;
    R.rows.forEach(function(x,i){
      var w=x.w, f=x.f, fill=alt(i), R1=r+1;
      sh.n(r,0,i+1,{fmt:INT,fill:fill});
      sh.s(r,1,w.name||'',{fill:fill,bold:true}); sh.s(r,2,x.group,{fill:fill}); sh.s(r,3,x.client,{fill:fill}); sh.s(r,4,w.assignee||'',{fill:fill});
      sh.s(r,5,A.WORK_TYPE[w.type]||w.customType||'',{fill:fill,h:'center'}); sh.s(r,6,(A.WORK_STATUS[w.status]||{}).ar||'',{fill:fill,h:'center'});
      sh.s(r,7,w.startDate||'',{fill:fill,h:'center'}); sh.s(r,8,w.deliveryDate||'',{fill:fill,h:'center'});
      sh.n(r,9,A.parseNum(w.agreedAmount),{fill:fill}); sh.s(r,10,w.agreedCurrency||b,{fill:fill,h:'center'});
      sh.n(r,11,x.agreed,{fill:fill});
      sh.n(r,12,f.videoCredits,{fmt:INT,fill:fill}); sh.n(r,13,f.videoCount,{fmt:INT,fill:fill});
      sh.n(r,14,f.imageCredits,{fmt:INT,fill:fill}); sh.n(r,15,f.imageCount,{fmt:INT,fill:fill});
      sh.f(r,16,'M'+R1+'+O'+R1,x.credits,{fmt:INT,fill:fill});
      sh.n(r,17,x.cost,{fill:fill});
      sh.f(r,18,'L'+R1+'-R'+R1,x.profit,{fill:fill,bold:true,color:x.profit<0?'C62828':'097A54'});
      sh.f(r,19,'IF(L'+R1+'>0,S'+R1+'/L'+R1+',0)',x.agreed>0?x.profit/x.agreed:0,{fmt:PCT,fill:fill});
      sh.n(r,20,x.received,{fill:fill});
      sh.f(r,21,'L'+R1+'-U'+R1,x.remaining,{fill:fill,color:x.remaining>0.004?'C62828':'1A1F1C'});
      sh.s(r,22,(A.PAY_STATUS[f.payStatus]||{}).ar||'',{fill:fill,h:'center'});
      r++;
    });
    var tot=r, T=R.T, TO={bold:true,fill:'E6F6EF'};
    for(var c=0;c<H.length;c++) sh.s(tot,c,'',TO);
    sh.s(tot,1,'الإجمالي',TO);
    var last=tot; // row index (0-based) of last data = tot-1 -> excel row tot
    function sum(col,v,o){ if(R.rows.length) sh.f(tot,col,'SUM('+colL(col)+(first+1)+':'+colL(col)+tot+')',v,Object.assign({},TO,o||{})); else sh.n(tot,col,0,Object.assign({},TO,o||{})); }
    sum(11,T.agreed); sum(12,sumOf(R,'videoCredits'),{fmt:INT}); sum(13,sumOf(R,'videoCount'),{fmt:INT});
    sum(14,sumOf(R,'imageCredits'),{fmt:INT}); sum(15,sumOf(R,'imageCount'),{fmt:INT}); sum(16,T.credits,{fmt:INT});
    sum(17,T.cost); sum(18,T.profit); sum(20,T.received); sum(21,T.remaining);
    var TR=tot+1; sh.f(tot,19,'IF(L'+TR+'>0,S'+TR+'/L'+TR+',0)',T.margin,Object.assign({},TO,{fmt:PCT}));
    sh.s(tot+2,1,'ملاحظة: الأعمال الملغاة مستبعدة ('+R.cancelled+')، والمبالغ محوّلة حسب أسعار الصرف المحفوظة في التطبيق.',{border:false,color:'5A6B63',noW:true});
    sh.merges.push({s:{r:tot+2,c:1},e:{r:tot+2,c:12}});
    var ws=sh.done(); ws.__tot=TR; ws.__first=first+1; ws.__last=tot; return ws;
  }
  function sumOf(R,k){return R.rows.reduce(function(a,x){return a+(+x.f[k]||0);},0);}

  function groupsSheet(R,hasWorks,wsInfo){
    var sh=new Sheet(), b=R.base, H=['الجهة','عدد الأعمال','مكتمل','المتفق عليه ('+b+')','تكلفة الإنتاج ('+b+')','الربح ('+b+')','الهامش','المستلم ('+b+')','المتبقي ('+b+')','إجمالي الرصيد','أول عمل','آخر عمل'];
    sh.title(0,'تقرير الجهات — '+R.p.label,'الفترة: '+R.p.from+' إلى '+R.p.to+' • المبالغ بعملة '+b,H.length);
    sh.header(3,H);
    var first=4, r=first, W=q(WS)+'!', rg=function(col){return W+'$'+col+'$'+wsInfo.first+':$'+col+'$'+wsInfo.last;};
    R.groups.forEach(function(g,i){
      var fill=alt(i), R1=r+1, A1='A'+R1;
      sh.s(r,0,g.name,{fill:fill,bold:true});
      if(hasWorks&&R.rows.length){
        sh.f(r,1,'COUNTIFS('+rg('C')+','+A1+')',g.count,{fmt:INT,fill:fill});
        sh.f(r,2,'COUNTIFS('+rg('C')+','+A1+','+rg('G')+',"'+A.WORK_STATUS.done.ar+'")',g.done,{fmt:INT,fill:fill});
        sh.f(r,3,'SUMIFS('+rg('L')+','+rg('C')+','+A1+')',g.agreed,{fill:fill});
        sh.f(r,4,'SUMIFS('+rg('R')+','+rg('C')+','+A1+')',g.cost,{fill:fill});
        sh.f(r,7,'SUMIFS('+rg('U')+','+rg('C')+','+A1+')',g.received,{fill:fill});
        sh.f(r,9,'SUMIFS('+rg('Q')+','+rg('C')+','+A1+')',g.credits,{fmt:INT,fill:fill});
      }else{
        sh.n(r,1,g.count,{fmt:INT,fill:fill}); sh.n(r,2,g.done,{fmt:INT,fill:fill}); sh.n(r,3,g.agreed,{fill:fill});
        sh.n(r,4,g.cost,{fill:fill}); sh.n(r,7,g.received,{fill:fill}); sh.n(r,9,g.credits,{fmt:INT,fill:fill});
      }
      sh.f(r,5,'D'+R1+'-E'+R1,g.profit,{fill:fill,bold:true,color:g.profit<0?'C62828':'097A54'});
      sh.f(r,6,'IF(D'+R1+'>0,F'+R1+'/D'+R1+',0)',g.agreed>0?g.profit/g.agreed:0,{fmt:PCT,fill:fill});
      sh.f(r,8,'D'+R1+'-H'+R1,g.remaining,{fill:fill,color:g.remaining>0.004?'C62828':'1A1F1C'});
      sh.s(r,10,g.first,{fill:fill,h:'center'}); sh.s(r,11,g.last,{fill:fill,h:'center'});
      r++;
    });
    var tot=r, TO={bold:true,fill:'E6F6EF'}, T=R.T;
    for(var c=0;c<H.length;c++) sh.s(tot,c,'',TO);
    sh.s(tot,0,'الإجمالي',TO);
    function sum(col,v,o){ if(R.groups.length) sh.f(tot,col,'SUM('+colL(col)+(first+1)+':'+colL(col)+tot+')',v,Object.assign({},TO,o||{})); else sh.n(tot,col,0,Object.assign({},TO,o||{})); }
    sum(1,T.count,{fmt:INT}); sum(2,T.done,{fmt:INT}); sum(3,T.agreed); sum(4,T.cost); sum(5,T.profit); sum(7,T.received); sum(8,T.remaining); sum(9,T.credits,{fmt:INT});
    var TR=tot+1; sh.f(tot,6,'IF(D'+TR+'>0,F'+TR+'/D'+TR+',0)',T.margin,Object.assign({},TO,{fmt:PCT}));
    var ws=sh.done(); ws.__tot=TR; return ws;
  }

  function subsSheet(R){
    var sh=new Sheet(), b=R.base, H=['الأداة','التاريخ','المبلغ','العملة','المبلغ ('+b+')','الرصيد (Credits)','سعر الرصيد الواحد','ملاحظة'];
    sh.title(0,'الاشتراكات — '+R.p.label,'الدفعات والتجديدات خلال الفترة',H.length);
    sh.header(3,H);
    var first=4, r=first;
    R.subs.forEach(function(x,i){var fill=alt(i),R1=r+1;
      sh.s(r,0,x.tool,{fill:fill,bold:true}); sh.s(r,1,x.date,{fill:fill,h:'center'}); sh.n(r,2,x.amount,{fill:fill}); sh.s(r,3,x.currency,{fill:fill,h:'center'});
      sh.n(r,4,x.base,{fill:fill}); sh.n(r,5,x.credits,{fmt:INT,fill:fill});
      sh.f(r,6,'IF(F'+R1+'>0,C'+R1+'/F'+R1+',0)',x.credits>0?x.amount/x.credits:0,{fmt:'#,##0.0000',fill:fill});
      sh.s(r,7,x.note,{fill:fill}); r++;});
    var tot=r, TO={bold:true,fill:'E6F6EF'};
    for(var c=0;c<H.length;c++) sh.s(tot,c,'',TO);
    sh.s(tot,0,'الإجمالي',TO);
    if(R.subs.length){ sh.f(tot,4,'SUM(E'+(first+1)+':E'+tot+')',R.T.subsPaid,TO); sh.f(tot,5,'SUM(F'+(first+1)+':F'+tot+')',R.T.subsCredits,Object.assign({},TO,{fmt:INT})); }
    else { sh.n(tot,4,0,TO); sh.n(tot,5,0,Object.assign({},TO,{fmt:INT})); }
    var ws=sh.done(); ws.__tot=tot+1; return ws;
  }

  function summarySheet(R,refs){
    var sh=new Sheet(), b=R.base, bz=A.Store.settings().business||{};
    sh.title(0,'تقرير '+(bz.name||'hsn.pmt')+' — '+R.p.label,null,2);
    var r=2, T=R.T, i=0;
    [['الفترة من',R.p.from],['الفترة إلى',R.p.to],['عملة المبالغ',b],['تاريخ الإصدار',A.todayISO()]].forEach(function(m){sh.s(r,0,m[0],{bold:true,fill:'F4F8F6'});sh.s(r,1,m[1],{h:'center'});r++;});
    r++; sh.header(r,['البند','القيمة']); r++;
    function line(label,f,v,fmt){var fill=alt(i++); sh.s(r,0,label,{fill:fill,bold:true}); if(f) sh.f(r,1,f,v,{fmt:fmt||NUM,fill:fill}); else sh.n(r,1,v,{fmt:fmt||NUM,fill:fill}); r++;}
    var W=refs.works?q(WS)+'!':null, G=refs.groups?q(GS)+'!':null;
    if(W){ var t=refs.works.__tot, a=refs.works.__first, z=refs.works.__last, has=R.rows.length>0;
      line('عدد الأعمال',has?'COUNTA('+W+'B'+a+':B'+z+')':null,T.count,INT);
      line('الأعمال المكتملة',has?'COUNTIF('+W+'G'+a+':G'+z+',"'+A.WORK_STATUS.done.ar+'")':null,T.done,INT);
      line('إجمالي المتفق عليه ('+b+')',W+'L'+t,T.agreed);
      line('إجمالي تكلفة الإنتاج ('+b+')',W+'R'+t,T.cost);
      line('صافي الربح ('+b+')',W+'S'+t,T.profit);
      line('هامش الربح',W+'T'+t,T.margin,PCT);
      line('المستلم فعليًا ('+b+')',W+'U'+t,T.received);
      line('المتبقي على العملاء ('+b+')',W+'V'+t,T.remaining);
      line('الرصيد المستخدم في الأعمال (Credits)',W+'Q'+t,T.credits,INT);
    }else if(G){ var g=refs.groups.__tot;
      line('عدد الأعمال',G+'B'+g,T.count,INT); line('الأعمال المكتملة',G+'C'+g,T.done,INT);
      line('إجمالي المتفق عليه ('+b+')',G+'D'+g,T.agreed); line('إجمالي تكلفة الإنتاج ('+b+')',G+'E'+g,T.cost);
      line('صافي الربح ('+b+')',G+'F'+g,T.profit); line('هامش الربح',G+'G'+g,T.margin,PCT);
      line('المستلم فعليًا ('+b+')',G+'H'+g,T.received); line('المتبقي على العملاء ('+b+')',G+'I'+g,T.remaining);
      line('الرصيد المستخدم في الأعمال (Credits)',G+'J'+g,T.credits,INT);
    }
    line('عدد الجهات',null,T.groups,INT);
    if(refs.subs){ var s=refs.subs.__tot;
      line('المدفوع للأدوات ('+b+')',q(SS)+'!E'+s,T.subsPaid);
      line('الرصيد المشترى (Credits)',q(SS)+'!F'+s,T.subsCredits,INT);
    }
    sh.s(r+1,0,'الأعمال الملغاة مستبعدة ('+R.cancelled+'). الفترة محسوبة حسب تاريخ بدء العمل.',{border:false,color:'5A6B63',noW:true,wrap:true});
    sh.heights[r+1]=32;
    sh.merges.push({s:{r:r+1,c:0},e:{r:r+1,c:1}});
    var ws=sh.done(); ws['!cols']=[{wch:40},{wch:22}]; return ws;
  }

  function workbook(R){
    A.XL=window.XLSX; var wb=A.XL.utils.book_new(), refs={};
    if(R.scope!=='groups') refs.works=worksSheet(R);
    if(R.scope!=='works') refs.groups=groupsSheet(R,!!refs.works,refs.works?{first:refs.works.__first,last:refs.works.__last}:{first:5,last:5});
    if(R.scope==='all') refs.subs=subsSheet(R);
    A.XL.utils.book_append_sheet(wb,summarySheet(R,refs),'الملخص');
    if(refs.works) A.XL.utils.book_append_sheet(wb,refs.works,WS);
    if(refs.groups) A.XL.utils.book_append_sheet(wb,refs.groups,GS);
    if(refs.subs) A.XL.utils.book_append_sheet(wb,refs.subs,SS);
    wb.Workbook={Views:[{RTL:true}]};
    return wb;
  }
  function exportXlsx(){
    if(!window.XLSX){A.toast('مكتبة Excel غير متوفرة','err');return;}
    A.XL=window.XLSX;
    var R=build(), wb=workbook(R);
    var b64=A.XL.write(wb,{type:'base64',bookType:'xlsx'});
    var fn='hsn-pmt-report-'+R.p.file+'.xlsx';
    A.toast('جاري تجهيز ملف Excel…');
    return A.Platform.saveAndShare(fn,b64,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',{title:'تقرير '+R.p.label,dialog:'مشاركة التقرير'})
      .then(function(){A.toast('تم تصدير التقرير','ok');})
      .catch(function(e){console.error(e);A.toast('تعذّر التصدير','err');});
  }

  // ---------------- UI ----------------
  function years(){
    var ys={}, now=new Date().getFullYear(); ys[now]=1;
    A.Store.works().forEach(function(w){var k=workKey(w);if(k)ys[+k.slice(0,4)]=1;});
    A.Store.subscriptions().forEach(function(s){(s.entries||[]).forEach(function(e){if(e.date)ys[+e.date.slice(0,4)]=1;});});
    return Object.keys(ys).map(Number).filter(Boolean).sort(function(a,b){return b-a;});
  }
  function preview(){
    var R=build(), b=R.base, T=R.T, h='';
    h+='<div class="notice info">'+A.icon('info',18)+'<div>'+A.esc(R.p.label)+(R.cancelled?(' • '+R.cancelled+' ملغي مستبعد'):'')+'</div></div>';
    h+='<div class="stat-grid">'+
      '<div class="stat hero"><div class="lbl">صافي الربح</div><div class="val '+(T.profit<0?'neg':'')+'">'+A.money(T.profit,b)+'</div></div>'+
      '<div class="stat"><div class="lbl">الأعمال</div><div class="val val-rtl">'+A.esc(A.worksWord(T.count))+' <span class="val-sub">(مكتمل '+T.done+')</span></div></div>'+
      '<div class="stat"><div class="lbl">المتفق عليه</div><div class="val">'+A.money(T.agreed,b)+'</div></div>'+
      '<div class="stat"><div class="lbl">تكلفة الإنتاج</div><div class="val">'+A.money(T.cost,b)+'</div></div>'+
      '<div class="stat"><div class="lbl">هامش الربح</div><div class="val">'+Math.round(T.margin*100)+'%</div></div>'+
      '<div class="stat"><div class="lbl">المستلم</div><div class="val">'+A.money(T.received,b)+'</div></div>'+
      '<div class="stat"><div class="lbl">المتبقي</div><div class="val '+(T.remaining>0.004?'neg':'')+'">'+A.money(T.remaining,b)+'</div></div>'+
      '<div class="stat wide"><div class="lbl">الرصيد المستخدم في الأعمال</div><div class="val">'+A.esc(A.groupNum(T.credits))+'<span class="tiny muted"> Credit</span></div></div>'+
      (R.scope==='all'?'<div class="stat"><div class="lbl">المدفوع للأدوات</div><div class="val">'+A.money(T.subsPaid,b)+'</div></div><div class="stat"><div class="lbl">الرصيد المشترى</div><div class="val">'+A.esc(A.groupNum(T.subsCredits))+'<span class="tiny muted"> Credit</span></div></div>':'')+
    '</div>';
    if(R.scope!=='works'){
      h+='<div class="section-title">الجهات ('+R.groups.length+')</div>';
      h+=R.groups.length?'<div class="list">'+R.groups.map(function(g){return '<div class="rep-card"><div class="rep-top"><b>'+A.esc(g.name)+'</b><span class="rep-profit '+(g.profit<0?'neg':'pos')+'">'+A.money(g.profit,b)+'</span></div><div class="rep-meta">'+A.esc(A.worksWord(g.count))+' (مكتمل '+g.done+') • متفق '+A.esc(A.moneyText(g.agreed,b))+' • تكلفة '+A.esc(A.moneyText(g.cost,b))+(g.remaining>0.004?' • متبقٍ '+A.esc(A.moneyText(g.remaining,b)):'')+'</div></div>';}).join('')+'</div>':'<div class="card pad center muted tiny">لا جهات في هذه الفترة</div>';
    }
    if(R.scope!=='groups'){
      h+='<div class="section-title">الأعمال ('+R.rows.length+')</div>';
      h+=R.rows.length?'<div class="list">'+R.rows.map(function(x){return '<div class="rep-card"><div class="rep-top"><b>'+A.esc(x.w.name||'—')+'</b><span class="rep-profit '+(x.profit<0?'neg':'pos')+'">'+A.money(x.profit,b)+'</span></div><div class="rep-meta">'+A.esc(x.group)+(x.client?' • '+A.esc(x.client):'')+' • '+A.esc(x.w.startDate||'')+' • '+A.esc((A.WORK_STATUS[x.w.status]||{}).ar||'')+'</div><div class="rep-meta">متفق '+A.esc(A.moneyText(x.agreed,b))+' • تكلفة '+A.esc(A.moneyText(x.cost,b))+' • '+A.esc(A.groupNum(x.credits))+' Credit</div></div>';}).join('')+'</div>':'<div class="card pad center muted tiny">لا أعمال في هذه الفترة</div>';
    }
    if(R.scope==='all'){
      h+='<div class="section-title">الاشتراكات ('+R.subs.length+')</div>';
      h+=R.subs.length?'<div class="list">'+R.subs.map(function(s){return '<div class="rep-card"><div class="rep-top"><b>'+A.esc(s.tool)+'</b><span>'+A.money(s.amount,s.currency)+'</span></div><div class="rep-meta">'+A.esc(s.date)+' • '+A.esc(A.groupNum(s.credits))+' Credit</div></div>';}).join('')+'</div>':'<div class="card pad center muted tiny">لا دفعات اشتراكات في هذه الفترة</div>';
    }
    var out=A.$('#repOut'); if(out) out.innerHTML=h;
  }
  function periodInputs(){
    var now=new Date(), y=st.year||now.getFullYear(), m=st.month||(now.getMonth()+1), ys=years(), h='';
    var ysel='<select class="select" id="rYear">'+ys.map(function(v){return '<option value="'+v+'" '+(v===y?'selected':'')+'>'+v+'</option>';}).join('')+'</select>';
    if(st.ptype==='month') h='<div class="grid2"><div class="field"><label>الشهر</label><select class="select" id="rMonth">'+MONTHS.map(function(n,i){return '<option value="'+(i+1)+'" '+(i+1===m?'selected':'')+'>'+n+'</option>';}).join('')+'</select></div><div class="field"><label>السنة</label>'+ysel+'</div></div>';
    else if(st.ptype==='year') h='<div class="field"><label>السنة</label>'+ysel+'</div>';
    else { var p=period(); h='<div class="grid2"><div class="field"><label>من</label><input class="input" type="date" id="rFrom" value="'+p.from+'"></div><div class="field"><label>إلى</label><input class="input" type="date" id="rTo" value="'+p.to+'"></div></div>'; }
    A.$('#perBox').innerHTML=h;
    if(A.$('#rMonth'))A.$('#rMonth').onchange=function(){st.month=+this.value;preview();};
    if(A.$('#rYear'))A.$('#rYear').onchange=function(){st.year=+this.value;preview();};
    if(A.$('#rFrom'))A.$('#rFrom').onchange=function(){st.from=this.value;preview();};
    if(A.$('#rTo'))A.$('#rTo').onchange=function(){st.to=this.value;preview();};
  }
  function seg(id,opts,val){return '<div class="seg" id="'+id+'">'+opts.map(function(o){return '<button data-v="'+o[0]+'" class="'+(o[0]===val?'on':'')+'">'+o[1]+'</button>';}).join('')+'</div>';}

  A.Reports={build:function(o){if(o)Object.assign(st,o);st.scope='all';return build();}, workbook:function(o){if(o)Object.assign(st,o);st.scope='all';return workbook(build());}, exportXlsx:exportXlsx};
  A.Views=A.Views||{};
  A.Views.reports={
    show:function(){
      var body='<div class="field"><label>الفترة</label>'+seg('rType',[['month','شهري'],['year','سنوي'],['custom','من – إلى']],st.ptype)+'</div>'+
        '<div id="perBox"></div>'+
        '<button class="btn" id="rExport">'+A.icon('download',18)+' تصدير Excel</button>'+
        '<div id="repOut" style="margin-top:14px"></div>';
      A.chrome({title:'التقارير',back:'#/more',nav:'more',body:body});
      periodInputs(); preview();
      A.$('#rType').onclick=function(e){var bt=e.target.closest('[data-v]');if(!bt)return;st.ptype=bt.getAttribute('data-v');A.$$('#rType button').forEach(function(x){x.classList.toggle('on',x===bt);});periodInputs();preview();};
      A.$('#rExport').onclick=exportXlsx;
    }
  };
})(App);
