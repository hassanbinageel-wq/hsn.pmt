/* طبقة المنصة: تغلّف إضافات Capacitor مع بدائل للمتصفح */
window.App = window.App || {};
(function(A){
  var Cap = window.Capacitor;
  var isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function P(n){return (Cap && Cap.Plugins && Cap.Plugins[n]) ? Cap.Plugins[n] : null;}

  A.Platform = {
    isNative:isNative,

    hideSplash:function(){var s=P('SplashScreen');if(s&&s.hide){setTimeout(function(){s.hide();},300);}},

    openUrl:function(url){
      if(isNative){var app=P('App');if(app&&app.openUrl){app.openUrl({url:url}).catch(function(){window.open(url,'_system');});return;}}
      window.open(url,'_blank');
    },
    openWhatsApp:function(phone,text){
      var num=(phone||'').replace(/[^\d]/g,'');
      var url='https://wa.me/'+num+(text?('?text='+encodeURIComponent(text)):'');
      this.openUrl(url);
    },
    dial:function(phone){this.openUrl('tel:'+(phone||'').replace(/\s/g,''));},

    // Save a base64 file and offer share. mime e.g. 'application/pdf'
    saveAndShare:function(fileName, base64, mime, opts){
      opts=opts||{};
      if(isNative){
        var Filesystem=P('Filesystem'), Share=P('Share');
        var dir = (Filesystem && Filesystem.Directory) ? 'CACHE' : 'CACHE';
        return Filesystem.writeFile({path:fileName, data:base64, directory:'CACHE'})
          .then(function(r){
            return Filesystem.getUri({path:fileName, directory:'CACHE'}).then(function(u){
              if(opts.shareOnly!==false && Share && Share.share){
                return Share.share({title:opts.title||fileName, url:u.uri, dialogTitle:opts.dialog||'مشاركة'}).then(function(){return {uri:u.uri};}).catch(function(){return {uri:u.uri};});
              }
              return {uri:u.uri};
            });
          });
      }
      // web fallback: download via blob
      return new Promise(function(res){
        var bin=atob(base64), arr=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
        var blob=new Blob([arr],{type:mime||'application/octet-stream'});
        var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fileName;a.click();
        setTimeout(function(){URL.revokeObjectURL(a.href);},1500);
        res({uri:'(downloaded)'});
      });
    },
    // Save/share a text file (utf-8) -> encoded to base64
    saveText:function(fileName, text, mime, opts){
      var b64;
      try{ b64=btoa(unescape(encodeURIComponent(text))); }catch(e){ b64=btoa(text); }
      return this.saveAndShare(fileName,b64,mime||'text/plain',opts);
    },

    // Save a text file into the device file manager: Documents/hsn.pmt/<file>
    saveToDevice:function(fileName, text){
      if(isNative){
        var FS=P('Filesystem');
        var path='hsn.pmt/'+fileName;
        var write=function(){ return FS.writeFile({path:path, data:text, directory:'DOCUMENTS', encoding:'utf8', recursive:true})
          .then(function(r){ return {uri:r&&r.uri, where:'Documents/hsn.pmt', file:fileName}; }); };
        var perm = FS.requestPermissions ? FS.requestPermissions().catch(function(){}) : Promise.resolve();
        return perm.then(write);
      }
      // web fallback: regular download
      var blob=new Blob([text],{type:'application/json'}), a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download=fileName; a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href);},1500);
      return Promise.resolve({uri:'', where:'التنزيلات', file:fileName});
    },

    // pick a backup file (returns text content)
    pickTextFile:function(){
      return new Promise(function(res,rej){
        var inp=document.createElement('input');inp.type='file'; // no accept filter — Android hides custom .hsnbak otherwise
        inp.onchange=function(){var f=inp.files[0];if(!f){res(null);return;}var rd=new FileReader();rd.onload=function(){res({name:f.name,text:rd.result});};rd.onerror=function(){rej(rd.error);};rd.readAsText(f);};
        inp.click();
      });
    },

    onBackButton:function(handler){
      var app=P('App');
      if(app&&app.addListener){app.addListener('backButton',handler);}
    },
    exitApp:function(){var app=P('App');if(app&&app.exitApp)app.exitApp();},

    contactsSupported:function(){
      return !!P('Contacts') || (typeof navigator!=='undefined' && navigator.contacts && navigator.contacts.select);
    },
    // returns array of {name,phone} after requesting permission
    getContacts:function(){
      var C=P('Contacts');
      if(!(C && C.getContacts)) return Promise.reject(new Error('إضافة جهات الاتصال غير مثبتة'));
      var fetch=function(){
        return C.getContacts({projection:{name:true, phones:true}}).then(function(res){
          var list=(res&&res.contacts)||[];
          return list.map(function(c){
            var nm=c.name?(c.name.display||[c.name.given,c.name.middle,c.name.family].filter(Boolean).join(' ')):'';
            var ph=(c.phones&&c.phones.length)?(c.phones[0].number||''):'';
            return {name:(nm||'').trim(), phone:(ph||'').trim()};
          }).filter(function(x){return x.name||x.phone;}).sort(function(a,b){return (a.name||'').localeCompare(b.name||'','ar');});
        });
      };
      if(C.requestPermissions){
        return C.requestPermissions().then(function(st){
          var g=st&&st.contacts;
          if(g && g!=='granted' && g!=='limited' && g!=='prompt') throw new Error('لم يُسمح بالوصول لجهات الاتصال');
          return fetch();
        });
      }
      return fetch();
    },
    // returns {name, phone} or null
    pickContact:function(){
      var C=P('Contacts');
      if(C && C.pickContact){
        return C.pickContact({projection:{name:true, phones:true}}).then(function(res){
          var c=res && res.contact ? res.contact : res;
          if(!c) return null;
          var name = c.name ? (c.name.display || [c.name.given,c.name.family].filter(Boolean).join(' ')) : '';
          var phone = (c.phones && c.phones.length) ? c.phones[0].number : '';
          return {name:(name||'').trim(), phone:(phone||'').trim()};
        }).catch(function(e){ console.error(e); throw e; });
      }
      // web Contact Picker API
      if(typeof navigator!=='undefined' && navigator.contacts && navigator.contacts.select){
        return navigator.contacts.select(['name','tel'],{multiple:false}).then(function(arr){
          if(!arr || !arr.length) return null;
          var c=arr[0];
          return {name:(c.name&&c.name[0])||'', phone:(c.tel&&c.tel[0])||''};
        });
      }
      return Promise.reject(new Error('contacts-unsupported'));
    }
  };
})(App);
