var St=Object.defineProperty;var Tt=Object.getOwnPropertyDescriptor;var g=(n,e,t,r)=>{for(var i=r>1?void 0:r?Tt(e,t):e,s=n.length-1,o;s>=0;s--)(o=n[s])&&(i=(r?o(e,t,i):o(i))||i);return r&&i&&St(e,t,i),i};var j=globalThis,q=j.ShadowRoot&&(j.ShadyCSS===void 0||j.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,J=Symbol(),at=new WeakMap,R=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==J)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(q&&e===void 0){let r=t!==void 0&&t.length===1;r&&(e=at.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&at.set(t,e))}return e}toString(){return this.cssText}},lt=n=>new R(typeof n=="string"?n:n+"",void 0,J),G=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((r,i,s)=>r+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[s+1],n[0]);return new R(t,n,J)},ct=(n,e)=>{if(q)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let r=document.createElement("style"),i=j.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=t.cssText,n.appendChild(r)}},Y=q?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let r of e.cssRules)t+=r.cssText;return lt(t)})(n):n;var{is:Ct,defineProperty:Mt,getOwnPropertyDescriptor:Rt,getOwnPropertyNames:Pt,getOwnPropertySymbols:Ht,getPrototypeOf:Ot}=Object,I=globalThis,dt=I.trustedTypes,Nt=dt?dt.emptyScript:"",Dt=I.reactiveElementPolyfillSupport,P=(n,e)=>n,H={toAttribute(n,e){switch(e){case Boolean:n=n?Nt:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},F=(n,e)=>!Ct(n,e),ht={attribute:!0,type:String,converter:H,reflect:!1,useDefault:!1,hasChanged:F};Symbol.metadata??=Symbol("metadata"),I.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=ht){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let r=Symbol(),i=this.getPropertyDescriptor(e,r,t);i!==void 0&&Mt(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){let{get:i,set:s}=Rt(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:i,set(o){let a=i?.call(this);s?.call(this,o),this.requestUpdate(e,a,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ht}static _$Ei(){if(this.hasOwnProperty(P("elementProperties")))return;let e=Ot(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(P("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(P("properties"))){let t=this.properties,r=[...Pt(t),...Ht(t)];for(let i of r)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[r,i]of t)this.elementProperties.set(r,i)}this._$Eh=new Map;for(let[t,r]of this.elementProperties){let i=this._$Eu(t,r);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let r=new Set(e.flat(1/0).reverse());for(let i of r)t.unshift(Y(i))}else e!==void 0&&t.push(Y(e));return t}static _$Eu(e,t){let r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ct(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){let r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(i!==void 0&&r.reflect===!0){let s=(r.converter?.toAttribute!==void 0?r.converter:H).toAttribute(t,r.type);this._$Em=e,s==null?this.removeAttribute(i):this.setAttribute(i,s),this._$Em=null}}_$AK(e,t){let r=this.constructor,i=r._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let s=r.getPropertyOptions(i),o=typeof s.converter=="function"?{fromAttribute:s.converter}:s.converter?.fromAttribute!==void 0?s.converter:H;this._$Em=i;let a=o.fromAttribute(t,s.type);this[i]=a??this._$Ej?.get(i)??a,this._$Em=null}}requestUpdate(e,t,r,i=!1,s){if(e!==void 0){let o=this.constructor;if(i===!1&&(s=this[e]),r??=o.getPropertyOptions(e),!((r.hasChanged??F)(s,t)||r.useDefault&&r.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:s},o){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),s!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,s]of this._$Ep)this[i]=s;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[i,s]of r){let{wrapped:o}=s,a=this[i];o!==!0||this._$AL.has(i)||a===void 0||this.C(i,void 0,s,a)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};v.elementStyles=[],v.shadowRootOptions={mode:"open"},v[P("elementProperties")]=new Map,v[P("finalized")]=new Map,Dt?.({ReactiveElement:v}),(I.reactiveElementVersions??=[]).push("2.1.2");var it=globalThis,pt=n=>n,W=it.trustedTypes,ut=W?W.createPolicy("lit-html",{createHTML:n=>n}):void 0,yt="$lit$",k=`lit$${Math.random().toFixed(9).slice(2)}$`,$t="?"+k,Ut=`<${$t}>`,A=document,N=()=>A.createComment(""),D=n=>n===null||typeof n!="object"&&typeof n!="function",st=Array.isArray,zt=n=>st(n)||typeof n?.[Symbol.iterator]=="function",Z=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,gt=/-->/g,mt=/>/g,_=RegExp(`>|${Z}(?:([^\\s"'>=/]+)(${Z}*=${Z}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),bt=/'/g,ft=/"/g,xt=/^(?:script|style|textarea|title)$/i,ot=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),c=ot(1),Yt=ot(2),Zt=ot(3),S=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),vt=new WeakMap,E=A.createTreeWalker(A,129);function wt(n,e){if(!st(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return ut!==void 0?ut.createHTML(e):e}var Lt=(n,e)=>{let t=n.length-1,r=[],i,s=e===2?"<svg>":e===3?"<math>":"",o=O;for(let a=0;a<t;a++){let l=n[a],p,h,d=-1,m=0;for(;m<l.length&&(o.lastIndex=m,h=o.exec(l),h!==null);)m=o.lastIndex,o===O?h[1]==="!--"?o=gt:h[1]!==void 0?o=mt:h[2]!==void 0?(xt.test(h[2])&&(i=RegExp("</"+h[2],"g")),o=_):h[3]!==void 0&&(o=_):o===_?h[0]===">"?(o=i??O,d=-1):h[1]===void 0?d=-2:(d=o.lastIndex-h[2].length,p=h[1],o=h[3]===void 0?_:h[3]==='"'?ft:bt):o===ft||o===bt?o=_:o===gt||o===mt?o=O:(o=_,i=void 0);let w=o===_&&n[a+1].startsWith("/>")?" ":"";s+=o===O?l+Ut:d>=0?(r.push(p),l.slice(0,d)+yt+l.slice(d)+k+w):l+k+(d===-2?a:w)}return[wt(n,s+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]},U=class n{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let s=0,o=0,a=e.length-1,l=this.parts,[p,h]=Lt(e,t);if(this.el=n.createElement(p,r),E.currentNode=this.el.content,t===2||t===3){let d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(i=E.nextNode())!==null&&l.length<a;){if(i.nodeType===1){if(i.hasAttributes())for(let d of i.getAttributeNames())if(d.endsWith(yt)){let m=h[o++],w=i.getAttribute(d).split(k),L=/([.?@])?(.*)/.exec(m);l.push({type:1,index:s,name:L[2],strings:w,ctor:L[1]==="."?X:L[1]==="?"?tt:L[1]==="@"?et:M}),i.removeAttribute(d)}else d.startsWith(k)&&(l.push({type:6,index:s}),i.removeAttribute(d));if(xt.test(i.tagName)){let d=i.textContent.split(k),m=d.length-1;if(m>0){i.textContent=W?W.emptyScript:"";for(let w=0;w<m;w++)i.append(d[w],N()),E.nextNode(),l.push({type:2,index:++s});i.append(d[m],N())}}}else if(i.nodeType===8)if(i.data===$t)l.push({type:2,index:s});else{let d=-1;for(;(d=i.data.indexOf(k,d+1))!==-1;)l.push({type:7,index:s}),d+=k.length-1}s++}}static createElement(e,t){let r=A.createElement("template");return r.innerHTML=e,r}};function C(n,e,t=n,r){if(e===S)return e;let i=r!==void 0?t._$Co?.[r]:t._$Cl,s=D(e)?void 0:e._$litDirective$;return i?.constructor!==s&&(i?._$AO?.(!1),s===void 0?i=void 0:(i=new s(n),i._$AT(n,t,r)),r!==void 0?(t._$Co??=[])[r]=i:t._$Cl=i),i!==void 0&&(e=C(n,i._$AS(n,e.values),i,r)),e}var Q=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:r}=this._$AD,i=(e?.creationScope??A).importNode(t,!0);E.currentNode=i;let s=E.nextNode(),o=0,a=0,l=r[0];for(;l!==void 0;){if(o===l.index){let p;l.type===2?p=new z(s,s.nextSibling,this,e):l.type===1?p=new l.ctor(s,l.name,l.strings,this,e):l.type===6&&(p=new rt(s,this,e)),this._$AV.push(p),l=r[++a]}o!==l?.index&&(s=E.nextNode(),o++)}return E.currentNode=A,i}p(e){let t=0;for(let r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}},z=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=C(this,e,t),D(e)?e===u||e==null||e===""?(this._$AH!==u&&this._$AR(),this._$AH=u):e!==this._$AH&&e!==S&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):zt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==u&&D(this._$AH)?this._$AA.nextSibling.data=e:this.T(A.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:r}=e,i=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=U.createElement(wt(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(t);else{let s=new Q(i,this),o=s.u(this.options);s.p(t),this.T(o),this._$AH=s}}_$AC(e){let t=vt.get(e.strings);return t===void 0&&vt.set(e.strings,t=new U(e)),t}k(e){st(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,r,i=0;for(let s of e)i===t.length?t.push(r=new n(this.O(N()),this.O(N()),this,this.options)):r=t[i],r._$AI(s),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let r=pt(e).nextSibling;pt(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},M=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,s){this.type=1,this._$AH=u,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=s,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=u}_$AI(e,t=this,r,i){let s=this.strings,o=!1;if(s===void 0)e=C(this,e,t,0),o=!D(e)||e!==this._$AH&&e!==S,o&&(this._$AH=e);else{let a=e,l,p;for(e=s[0],l=0;l<s.length-1;l++)p=C(this,a[r+l],t,l),p===S&&(p=this._$AH[l]),o||=!D(p)||p!==this._$AH[l],p===u?e=u:e!==u&&(e+=(p??"")+s[l+1]),this._$AH[l]=p}o&&!i&&this.j(e)}j(e){e===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},X=class extends M{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===u?void 0:e}},tt=class extends M{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==u)}},et=class extends M{constructor(e,t,r,i,s){super(e,t,r,i,s),this.type=5}_$AI(e,t=this){if((e=C(this,e,t,0)??u)===S)return;let r=this._$AH,i=e===u&&r!==u||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,s=e!==u&&(r===u||i);i&&this.element.removeEventListener(this.name,this,r),s&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},rt=class{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){C(this,e)}};var jt=it.litHtmlPolyfillSupport;jt?.(U,z),(it.litHtmlVersions??=[]).push("3.3.3");var kt=(n,e,t)=>{let r=t?.renderBefore??e,i=r._$litPart$;if(i===void 0){let s=t?.renderBefore??null;r._$litPart$=i=new z(e.insertBefore(N(),s),s,void 0,t??{})}return i._$AI(n),i};var nt=globalThis,f=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=kt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return S}};f._$litElement$=!0,f.finalized=!0,nt.litElementHydrateSupport?.({LitElement:f});var qt=nt.litElementPolyfillSupport;qt?.({LitElement:f});(nt.litElementVersions??=[]).push("4.2.2");var B=n=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(n,e)}):customElements.define(n,e)};var Gt={attribute:!0,type:String,converter:H,reflect:!1,hasChanged:F},It=(n=Gt,e,t)=>{let{kind:r,metadata:i}=t,s=globalThis.litPropertyMetadata.get(i);if(s===void 0&&globalThis.litPropertyMetadata.set(i,s=new Map),r==="setter"&&((n=Object.create(n)).wrapped=!0),s.set(t.name,n),r==="accessor"){let{name:o}=t;return{set(a){let l=e.get.call(this);e.set.call(this,a),this.requestUpdate(o,l,n,!0,a)},init(a){return a!==void 0&&this.C(o,void 0,n,a),a}}}if(r==="setter"){let{name:o}=t;return function(a){let l=this[o];e.call(this,a),this.requestUpdate(o,l,n,!0,a)}}throw Error("Unsupported decorator location: "+r)};function y(n){return(e,t)=>typeof t=="object"?It(n,e,t):((r,i,s)=>{let o=i.hasOwnProperty(s);return i.constructor.createProperty(s,r),o?Object.getOwnPropertyDescriptor(i,s):void 0})(n,e,t)}function $(n){return y({...n,state:!0,attribute:!1})}var _t="smart_icons.rules_cache.v1",K=class{constructor(){this.rules=new Map;this.listeners=new Set;this.unsubscribe=null}hydrateFromCache(){try{let e=localStorage.getItem(_t);if(!e)return 0;let r=JSON.parse(e)?.rules;return!Array.isArray(r)||r.length===0?0:(this.rules=new Map(r.map(i=>[i.id,i])),this.emit(),r.length)}catch{return 0}}async connect(e){let t=await e.sendMessagePromise({type:"smart_icons/list"});this.rules=new Map(t.rules.map(r=>[r.id,r])),this.writeCache(),this.emit(),this.unsubscribe=await e.subscribeMessage(r=>this.handleEvent(r),{type:"smart_icons/subscribe"})}async disconnect(){this.unsubscribe&&(await this.unsubscribe(),this.unsubscribe=null),this.rules.clear(),this.listeners.clear()}all(){return[...this.rules.values()]}byTarget(e){let t=[];for(let r of this.rules.values())r.targets.includes(e)&&t.push(r);return t}sources(){let e=new Set;for(let t of this.rules.values())t.enabled&&e.add(t.source);return e}subscribe(e){return this.listeners.add(e),e(this.all()),()=>this.listeners.delete(e)}handleEvent(e){e.type==="removed"?this.rules.delete(e.id):this.rules.set(e.id,e.rule),this.writeCache(),this.emit()}writeCache(){try{localStorage.setItem(_t,JSON.stringify({rules:this.all()}))}catch{}}emit(){let e=this.all();for(let t of this.listeners)t(e)}};var Et=G`
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
    /* container-type: inline-size lets us write @container queries
       below that respond to the card's own width, not the viewport.
       Viewport-based media queries miss the sidebar-open case (the
       panel iframe is narrower but the viewport isn't). */
    container-type: inline-size;
    container-name: panel;
  }
  /* min-width: 0 chain so the table can shrink with its container
     instead of being pushed wider by long target names or the
     non-wrapping actions column. Without this, flex/grid ancestors
     hand the table their content-width rather than their box-width. */
  .table-wrap {
    min-width: 0;
    overflow-x: auto;
  }
  /* Banner for failures from out-of-dialog actions (toggle, delete).
     Sits above the table so it can't be missed; dismissible via the × button. */
  .action-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 12px;
    padding: 8px 12px;
    color: var(--error-color, #db4437);
    background-color: color-mix(
      in srgb,
      var(--error-color, #db4437) 10%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.9em;
  }
  .action-error-dismiss {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.4em;
    line-height: 1;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .action-error-dismiss:hover {
    background: color-mix(
      in srgb,
      var(--error-color, #db4437) 15%,
      transparent
    );
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
  }
  .action-buttons {
    display: inline-flex;
    gap: 12px;
    align-items: center;
  }
  .empty {
    text-align: center;
    padding: 40px 24px;
    color: var(--secondary-text-color, #727272);
    max-width: 540px;
    margin: 0 auto;
  }
  .empty-illustration {
    font-size: 3em;
    margin-bottom: 8px;
  }
  .empty h2 {
    margin: 0 0 12px;
    color: var(--primary-text-color, #212121);
  }
  .empty-lead {
    font-size: 1.05em;
    margin: 0 0 16px;
  }
  .empty-examples {
    text-align: left;
    display: inline-block;
    margin: 8px 0 20px;
    padding-left: 20px;
  }
  .empty-examples li {
    margin-bottom: 6px;
  }
  .empty-examples code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.9em;
    color: var(--primary-text-color, #212121);
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
  button.btn-primary:disabled,
  button.btn-text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button.btn-primary:disabled:hover {
    filter: none;
  }

  /* Narrow-container layout: the table reformats as a vertical stack
     of cards (one card per rule). Each cell becomes a labeled row
     using the data-label attribute we set in renderRow(). Avoids
     horizontal overflow and preserves all the info.

     Uses a container query against ha-card (declared as a
     container above) so the trigger is the card's own width — this
     correctly fires when the HA sidebar opens and squeezes the
     panel, where a viewport-based @media query would miss it.

     Threshold ~860px: the actions column carries three ha-buttons
     (~270px) on top of five other columns, so anything narrower
     than ~900px clips. Card-stack reads better than a horizontally-
     scrolling table below that. */
  @container panel (max-width: 860px) {
    :host {
      padding: 12px 8px;
    }
    ha-card {
      padding: 12px;
    }
    header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    table,
    thead,
    tbody,
    tr,
    th,
    td {
      display: block;
    }
    thead {
      display: none;
    }
    tbody tr {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    tbody td {
      border-bottom: none;
      padding: 4px 0;
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 8px;
      align-items: center;
    }
    tbody td::before {
      content: attr(data-label);
      font-size: 0.85em;
      font-weight: 500;
      color: var(--secondary-text-color, #727272);
    }
    tbody td.actions {
      display: block;
      padding-top: 10px;
      margin-top: 8px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      text-align: left;
    }
    tbody td.actions::before {
      content: none;
    }
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }
`,At=G`
  :host {
    /* We zero out --dialog-content-padding on the host ha-dialog so
       our sticky save bar can sit flush against the dialog's edge.
       That means the editor itself has to provide its own content
       padding around everything *except* the sticky actions row
       (which has its own padding via .actions). */
    display: block;
    width: 100%;
    padding: 16px 16px 0;
    color: var(--primary-text-color, #212121);
    box-sizing: border-box;
  }
  .actions {
    /* Pull the bar out to the editor's edge so its border-top spans
       the full dialog width, not the inset content area. */
    margin-left: -16px;
    margin-right: -16px;
  }
  /* Mobile: tighter padding and the sticky bar drops back to static
     flow. Sticky-bottom positioning interacts unpredictably with how
     ha-dialog wraps its content area on small viewports (the dialog
     can grow taller than the viewport, the scroll container can shift,
     and the bar visually ends up floating over the wrong content).
     Static actions sit at the natural end of the form — user scrolls
     to bottom to save, which is the normal mobile pattern. */
  @media (max-width: 600px) {
    :host {
      padding: 8px 8px 0;
    }
    .actions {
      position: static;
      margin-left: -8px;
      margin-right: -8px;
      padding: 10px 12px;
    }
    .group {
      margin-bottom: 12px;
    }
    fieldset {
      padding: 8px;
    }
    .row {
      gap: 6px;
      padding: 8px 0;
    }
    .row > select {
      flex-basis: 64px;
    }
    .row > input[type='text'],
    .row .swatch-input,
    .row .icon-input,
    .row ha-icon-picker {
      flex-basis: 100%;
    }
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
  /* Mapping and threshold rows use flex-wrap so controls flow naturally
     onto a second line when the dialog gets narrow. Each input has a
     flex-basis that yields its preferred size while still shrinking. */
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .row:last-of-type {
    border-bottom: none;
  }
  .row > * {
    min-width: 0;
  }
  .row > select {
    flex: 0 0 80px;
  }
  .row > input[type='text'] {
    flex: 1 1 140px;
  }
  .row .swatch-input,
  .row .icon-input,
  .row ha-icon-picker {
    flex: 1 1 200px;
  }
  .row > .btn-icon {
    flex: 0 0 auto;
  }
  .reorder-buttons {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex: 0 0 auto;
  }
  .reorder-buttons .btn-icon {
    padding: 0 6px;
    font-size: 1em;
    line-height: 1.2;
  }
  /* Targets list: each row is a single text input plus a remove button. */
  .target-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .target-row input {
    flex: 1;
    min-width: 0;
  }
  .target-row .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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
  .fieldset-hint {
    font-size: 0.9em;
    color: var(--secondary-text-color, #727272);
    margin: 4px 0 12px;
  }
  .fieldset-hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
  }
  /* Glob preview hint under each target row. */
  .target-hint {
    font-size: 0.8em;
    color: var(--secondary-text-color, #727272);
    padding: 0 4px 6px;
    margin-top: -4px;
  }
  .target-hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.95em;
  }
  .target-hint--empty {
    color: var(--warning-color, #ff9800);
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
  /* Sticky actions row pinned to the bottom of the editor. The host
     panel sets the dialog content padding to 0 on the ha-dialog so
     this bar can sit flush against the dialog edge with no gap. The
     actions have their own internal padding so they stay visually
     separated from the content. */
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--card-background-color, #fff);
    border-top: 1px solid var(--divider-color, #e0e0e0);
    z-index: 1;
  }
  .error {
    color: var(--error-color, #db4437);
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--error-color, #db4437);
    background-color: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    border-radius: 4px;
  }
  /* Inline validation error placed near the field(s) it refers to. */
  .inline-error {
    margin: 6px 0 0;
    padding: 6px 10px;
    color: var(--warning-color, #ff9800);
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 8%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.85em;
  }
`;var Ft=0;function T(){return Ft++}var x=class extends f{constructor(){super(...arguments);this.errorMessage="";this.working=this.blankState();this.cancelClicked=()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))};this.addGlob=()=>{this.working={...this.working,targetGlobs:[...this.working.targetGlobs,{value:"",_key:T()}]}};this.addThreshold=()=>{this.working={...this.working,thresholds:[...this.working.thresholds,{lt:0,color:"",icon:"",_key:T()}]}};this.addMapping=()=>{this.working={...this.working,mapping:[...this.working.mapping,{key:"",color:"",icon:"",_key:T()}]}};this.save=()=>{let t=this.serialize();this.dispatchEvent(new CustomEvent("save",{detail:t,bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback();for(let t of["ha-icon-picker","ha-selector"])customElements.get(t)||customElements.whenDefined(t).then(()=>this.requestUpdate()).catch(()=>{})}willUpdate(t){t.has("rule")&&(this.working=this.rule?this.hydrate(this.rule):this.blankState())}renderIconField(t,r){return customElements.get("ha-icon-picker")&&this.hass?c`
        <ha-icon-picker
          .hass=${this.hass}
          .value=${t}
          .label=${"Icon"}
          @value-changed=${i=>r(i.detail?.value??"")}
        ></ha-icon-picker>
      `:c`
      <div class="icon-input">
        ${t?c`<ha-icon class="icon-preview" .icon=${t}></ha-icon>`:c`<span class="icon-preview placeholder" aria-hidden="true"></span>`}
        <input
          type="text"
          placeholder="mdi:icon"
          .value=${t}
          @input=${i=>r(i.target.value)}
        />
      </div>
    `}get entityIds(){return this.hass?Object.keys(this.hass.states).sort():[]}renderEntityField(t,r,i,s,o=!1){return customElements.get("ha-selector")&&this.hass?c`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{entity:{}}}
            .value=${i}
            .label=${t}
            @value-changed=${a=>s(a.detail?.value??"")}
          ></ha-selector>
        </div>
      `:c`
      <label class="field">
        <span class="label">${t}</span>
        <input
          type="text"
          list="smart-icons-entities"
          ?required=${o}
          placeholder=${r}
          .value=${i}
          @input=${a=>s(a.target.value)}
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
        ${this.renderTargetEntitiesField()}
        ${this.renderTargetGlobsField()}
        ${this.targetsError?c`<div class="inline-error">${this.targetsError}</div>`:null}
      </section>

      <section class="group">
        <h3 class="group-title">React to</h3>
        ${this.renderEntityField("Source entity",this.isPerTarget?"leave blank \u2014 per-target source":"defaults to target",this.working.source,t=>this.patch({source:t}))}
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
            ${this.renderWatchingHint()}
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
        ${this.modeError?c`<div class="inline-error">${this.modeError}</div>`:null}
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
        <ha-button @click=${this.cancelClicked}>Cancel</ha-button>
        <ha-button
          variant="brand"
          ?disabled=${this.validationErrors.length>0}
          @click=${this.save}
        >Save</ha-button>
      </div>
    `}submit(){return this.validationErrors.length>0?!1:(this.save(),!0)}get validationErrors(){return[this.targetsError,this.sourceError,this.modeError].filter(t=>t!==null)}get targetsError(){let t=this.working.targetEntities,r=this.working.targetGlobs.map(i=>i.value.trim()).filter(i=>i.length>0);return t.length===0&&r.length===0?"Pick at least one target entity or add a glob pattern.":null}get sourceError(){return null}get modeError(){if(this.working.mode==="thresholds"){if(!this.working.thresholds.some(r=>this.thresholdComparator(r)!==null||r.color||r.icon))return"Thresholds mode needs at least one entry."}else if(this.working.mode==="mapping"){if(!this.working.mapping.some(r=>r.key.trim().length>0))return"Mapping mode needs at least one state \u2192 decoration entry."}else if(this.working.mode==="template"&&!this.working.template.trim())return"Template mode requires a non-empty Jinja template.";return null}get sourceEntityForDisplay(){let t=this.working.source.trim();return t||this.working.targetEntities[0]||"(entity)"}get isPerTarget(){if(this.working.source.trim())return!1;let t=this.working.targetEntities,r=this.working.targetGlobs.filter(i=>i.value.trim());return t.length>1||r.length>0}renderWatchingHint(){let t=this.working.source_attribute.trim();if(this.isPerTarget)return t?c`Per-target: each matched entity's
            <code>.${t}</code> attribute drives its own decoration.`:c`Per-target: each matched entity reacts to its own state.
            Set a state attribute (e.g. <code>brightness</code>) to use
            an attribute instead.`;let r=this.sourceEntityForDisplay;return t?c`Watching <code>${r}.${t}</code>`:c`Watching the state of <code>${r}</code>. Pick a state
          attribute (e.g. <code>azimuth</code>) for numeric-attribute rules.`}get sourceAttributes(){let t=this.sourceEntityForDisplay,r=this.hass?.states?.[t]?.attributes;return r?Object.keys(r).sort():[]}renderThresholds(){let t=this.working.thresholds;return c`
      <fieldset>
        <legend>
          Threshold entries — first matching wins; the entry with no
          comparator is the "else" branch. Use ↑ ↓ to reorder.
        </legend>
        ${t.length===0?c`<p class="fieldset-hint">
              No threshold entries yet. Each entry has a comparator
              (e.g. <code>&lt; 18</code>) plus a color or icon to apply.
              The first matching entry wins.
            </p>`:null}
        ${t.map((r,i)=>c`
            <div class="row threshold-row">
              <div class="reorder-buttons">
                <button
                  class="btn-icon"
                  ?disabled=${i===0}
                  @click=${()=>this.moveThreshold(i,-1)}
                  title="Move up"
                >↑</button>
                <button
                  class="btn-icon"
                  ?disabled=${i===t.length-1}
                  @click=${()=>this.moveThreshold(i,1)}
                  title="Move down"
                >↓</button>
              </div>
              <select
                .value=${this.thresholdComparator(r)}
                @change=${s=>this.setThresholdComparator(i,s.target.value)}
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
                .value=${this.thresholdValue(r)}
                ?disabled=${this.thresholdComparator(r)===""}
                @input=${s=>this.setThresholdValue(i,s.target.value)}
              />
              ${this.renderColorInput(r.color??"",s=>this.updateThreshold(i,{color:s}))}
              ${this.renderIconField(r.icon??"",s=>this.updateThreshold(i,{icon:s}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeThreshold(i)}
                title="Remove"
              >×</button>
            </div>
          `)}
        <button class="btn-text add-button" @click=${this.addThreshold}>
          + Add entry
        </button>
      </fieldset>
    `}moveThreshold(t,r){let i=t+r;if(i<0||i>=this.working.thresholds.length)return;let s=[...this.working.thresholds];[s[t],s[i]]=[s[i],s[t]],this.working={...this.working,thresholds:s}}renderMapping(){let t=this.working.mapping,r=t.every(i=>!i.key.trim());return c`
      <fieldset>
        <legend>
          State → decoration. <code>_else</code> is the fallback bucket.
        </legend>
        ${r?c`<p class="fieldset-hint">
              Add one entry per state value (e.g. <code>on</code>,
              <code>off</code>) — or use <code>_else</code> as a catch-all
              fallback. Each entry can set a color, an icon, or both.
            </p>`:null}
        ${t.map((i,s)=>c`
            <div class="row">
              <input
                type="text"
                placeholder="state"
                .value=${i.key}
                @input=${o=>this.updateMapping(s,{key:o.target.value})}
              />
              ${this.renderColorInput(i.color,o=>this.updateMapping(s,{color:o}))}
              ${this.renderIconField(i.icon,o=>this.updateMapping(s,{icon:o}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeMapping(s)}
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
          @input=${i=>r(i.target.value)}
          title="Pick a color"
        />
        <input
          type="text"
          placeholder="#hex, name, or var(--…)"
          .value=${t}
          @input=${i=>r(i.target.value)}
        />
      </div>
    `}colorAsHex(t){if(!t)return"#888888";if(/^#[0-9a-fA-F]{6}$/.test(t))return t;if(/^#[0-9a-fA-F]{3}$/.test(t))return"#"+t.slice(1).split("").map(r=>r+r).join("");try{let r=document.createElement("canvas").getContext("2d");if(!r)return"#888888";r.fillStyle=t;let i=r.fillStyle;return/^#[0-9a-fA-F]{6}$/.test(i)?i:"#888888"}catch{return"#888888"}}patch(t){this.working={...this.working,...t}}hydrate(t){let r=[],i=[];for(let o of t.targets)/[*?[]/.test(o)?i.push({value:o,_key:T()}):r.push(o);let s=r[0];return{id:t.id,targetEntities:r,targetGlobs:i,source:t.source===s?"":t.source,source_attribute:t.source_attribute??"",mode:t.mode,thresholds:(t.thresholds??[]).map(o=>({...o,_key:T()})),mapping:t.mapping?Object.entries(t.mapping).map(([o,a])=>({key:o,color:a.color??"",icon:a.icon??"",_key:T()})):[],template:t.template??"",enabled:t.enabled,priority:t.priority}}blankState(){return{targetEntities:[],targetGlobs:[],source:"",source_attribute:"",mode:"mapping",thresholds:[],mapping:[{key:"",color:"",icon:"",_key:T()}],template:"",enabled:!0,priority:10}}renderTargetEntitiesField(){return customElements.get("ha-selector")&&this.hass?c`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{entity:{multiple:!0}}}
            .value=${this.working.targetEntities}
            .label=${"Target entities"}
            @value-changed=${t=>this.patch({targetEntities:t.detail?.value??[]})}
          ></ha-selector>
        </div>
      `:c`
      <label class="field">
        <span class="label">Target entities (comma-separated)</span>
        <input
          type="text"
          list="smart-icons-entities"
          placeholder="light.kitchen, light.living_room"
          .value=${this.working.targetEntities.join(", ")}
          @input=${t=>this.patch({targetEntities:t.target.value.split(",").map(r=>r.trim()).filter(r=>r.length>0)})}
        />
      </label>
    `}renderTargetGlobsField(){return c`
      <fieldset>
        <legend>
          Glob patterns (optional) — match many entities at once.
          E.g. <code>light.kitchen_*</code> or <code>sensor.temp_?</code>.
        </legend>
        ${this.working.targetGlobs.length===0?c`<p class="fieldset-hint">
              No patterns. Use the picker above for individual entities,
              or click <strong>+ Add pattern</strong> to target a group.
            </p>`:null}
        ${this.working.targetGlobs.map((t,r)=>c`
            <div class="target-row">
              <input
                type="text"
                placeholder="e.g. light.kitchen_*"
                .value=${t.value}
                @input=${i=>this.updateGlob(r,i.target.value)}
              />
              <button
                class="btn-icon"
                @click=${()=>this.removeGlob(r)}
                title="Remove pattern"
              >×</button>
            </div>
            ${this.renderGlobPreview(t.value)}
          `)}
        <button class="btn-text add-button" @click=${this.addGlob}>
          + Add pattern
        </button>
      </fieldset>
    `}renderGlobPreview(t){let r=t.trim();if(!r||!/[*?[]/.test(r)||!this.hass)return null;let i=this.matchGlob(r);if(i.length===0)return c`<div class="target-hint target-hint--empty">
        No entities match this pattern yet.
      </div>`;let s=i.slice(0,3).join(", "),o=i.length>3?` (+${i.length-3} more)`:"";return c`<div class="target-hint">
      Matches ${i.length}
      ${i.length===1?"entity":"entities"}:
      <code>${s}</code>${o}
    </div>`}matchGlob(t){let r=new RegExp("^"+t.replace(/[.+^$()|\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");return Object.keys(this.hass?.states??{}).filter(i=>r.test(i)).sort()}updateGlob(t,r){this.working={...this.working,targetGlobs:this.working.targetGlobs.map((i,s)=>s===t?{...i,value:r}:i)}}removeGlob(t){this.working={...this.working,targetGlobs:this.working.targetGlobs.filter((r,i)=>i!==t)}}thresholdComparator(t){for(let r of["lt","lte","gt","gte","eq"])if(t[r]!==void 0)return r;return""}thresholdValue(t){for(let r of["lt","lte","gt","gte","eq"])if(t[r]!==void 0)return String(t[r]);return""}setThresholdComparator(t,r){let i=this.working.thresholds[t],s={...i};for(let o of["lt","lte","gt","gte","eq"])delete s[o];if(r){let o=this.thresholdValue(i),a=Number(o),l=r==="eq"&&Number.isNaN(a)?o:Number.isNaN(a)?0:a;s[r]=l}this.working={...this.working,thresholds:this.working.thresholds.map((o,a)=>a===t?s:o)}}setThresholdValue(t,r){let i=this.working.thresholds[t],s=this.thresholdComparator(i);if(!s)return;let o=Number(r),a=s==="eq"&&Number.isNaN(o)?r:o;this.working={...this.working,thresholds:this.working.thresholds.map((l,p)=>p===t?{...l,[s]:a}:l)}}updateThreshold(t,r){this.working={...this.working,thresholds:this.working.thresholds.map((i,s)=>s===t?{...i,...r}:i)}}removeThreshold(t){this.working={...this.working,thresholds:this.working.thresholds.filter((r,i)=>i!==t)}}updateMapping(t,r){this.working={...this.working,mapping:this.working.mapping.map((i,s)=>s===t?{...i,...r}:i)}}removeMapping(t){this.working={...this.working,mapping:this.working.mapping.filter((r,i)=>i!==t)}}serialize(){let t=this.working.targetEntities,r=this.working.targetGlobs.map(p=>p.value.trim()).filter(p=>p.length>0),i=[...t,...r],o=this.working.source.trim()||t[0]||"",a=this.working.source_attribute.trim(),l={targets:i,source:o,mode:this.working.mode,enabled:this.working.enabled,priority:this.working.priority};if(a&&(l.source_attribute=a),this.working.id&&(l.id=this.working.id),this.working.mode==="thresholds")l.thresholds=this.working.thresholds.map(({_key:p,...h})=>{let d={};for(let m of["lt","lte","gt","gte","eq"])h[m]!==void 0&&(d[m]=h[m]);return h.color&&(d.color=h.color),h.icon&&(d.icon=h.icon),d});else if(this.working.mode==="mapping"){let p={};for(let h of this.working.mapping){if(!h.key)continue;let d={};h.color&&(d.color=h.color),h.icon&&(d.icon=h.icon),p[h.key]=d}l.mapping=p}else this.working.mode==="template"&&(l.template=this.working.template);return l}};x.styles=At,g([y({attribute:!1})],x.prototype,"rule",2),g([y({attribute:!1})],x.prototype,"hass",2),g([y({type:String})],x.prototype,"errorMessage",2),g([$()],x.prototype,"working",2),x=g([B("smart-icons-rule-editor")],x);var b=class extends f{constructor(){super(...arguments);this.narrow=!1;this.rules=[];this.editing=null;this.dialogOpen=!1;this.editorError="";this.pendingDelete=null;this.actionError="";this.clearActionError=()=>{this.actionError=""};this.addRule=()=>{this.editing=null,this.editorError="",this.dialogOpen=!0};this.cancelEdit=()=>{this.dialogOpen=!1,this.editing=null,this.editorError=""};this.onEditorSave=async t=>{let r=t.detail;this.editorError="";try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:r}),this.dialogOpen=!1,this.editing=null}catch(i){this.editorError=this.errorMessage(i)}};this.cancelDelete=()=>{this.pendingDelete=null};this.confirmDelete=async()=>{let t=this.pendingDelete;if(this.pendingDelete=null,!!t)try{await this.hass.connection.sendMessagePromise({type:"smart_icons/delete",rule_id:t.id}),this.actionError=""}catch(r){let i=t.targets[0]??t.id;this.actionError=`Couldn't delete rule for ${i}: ${this.errorMessage(r)}`}}}connectedCallback(){super.connectedCallback(),this.initStore()}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.(),this.store?.disconnect()}render(){return c`
      <ha-card>
        <header>
          <h1>Smart Icons</h1>
          <ha-button raised @click=${this.addRule}>+ Add rule</ha-button>
        </header>
        ${this.actionError?c`
              <div class="action-error" role="alert">
                <span>${this.actionError}</span>
                <button
                  class="action-error-dismiss"
                  @click=${this.clearActionError}
                  aria-label="Dismiss"
                >×</button>
              </div>
            `:u}
        ${this.rules.length===0?this.renderEmpty():this.renderTable()}
      </ha-card>
      ${this.dialogOpen?this.renderDialog():u}
      ${this.pendingDelete?this.renderDeleteConfirm():u}
    `}renderDeleteConfirm(){let t=this.pendingDelete,r=t.targets.length===1?t.targets[0]:`${t.targets.length} targets (${t.targets[0]}\u2026)`;return c`
      <ha-dialog
        open
        heading="Delete rule?"
        @closed=${this.cancelDelete}
      >
        <p>
          This permanently removes the rule for <code>${r}</code>.
          The color override (and on the next state update, the icon
          override) will be cleared.
        </p>
        <ha-button slot="secondaryAction" @click=${this.cancelDelete}
          >Cancel</ha-button
        >
        <ha-button
          slot="primaryAction"
          variant="danger"
          @click=${this.confirmDelete}
          >Delete</ha-button
        >
      </ha-dialog>
    `}renderEmpty(){return c`
      <div class="empty">
        <div class="empty-illustration">🎨</div>
        <h2>No rules yet</h2>
        <p class="empty-lead">
          Smart Icons lets any entity's icon take its color or glyph
          from another entity's state.
        </p>
        <p>
          A few examples to get started:
        </p>
        <ul class="empty-examples">
          <li>Color your kitchen light's icon by the kitchen sensor's temperature.</li>
          <li>Show a different glyph for <code>sun.sun</code> based on its azimuth.</li>
          <li>Highlight every <code>light.kitchen_*</code> entity together with a glob target.</li>
        </ul>
        <ha-button raised @click=${this.addRule}>+ Create your first rule</ha-button>
      </div>
    `}renderTable(){let t=[...this.rules].sort((r,i)=>{let s=r.targets[0]??"",o=i.targets[0]??"";return s===o?i.priority-r.priority:s.localeCompare(o)});return c`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Targets</th>
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
      </div>
    `}renderRow(t){let r=t.targets[0]??"",i=t.targets.length<=1?r:`${r} (+${t.targets.length-1} more)`,s=t.targets.length===1&&t.source===r,o=(()=>{let a=s?"\u2014":t.source;return t.source_attribute?a==="\u2014"?`(target).${t.source_attribute}`:`${a}.${t.source_attribute}`:a})();return c`
      <tr>
        <td data-label="Targets" title=${t.targets.join(", ")}>${i}</td>
        <td data-label="Source">${o}</td>
        <td data-label="Mode"><span class="pill">${t.mode}</span></td>
        <td data-label="Enabled">
          <ha-switch
            .checked=${t.enabled}
            @change=${a=>{let l=a.target;this.toggleRule(t,l.checked,l)}}
          ></ha-switch>
        </td>
        <td data-label="Priority">${t.priority}</td>
        <td class="actions">
          <div class="action-buttons">
            <ha-button @click=${()=>this.editRule(t)}>Edit</ha-button>
            <ha-button @click=${()=>this.duplicateRule(t)}>Duplicate</ha-button>
            <ha-button @click=${()=>this.deleteRule(t)}>Delete</ha-button>
          </div>
        </td>
      </tr>
    `}renderDialog(){return c`
      <ha-dialog
        open
        heading=${this.dialogTitle}
        style="--dialog-content-padding: 0"
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
    `}get dialogTitle(){return this.editing?this.editing.id?"Edit rule":"Duplicate rule":"Add rule"}async initStore(){this.store=new K,this.store.hydrateFromCache(),this.unsubscribe=this.store.subscribe(t=>{this.rules=t});try{await this.store.connect(this.hass.connection)}catch(t){console.error("[smart-icons-panel] failed to connect WS",t)}}editRule(t){this.editing=t,this.editorError="",this.dialogOpen=!0}duplicateRule(t){this.editing={...t,id:"",created:"",updated:""},this.editorError="",this.dialogOpen=!0}async toggleRule(t,r,i){try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:{...t,enabled:r}}),this.actionError=""}catch(s){i.checked=t.enabled,this.actionError=`Couldn't ${r?"enable":"disable"} rule: ${this.errorMessage(s)}`}}deleteRule(t){this.pendingDelete=t}errorMessage(t){if(t&&typeof t=="object"&&"message"in t){let r=t.message;if(typeof r=="string")return r}return String(t)}};b.styles=Et,g([y({attribute:!1})],b.prototype,"hass",2),g([y({type:Boolean,reflect:!0})],b.prototype,"narrow",2),g([$()],b.prototype,"rules",2),g([$()],b.prototype,"editing",2),g([$()],b.prototype,"dialogOpen",2),g([$()],b.prototype,"editorError",2),g([$()],b.prototype,"pendingDelete",2),g([$()],b.prototype,"actionError",2),b=g([B("smart-icons-panel")],b);
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
