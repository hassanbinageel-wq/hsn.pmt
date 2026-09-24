/* تخزين محلي عبر IndexedDB — يحفظ: sec (مادة الأمان)، vault (البيانات المشفّرة)، meta (بيانات غير سرية) */
window.App = window.App || {};
(function(A){
  var DB_NAME='hsnpmt_db', STORE='kv', _db=null;
  function open(){
    return new Promise(function(res,rej){
      if(_db){res(_db);return;}
      var r=indexedDB.open(DB_NAME,1);
      r.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
      r.onsuccess=function(){_db=r.result;res(_db);};
      r.onerror=function(){rej(r.error);};
    });
  }
  function tx(mode){return open().then(function(db){return db.transaction(STORE,mode).objectStore(STORE);});}

  A.DB={
    get:function(k){return tx('readonly').then(function(s){return new Promise(function(res,rej){var r=s.get(k);r.onsuccess=function(){res(r.result==null?null:r.result);};r.onerror=function(){rej(r.error);};});});},
    set:function(k,v){return tx('readwrite').then(function(s){return new Promise(function(res,rej){var r=s.put(v,k);r.onsuccess=function(){res(true);};r.onerror=function(){rej(r.error);};});});},
    del:function(k){return tx('readwrite').then(function(s){return new Promise(function(res,rej){var r=s.delete(k);r.onsuccess=function(){res(true);};r.onerror=function(){rej(r.error);};});});},
    hasVault:function(){return this.get('vault').then(function(v){return !!v;});}
  };
})(App);
