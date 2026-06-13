(function(global){
  const registry=new Map();
  function normalize(name,from){
    if(!name.startsWith('.'))return name.replace(/\.js$/,'');
    const base=from.split('/');base.pop();
    for(const part of name.replace(/\.js$/,'').split('/')){
      if(part==='.'||part==='')continue;
      if(part==='..')base.pop();else base.push(part);
    }
    return base.join('/');
  }
  function define(name,deps,factory){registry.set(name.replace(/\.js$/,''),{name:name.replace(/\.js$/,''),deps,factory,exports:{},ready:false,loading:false});}
  define.amd={};
  function load(name,from=''){
    const key=normalize(name,from),mod=registry.get(key);
    if(!mod)throw new Error('Brak modułu AMD: '+key+' (z '+from+')');
    if(mod.ready)return mod.exports;
    if(mod.loading)throw new Error('Cykliczna zależność AMD: '+key);
    mod.loading=true;
    const localRequire=(deps,callback)=>{const values=deps.map(dep=>load(dep,key));if(callback)callback(...values);};
    const args=mod.deps.map(dep=>dep==='require'?localRequire:dep==='exports'?mod.exports:dep==='module'?{exports:mod.exports}:load(dep,key));
    const result=mod.factory(...args);
    if(result!==undefined)mod.exports=result;
    mod.ready=true;mod.loading=false;return mod.exports;
  }
  function require(deps,callback){const values=deps.map(dep=>load(dep));if(callback)callback(...values);return values;}
  global.define=define;global.require=require;
})(window);
