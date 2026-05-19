var St=Object.defineProperty;var Ct=Object.getOwnPropertyDescriptor;var g=(i,e,t,r)=>{for(var s=r>1?void 0:r?Ct(e,t):e,o=i.length-1,n;o>=0;o--)(n=i[o])&&(s=(r?n(e,t,s):n(s))||s);return r&&s&&St(e,t,s),s};var q=globalThis,z=q.ShadowRoot&&(q.ShadyCSS===void 0||q.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Y=Symbol(),at=new WeakMap,T=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==Y)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(z&&e===void 0){let r=t!==void 0&&t.length===1;r&&(e=at.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&at.set(t,e))}return e}toString(){return this.cssText}},lt=i=>new T(typeof i=="string"?i:i+"",void 0,Y),F=(i,...e)=>{let t=i.length===1?i[0]:e.reduce((r,s,o)=>r+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+i[o+1],i[0]);return new T(t,i,Y)},ct=(i,e)=>{if(z)i.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let r=document.createElement("style"),s=q.litNonce;s!==void 0&&r.setAttribute("nonce",s),r.textContent=t.cssText,i.appendChild(r)}},Z=z?i=>i:i=>i instanceof CSSStyleSheet?(e=>{let t="";for(let r of e.cssRules)t+=r.cssText;return lt(t)})(i):i;var{is:Mt,defineProperty:Tt,getOwnPropertyDescriptor:Rt,getOwnPropertyNames:Pt,getOwnPropertySymbols:Ht,getPrototypeOf:Ot}=Object,I=globalThis,ht=I.trustedTypes,Nt=ht?ht.emptyScript:"",Ut=I.reactiveElementPolyfillSupport,R=(i,e)=>i,P={toAttribute(i,e){switch(e){case Boolean:i=i?Nt:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,e){let t=i;switch(e){case Boolean:t=i!==null;break;case Number:t=i===null?null:Number(i);break;case Object:case Array:try{t=JSON.parse(i)}catch{t=null}}return t}},W=(i,e)=>!Mt(i,e),dt={attribute:!0,type:String,converter:P,reflect:!1,useDefault:!1,hasChanged:W};Symbol.metadata??=Symbol("metadata"),I.litPropertyMetadata??=new WeakMap;var b=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=dt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let r=Symbol(),s=this.getPropertyDescriptor(e,r,t);s!==void 0&&Tt(this.prototype,e,s)}}static getPropertyDescriptor(e,t,r){let{get:s,set:o}=Rt(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:s,set(n){let a=s?.call(this);o?.call(this,n),this.requestUpdate(e,a,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??dt}static _$Ei(){if(this.hasOwnProperty(R("elementProperties")))return;let e=Ot(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(R("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(R("properties"))){let t=this.properties,r=[...Pt(t),...Ht(t)];for(let s of r)this.createProperty(s,t[s])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[r,s]of t)this.elementProperties.set(r,s)}this._$Eh=new Map;for(let[t,r]of this.elementProperties){let s=this._$Eu(t,r);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let r=new Set(e.flat(1/0).reverse());for(let s of r)t.unshift(Z(s))}else e!==void 0&&t.push(Z(e));return t}static _$Eu(e,t){let r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ct(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){let r=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,r);if(s!==void 0&&r.reflect===!0){let o=(r.converter?.toAttribute!==void 0?r.converter:P).toAttribute(t,r.type);this._$Em=e,o==null?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(e,t){let r=this.constructor,s=r._$Eh.get(e);if(s!==void 0&&this._$Em!==s){let o=r.getPropertyOptions(s),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:P;this._$Em=s;let a=n.fromAttribute(t,o.type);this[s]=a??this._$Ej?.get(s)??a,this._$Em=null}}requestUpdate(e,t,r,s=!1,o){if(e!==void 0){let n=this.constructor;if(s===!1&&(o=this[e]),r??=n.getPropertyOptions(e),!((r.hasChanged??W)(o,t)||r.useDefault&&r.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:s,wrapped:o},n){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),o!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),s===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[s,o]of this._$Ep)this[s]=o;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[s,o]of r){let{wrapped:n}=o,a=this[s];n!==!0||this._$AL.has(s)||a===void 0||this.C(s,void 0,o,a)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};b.elementStyles=[],b.shadowRootOptions={mode:"open"},b[R("elementProperties")]=new Map,b[R("finalized")]=new Map,Ut?.({ReactiveElement:b}),(I.reactiveElementVersions??=[]).push("2.1.2");var st=globalThis,pt=i=>i,B=st.trustedTypes,ut=B?B.createPolicy("lit-html",{createHTML:i=>i}):void 0,yt="$lit$",_=`lit$${Math.random().toFixed(9).slice(2)}$`,$t="?"+_,Lt=`<${$t}>`,E=document,O=()=>E.createComment(""),N=i=>i===null||typeof i!="object"&&typeof i!="function",it=Array.isArray,Dt=i=>it(i)||typeof i?.[Symbol.iterator]=="function",G=`[ 	
\f\r]`,H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,gt=/-->/g,mt=/>/g,w=RegExp(`>|${G}(?:([^\\s"'>=/]+)(${G}*=${G}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ft=/'/g,vt=/"/g,xt=/^(?:script|style|textarea|title)$/i,ot=i=>(e,...t)=>({_$litType$:i,strings:e,values:t}),c=ot(1),Zt=ot(2),Gt=ot(3),A=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),bt=new WeakMap,k=E.createTreeWalker(E,129);function _t(i,e){if(!it(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return ut!==void 0?ut.createHTML(e):e}var jt=(i,e)=>{let t=i.length-1,r=[],s,o=e===2?"<svg>":e===3?"<math>":"",n=H;for(let a=0;a<t;a++){let l=i[a],h,u,d=-1,v=0;for(;v<l.length&&(n.lastIndex=v,u=n.exec(l),u!==null);)v=n.lastIndex,n===H?u[1]==="!--"?n=gt:u[1]!==void 0?n=mt:u[2]!==void 0?(xt.test(u[2])&&(s=RegExp("</"+u[2],"g")),n=w):u[3]!==void 0&&(n=w):n===w?u[0]===">"?(n=s??H,d=-1):u[1]===void 0?d=-2:(d=n.lastIndex-u[2].length,h=u[1],n=u[3]===void 0?w:u[3]==='"'?vt:ft):n===vt||n===ft?n=w:n===gt||n===mt?n=H:(n=w,s=void 0);let x=n===w&&i[a+1].startsWith("/>")?" ":"";o+=n===H?l+Lt:d>=0?(r.push(h),l.slice(0,d)+yt+l.slice(d)+_+x):l+_+(d===-2?a:x)}return[_t(i,o+(i[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]},U=class i{constructor({strings:e,_$litType$:t},r){let s;this.parts=[];let o=0,n=0,a=e.length-1,l=this.parts,[h,u]=jt(e,t);if(this.el=i.createElement(h,r),k.currentNode=this.el.content,t===2||t===3){let d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(s=k.nextNode())!==null&&l.length<a;){if(s.nodeType===1){if(s.hasAttributes())for(let d of s.getAttributeNames())if(d.endsWith(yt)){let v=u[n++],x=s.getAttribute(d).split(_),j=/([.?@])?(.*)/.exec(v);l.push({type:1,index:o,name:j[2],strings:x,ctor:j[1]==="."?X:j[1]==="?"?tt:j[1]==="@"?et:M}),s.removeAttribute(d)}else d.startsWith(_)&&(l.push({type:6,index:o}),s.removeAttribute(d));if(xt.test(s.tagName)){let d=s.textContent.split(_),v=d.length-1;if(v>0){s.textContent=B?B.emptyScript:"";for(let x=0;x<v;x++)s.append(d[x],O()),k.nextNode(),l.push({type:2,index:++o});s.append(d[v],O())}}}else if(s.nodeType===8)if(s.data===$t)l.push({type:2,index:o});else{let d=-1;for(;(d=s.data.indexOf(_,d+1))!==-1;)l.push({type:7,index:o}),d+=_.length-1}o++}}static createElement(e,t){let r=E.createElement("template");return r.innerHTML=e,r}};function C(i,e,t=i,r){if(e===A)return e;let s=r!==void 0?t._$Co?.[r]:t._$Cl,o=N(e)?void 0:e._$litDirective$;return s?.constructor!==o&&(s?._$AO?.(!1),o===void 0?s=void 0:(s=new o(i),s._$AT(i,t,r)),r!==void 0?(t._$Co??=[])[r]=s:t._$Cl=s),s!==void 0&&(e=C(i,s._$AS(i,e.values),s,r)),e}var Q=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:r}=this._$AD,s=(e?.creationScope??E).importNode(t,!0);k.currentNode=s;let o=k.nextNode(),n=0,a=0,l=r[0];for(;l!==void 0;){if(n===l.index){let h;l.type===2?h=new L(o,o.nextSibling,this,e):l.type===1?h=new l.ctor(o,l.name,l.strings,this,e):l.type===6&&(h=new rt(o,this,e)),this._$AV.push(h),l=r[++a]}n!==l?.index&&(o=k.nextNode(),n++)}return k.currentNode=E,s}p(e){let t=0;for(let r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}},L=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,s){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=C(this,e,t),N(e)?e===p||e==null||e===""?(this._$AH!==p&&this._$AR(),this._$AH=p):e!==this._$AH&&e!==A&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Dt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==p&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(E.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:r}=e,s=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=U.createElement(_t(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===s)this._$AH.p(t);else{let o=new Q(s,this),n=o.u(this.options);o.p(t),this.T(n),this._$AH=o}}_$AC(e){let t=bt.get(e.strings);return t===void 0&&bt.set(e.strings,t=new U(e)),t}k(e){it(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,r,s=0;for(let o of e)s===t.length?t.push(r=new i(this.O(O()),this.O(O()),this,this.options)):r=t[s],r._$AI(o),s++;s<t.length&&(this._$AR(r&&r._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let r=pt(e).nextSibling;pt(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},M=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,s,o){this.type=1,this._$AH=p,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=o,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=p}_$AI(e,t=this,r,s){let o=this.strings,n=!1;if(o===void 0)e=C(this,e,t,0),n=!N(e)||e!==this._$AH&&e!==A,n&&(this._$AH=e);else{let a=e,l,h;for(e=o[0],l=0;l<o.length-1;l++)h=C(this,a[r+l],t,l),h===A&&(h=this._$AH[l]),n||=!N(h)||h!==this._$AH[l],h===p?e=p:e!==p&&(e+=(h??"")+o[l+1]),this._$AH[l]=h}n&&!s&&this.j(e)}j(e){e===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},X=class extends M{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===p?void 0:e}},tt=class extends M{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==p)}},et=class extends M{constructor(e,t,r,s,o){super(e,t,r,s,o),this.type=5}_$AI(e,t=this){if((e=C(this,e,t,0)??p)===A)return;let r=this._$AH,s=e===p&&r!==p||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,o=e!==p&&(r===p||s);s&&this.element.removeEventListener(this.name,this,r),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},rt=class{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){C(this,e)}};var qt=st.litHtmlPolyfillSupport;qt?.(U,L),(st.litHtmlVersions??=[]).push("3.3.3");var wt=(i,e,t)=>{let r=t?.renderBefore??e,s=r._$litPart$;if(s===void 0){let o=t?.renderBefore??null;r._$litPart$=s=new L(e.insertBefore(O(),o),o,void 0,t??{})}return s._$AI(i),s};var nt=globalThis,f=class extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=wt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};f._$litElement$=!0,f.finalized=!0,nt.litElementHydrateSupport?.({LitElement:f});var zt=nt.litElementPolyfillSupport;zt?.({LitElement:f});(nt.litElementVersions??=[]).push("4.2.2");var V=i=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(i,e)}):customElements.define(i,e)};var Ft={attribute:!0,type:String,converter:P,reflect:!1,hasChanged:W},It=(i=Ft,e,t)=>{let{kind:r,metadata:s}=t,o=globalThis.litPropertyMetadata.get(s);if(o===void 0&&globalThis.litPropertyMetadata.set(s,o=new Map),r==="setter"&&((i=Object.create(i)).wrapped=!0),o.set(t.name,i),r==="accessor"){let{name:n}=t;return{set(a){let l=e.get.call(this);e.set.call(this,a),this.requestUpdate(n,l,i,!0,a)},init(a){return a!==void 0&&this.C(n,void 0,i,a),a}}}if(r==="setter"){let{name:n}=t;return function(a){let l=this[n];e.call(this,a),this.requestUpdate(n,l,i,!0,a)}}throw Error("Unsupported decorator location: "+r)};function y(i){return(e,t)=>typeof t=="object"?It(i,e,t):((r,s,o)=>{let n=s.hasOwnProperty(o);return s.constructor.createProperty(o,r),n?Object.getOwnPropertyDescriptor(s,o):void 0})(i,e,t)}function S(i){return y({...i,state:!0,attribute:!1})}var kt="smart_icons.rules_cache.v1",J=class{constructor(){this.rules=new Map;this.listeners=new Set;this.unsubscribe=null}hydrateFromCache(){try{let e=localStorage.getItem(kt);if(!e)return 0;let r=JSON.parse(e)?.rules;return!Array.isArray(r)||r.length===0?0:(this.rules=new Map(r.map(s=>[s.id,s])),this.emit(),r.length)}catch{return 0}}async connect(e){let t=await e.sendMessagePromise({type:"smart_icons/list"});this.rules=new Map(t.rules.map(r=>[r.id,r])),this.writeCache(),this.emit(),this.unsubscribe=await e.subscribeMessage(r=>this.handleEvent(r),{type:"smart_icons/subscribe"})}async disconnect(){this.unsubscribe&&(await this.unsubscribe(),this.unsubscribe=null),this.rules.clear(),this.listeners.clear()}all(){return[...this.rules.values()]}byTarget(e){let t=[];for(let r of this.rules.values())r.target===e&&t.push(r);return t}sources(){let e=new Set;for(let t of this.rules.values())t.enabled&&e.add(t.source);return e}subscribe(e){return this.listeners.add(e),e(this.all()),()=>this.listeners.delete(e)}handleEvent(e){e.type==="removed"?this.rules.delete(e.id):this.rules.set(e.id,e.rule),this.writeCache(),this.emit()}writeCache(){try{localStorage.setItem(kt,JSON.stringify({rules:this.all()}))}catch{}}emit(){let e=this.all();for(let t of this.listeners)t(e)}};var Et=F`
  :host {
    display: block;
    padding: 24px 16px;
    max-width: 1200px;
    margin: 0 auto;
    box-sizing: border-box;
    color: var(--primary-text-color, #212121);
  }
  ha-card {
    padding: 16px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 1.4em;
    margin: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    vertical-align: middle;
  }
  th {
    font-weight: 500;
    color: var(--secondary-text-color, #727272);
  }
  td.actions {
    text-align: right;
    white-space: nowrap;
  }
  .empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--secondary-text-color, #727272);
  }
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85em;
    background: var(--divider-color, #e0e0e0);
    color: var(--primary-text-color, #212121);
  }
  button.btn-text,
  button.btn-primary {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    text-transform: uppercase;
    font-size: 0.9em;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  button.btn-text:hover,
  button.btn-primary:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  button.btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }
  button.btn-primary:hover {
    background: var(--primary-color, #03a9f4);
    filter: brightness(1.1);
  }
`,At=F`
  :host {
    display: block;
    min-width: 520px;
    color: var(--primary-text-color, #212121);
  }
  .dialog-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin: 0 0 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .enabled-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95em;
    color: var(--primary-text-color, #212121);
  }
  .group {
    margin: 0 0 20px;
  }
  .group-title {
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--secondary-text-color, #727272);
    margin: 0 0 10px;
    font-weight: 500;
  }
  .field {
    display: block;
    margin-bottom: 12px;
  }
  .field .label {
    display: block;
    font-size: 0.85em;
    color: var(--secondary-text-color, #727272);
    margin-bottom: 4px;
  }
  .hint {
    display: block;
    font-size: 0.8em;
    color: var(--secondary-text-color, #727272);
    margin-top: 4px;
  }
  .hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.95em;
  }
  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 8px 10px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    color: var(--primary-text-color, #212121);
    font: inherit;
    box-sizing: border-box;
  }
  input[type='text']:focus,
  input[type='number']:focus,
  select:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }
  /* HA's selector + icon picker both want full-width and a sensible
     min-width:0 so they don't blow out flex parents. ha-selector is
     used for entity fields (HA's options-flow dispatcher); ha-icon-picker
     for icons. Both require a .label to render their floating-label
     layout correctly. */
  ha-icon-picker,
  ha-selector {
    display: block;
    width: 100%;
    min-width: 0;
  }
  /* Fallback icon input (when ha-icon-picker isn't available). */
  .icon-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .icon-input .icon-preview {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    color: var(--primary-text-color, #212121);
  }
  .icon-input .icon-preview.placeholder {
    display: inline-block;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
  }
  .icon-input input {
    flex: 1;
    min-width: 0;
  }
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(80px, 1fr) minmax(160px, 2fr) minmax(140px, 2fr) auto;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  /* For thresholds rows: comparator + value + color + icon + remove = 5 cols */
  .row:has(select:not(.legacy)) {
    grid-template-columns:
      80px
      minmax(80px, 1fr)
      minmax(160px, 2fr)
      minmax(140px, 2fr)
      auto;
  }
  .swatch-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .swatch-input input[type='color'] {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    background: none;
  }
  .swatch-input input[type='text'] {
    flex: 1;
    min-width: 0;
  }
  fieldset {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    padding: 12px;
    margin: 0 0 16px;
  }
  legend {
    padding: 0 6px;
    font-size: 0.85em;
    color: var(--secondary-text-color, #727272);
  }
  legend code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .add-button {
    margin-top: 8px;
  }
  button.btn-text,
  button.btn-primary {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    text-transform: uppercase;
    font-size: 0.9em;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  button.btn-text:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  button.btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }
  button.btn-primary:hover {
    filter: brightness(1.1);
  }
  button.btn-icon {
    background: none;
    border: none;
    color: var(--secondary-text-color, #727272);
    cursor: pointer;
    font-size: 1.4em;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 4px;
  }
  button.btn-icon:hover {
    color: var(--error-color, #db4437);
    background: var(--secondary-background-color, #f5f5f5);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  .error {
    color: var(--error-color, #db4437);
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--error-color, #db4437);
    background-color: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    border-radius: 4px;
  }
`;var Wt=0;function D(){return Wt++}var $=class extends f{constructor(){super(...arguments);this.errorMessage="";this.working=this.blankState();this.addThreshold=()=>{this.working={...this.working,thresholds:[...this.working.thresholds,{lt:0,color:"",icon:"",_key:D()}]}};this.addMapping=()=>{this.working={...this.working,mapping:[...this.working.mapping,{key:"",color:"",icon:"",_key:D()}]}};this.save=()=>{let t=this.serialize();this.dispatchEvent(new CustomEvent("save",{detail:t,bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback();for(let t of["ha-icon-picker","ha-selector"])customElements.get(t)||customElements.whenDefined(t).then(()=>this.requestUpdate()).catch(()=>{})}willUpdate(t){t.has("rule")&&(this.working=this.rule?this.hydrate(this.rule):this.blankState())}renderIconField(t,r){return customElements.get("ha-icon-picker")&&this.hass?c`
        <ha-icon-picker
          .hass=${this.hass}
          .value=${t}
          .label=${"Icon"}
          @value-changed=${s=>r(s.detail?.value??"")}
        ></ha-icon-picker>
      `:c`
      <div class="icon-input">
        ${t?c`<ha-icon class="icon-preview" .icon=${t}></ha-icon>`:c`<span class="icon-preview placeholder" aria-hidden="true"></span>`}
        <input
          type="text"
          placeholder="mdi:icon"
          .value=${t}
          @input=${s=>r(s.target.value)}
        />
      </div>
    `}get entityIds(){return this.hass?Object.keys(this.hass.states).sort():[]}renderEntityField(t,r,s,o,n=!1){return customElements.get("ha-selector")&&this.hass?c`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{entity:{}}}
            .value=${s}
            .label=${t}
            @value-changed=${a=>o(a.detail?.value??"")}
          ></ha-selector>
        </div>
      `:c`
      <label class="field">
        <span class="label">${t}</span>
        <input
          type="text"
          list="smart-icons-entities"
          ?required=${n}
          placeholder=${r}
          .value=${s}
          @input=${a=>o(a.target.value)}
        />
      </label>
    `}render(){return c`
      <datalist id="smart-icons-entities">
        ${this.entityIds.map(t=>c`<option value=${t}></option>`)}
      </datalist>
      <datalist id="smart-icons-source-attributes">
        ${this.sourceAttributes.map(t=>c`<option value=${t}></option>`)}
      </datalist>

      <header class="dialog-header">
        <label class="enabled-toggle">
          <ha-switch
            .checked=${this.working.enabled}
            @change=${t=>this.patch({enabled:t.target.checked})}
          ></ha-switch>
          <span>${this.working.enabled?"Enabled":"Disabled"}</span>
        </label>
      </header>

      <section class="group">
        <h3 class="group-title">Apply to</h3>
        ${this.renderEntityField("Target entity","e.g. light.kitchen",this.working.target,t=>this.patch({target:t}),!0)}
      </section>

      <section class="group">
        <h3 class="group-title">React to</h3>
        ${this.renderEntityField("Source entity","defaults to target",this.working.source,t=>this.patch({source:t}))}
        <label class="field">
          <span class="label">Source attribute</span>
          <input
            type="text"
            list="smart-icons-source-attributes"
            placeholder="leave blank to use the entity's state"
            .value=${this.working.source_attribute}
            @input=${t=>this.patch({source_attribute:t.target.value})}
          />
          <span class="hint">
            ${this.working.source_attribute?c`Watching <code>${this.sourceEntityForDisplay}.${this.working.source_attribute}</code>`:c`Watching the state of <code>${this.sourceEntityForDisplay}</code>. Pick a state attribute
                (e.g. <code>azimuth</code>) for numeric-attribute rules.`}
          </span>
        </label>
      </section>

      <section class="group">
        <h3 class="group-title">Decoration</h3>
        <label class="field">
          <span class="label">Mode</span>
          <select
            .value=${this.working.mode}
            @change=${t=>this.patch({mode:t.target.value})}
          >
            <option
              value="mapping"
              ?selected=${this.working.mode==="mapping"}
            >
              Mapping (exact state → decoration)
            </option>
            <option
              value="thresholds"
              ?selected=${this.working.mode==="thresholds"}
            >
              Thresholds (numeric ranges)
            </option>
            <option
              value="template"
              ?selected=${this.working.mode==="template"}
            >
              Template (v0.2)
            </option>
          </select>
        </label>
        ${this.working.mode==="thresholds"?this.renderThresholds():this.working.mode==="mapping"?this.renderMapping():this.renderTemplate()}
      </section>

      <section class="group">
        <h3 class="group-title">Options</h3>
        <label class="field">
          <span class="label">Priority</span>
          <input
            type="number"
            .value=${String(this.working.priority)}
            @input=${t=>this.patch({priority:Number(t.target.value)||0})}
          />
          <span class="hint">
            When several rules target the same entity, the highest-priority
            enabled rule with a matching state wins.
          </span>
        </label>
      </section>

      ${this.errorMessage?c`<div class="error">${this.errorMessage}</div>`:null}

      <div class="actions">
        <button
          class="btn-text"
          @click=${()=>this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}
        >
          Cancel
        </button>
        <button class="btn-primary" @click=${this.save}>Save</button>
      </div>
    `}get sourceEntityForDisplay(){return this.working.source.trim()||this.working.target.trim()||"(entity)"}get sourceAttributes(){let t=this.sourceEntityForDisplay,r=this.hass?.states?.[t]?.attributes;return r?Object.keys(r).sort():[]}renderThresholds(){return c`
      <fieldset>
        <legend>
          Threshold entries — first matching wins; the entry with no
          comparator is the "else" branch.
        </legend>
        ${this.working.thresholds.map((t,r)=>c`
            <div class="row">
              <select
                .value=${this.thresholdComparator(t)}
                @change=${s=>this.setThresholdComparator(r,s.target.value)}
                title="Comparator"
              >
                <option value="">(else)</option>
                <option value="lt">&lt;</option>
                <option value="lte">≤</option>
                <option value="gt">&gt;</option>
                <option value="gte">≥</option>
                <option value="eq">=</option>
              </select>
              <input
                type="text"
                placeholder="value"
                .value=${this.thresholdValue(t)}
                ?disabled=${this.thresholdComparator(t)===""}
                @input=${s=>this.setThresholdValue(r,s.target.value)}
              />
              ${this.renderColorInput(t.color??"",s=>this.updateThreshold(r,{color:s}))}
              ${this.renderIconField(t.icon??"",s=>this.updateThreshold(r,{icon:s}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeThreshold(r)}
                title="Remove"
              >×</button>
            </div>
          `)}
        <button class="btn-text add-button" @click=${this.addThreshold}>
          + Add entry
        </button>
      </fieldset>
    `}renderMapping(){return c`
      <fieldset>
        <legend>
          State → decoration. <code>_else</code> is the fallback bucket.
        </legend>
        ${this.working.mapping.map((t,r)=>c`
            <div class="row">
              <input
                type="text"
                placeholder="state"
                .value=${t.key}
                @input=${s=>this.updateMapping(r,{key:s.target.value})}
              />
              ${this.renderColorInput(t.color,s=>this.updateMapping(r,{color:s}))}
              ${this.renderIconField(t.icon,s=>this.updateMapping(r,{icon:s}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeMapping(r)}
                title="Remove"
              >×</button>
            </div>
          `)}
        <button class="btn-text add-button" @click=${this.addMapping}>
          + Add state
        </button>
      </fieldset>
    `}renderTemplate(){return c`
      <fieldset>
        <legend>
          Template mode (storage only in v0.1; runtime evaluation lands in v0.2).
        </legend>
        <input
          type="text"
          placeholder='{{ "#ff0000" if is_state(...) else "inherit" }}'
          .value=${this.working.template}
          @input=${t=>this.patch({template:t.target.value})}
        />
      </fieldset>
    `}renderColorInput(t,r){return c`
      <div class="swatch-input">
        <input
          type="color"
          .value=${this.colorAsHex(t)}
          @input=${s=>r(s.target.value)}
          title="Pick a color"
        />
        <input
          type="text"
          placeholder="#hex, name, or var(--…)"
          .value=${t}
          @input=${s=>r(s.target.value)}
        />
      </div>
    `}colorAsHex(t){if(!t)return"#888888";if(/^#[0-9a-fA-F]{6}$/.test(t))return t;if(/^#[0-9a-fA-F]{3}$/.test(t))return"#"+t.slice(1).split("").map(r=>r+r).join("");try{let r=document.createElement("canvas").getContext("2d");if(!r)return"#888888";r.fillStyle=t;let s=r.fillStyle;return/^#[0-9a-fA-F]{6}$/.test(s)?s:"#888888"}catch{return"#888888"}}patch(t){this.working={...this.working,...t}}hydrate(t){return{id:t.id,target:t.target,source:t.source===t.target?"":t.source,source_attribute:t.source_attribute??"",mode:t.mode,thresholds:(t.thresholds??[]).map(r=>({...r,_key:D()})),mapping:t.mapping?Object.entries(t.mapping).map(([r,s])=>({key:r,color:s.color??"",icon:s.icon??"",_key:D()})):[],template:t.template??"",enabled:t.enabled,priority:t.priority}}blankState(){return{target:"",source:"",source_attribute:"",mode:"mapping",thresholds:[],mapping:[{key:"",color:"",icon:"",_key:D()}],template:"",enabled:!0,priority:10}}thresholdComparator(t){for(let r of["lt","lte","gt","gte","eq"])if(t[r]!==void 0)return r;return""}thresholdValue(t){for(let r of["lt","lte","gt","gte","eq"])if(t[r]!==void 0)return String(t[r]);return""}setThresholdComparator(t,r){let s=this.working.thresholds[t],o={...s};for(let n of["lt","lte","gt","gte","eq"])delete o[n];if(r){let n=this.thresholdValue(s),a=Number(n),l=r==="eq"&&Number.isNaN(a)?n:Number.isNaN(a)?0:a;o[r]=l}this.working={...this.working,thresholds:this.working.thresholds.map((n,a)=>a===t?o:n)}}setThresholdValue(t,r){let s=this.working.thresholds[t],o=this.thresholdComparator(s);if(!o)return;let n=Number(r),a=o==="eq"&&Number.isNaN(n)?r:n;this.working={...this.working,thresholds:this.working.thresholds.map((l,h)=>h===t?{...l,[o]:a}:l)}}updateThreshold(t,r){this.working={...this.working,thresholds:this.working.thresholds.map((s,o)=>o===t?{...s,...r}:s)}}removeThreshold(t){this.working={...this.working,thresholds:this.working.thresholds.filter((r,s)=>s!==t)}}updateMapping(t,r){this.working={...this.working,mapping:this.working.mapping.map((s,o)=>o===t?{...s,...r}:s)}}removeMapping(t){this.working={...this.working,mapping:this.working.mapping.filter((r,s)=>s!==t)}}serialize(){let t=this.working.target.trim(),r=this.working.source.trim()||t,s=this.working.source_attribute.trim(),o={target:t,source:r,mode:this.working.mode,enabled:this.working.enabled,priority:this.working.priority};if(s&&(o.source_attribute=s),this.working.id&&(o.id=this.working.id),this.working.mode==="thresholds")o.thresholds=this.working.thresholds.map(({_key:n,...a})=>{let l={};for(let h of["lt","lte","gt","gte","eq"])a[h]!==void 0&&(l[h]=a[h]);return a.color&&(l.color=a.color),a.icon&&(l.icon=a.icon),l});else if(this.working.mode==="mapping"){let n={};for(let a of this.working.mapping){if(!a.key)continue;let l={};a.color&&(l.color=a.color),a.icon&&(l.icon=a.icon),n[a.key]=l}o.mapping=n}else this.working.mode==="template"&&(o.template=this.working.template);return o}};$.styles=At,g([y({attribute:!1})],$.prototype,"rule",2),g([y({attribute:!1})],$.prototype,"hass",2),g([y({type:String})],$.prototype,"errorMessage",2),g([S()],$.prototype,"working",2),$=g([V("smart-icons-rule-editor")],$);var m=class extends f{constructor(){super(...arguments);this.narrow=!1;this.rules=[];this.editing=null;this.dialogOpen=!1;this.editorError="";this.addRule=()=>{this.editing=null,this.editorError="",this.dialogOpen=!0};this.cancelEdit=()=>{this.dialogOpen=!1,this.editing=null,this.editorError=""};this.onEditorSave=async t=>{let r=t.detail;this.editorError="";try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:r}),this.dialogOpen=!1,this.editing=null}catch(s){this.editorError=this.errorMessage(s)}}}connectedCallback(){super.connectedCallback(),this.initStore()}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.(),this.store?.disconnect()}render(){return c`
      <ha-card>
        <header>
          <h1>Smart Icons</h1>
          <mwc-button raised @click=${this.addRule}>+ Add rule</mwc-button>
        </header>
        ${this.rules.length===0?this.renderEmpty():this.renderTable()}
      </ha-card>
      ${this.dialogOpen?this.renderDialog():p}
    `}renderEmpty(){return c`
      <div class="empty">
        <p>No rules yet.</p>
        <p>
          Click <strong>+ Add rule</strong> to drive any entity's icon color
          or glyph from another entity's state.
        </p>
      </div>
    `}renderTable(){let t=[...this.rules].sort((r,s)=>r.target===s.target?s.priority-r.priority:r.target.localeCompare(s.target));return c`
      <table>
        <thead>
          <tr>
            <th>Target</th>
            <th>Source</th>
            <th>Mode</th>
            <th>Enabled</th>
            <th>Priority</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${t.map(r=>this.renderRow(r))}
        </tbody>
      </table>
    `}renderRow(t){let r=(()=>{let s=t.source===t.target?"\u2014":t.source;return t.source_attribute?s==="\u2014"?`(target).${t.source_attribute}`:`${s}.${t.source_attribute}`:s})();return c`
      <tr>
        <td>${t.target}</td>
        <td>${r}</td>
        <td><span class="pill">${t.mode}</span></td>
        <td>
          <ha-switch
            .checked=${t.enabled}
            @change=${s=>this.toggleRule(t,s.target.checked)}
          ></ha-switch>
        </td>
        <td>${t.priority}</td>
        <td class="actions">
          <mwc-button @click=${()=>this.editRule(t)}>Edit</mwc-button>
          <mwc-button @click=${()=>this.deleteRule(t)}>Delete</mwc-button>
        </td>
      </tr>
    `}renderDialog(){return c`
      <ha-dialog
        open
        heading=${this.editing?"Edit rule":"Add rule"}
        @closed=${this.cancelEdit}
      >
        <smart-icons-rule-editor
          .hass=${this.hass}
          .rule=${this.editing??void 0}
          .errorMessage=${this.editorError}
          @save=${this.onEditorSave}
          @cancel=${this.cancelEdit}
        ></smart-icons-rule-editor>
      </ha-dialog>
    `}async initStore(){this.store=new J,this.store.hydrateFromCache(),this.unsubscribe=this.store.subscribe(t=>{this.rules=t});try{await this.store.connect(this.hass.connection)}catch(t){console.error("[smart-icons-panel] failed to connect WS",t)}}editRule(t){this.editing=t,this.editorError="",this.dialogOpen=!0}async toggleRule(t,r){try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:{...t,enabled:r}})}catch(s){console.error("[smart-icons-panel] toggle failed",s)}}async deleteRule(t){if(confirm(`Delete rule for ${t.target}?`))try{await this.hass.connection.sendMessagePromise({type:"smart_icons/delete",rule_id:t.id})}catch(r){console.error("[smart-icons-panel] delete failed",r)}}errorMessage(t){if(t&&typeof t=="object"&&"message"in t){let r=t.message;if(typeof r=="string")return r}return String(t)}};m.styles=Et,g([y({attribute:!1})],m.prototype,"hass",2),g([y({type:Boolean,reflect:!0})],m.prototype,"narrow",2),g([S()],m.prototype,"rules",2),g([S()],m.prototype,"editing",2),g([S()],m.prototype,"dialogOpen",2),g([S()],m.prototype,"editorError",2),m=g([V("smart-icons-panel")],m);
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
