// Pure controller tests with a small DOM double; no browser or network.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const nodes = new Map();
class Node {
  constructor() {
    this.value = "0"; this.children = []; this.style = {}; this.dataset = {};
    this.classList = {add(){}, remove(){}, toggle(){}, contains(){return false;}};
    this.listeners = {};
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this[name] = value; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  add(option) { this.children.push(option); }
}
const document = {
  getElementById(id) { if (!nodes.has(id)) nodes.set(id,new Node()); return nodes.get(id); },
  createElement() { return new Node(); },
  addEventListener() {},
  querySelectorAll() { return []; }
};
const context = vm.createContext({document, console, assert, URL, Headers, AbortSignal,
  getComputedStyle(){return {getPropertyValue(){return "";}};},
  Option: class { constructor(text,value) { this.text=text; this.value=value; } },
  location:{href:"http://127.0.0.1:8520/",origin:"http://127.0.0.1:8520",hostname:"127.0.0.1"},
  setTimeout(){}, setInterval(){}, clearInterval(){},
  window:{fetch:async()=>{throw new Error("Network must not be called");}},
  localStorage:{getItem(){return null;},setItem(){}}
});
const root = path.resolve(__dirname,"../frontend");
vm.runInContext(fs.readFileSync(path.join(root,"app.js"),"utf8"),context);
vm.runInContext(fs.readFileSync(path.join(root,"desktop_bootstrap.js"),"utf8")
  .replace(/\nmountDesktopControls\(\);/, ""),context);
vm.runInContext(fs.readFileSync(path.join(root,"features.js"),"utf8"),context);
vm.runInContext(`
currentVideoDuration = 120;
timelineStart = 0; timelineEnd = 120;
setStartSeconds(1.2); setEndSeconds(13.8);
assert.equal(getStartSeconds(),1.2);
assert.equal(getEndSeconds(),13.8);
assert.equal(formatTimeString(1.2),"00:01.2");
setEndSeconds(150);
assert.equal(getEndSeconds(),120);
setupSliders();
timelineStart=30; timelineEnd=60;
sliderEnd.value="60"; sliderStart.value="45";
sliderStart.listeners.input();
assert.equal(getStartSeconds(),45);
assert.equal(getEndSeconds(),120, "Zoom must not move the opposite endpoint");
renderChapters([{title:'<img src=x onerror=alert(1)>', start_formatted:'00:01',start_time:1,end_time:4}]);
assert.equal(document.getElementById("chapters-list").children[0].textContent,
  '00:01 - <img src=x onerror=alert(1)>');
assert.equal(document.getElementById("chapters-list").children[0].innerHTML,undefined);
defaultQuality="1080";
populateQuality("clip-quality",[{height:720},{height:240},{height:720}]);
assert.equal(document.getElementById("clip-quality").value,"720");
assert.equal(document.getElementById("clip-quality").children.length,3);
currentVideoUrl="https://youtube.com/watch?v=abcdefghijk";
document.getElementById("clip-format").value="vertical";
document.getElementById("clip-custom-title").value="Teste";
const request = clipRequest();
assert.equal(request.is_vertical,true);
assert.equal(request.start_time,45);
setStartSeconds(120);
assert.throws(()=>clipRequest(),/Escolha/);
`,context);
console.log("OK: decimal precision, zoom endpoints, safe titles, quality options, export options and invalid ranges.");
