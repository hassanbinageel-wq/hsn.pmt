/* الإقلاع + التوجيه + هيكل الواجهة */
window.App = window.App || {};
(function(A){
  var NAV=[
    {id:'dashboard',hash:'#/dashboard',ic:'dashboard',label:'الرئيسية'},
    {id:'works',hash:'#/works',ic:'works',label:'الأعمال'},
    {id:'clients',hash:'#/clients',ic:'clients',label:'العملاء'},
    {id:'invoice',hash:'#/invoices',ic:'invoice',label:'الفواتير'},
    {id:'more',hash:'#/more',ic:'more',label:'المزيد'}
  ];
  A._leaveGuard=null;
  A._backTarget=null;

  A.chrome=function(o){
    o=o||{};
    A._backTarget = o.back||null;
    var actions=(o.actions||[]).map(function(a){return '<button class="icon-btn" id="'+a.id+'">'+A.icon(a.icon,22)+'</button>';}).join('');
    var top='<div class="topbar">'+
      (o.back?'<button class="icon-btn back-btn" id="__back">'+A.icon('back',22)+'</button>':'')+
      '<div style="flex:1;min-width:0"><h1>'+A.esc(o.title||'')+'</h1>'+(o.sub?'<div class="sub">'+A.esc(o.sub)+'</div>':'')+'</div>'+actions+'</div>';
    var nav = o.noNav?'':'<div class="bottomnav">'+NAV.map(function(n){return '<a data-tab="'+n.hash+'" class="'+(o.nav===n.id?'active':'')+'"><span class="nav-ic">'+A.icon(n.ic,22)+'</span>'+n.label+'</a>';}).join('')+'</div>';
    A.$('#root').innerHTML=top+'<div class="screen'+(o.noNav?' no-nav':'')+'" id="view">'+(o.body||'')+'</div>'+nav;
    document.body.className='';
    window.scrollTo(0,0);
    if(o.back)A.$('#__back').onclick=function(){A.navGuarded(o.back);};
    A.$$('[data-tab]').forEach(function(el){el.onclick=function(){A.navGuarded(el.getAttribute('data-tab'));};});
  };

  A.go=function(hash){ A._leaveGuard=null; if(location.hash===hash){route();} else {location.hash=hash;} };
  A.navGuarded=function(hash){
    if(A._leaveGuard){
      A.confirm('مغادرة دون حفظ؟',A._leaveGuard,{ok:'مغادرة',danger:true}).then(function(ok){if(ok){A._leaveGuard=null;A.go(hash);}});
    }else A.go(hash);
  };
  A.setGuard=function(msg){A._leaveGuard=msg||'لديك تغييرات غير محفوظة.';};

  function parse(){var h=location.hash||'#/dashboard';var m=h.replace(/^#\//,'').split('/');return {seg:m[0]||'dashboard',id:m[1],sub:m[1]};}
  function route(){
    if(!A.Store.state()){return;}
    var p=parse();
    try{
      switch(p.seg){
        case '':case 'dashboard': A.Views.dashboard.show();break;
        case 'works': A.Views.works.show();break;
        case 'work': A.Views.works.detail(p.id);break;
        case 'group': A.Views.groups.detail(p.id);break;
        case 'clients': A.Views.clients.show();break;
        case 'client': A.Views.clients.detail(p.id);break;
        case 'invoices': A.Views.invoices.show();break;
        case 'invoice': A.Views.invoices.detail(p.id);break;
        case 'subscriptions': A.Views.subscriptions.show();break;
        case 'more': A.Views.more.show();break;
        case 'backup': A.Views.backup.show();break;
        case 'reports': A.Views.reports.show();break;
        case 'settings':
          var fn=A.Views.settings[p.sub]; if(fn)fn();else A.Views.more.show();break;
        default: A.Views.dashboard.show();
      }
    }catch(e){console.error(e);A.toast('حدث خطأ في العرض','err');}
    A.Platform.hideSplash();
  }
  A.route=route;

  A.startApp=function(){
    // hardware back button
    A.Platform.onBackButton(function(){
      if(A.$('.overlay')){A.closeSheet();return;}
      if(A._leaveGuard){A.confirm('مغادرة دون حفظ؟',A._leaveGuard,{ok:'مغادرة',danger:true}).then(function(ok){if(ok){A._leaveGuard=null;if(A._backTarget)A.go(A._backTarget);else A.go('#/dashboard');}});return;}
      if(A._backTarget){A.go(A._backTarget);return;}
      var p=parse();
      if(['dashboard','works','clients','invoices','more',''].indexOf(p.seg)>=0){
        A.confirm('إغلاق التطبيق؟','',{ok:'إغلاق'}).then(function(ok){if(ok)A.Platform.exitApp();});
      }else A.go('#/dashboard');
    });
    window.addEventListener('hashchange',route);
    if(!location.hash) location.hash='#/dashboard';
    route();
    A.Views.backup.checkReminder();
  };

  // set unsaved guard when entering full-screen forms
  var _wForm=A.Views.works.form, _iForm=A.Views.invoices.form;
  A.Views.works.form=function(){_wForm.apply(this,arguments);A.setGuard('سيتم فقد تعديلات العمل غير المحفوظة.');};
  A.Views.invoices.form=function(){_iForm.apply(this,arguments);A.setGuard('سيتم فقد تعديلات الفاتورة غير المحفوظة.');};

  // ---------- theme (light / dark / auto) ----------
  A.Theme={
    resolve:function(){var t=A.Store.theme();if(t==='auto'){return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}return t;},
    apply:function(){var r=this.resolve();document.documentElement.setAttribute('data-theme',r);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',r==='dark'?'#0a0f0d':'#ffffff');},
    set:function(t){A.Store.setTheme(t);this.apply();}
  };

  // boot — no password; load existing data or start fresh
  function boot(){
    A.DB.hasVault().then(function(has){
      return has? A.Store.load() : A.Store.initNew();
    }).then(function(){ A.Theme.apply(); A.startApp(); A.Platform.hideSplash();
      if(window.matchMedia){try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(A.Store.theme()==='auto')A.Theme.apply();});}catch(e){}}
    })
    .catch(function(e){console.error(e);
      A.$('#root').innerHTML='<div class="auth"><div class="logo">'+A.icon('warn',72)+'</div><h1>خطأ</h1><p>تعذر فتح قاعدة البيانات المحلية على هذا الجهاز.</p></div>';
      A.Platform.hideSplash();});
  }
  if(document.readyState!=='loading')boot();else document.addEventListener('DOMContentLoaded',boot);
})(App);
