// Light / dark / system theme switch. Runs first so the page never flashes the wrong theme.
(function(){
  // theme: "system" follows the device; "light"/"dark" pin it. Remembered in this browser only.
  var KEY="ksu-planner-theme",root=document.documentElement;
  function apply(v){if(v==="light"||v==="dark")root.setAttribute("data-theme",v);else root.removeAttribute("data-theme");
    document.querySelectorAll("[data-theme-pick]").forEach(function(b){b.setAttribute("aria-checked",String(b.getAttribute("data-theme-pick")===(v||"system")))})}
  var saved=null;try{saved=localStorage.getItem(KEY)}catch(e){}
  if(saved&&saved!=="system")apply(saved);
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-theme-pick]");if(!b)return;var v=b.getAttribute("data-theme-pick");apply(v);try{localStorage.setItem(KEY,v)}catch(e){}});
  document.addEventListener("keydown",function(e){var b=e.target.closest&&e.target.closest("[data-theme-pick]");if(!b||(e.key!=="ArrowRight"&&e.key!=="ArrowLeft"))return;var all=[].slice.call(document.querySelectorAll("[data-theme-pick]")),i=all.indexOf(b),n=all[(i+(e.key==="ArrowRight"?1:all.length-1))%all.length];n.focus();n.click()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){apply(saved||"system")});else apply(saved||"system");
})();
