var zr=Object.defineProperty;var Gr=Object.getOwnPropertyDescriptor;var y=(e,r,t,i)=>{for(var n=i>1?void 0:i?Gr(r,t):r,o=e.length-1,s;o>=0;o--)(s=e[o])&&(n=(i?s(r,t,n):s(n))||n);return i&&n&&zr(r,t,n),n};var ge=globalThis,me=ge.ShadowRoot&&(ge.ShadyCSS===void 0||ge.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Pe=Symbol(),ut=new WeakMap,ee=class{constructor(r,t,i){if(this._$cssResult$=!0,i!==Pe)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=r,this.t=t}get styleSheet(){let r=this.o,t=this.t;if(me&&r===void 0){let i=t!==void 0&&t.length===1;i&&(r=ut.get(t)),r===void 0&&((this.o=r=new CSSStyleSheet).replaceSync(this.cssText),i&&ut.set(t,r))}return r}toString(){return this.cssText}},dt=e=>new ee(typeof e=="string"?e:e+"",void 0,Pe),ve=(e,...r)=>{let t=e.length===1?e[0]:r.reduce((i,n,o)=>i+(s=>{if(s._$cssResult$===!0)return s.cssText;if(typeof s=="number")return s;throw Error("Value passed to 'css' function must be a 'css' function result: "+s+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+e[o+1],e[0]);return new ee(t,e,Pe)},pt=(e,r)=>{if(me)e.adoptedStyleSheets=r.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of r){let i=document.createElement("style"),n=ge.litNonce;n!==void 0&&i.setAttribute("nonce",n),i.textContent=t.cssText,e.appendChild(i)}},He=me?e=>e:e=>e instanceof CSSStyleSheet?(r=>{let t="";for(let i of r.cssRules)t+=i.cssText;return dt(t)})(e):e;var{is:qr,defineProperty:Vr,getOwnPropertyDescriptor:Wr,getOwnPropertyNames:Kr,getOwnPropertySymbols:Qr,getPrototypeOf:Jr}=Object,be=globalThis,ht=be.trustedTypes,Xr=ht?ht.emptyScript:"",Zr=be.reactiveElementPolyfillSupport,te=(e,r)=>e,re={toAttribute(e,r){switch(r){case Boolean:e=e?Xr:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,r){let t=e;switch(r){case Boolean:t=e!==null;break;case Number:t=e===null?null:Number(e);break;case Object:case Array:try{t=JSON.parse(e)}catch{t=null}}return t}},xe=(e,r)=>!qr(e,r),ft={attribute:!0,type:String,converter:re,reflect:!1,useDefault:!1,hasChanged:xe};Symbol.metadata??=Symbol("metadata"),be.litPropertyMetadata??=new WeakMap;var F=class extends HTMLElement{static addInitializer(r){this._$Ei(),(this.l??=[]).push(r)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(r,t=ft){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(r)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(r,t),!t.noAccessor){let i=Symbol(),n=this.getPropertyDescriptor(r,i,t);n!==void 0&&Vr(this.prototype,r,n)}}static getPropertyDescriptor(r,t,i){let{get:n,set:o}=Wr(this.prototype,r)??{get(){return this[t]},set(s){this[t]=s}};return{get:n,set(s){let a=n?.call(this);o?.call(this,s),this.requestUpdate(r,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(r){return this.elementProperties.get(r)??ft}static _$Ei(){if(this.hasOwnProperty(te("elementProperties")))return;let r=Jr(this);r.finalize(),r.l!==void 0&&(this.l=[...r.l]),this.elementProperties=new Map(r.elementProperties)}static finalize(){if(this.hasOwnProperty(te("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(te("properties"))){let t=this.properties,i=[...Kr(t),...Qr(t)];for(let n of i)this.createProperty(n,t[n])}let r=this[Symbol.metadata];if(r!==null){let t=litPropertyMetadata.get(r);if(t!==void 0)for(let[i,n]of t)this.elementProperties.set(i,n)}this._$Eh=new Map;for(let[t,i]of this.elementProperties){let n=this._$Eu(t,i);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(r){let t=[];if(Array.isArray(r)){let i=new Set(r.flat(1/0).reverse());for(let n of i)t.unshift(He(n))}else r!==void 0&&t.push(He(r));return t}static _$Eu(r,t){let i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof r=="string"?r.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(r=>this.enableUpdating=r),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(r=>r(this))}addController(r){(this._$EO??=new Set).add(r),this.renderRoot!==void 0&&this.isConnected&&r.hostConnected?.()}removeController(r){this._$EO?.delete(r)}_$E_(){let r=new Map,t=this.constructor.elementProperties;for(let i of t.keys())this.hasOwnProperty(i)&&(r.set(i,this[i]),delete this[i]);r.size>0&&(this._$Ep=r)}createRenderRoot(){let r=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return pt(r,this.constructor.elementStyles),r}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(r=>r.hostConnected?.())}enableUpdating(r){}disconnectedCallback(){this._$EO?.forEach(r=>r.hostDisconnected?.())}attributeChangedCallback(r,t,i){this._$AK(r,i)}_$ET(r,t){let i=this.constructor.elementProperties.get(r),n=this.constructor._$Eu(r,i);if(n!==void 0&&i.reflect===!0){let o=(i.converter?.toAttribute!==void 0?i.converter:re).toAttribute(t,i.type);this._$Em=r,o==null?this.removeAttribute(n):this.setAttribute(n,o),this._$Em=null}}_$AK(r,t){let i=this.constructor,n=i._$Eh.get(r);if(n!==void 0&&this._$Em!==n){let o=i.getPropertyOptions(n),s=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:re;this._$Em=n;let a=s.fromAttribute(t,o.type);this[n]=a??this._$Ej?.get(n)??a,this._$Em=null}}requestUpdate(r,t,i,n=!1,o){if(r!==void 0){let s=this.constructor;if(n===!1&&(o=this[r]),i??=s.getPropertyOptions(r),!((i.hasChanged??xe)(o,t)||i.useDefault&&i.reflect&&o===this._$Ej?.get(r)&&!this.hasAttribute(s._$Eu(r,i))))return;this.C(r,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(r,t,{useDefault:i,reflect:n,wrapped:o},s){i&&!(this._$Ej??=new Map).has(r)&&(this._$Ej.set(r,s??t??this[r]),o!==!0||s!==void 0)||(this._$AL.has(r)||(this.hasUpdated||i||(t=void 0),this._$AL.set(r,t)),n===!0&&this._$Em!==r&&(this._$Eq??=new Set).add(r))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let r=this.scheduleUpdate();return r!=null&&await r,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,o]of this._$Ep)this[n]=o;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[n,o]of i){let{wrapped:s}=o,a=this[n];s!==!0||this._$AL.has(n)||a===void 0||this.C(n,void 0,o,a)}}let r=!1,t=this._$AL;try{r=this.shouldUpdate(t),r?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw r=!1,this._$EM(),i}r&&this._$AE(t)}willUpdate(r){}_$AE(r){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(r)),this.updated(r)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(r){return!0}update(r){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(r){}firstUpdated(r){}};F.elementStyles=[],F.shadowRootOptions={mode:"open"},F[te("elementProperties")]=new Map,F[te("finalized")]=new Map,Zr?.({ReactiveElement:F}),(be.reactiveElementVersions??=[]).push("2.1.2");var Ue=globalThis,gt=e=>e,ye=Ue.trustedTypes,mt=ye?ye.createPolicy("lit-html",{createHTML:e=>e}):void 0,Be="$lit$",N=`lit$${Math.random().toFixed(9).slice(2)}$`,Ye="?"+N,ei=`<${Ye}>`,B=document,ne=()=>B.createComment(""),oe=e=>e===null||typeof e!="object"&&typeof e!="function",ze=Array.isArray,At=e=>ze(e)||typeof e?.[Symbol.iterator]=="function",je=`[ 	
\f\r]`,ie=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,vt=/-->/g,bt=/>/g,j=RegExp(`>|${je}(?:([^\\s"'>=/]+)(${je}*=${je}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),xt=/'/g,yt=/"/g,_t=/^(?:script|style|textarea|title)$/i,Ge=e=>(r,...t)=>({_$litType$:e,strings:r,values:t}),g=Ge(1),Po=Ge(2),Ho=Ge(3),Y=Symbol.for("lit-noChange"),b=Symbol.for("lit-nothing"),wt=new WeakMap,U=B.createTreeWalker(B,129);function Et(e,r){if(!ze(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return mt!==void 0?mt.createHTML(r):r}var $t=(e,r)=>{let t=e.length-1,i=[],n,o=r===2?"<svg>":r===3?"<math>":"",s=ie;for(let a=0;a<t;a++){let l=e[a],c,d,u=-1,p=0;for(;p<l.length&&(s.lastIndex=p,d=s.exec(l),d!==null);)p=s.lastIndex,s===ie?d[1]==="!--"?s=vt:d[1]!==void 0?s=bt:d[2]!==void 0?(_t.test(d[2])&&(n=RegExp("</"+d[2],"g")),s=j):d[3]!==void 0&&(s=j):s===j?d[0]===">"?(s=n??ie,u=-1):d[1]===void 0?u=-2:(u=s.lastIndex-d[2].length,c=d[1],s=d[3]===void 0?j:d[3]==='"'?yt:xt):s===yt||s===xt?s=j:s===vt||s===bt?s=ie:(s=j,n=void 0);let h=s===j&&e[a+1].startsWith("/>")?" ":"";o+=s===ie?l+ei:u>=0?(i.push(c),l.slice(0,u)+Be+l.slice(u)+N+h):l+N+(u===-2?a:h)}return[Et(e,o+(e[t]||"<?>")+(r===2?"</svg>":r===3?"</math>":"")),i]},se=class e{constructor({strings:r,_$litType$:t},i){let n;this.parts=[];let o=0,s=0,a=r.length-1,l=this.parts,[c,d]=$t(r,t);if(this.el=e.createElement(c,i),U.currentNode=this.el.content,t===2||t===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(n=U.nextNode())!==null&&l.length<a;){if(n.nodeType===1){if(n.hasAttributes())for(let u of n.getAttributeNames())if(u.endsWith(Be)){let p=d[s++],h=n.getAttribute(u).split(N),m=/([.?@])?(.*)/.exec(p);l.push({type:1,index:o,name:m[2],strings:h,ctor:m[1]==="."?Ae:m[1]==="?"?_e:m[1]==="@"?Ee:G}),n.removeAttribute(u)}else u.startsWith(N)&&(l.push({type:6,index:o}),n.removeAttribute(u));if(_t.test(n.tagName)){let u=n.textContent.split(N),p=u.length-1;if(p>0){n.textContent=ye?ye.emptyScript:"";for(let h=0;h<p;h++)n.append(u[h],ne()),U.nextNode(),l.push({type:2,index:++o});n.append(u[p],ne())}}}else if(n.nodeType===8)if(n.data===Ye)l.push({type:2,index:o});else{let u=-1;for(;(u=n.data.indexOf(N,u+1))!==-1;)l.push({type:7,index:o}),u+=N.length-1}o++}}static createElement(r,t){let i=B.createElement("template");return i.innerHTML=r,i}};function z(e,r,t=e,i){if(r===Y)return r;let n=i!==void 0?t._$Co?.[i]:t._$Cl,o=oe(r)?void 0:r._$litDirective$;return n?.constructor!==o&&(n?._$AO?.(!1),o===void 0?n=void 0:(n=new o(e),n._$AT(e,t,i)),i!==void 0?(t._$Co??=[])[i]=n:t._$Cl=n),n!==void 0&&(r=z(e,n._$AS(e,r.values),n,i)),r}var we=class{constructor(r,t){this._$AV=[],this._$AN=void 0,this._$AD=r,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(r){let{el:{content:t},parts:i}=this._$AD,n=(r?.creationScope??B).importNode(t,!0);U.currentNode=n;let o=U.nextNode(),s=0,a=0,l=i[0];for(;l!==void 0;){if(s===l.index){let c;l.type===2?c=new K(o,o.nextSibling,this,r):l.type===1?c=new l.ctor(o,l.name,l.strings,this,r):l.type===6&&(c=new $e(o,this,r)),this._$AV.push(c),l=i[++a]}s!==l?.index&&(o=U.nextNode(),s++)}return U.currentNode=B,n}p(r){let t=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(r,i,t),t+=i.strings.length-2):i._$AI(r[t])),t++}},K=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(r,t,i,n){this.type=2,this._$AH=b,this._$AN=void 0,this._$AA=r,this._$AB=t,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let r=this._$AA.parentNode,t=this._$AM;return t!==void 0&&r?.nodeType===11&&(r=t.parentNode),r}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(r,t=this){r=z(this,r,t),oe(r)?r===b||r==null||r===""?(this._$AH!==b&&this._$AR(),this._$AH=b):r!==this._$AH&&r!==Y&&this._(r):r._$litType$!==void 0?this.$(r):r.nodeType!==void 0?this.T(r):At(r)?this.k(r):this._(r)}O(r){return this._$AA.parentNode.insertBefore(r,this._$AB)}T(r){this._$AH!==r&&(this._$AR(),this._$AH=this.O(r))}_(r){this._$AH!==b&&oe(this._$AH)?this._$AA.nextSibling.data=r:this.T(B.createTextNode(r)),this._$AH=r}$(r){let{values:t,_$litType$:i}=r,n=typeof i=="number"?this._$AC(r):(i.el===void 0&&(i.el=se.createElement(Et(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(t);else{let o=new we(n,this),s=o.u(this.options);o.p(t),this.T(s),this._$AH=o}}_$AC(r){let t=wt.get(r.strings);return t===void 0&&wt.set(r.strings,t=new se(r)),t}k(r){ze(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,i,n=0;for(let o of r)n===t.length?t.push(i=new e(this.O(ne()),this.O(ne()),this,this.options)):i=t[n],i._$AI(o),n++;n<t.length&&(this._$AR(i&&i._$AB.nextSibling,n),t.length=n)}_$AR(r=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);r!==this._$AB;){let i=gt(r).nextSibling;gt(r).remove(),r=i}}setConnected(r){this._$AM===void 0&&(this._$Cv=r,this._$AP?.(r))}},G=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(r,t,i,n,o){this.type=1,this._$AH=b,this._$AN=void 0,this.element=r,this.name=t,this._$AM=n,this.options=o,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=b}_$AI(r,t=this,i,n){let o=this.strings,s=!1;if(o===void 0)r=z(this,r,t,0),s=!oe(r)||r!==this._$AH&&r!==Y,s&&(this._$AH=r);else{let a=r,l,c;for(r=o[0],l=0;l<o.length-1;l++)c=z(this,a[i+l],t,l),c===Y&&(c=this._$AH[l]),s||=!oe(c)||c!==this._$AH[l],c===b?r=b:r!==b&&(r+=(c??"")+o[l+1]),this._$AH[l]=c}s&&!n&&this.j(r)}j(r){r===b?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,r??"")}},Ae=class extends G{constructor(){super(...arguments),this.type=3}j(r){this.element[this.name]=r===b?void 0:r}},_e=class extends G{constructor(){super(...arguments),this.type=4}j(r){this.element.toggleAttribute(this.name,!!r&&r!==b)}},Ee=class extends G{constructor(r,t,i,n,o){super(r,t,i,n,o),this.type=5}_$AI(r,t=this){if((r=z(this,r,t,0)??b)===Y)return;let i=this._$AH,n=r===b&&i!==b||r.capture!==i.capture||r.once!==i.once||r.passive!==i.passive,o=r!==b&&(i===b||n);n&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,r),this._$AH=r}handleEvent(r){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,r):this._$AH.handleEvent(r)}},$e=class{constructor(r,t,i){this.element=r,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(r){z(this,r)}},kt={M:Be,P:N,A:Ye,C:1,L:$t,R:we,D:At,V:z,I:K,H:G,N:_e,U:Ee,B:Ae,F:$e},ti=Ue.litHtmlPolyfillSupport;ti?.(se,K),(Ue.litHtmlVersions??=[]).push("3.3.3");var Ct=(e,r,t)=>{let i=t?.renderBefore??r,n=i._$litPart$;if(n===void 0){let o=t?.renderBefore??null;i._$litPart$=n=new K(r.insertBefore(ne(),o),o,void 0,t??{})}return n._$AI(e),n};var qe=globalThis,L=class extends F{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let r=super.createRenderRoot();return this.renderOptions.renderBefore??=r.firstChild,r}update(r){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(r),this._$Do=Ct(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return Y}};L._$litElement$=!0,L.finalized=!0,qe.litElementHydrateSupport?.({LitElement:L});var ri=qe.litElementPolyfillSupport;ri?.({LitElement:L});(qe.litElementVersions??=[]).push("4.2.2");var ke=e=>(r,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(e,r)}):customElements.define(e,r)};var ii={attribute:!0,type:String,converter:re,reflect:!1,hasChanged:xe},ni=(e=ii,r,t)=>{let{kind:i,metadata:n}=t,o=globalThis.litPropertyMetadata.get(n);if(o===void 0&&globalThis.litPropertyMetadata.set(n,o=new Map),i==="setter"&&((e=Object.create(e)).wrapped=!0),o.set(t.name,e),i==="accessor"){let{name:s}=t;return{set(a){let l=r.get.call(this);r.set.call(this,a),this.requestUpdate(s,l,e,!0,a)},init(a){return a!==void 0&&this.C(s,void 0,e,a),a}}}if(i==="setter"){let{name:s}=t;return function(a){let l=this[s];r.call(this,a),this.requestUpdate(s,l,e,!0,a)}}throw Error("Unsupported decorator location: "+i)};function D(e){return(r,t)=>typeof t=="object"?ni(e,r,t):((i,n,o)=>{let s=n.hasOwnProperty(o);return n.constructor.createProperty(o,i),s?Object.getOwnPropertyDescriptor(n,o):void 0})(e,r,t)}function _(e){return D({...e,state:!0,attribute:!1})}var{I:ks}=kt;var St=e=>e.strings===void 0;var Tt={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},Ve=e=>(...r)=>({_$litDirective$:e,values:r}),Se=class{constructor(r){}get _$AU(){return this._$AM._$AU}_$AT(r,t,i){this._$Ct=r,this._$AM=t,this._$Ci=i}_$AS(r,t){return this.update(r,t)}update(r,t){return this.render(...t)}};var ae=(e,r)=>{let t=e._$AN;if(t===void 0)return!1;for(let i of t)i._$AO?.(r,!1),ae(i,r);return!0},Te=e=>{let r,t;do{if((r=e._$AM)===void 0)break;t=r._$AN,t.delete(e),e=r}while(t?.size===0)},Rt=e=>{for(let r;r=e._$AM;e=r){let t=r._$AN;if(t===void 0)r._$AN=t=new Set;else if(t.has(e))break;t.add(e),ai(r)}};function oi(e){this._$AN!==void 0?(Te(this),this._$AM=e,Rt(this)):this._$AM=e}function si(e,r=!1,t=0){let i=this._$AH,n=this._$AN;if(n!==void 0&&n.size!==0)if(r)if(Array.isArray(i))for(let o=t;o<i.length;o++)ae(i[o],!1),Te(i[o]);else i!=null&&(ae(i,!1),Te(i));else ae(this,e)}var ai=e=>{e.type==Tt.CHILD&&(e._$AP??=si,e._$AQ??=oi)},Re=class extends Se{constructor(){super(...arguments),this._$AN=void 0}_$AT(r,t,i){super._$AT(r,t,i),Rt(this),this.isConnected=r._$AU}_$AO(r,t=!0){r!==this.isConnected&&(this.isConnected=r,r?this.reconnected?.():this.disconnected?.()),t&&(ae(this,r),Te(this))}setValue(r){if(St(this._$Ct))this._$Ct._$AI(r,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=r,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}};var Mt=()=>new Ke,Ke=class{},We=new WeakMap,Lt=Ve(class extends Re{render(e){return b}update(e,[r]){let t=r!==this.G;return t&&this.rt(void 0),(t||this.lt!==this.ct)&&(this.G=r,this.ht=e.options?.host,this.rt(this.ct=e.element)),b}rt(e){if(this.G!==void 0)if(this.isConnected||(e=void 0),typeof this.G=="function"){let r=this.ht??globalThis,t=We.get(r);t===void 0&&(t=new WeakMap,We.set(r,t)),t.get(this.G)!==void 0&&this.G.call(this.ht,void 0),t.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return typeof this.G=="function"?We.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});var Ot="smart_icons.rules_cache.v1",Me=class{constructor(){this.rules=new Map;this.listeners=new Set;this.unsubscribe=null}hydrateFromCache(){try{let r=localStorage.getItem(Ot);if(!r)return 0;let i=JSON.parse(r)?.rules;return!Array.isArray(i)||i.length===0?0:(this.rules=new Map(i.map(n=>[n.id,n])),this.emit(),i.length)}catch{return 0}}async connect(r){let t=await r.sendMessagePromise({type:"smart_icons/list"});this.rules=new Map(t.rules.map(i=>[i.id,i])),this.writeCache(),this.emit(),this.unsubscribe=await r.subscribeMessage(i=>this.handleEvent(i),{type:"smart_icons/subscribe"})}async disconnect(){this.unsubscribe&&(await this.unsubscribe(),this.unsubscribe=null),this.rules.clear(),this.listeners.clear()}all(){return[...this.rules.values()]}byTarget(r){let t=[];for(let i of this.rules.values())i.targets.includes(r)&&t.push(i);return t}sources(){let r=new Set;for(let t of this.rules.values())t.enabled&&r.add(t.source);return r}subscribe(r){return this.listeners.add(r),r(this.all()),()=>this.listeners.delete(r)}handleEvent(r){r.type==="removed"?this.rules.delete(r.id):this.rules.set(r.id,r.rule),this.writeCache(),this.emit()}writeCache(){try{localStorage.setItem(Ot,JSON.stringify({rules:this.all()}))}catch{}}emit(){let r=this.all();for(let t of this.listeners)t(r)}};var Ft=ve`
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
  /* Panel-level action bar (visual mode: just the toggle link;
     code mode: toggle on left, Save on right). Mirrors the editor's
     .actions bar but lives directly in the panel content rather than
     inside a dialog. Not sticky — the panel scrolls as a whole. */
  .panel-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color, #e0e0e0);
  }
  /* Action row at the bottom of an ha-dialog body — the workaround
     for modern ha-dialog dropping its primaryAction / secondaryAction
     named slots. Right-aligns Cancel + Confirm to match HA's own
     visual convention for confirmation modals. */
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  /* "Show code editor" / "Show visual editor" toggle. Plain text in
     the primary color — matches HA's automation-editor pattern. */
  .text-toggle {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    cursor: pointer;
    font: inherit;
    font-size: 0.95em;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 0;
  }
  .text-toggle:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  .text-toggle:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  .text-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* YAML textarea for the panel's whole-config code view. Same shape
     as the editor's .yaml-area (the two stylesheets are scoped to
     different shadow roots, so each one declares it once). */
  .yaml-area {
    width: 100%;
    min-height: 420px;
    max-height: 70vh;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--code-editor-background-color, var(--card-background-color, #fff));
    color: var(--primary-text-color, #212121);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.9em;
    line-height: 1.4;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }
  .yaml-area:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }
  /* Inline error block below the YAML textarea (parse failures,
     server validation failures, transport errors). Wider than the
     table's action-error banner — this surface accepts a free-form
     message and an optional clickable per-rule list. */
  .inline-error {
    margin: 12px 0 0;
    padding: 8px 12px;
    color: var(--warning-color, #ff9800);
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 8%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.9em;
  }
  .inline-error-message {
    white-space: pre-wrap;
  }
  /* Per-rule error list — clicking an item focuses the textarea and
     selects the failing rule's lines. Render as plain buttons so the
     whole row is the click target and keyboard navigation works. */
  .rule-error-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .rule-error-list li {
    margin: 2px 0;
  }
  .rule-error-item {
    background: none;
    border: none;
    text-align: left;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 4px 6px;
    border-radius: 3px;
    width: 100%;
    display: block;
    white-space: pre-wrap;
  }
  .rule-error-item::before {
    content: '▸ ';
    font-weight: bold;
  }
  .rule-error-item:hover {
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 16%,
      transparent
    );
  }
  .rule-error-item:focus-visible {
    outline: 2px solid var(--warning-color, #ff9800);
    outline-offset: 1px;
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
`,Nt=ve`
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
     separated from the content.

     Layout matches HA's automation editor: a "Show code editor" /
     "Show visual editor" toggle on the left (text-style button),
     Cancel + Save on the right. justify-content: space-between
     pushes them apart with the toggle anchored left. */
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--card-background-color, #fff);
    border-top: 1px solid var(--divider-color, #e0e0e0);
    z-index: 1;
  }
  .actions-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  /* "Show code editor" / "Show visual editor" toggle in the action bar.
     Plain text styled with the primary color — matches HA's
     automation-editor pattern (no button background, no border,
     subtle hover background only). */
  .text-toggle {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    cursor: pointer;
    font: inherit;
    font-size: 0.95em;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 0;
  }
  .text-toggle:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  .text-toggle:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  /* YAML textarea used by the editor's code-editor mode. Same shape
     as the panel's import dialog (the panel duplicates this in its
     own stylesheet — both use HA's CSS variables for theming). */
  .yaml-area {
    width: 100%;
    min-height: 320px;
    max-height: 60vh;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--code-editor-background-color, var(--card-background-color, #fff));
    color: var(--primary-text-color, #212121);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.9em;
    line-height: 1.4;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }
  .yaml-area:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
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
`;function Jt(e){return typeof e>"u"||e===null}function li(e){return typeof e=="object"&&e!==null}function ci(e){return Array.isArray(e)?e:Jt(e)?[]:[e]}function ui(e,r){var t,i,n,o;if(r)for(o=Object.keys(r),t=0,i=o.length;t<i;t+=1)n=o[t],e[n]=r[n];return e}function di(e,r){var t="",i;for(i=0;i<r;i+=1)t+=e;return t}function pi(e){return e===0&&Number.NEGATIVE_INFINITY===1/e}var hi=Jt,fi=li,gi=ci,mi=di,vi=pi,bi=ui,E={isNothing:hi,isObject:fi,toArray:gi,repeat:mi,isNegativeZero:vi,extend:bi};function Xt(e,r){var t="",i=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(t+='in "'+e.mark.name+'" '),t+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!r&&e.mark.snippet&&(t+=`

`+e.mark.snippet),i+" "+t):i}function ce(e,r){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=r,this.message=Xt(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error().stack||""}ce.prototype=Object.create(Error.prototype);ce.prototype.constructor=ce;ce.prototype.toString=function(r){return this.name+": "+Xt(this,r)};var S=ce;function Qe(e,r,t,i,n){var o="",s="",a=Math.floor(n/2)-1;return i-r>a&&(o=" ... ",r=i-a+o.length),t-i>a&&(s=" ...",t=i+a-s.length),{str:o+e.slice(r,t).replace(/\t/g,"\u2192")+s,pos:i-r+o.length}}function Je(e,r){return E.repeat(" ",r-e.length)+e}function xi(e,r){if(r=Object.create(r||null),!e.buffer)return null;r.maxLength||(r.maxLength=79),typeof r.indent!="number"&&(r.indent=1),typeof r.linesBefore!="number"&&(r.linesBefore=3),typeof r.linesAfter!="number"&&(r.linesAfter=2);for(var t=/\r?\n|\r|\0/g,i=[0],n=[],o,s=-1;o=t.exec(e.buffer);)n.push(o.index),i.push(o.index+o[0].length),e.position<=o.index&&s<0&&(s=i.length-2);s<0&&(s=i.length-1);var a="",l,c,d=Math.min(e.line+r.linesAfter,n.length).toString().length,u=r.maxLength-(r.indent+d+3);for(l=1;l<=r.linesBefore&&!(s-l<0);l++)c=Qe(e.buffer,i[s-l],n[s-l],e.position-(i[s]-i[s-l]),u),a=E.repeat(" ",r.indent)+Je((e.line-l+1).toString(),d)+" | "+c.str+`
`+a;for(c=Qe(e.buffer,i[s],n[s],e.position,u),a+=E.repeat(" ",r.indent)+Je((e.line+1).toString(),d)+" | "+c.str+`
`,a+=E.repeat("-",r.indent+d+3+c.pos)+`^
`,l=1;l<=r.linesAfter&&!(s+l>=n.length);l++)c=Qe(e.buffer,i[s+l],n[s+l],e.position-(i[s]-i[s+l]),u),a+=E.repeat(" ",r.indent)+Je((e.line+l+1).toString(),d)+" | "+c.str+`
`;return a.replace(/\n$/,"")}var yi=xi,wi=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],Ai=["scalar","sequence","mapping"];function _i(e){var r={};return e!==null&&Object.keys(e).forEach(function(t){e[t].forEach(function(i){r[String(i)]=t})}),r}function Ei(e,r){if(r=r||{},Object.keys(r).forEach(function(t){if(wi.indexOf(t)===-1)throw new S('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')}),this.options=r,this.tag=e,this.kind=r.kind||null,this.resolve=r.resolve||function(){return!0},this.construct=r.construct||function(t){return t},this.instanceOf=r.instanceOf||null,this.predicate=r.predicate||null,this.represent=r.represent||null,this.representName=r.representName||null,this.defaultStyle=r.defaultStyle||null,this.multi=r.multi||!1,this.styleAliases=_i(r.styleAliases||null),Ai.indexOf(this.kind)===-1)throw new S('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')}var k=Ei;function Dt(e,r){var t=[];return e[r].forEach(function(i){var n=t.length;t.forEach(function(o,s){o.tag===i.tag&&o.kind===i.kind&&o.multi===i.multi&&(n=s)}),t[n]=i}),t}function $i(){var e={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}},r,t;function i(n){n.multi?(e.multi[n.kind].push(n),e.multi.fallback.push(n)):e[n.kind][n.tag]=e.fallback[n.tag]=n}for(r=0,t=arguments.length;r<t;r+=1)arguments[r].forEach(i);return e}function Ze(e){return this.extend(e)}Ze.prototype.extend=function(r){var t=[],i=[];if(r instanceof k)i.push(r);else if(Array.isArray(r))i=i.concat(r);else if(r&&(Array.isArray(r.implicit)||Array.isArray(r.explicit)))r.implicit&&(t=t.concat(r.implicit)),r.explicit&&(i=i.concat(r.explicit));else throw new S("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");t.forEach(function(o){if(!(o instanceof k))throw new S("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(o.loadKind&&o.loadKind!=="scalar")throw new S("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(o.multi)throw new S("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),i.forEach(function(o){if(!(o instanceof k))throw new S("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var n=Object.create(Ze.prototype);return n.implicit=(this.implicit||[]).concat(t),n.explicit=(this.explicit||[]).concat(i),n.compiledImplicit=Dt(n,"implicit"),n.compiledExplicit=Dt(n,"explicit"),n.compiledTypeMap=$i(n.compiledImplicit,n.compiledExplicit),n};var Zt=Ze,er=new k("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return e!==null?e:""}}),tr=new k("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return e!==null?e:[]}}),rr=new k("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return e!==null?e:{}}}),ir=new Zt({explicit:[er,tr,rr]});function ki(e){if(e===null)return!0;var r=e.length;return r===1&&e==="~"||r===4&&(e==="null"||e==="Null"||e==="NULL")}function Ci(){return null}function Si(e){return e===null}var nr=new k("tag:yaml.org,2002:null",{kind:"scalar",resolve:ki,construct:Ci,predicate:Si,represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"});function Ti(e){if(e===null)return!1;var r=e.length;return r===4&&(e==="true"||e==="True"||e==="TRUE")||r===5&&(e==="false"||e==="False"||e==="FALSE")}function Ri(e){return e==="true"||e==="True"||e==="TRUE"}function Mi(e){return Object.prototype.toString.call(e)==="[object Boolean]"}var or=new k("tag:yaml.org,2002:bool",{kind:"scalar",resolve:Ti,construct:Ri,predicate:Mi,represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function Li(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function Oi(e){return 48<=e&&e<=55}function Fi(e){return 48<=e&&e<=57}function Ni(e){if(e===null)return!1;var r=e.length,t=0,i=!1,n;if(!r)return!1;if(n=e[t],(n==="-"||n==="+")&&(n=e[++t]),n==="0"){if(t+1===r)return!0;if(n=e[++t],n==="b"){for(t++;t<r;t++)if(n=e[t],n!=="_"){if(n!=="0"&&n!=="1")return!1;i=!0}return i&&n!=="_"}if(n==="x"){for(t++;t<r;t++)if(n=e[t],n!=="_"){if(!Li(e.charCodeAt(t)))return!1;i=!0}return i&&n!=="_"}if(n==="o"){for(t++;t<r;t++)if(n=e[t],n!=="_"){if(!Oi(e.charCodeAt(t)))return!1;i=!0}return i&&n!=="_"}}if(n==="_")return!1;for(;t<r;t++)if(n=e[t],n!=="_"){if(!Fi(e.charCodeAt(t)))return!1;i=!0}return!(!i||n==="_")}function Di(e){var r=e,t=1,i;if(r.indexOf("_")!==-1&&(r=r.replace(/_/g,"")),i=r[0],(i==="-"||i==="+")&&(i==="-"&&(t=-1),r=r.slice(1),i=r[0]),r==="0")return 0;if(i==="0"){if(r[1]==="b")return t*parseInt(r.slice(2),2);if(r[1]==="x")return t*parseInt(r.slice(2),16);if(r[1]==="o")return t*parseInt(r.slice(2),8)}return t*parseInt(r,10)}function Ii(e){return Object.prototype.toString.call(e)==="[object Number]"&&e%1===0&&!E.isNegativeZero(e)}var sr=new k("tag:yaml.org,2002:int",{kind:"scalar",resolve:Ni,construct:Di,predicate:Ii,represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),Pi=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");function Hi(e){return!(e===null||!Pi.test(e)||e[e.length-1]==="_")}function ji(e){var r,t;return r=e.replace(/_/g,"").toLowerCase(),t=r[0]==="-"?-1:1,"+-".indexOf(r[0])>=0&&(r=r.slice(1)),r===".inf"?t===1?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:r===".nan"?NaN:t*parseFloat(r,10)}var Ui=/^[-+]?[0-9]+e/;function Bi(e,r){var t;if(isNaN(e))switch(r){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(r){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(r){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(E.isNegativeZero(e))return"-0.0";return t=e.toString(10),Ui.test(t)?t.replace("e",".e"):t}function Yi(e){return Object.prototype.toString.call(e)==="[object Number]"&&(e%1!==0||E.isNegativeZero(e))}var ar=new k("tag:yaml.org,2002:float",{kind:"scalar",resolve:Hi,construct:ji,predicate:Yi,represent:Bi,defaultStyle:"lowercase"}),lr=ir.extend({implicit:[nr,or,sr,ar]}),cr=lr,ur=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),dr=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");function zi(e){return e===null?!1:ur.exec(e)!==null||dr.exec(e)!==null}function Gi(e){var r,t,i,n,o,s,a,l=0,c=null,d,u,p;if(r=ur.exec(e),r===null&&(r=dr.exec(e)),r===null)throw new Error("Date resolve error");if(t=+r[1],i=+r[2]-1,n=+r[3],!r[4])return new Date(Date.UTC(t,i,n));if(o=+r[4],s=+r[5],a=+r[6],r[7]){for(l=r[7].slice(0,3);l.length<3;)l+="0";l=+l}return r[9]&&(d=+r[10],u=+(r[11]||0),c=(d*60+u)*6e4,r[9]==="-"&&(c=-c)),p=new Date(Date.UTC(t,i,n,o,s,a,l)),c&&p.setTime(p.getTime()-c),p}function qi(e){return e.toISOString()}var pr=new k("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:zi,construct:Gi,instanceOf:Date,represent:qi});function Vi(e){return e==="<<"||e===null}var hr=new k("tag:yaml.org,2002:merge",{kind:"scalar",resolve:Vi}),nt=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;function Wi(e){if(e===null)return!1;var r,t,i=0,n=e.length,o=nt;for(t=0;t<n;t++)if(r=o.indexOf(e.charAt(t)),!(r>64)){if(r<0)return!1;i+=6}return i%8===0}function Ki(e){var r,t,i=e.replace(/[\r\n=]/g,""),n=i.length,o=nt,s=0,a=[];for(r=0;r<n;r++)r%4===0&&r&&(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)),s=s<<6|o.indexOf(i.charAt(r));return t=n%4*6,t===0?(a.push(s>>16&255),a.push(s>>8&255),a.push(s&255)):t===18?(a.push(s>>10&255),a.push(s>>2&255)):t===12&&a.push(s>>4&255),new Uint8Array(a)}function Qi(e){var r="",t=0,i,n,o=e.length,s=nt;for(i=0;i<o;i++)i%3===0&&i&&(r+=s[t>>18&63],r+=s[t>>12&63],r+=s[t>>6&63],r+=s[t&63]),t=(t<<8)+e[i];return n=o%3,n===0?(r+=s[t>>18&63],r+=s[t>>12&63],r+=s[t>>6&63],r+=s[t&63]):n===2?(r+=s[t>>10&63],r+=s[t>>4&63],r+=s[t<<2&63],r+=s[64]):n===1&&(r+=s[t>>2&63],r+=s[t<<4&63],r+=s[64],r+=s[64]),r}function Ji(e){return Object.prototype.toString.call(e)==="[object Uint8Array]"}var fr=new k("tag:yaml.org,2002:binary",{kind:"scalar",resolve:Wi,construct:Ki,predicate:Ji,represent:Qi}),Xi=Object.prototype.hasOwnProperty,Zi=Object.prototype.toString;function en(e){if(e===null)return!0;var r=[],t,i,n,o,s,a=e;for(t=0,i=a.length;t<i;t+=1){if(n=a[t],s=!1,Zi.call(n)!=="[object Object]")return!1;for(o in n)if(Xi.call(n,o))if(!s)s=!0;else return!1;if(!s)return!1;if(r.indexOf(o)===-1)r.push(o);else return!1}return!0}function tn(e){return e!==null?e:[]}var gr=new k("tag:yaml.org,2002:omap",{kind:"sequence",resolve:en,construct:tn}),rn=Object.prototype.toString;function nn(e){if(e===null)return!0;var r,t,i,n,o,s=e;for(o=new Array(s.length),r=0,t=s.length;r<t;r+=1){if(i=s[r],rn.call(i)!=="[object Object]"||(n=Object.keys(i),n.length!==1))return!1;o[r]=[n[0],i[n[0]]]}return!0}function on(e){if(e===null)return[];var r,t,i,n,o,s=e;for(o=new Array(s.length),r=0,t=s.length;r<t;r+=1)i=s[r],n=Object.keys(i),o[r]=[n[0],i[n[0]]];return o}var mr=new k("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:nn,construct:on}),sn=Object.prototype.hasOwnProperty;function an(e){if(e===null)return!0;var r,t=e;for(r in t)if(sn.call(t,r)&&t[r]!==null)return!1;return!0}function ln(e){return e!==null?e:{}}var vr=new k("tag:yaml.org,2002:set",{kind:"mapping",resolve:an,construct:ln}),ot=cr.extend({implicit:[pr,hr],explicit:[fr,gr,mr,vr]}),H=Object.prototype.hasOwnProperty,Le=1,br=2,xr=3,Oe=4,Xe=1,cn=2,It=3,un=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,dn=/[\x85\u2028\u2029]/,pn=/[,\[\]\{\}]/,yr=/^(?:!|!!|![a-z\-]+!)$/i,wr=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function Pt(e){return Object.prototype.toString.call(e)}function O(e){return e===10||e===13}function V(e){return e===9||e===32}function T(e){return e===9||e===32||e===10||e===13}function J(e){return e===44||e===91||e===93||e===123||e===125}function hn(e){var r;return 48<=e&&e<=57?e-48:(r=e|32,97<=r&&r<=102?r-97+10:-1)}function fn(e){return e===120?2:e===117?4:e===85?8:0}function gn(e){return 48<=e&&e<=57?e-48:-1}function Ht(e){return e===48?"\0":e===97?"\x07":e===98?"\b":e===116||e===9?"	":e===110?`
`:e===118?"\v":e===102?"\f":e===114?"\r":e===101?"\x1B":e===32?" ":e===34?'"':e===47?"/":e===92?"\\":e===78?"\x85":e===95?"\xA0":e===76?"\u2028":e===80?"\u2029":""}function mn(e){return e<=65535?String.fromCharCode(e):String.fromCharCode((e-65536>>10)+55296,(e-65536&1023)+56320)}function Ar(e,r,t){r==="__proto__"?Object.defineProperty(e,r,{configurable:!0,enumerable:!0,writable:!0,value:t}):e[r]=t}var _r=new Array(256),Er=new Array(256);for(q=0;q<256;q++)_r[q]=Ht(q)?1:0,Er[q]=Ht(q);var q;function vn(e,r){this.input=e,this.filename=r.filename||null,this.schema=r.schema||ot,this.onWarning=r.onWarning||null,this.legacy=r.legacy||!1,this.json=r.json||!1,this.listener=r.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function $r(e,r){var t={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return t.snippet=yi(t),new S(r,t)}function f(e,r){throw $r(e,r)}function Fe(e,r){e.onWarning&&e.onWarning.call(null,$r(e,r))}var jt={YAML:function(r,t,i){var n,o,s;r.version!==null&&f(r,"duplication of %YAML directive"),i.length!==1&&f(r,"YAML directive accepts exactly one argument"),n=/^([0-9]+)\.([0-9]+)$/.exec(i[0]),n===null&&f(r,"ill-formed argument of the YAML directive"),o=parseInt(n[1],10),s=parseInt(n[2],10),o!==1&&f(r,"unacceptable YAML version of the document"),r.version=i[0],r.checkLineBreaks=s<2,s!==1&&s!==2&&Fe(r,"unsupported YAML version of the document")},TAG:function(r,t,i){var n,o;i.length!==2&&f(r,"TAG directive accepts exactly two arguments"),n=i[0],o=i[1],yr.test(n)||f(r,"ill-formed tag handle (first argument) of the TAG directive"),H.call(r.tagMap,n)&&f(r,'there is a previously declared suffix for "'+n+'" tag handle'),wr.test(o)||f(r,"ill-formed tag prefix (second argument) of the TAG directive");try{o=decodeURIComponent(o)}catch{f(r,"tag prefix is malformed: "+o)}r.tagMap[n]=o}};function P(e,r,t,i){var n,o,s,a;if(r<t){if(a=e.input.slice(r,t),i)for(n=0,o=a.length;n<o;n+=1)s=a.charCodeAt(n),s===9||32<=s&&s<=1114111||f(e,"expected valid JSON character");else un.test(a)&&f(e,"the stream contains non-printable characters");e.result+=a}}function Ut(e,r,t,i){var n,o,s,a;for(E.isObject(t)||f(e,"cannot merge mappings; the provided source object is unacceptable"),n=Object.keys(t),s=0,a=n.length;s<a;s+=1)o=n[s],H.call(r,o)||(Ar(r,o,t[o]),i[o]=!0)}function X(e,r,t,i,n,o,s,a,l){var c,d;if(Array.isArray(n))for(n=Array.prototype.slice.call(n),c=0,d=n.length;c<d;c+=1)Array.isArray(n[c])&&f(e,"nested arrays are not supported inside keys"),typeof n=="object"&&Pt(n[c])==="[object Object]"&&(n[c]="[object Object]");if(typeof n=="object"&&Pt(n)==="[object Object]"&&(n="[object Object]"),n=String(n),r===null&&(r={}),i==="tag:yaml.org,2002:merge")if(Array.isArray(o))for(c=0,d=o.length;c<d;c+=1)Ut(e,r,o[c],t);else Ut(e,r,o,t);else!e.json&&!H.call(t,n)&&H.call(r,n)&&(e.line=s||e.line,e.lineStart=a||e.lineStart,e.position=l||e.position,f(e,"duplicated mapping key")),Ar(r,n,o),delete t[n];return r}function st(e){var r;r=e.input.charCodeAt(e.position),r===10?e.position++:r===13?(e.position++,e.input.charCodeAt(e.position)===10&&e.position++):f(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function A(e,r,t){for(var i=0,n=e.input.charCodeAt(e.position);n!==0;){for(;V(n);)n===9&&e.firstTabInLine===-1&&(e.firstTabInLine=e.position),n=e.input.charCodeAt(++e.position);if(r&&n===35)do n=e.input.charCodeAt(++e.position);while(n!==10&&n!==13&&n!==0);if(O(n))for(st(e),n=e.input.charCodeAt(e.position),i++,e.lineIndent=0;n===32;)e.lineIndent++,n=e.input.charCodeAt(++e.position);else break}return t!==-1&&i!==0&&e.lineIndent<t&&Fe(e,"deficient indentation"),i}function Ie(e){var r=e.position,t;return t=e.input.charCodeAt(r),!!((t===45||t===46)&&t===e.input.charCodeAt(r+1)&&t===e.input.charCodeAt(r+2)&&(r+=3,t=e.input.charCodeAt(r),t===0||T(t)))}function at(e,r){r===1?e.result+=" ":r>1&&(e.result+=E.repeat(`
`,r-1))}function bn(e,r,t){var i,n,o,s,a,l,c,d,u=e.kind,p=e.result,h;if(h=e.input.charCodeAt(e.position),T(h)||J(h)||h===35||h===38||h===42||h===33||h===124||h===62||h===39||h===34||h===37||h===64||h===96||(h===63||h===45)&&(n=e.input.charCodeAt(e.position+1),T(n)||t&&J(n)))return!1;for(e.kind="scalar",e.result="",o=s=e.position,a=!1;h!==0;){if(h===58){if(n=e.input.charCodeAt(e.position+1),T(n)||t&&J(n))break}else if(h===35){if(i=e.input.charCodeAt(e.position-1),T(i))break}else{if(e.position===e.lineStart&&Ie(e)||t&&J(h))break;if(O(h))if(l=e.line,c=e.lineStart,d=e.lineIndent,A(e,!1,-1),e.lineIndent>=r){a=!0,h=e.input.charCodeAt(e.position);continue}else{e.position=s,e.line=l,e.lineStart=c,e.lineIndent=d;break}}a&&(P(e,o,s,!1),at(e,e.line-l),o=s=e.position,a=!1),V(h)||(s=e.position+1),h=e.input.charCodeAt(++e.position)}return P(e,o,s,!1),e.result?!0:(e.kind=u,e.result=p,!1)}function xn(e,r){var t,i,n;if(t=e.input.charCodeAt(e.position),t!==39)return!1;for(e.kind="scalar",e.result="",e.position++,i=n=e.position;(t=e.input.charCodeAt(e.position))!==0;)if(t===39)if(P(e,i,e.position,!0),t=e.input.charCodeAt(++e.position),t===39)i=e.position,e.position++,n=e.position;else return!0;else O(t)?(P(e,i,n,!0),at(e,A(e,!1,r)),i=n=e.position):e.position===e.lineStart&&Ie(e)?f(e,"unexpected end of the document within a single quoted scalar"):(e.position++,n=e.position);f(e,"unexpected end of the stream within a single quoted scalar")}function yn(e,r){var t,i,n,o,s,a;if(a=e.input.charCodeAt(e.position),a!==34)return!1;for(e.kind="scalar",e.result="",e.position++,t=i=e.position;(a=e.input.charCodeAt(e.position))!==0;){if(a===34)return P(e,t,e.position,!0),e.position++,!0;if(a===92){if(P(e,t,e.position,!0),a=e.input.charCodeAt(++e.position),O(a))A(e,!1,r);else if(a<256&&_r[a])e.result+=Er[a],e.position++;else if((s=fn(a))>0){for(n=s,o=0;n>0;n--)a=e.input.charCodeAt(++e.position),(s=hn(a))>=0?o=(o<<4)+s:f(e,"expected hexadecimal character");e.result+=mn(o),e.position++}else f(e,"unknown escape sequence");t=i=e.position}else O(a)?(P(e,t,i,!0),at(e,A(e,!1,r)),t=i=e.position):e.position===e.lineStart&&Ie(e)?f(e,"unexpected end of the document within a double quoted scalar"):(e.position++,i=e.position)}f(e,"unexpected end of the stream within a double quoted scalar")}function wn(e,r){var t=!0,i,n,o,s=e.tag,a,l=e.anchor,c,d,u,p,h,m=Object.create(null),x,w,M,v;if(v=e.input.charCodeAt(e.position),v===91)d=93,h=!1,a=[];else if(v===123)d=125,h=!0,a={};else return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=a),v=e.input.charCodeAt(++e.position);v!==0;){if(A(e,!0,r),v=e.input.charCodeAt(e.position),v===d)return e.position++,e.tag=s,e.anchor=l,e.kind=h?"mapping":"sequence",e.result=a,!0;t?v===44&&f(e,"expected the node content, but found ','"):f(e,"missed comma between flow collection entries"),w=x=M=null,u=p=!1,v===63&&(c=e.input.charCodeAt(e.position+1),T(c)&&(u=p=!0,e.position++,A(e,!0,r))),i=e.line,n=e.lineStart,o=e.position,Z(e,r,Le,!1,!0),w=e.tag,x=e.result,A(e,!0,r),v=e.input.charCodeAt(e.position),(p||e.line===i)&&v===58&&(u=!0,v=e.input.charCodeAt(++e.position),A(e,!0,r),Z(e,r,Le,!1,!0),M=e.result),h?X(e,a,m,w,x,M,i,n,o):u?a.push(X(e,null,m,w,x,M,i,n,o)):a.push(x),A(e,!0,r),v=e.input.charCodeAt(e.position),v===44?(t=!0,v=e.input.charCodeAt(++e.position)):t=!1}f(e,"unexpected end of the stream within a flow collection")}function An(e,r){var t,i,n=Xe,o=!1,s=!1,a=r,l=0,c=!1,d,u;if(u=e.input.charCodeAt(e.position),u===124)i=!1;else if(u===62)i=!0;else return!1;for(e.kind="scalar",e.result="";u!==0;)if(u=e.input.charCodeAt(++e.position),u===43||u===45)Xe===n?n=u===43?It:cn:f(e,"repeat of a chomping mode identifier");else if((d=gn(u))>=0)d===0?f(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):s?f(e,"repeat of an indentation width identifier"):(a=r+d-1,s=!0);else break;if(V(u)){do u=e.input.charCodeAt(++e.position);while(V(u));if(u===35)do u=e.input.charCodeAt(++e.position);while(!O(u)&&u!==0)}for(;u!==0;){for(st(e),e.lineIndent=0,u=e.input.charCodeAt(e.position);(!s||e.lineIndent<a)&&u===32;)e.lineIndent++,u=e.input.charCodeAt(++e.position);if(!s&&e.lineIndent>a&&(a=e.lineIndent),O(u)){l++;continue}if(e.lineIndent<a){n===It?e.result+=E.repeat(`
`,o?1+l:l):n===Xe&&o&&(e.result+=`
`);break}for(i?V(u)?(c=!0,e.result+=E.repeat(`
`,o?1+l:l)):c?(c=!1,e.result+=E.repeat(`
`,l+1)):l===0?o&&(e.result+=" "):e.result+=E.repeat(`
`,l):e.result+=E.repeat(`
`,o?1+l:l),o=!0,s=!0,l=0,t=e.position;!O(u)&&u!==0;)u=e.input.charCodeAt(++e.position);P(e,t,e.position,!1)}return!0}function Bt(e,r){var t,i=e.tag,n=e.anchor,o=[],s,a=!1,l;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=o),l=e.input.charCodeAt(e.position);l!==0&&(e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,f(e,"tab characters must not be used in indentation")),!(l!==45||(s=e.input.charCodeAt(e.position+1),!T(s))));){if(a=!0,e.position++,A(e,!0,-1)&&e.lineIndent<=r){o.push(null),l=e.input.charCodeAt(e.position);continue}if(t=e.line,Z(e,r,xr,!1,!0),o.push(e.result),A(e,!0,-1),l=e.input.charCodeAt(e.position),(e.line===t||e.lineIndent>r)&&l!==0)f(e,"bad indentation of a sequence entry");else if(e.lineIndent<r)break}return a?(e.tag=i,e.anchor=n,e.kind="sequence",e.result=o,!0):!1}function _n(e,r,t){var i,n,o,s,a,l,c=e.tag,d=e.anchor,u={},p=Object.create(null),h=null,m=null,x=null,w=!1,M=!1,v;if(e.firstTabInLine!==-1)return!1;for(e.anchor!==null&&(e.anchorMap[e.anchor]=u),v=e.input.charCodeAt(e.position);v!==0;){if(!w&&e.firstTabInLine!==-1&&(e.position=e.firstTabInLine,f(e,"tab characters must not be used in indentation")),i=e.input.charCodeAt(e.position+1),o=e.line,(v===63||v===58)&&T(i))v===63?(w&&(X(e,u,p,h,m,null,s,a,l),h=m=x=null),M=!0,w=!0,n=!0):w?(w=!1,n=!0):f(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,v=i;else{if(s=e.line,a=e.lineStart,l=e.position,!Z(e,t,br,!1,!0))break;if(e.line===o){for(v=e.input.charCodeAt(e.position);V(v);)v=e.input.charCodeAt(++e.position);if(v===58)v=e.input.charCodeAt(++e.position),T(v)||f(e,"a whitespace character is expected after the key-value separator within a block mapping"),w&&(X(e,u,p,h,m,null,s,a,l),h=m=x=null),M=!0,w=!1,n=!1,h=e.tag,m=e.result;else if(M)f(e,"can not read an implicit mapping pair; a colon is missed");else return e.tag=c,e.anchor=d,!0}else if(M)f(e,"can not read a block mapping entry; a multiline key may not be an implicit key");else return e.tag=c,e.anchor=d,!0}if((e.line===o||e.lineIndent>r)&&(w&&(s=e.line,a=e.lineStart,l=e.position),Z(e,r,Oe,!0,n)&&(w?m=e.result:x=e.result),w||(X(e,u,p,h,m,x,s,a,l),h=m=x=null),A(e,!0,-1),v=e.input.charCodeAt(e.position)),(e.line===o||e.lineIndent>r)&&v!==0)f(e,"bad indentation of a mapping entry");else if(e.lineIndent<r)break}return w&&X(e,u,p,h,m,null,s,a,l),M&&(e.tag=c,e.anchor=d,e.kind="mapping",e.result=u),M}function En(e){var r,t=!1,i=!1,n,o,s;if(s=e.input.charCodeAt(e.position),s!==33)return!1;if(e.tag!==null&&f(e,"duplication of a tag property"),s=e.input.charCodeAt(++e.position),s===60?(t=!0,s=e.input.charCodeAt(++e.position)):s===33?(i=!0,n="!!",s=e.input.charCodeAt(++e.position)):n="!",r=e.position,t){do s=e.input.charCodeAt(++e.position);while(s!==0&&s!==62);e.position<e.length?(o=e.input.slice(r,e.position),s=e.input.charCodeAt(++e.position)):f(e,"unexpected end of the stream within a verbatim tag")}else{for(;s!==0&&!T(s);)s===33&&(i?f(e,"tag suffix cannot contain exclamation marks"):(n=e.input.slice(r-1,e.position+1),yr.test(n)||f(e,"named tag handle cannot contain such characters"),i=!0,r=e.position+1)),s=e.input.charCodeAt(++e.position);o=e.input.slice(r,e.position),pn.test(o)&&f(e,"tag suffix cannot contain flow indicator characters")}o&&!wr.test(o)&&f(e,"tag name cannot contain such characters: "+o);try{o=decodeURIComponent(o)}catch{f(e,"tag name is malformed: "+o)}return t?e.tag=o:H.call(e.tagMap,n)?e.tag=e.tagMap[n]+o:n==="!"?e.tag="!"+o:n==="!!"?e.tag="tag:yaml.org,2002:"+o:f(e,'undeclared tag handle "'+n+'"'),!0}function $n(e){var r,t;if(t=e.input.charCodeAt(e.position),t!==38)return!1;for(e.anchor!==null&&f(e,"duplication of an anchor property"),t=e.input.charCodeAt(++e.position),r=e.position;t!==0&&!T(t)&&!J(t);)t=e.input.charCodeAt(++e.position);return e.position===r&&f(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(r,e.position),!0}function kn(e){var r,t,i;if(i=e.input.charCodeAt(e.position),i!==42)return!1;for(i=e.input.charCodeAt(++e.position),r=e.position;i!==0&&!T(i)&&!J(i);)i=e.input.charCodeAt(++e.position);return e.position===r&&f(e,"name of an alias node must contain at least one character"),t=e.input.slice(r,e.position),H.call(e.anchorMap,t)||f(e,'unidentified alias "'+t+'"'),e.result=e.anchorMap[t],A(e,!0,-1),!0}function Z(e,r,t,i,n){var o,s,a,l=1,c=!1,d=!1,u,p,h,m,x,w;if(e.listener!==null&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,o=s=a=Oe===t||xr===t,i&&A(e,!0,-1)&&(c=!0,e.lineIndent>r?l=1:e.lineIndent===r?l=0:e.lineIndent<r&&(l=-1)),l===1)for(;En(e)||$n(e);)A(e,!0,-1)?(c=!0,a=o,e.lineIndent>r?l=1:e.lineIndent===r?l=0:e.lineIndent<r&&(l=-1)):a=!1;if(a&&(a=c||n),(l===1||Oe===t)&&(Le===t||br===t?x=r:x=r+1,w=e.position-e.lineStart,l===1?a&&(Bt(e,w)||_n(e,w,x))||wn(e,x)?d=!0:(s&&An(e,x)||xn(e,x)||yn(e,x)?d=!0:kn(e)?(d=!0,(e.tag!==null||e.anchor!==null)&&f(e,"alias node should not have any properties")):bn(e,x,Le===t)&&(d=!0,e.tag===null&&(e.tag="?")),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):l===0&&(d=a&&Bt(e,w))),e.tag===null)e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);else if(e.tag==="?"){for(e.result!==null&&e.kind!=="scalar"&&f(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),u=0,p=e.implicitTypes.length;u<p;u+=1)if(m=e.implicitTypes[u],m.resolve(e.result)){e.result=m.construct(e.result),e.tag=m.tag,e.anchor!==null&&(e.anchorMap[e.anchor]=e.result);break}}else if(e.tag!=="!"){if(H.call(e.typeMap[e.kind||"fallback"],e.tag))m=e.typeMap[e.kind||"fallback"][e.tag];else for(m=null,h=e.typeMap.multi[e.kind||"fallback"],u=0,p=h.length;u<p;u+=1)if(e.tag.slice(0,h[u].tag.length)===h[u].tag){m=h[u];break}m||f(e,"unknown tag !<"+e.tag+">"),e.result!==null&&m.kind!==e.kind&&f(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+m.kind+'", not "'+e.kind+'"'),m.resolve(e.result,e.tag)?(e.result=m.construct(e.result,e.tag),e.anchor!==null&&(e.anchorMap[e.anchor]=e.result)):f(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return e.listener!==null&&e.listener("close",e),e.tag!==null||e.anchor!==null||d}function Cn(e){var r=e.position,t,i,n,o=!1,s;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);(s=e.input.charCodeAt(e.position))!==0&&(A(e,!0,-1),s=e.input.charCodeAt(e.position),!(e.lineIndent>0||s!==37));){for(o=!0,s=e.input.charCodeAt(++e.position),t=e.position;s!==0&&!T(s);)s=e.input.charCodeAt(++e.position);for(i=e.input.slice(t,e.position),n=[],i.length<1&&f(e,"directive name must not be less than one character in length");s!==0;){for(;V(s);)s=e.input.charCodeAt(++e.position);if(s===35){do s=e.input.charCodeAt(++e.position);while(s!==0&&!O(s));break}if(O(s))break;for(t=e.position;s!==0&&!T(s);)s=e.input.charCodeAt(++e.position);n.push(e.input.slice(t,e.position))}s!==0&&st(e),H.call(jt,i)?jt[i](e,i,n):Fe(e,'unknown document directive "'+i+'"')}if(A(e,!0,-1),e.lineIndent===0&&e.input.charCodeAt(e.position)===45&&e.input.charCodeAt(e.position+1)===45&&e.input.charCodeAt(e.position+2)===45?(e.position+=3,A(e,!0,-1)):o&&f(e,"directives end mark is expected"),Z(e,e.lineIndent-1,Oe,!1,!0),A(e,!0,-1),e.checkLineBreaks&&dn.test(e.input.slice(r,e.position))&&Fe(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&Ie(e)){e.input.charCodeAt(e.position)===46&&(e.position+=3,A(e,!0,-1));return}if(e.position<e.length-1)f(e,"end of the stream or a document separator is expected");else return}function kr(e,r){e=String(e),r=r||{},e.length!==0&&(e.charCodeAt(e.length-1)!==10&&e.charCodeAt(e.length-1)!==13&&(e+=`
`),e.charCodeAt(0)===65279&&(e=e.slice(1)));var t=new vn(e,r),i=e.indexOf("\0");for(i!==-1&&(t.position=i,f(t,"null byte is not allowed in input")),t.input+="\0";t.input.charCodeAt(t.position)===32;)t.lineIndent+=1,t.position+=1;for(;t.position<t.length-1;)Cn(t);return t.documents}function Sn(e,r,t){r!==null&&typeof r=="object"&&typeof t>"u"&&(t=r,r=null);var i=kr(e,t);if(typeof r!="function")return i;for(var n=0,o=i.length;n<o;n+=1)r(i[n])}function Tn(e,r){var t=kr(e,r);if(t.length!==0){if(t.length===1)return t[0];throw new S("expected a single document in the stream, but found more")}}var Rn=Sn,Mn=Tn,Cr={loadAll:Rn,load:Mn},Sr=Object.prototype.toString,Tr=Object.prototype.hasOwnProperty,lt=65279,Ln=9,ue=10,On=13,Fn=32,Nn=33,Dn=34,et=35,In=37,Pn=38,Hn=39,jn=42,Rr=44,Un=45,Ne=58,Bn=61,Yn=62,zn=63,Gn=64,Mr=91,Lr=93,qn=96,Or=123,Vn=124,Fr=125,C={};C[0]="\\0";C[7]="\\a";C[8]="\\b";C[9]="\\t";C[10]="\\n";C[11]="\\v";C[12]="\\f";C[13]="\\r";C[27]="\\e";C[34]='\\"';C[92]="\\\\";C[133]="\\N";C[160]="\\_";C[8232]="\\L";C[8233]="\\P";var Wn=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Kn=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Qn(e,r){var t,i,n,o,s,a,l;if(r===null)return{};for(t={},i=Object.keys(r),n=0,o=i.length;n<o;n+=1)s=i[n],a=String(r[s]),s.slice(0,2)==="!!"&&(s="tag:yaml.org,2002:"+s.slice(2)),l=e.compiledTypeMap.fallback[s],l&&Tr.call(l.styleAliases,a)&&(a=l.styleAliases[a]),t[s]=a;return t}function Jn(e){var r,t,i;if(r=e.toString(16).toUpperCase(),e<=255)t="x",i=2;else if(e<=65535)t="u",i=4;else if(e<=4294967295)t="U",i=8;else throw new S("code point within a string may not be greater than 0xFFFFFFFF");return"\\"+t+E.repeat("0",i-r.length)+r}var Xn=1,de=2;function Zn(e){this.schema=e.schema||ot,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=E.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=Qn(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType=e.quotingType==='"'?de:Xn,this.forceQuotes=e.forceQuotes||!1,this.replacer=typeof e.replacer=="function"?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Yt(e,r){for(var t=E.repeat(" ",r),i=0,n=-1,o="",s,a=e.length;i<a;)n=e.indexOf(`
`,i),n===-1?(s=e.slice(i),i=a):(s=e.slice(i,n+1),i=n+1),s.length&&s!==`
`&&(o+=t),o+=s;return o}function tt(e,r){return`
`+E.repeat(" ",e.indent*r)}function eo(e,r){var t,i,n;for(t=0,i=e.implicitTypes.length;t<i;t+=1)if(n=e.implicitTypes[t],n.resolve(r))return!0;return!1}function De(e){return e===Fn||e===Ln}function pe(e){return 32<=e&&e<=126||161<=e&&e<=55295&&e!==8232&&e!==8233||57344<=e&&e<=65533&&e!==lt||65536<=e&&e<=1114111}function zt(e){return pe(e)&&e!==lt&&e!==On&&e!==ue}function Gt(e,r,t){var i=zt(e),n=i&&!De(e);return(t?i:i&&e!==Rr&&e!==Mr&&e!==Lr&&e!==Or&&e!==Fr)&&e!==et&&!(r===Ne&&!n)||zt(r)&&!De(r)&&e===et||r===Ne&&n}function to(e){return pe(e)&&e!==lt&&!De(e)&&e!==Un&&e!==zn&&e!==Ne&&e!==Rr&&e!==Mr&&e!==Lr&&e!==Or&&e!==Fr&&e!==et&&e!==Pn&&e!==jn&&e!==Nn&&e!==Vn&&e!==Bn&&e!==Yn&&e!==Hn&&e!==Dn&&e!==In&&e!==Gn&&e!==qn}function ro(e){return!De(e)&&e!==Ne}function le(e,r){var t=e.charCodeAt(r),i;return t>=55296&&t<=56319&&r+1<e.length&&(i=e.charCodeAt(r+1),i>=56320&&i<=57343)?(t-55296)*1024+i-56320+65536:t}function Nr(e){var r=/^\n* /;return r.test(e)}var Dr=1,rt=2,Ir=3,Pr=4,Q=5;function io(e,r,t,i,n,o,s,a){var l,c=0,d=null,u=!1,p=!1,h=i!==-1,m=-1,x=to(le(e,0))&&ro(le(e,e.length-1));if(r||s)for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=le(e,l),!pe(c))return Q;x=x&&Gt(c,d,a),d=c}else{for(l=0;l<e.length;c>=65536?l+=2:l++){if(c=le(e,l),c===ue)u=!0,h&&(p=p||l-m-1>i&&e[m+1]!==" ",m=l);else if(!pe(c))return Q;x=x&&Gt(c,d,a),d=c}p=p||h&&l-m-1>i&&e[m+1]!==" "}return!u&&!p?x&&!s&&!n(e)?Dr:o===de?Q:rt:t>9&&Nr(e)?Q:s?o===de?Q:rt:p?Pr:Ir}function no(e,r,t,i,n){e.dump=(function(){if(r.length===0)return e.quotingType===de?'""':"''";if(!e.noCompatMode&&(Wn.indexOf(r)!==-1||Kn.test(r)))return e.quotingType===de?'"'+r+'"':"'"+r+"'";var o=e.indent*Math.max(1,t),s=e.lineWidth===-1?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-o),a=i||e.flowLevel>-1&&t>=e.flowLevel;function l(c){return eo(e,c)}switch(io(r,a,e.indent,s,l,e.quotingType,e.forceQuotes&&!i,n)){case Dr:return r;case rt:return"'"+r.replace(/'/g,"''")+"'";case Ir:return"|"+qt(r,e.indent)+Vt(Yt(r,o));case Pr:return">"+qt(r,e.indent)+Vt(Yt(oo(r,s),o));case Q:return'"'+so(r)+'"';default:throw new S("impossible error: invalid scalar style")}})()}function qt(e,r){var t=Nr(e)?String(r):"",i=e[e.length-1]===`
`,n=i&&(e[e.length-2]===`
`||e===`
`),o=n?"+":i?"":"-";return t+o+`
`}function Vt(e){return e[e.length-1]===`
`?e.slice(0,-1):e}function oo(e,r){for(var t=/(\n+)([^\n]*)/g,i=(function(){var c=e.indexOf(`
`);return c=c!==-1?c:e.length,t.lastIndex=c,Wt(e.slice(0,c),r)})(),n=e[0]===`
`||e[0]===" ",o,s;s=t.exec(e);){var a=s[1],l=s[2];o=l[0]===" ",i+=a+(!n&&!o&&l!==""?`
`:"")+Wt(l,r),n=o}return i}function Wt(e,r){if(e===""||e[0]===" ")return e;for(var t=/ [^ ]/g,i,n=0,o,s=0,a=0,l="";i=t.exec(e);)a=i.index,a-n>r&&(o=s>n?s:a,l+=`
`+e.slice(n,o),n=o+1),s=a;return l+=`
`,e.length-n>r&&s>n?l+=e.slice(n,s)+`
`+e.slice(s+1):l+=e.slice(n),l.slice(1)}function so(e){for(var r="",t=0,i,n=0;n<e.length;t>=65536?n+=2:n++)t=le(e,n),i=C[t],!i&&pe(t)?(r+=e[n],t>=65536&&(r+=e[n+1])):r+=i||Jn(t);return r}function ao(e,r,t){var i="",n=e.tag,o,s,a;for(o=0,s=t.length;o<s;o+=1)a=t[o],e.replacer&&(a=e.replacer.call(t,String(o),a)),(I(e,r,a,!1,!1)||typeof a>"u"&&I(e,r,null,!1,!1))&&(i!==""&&(i+=","+(e.condenseFlow?"":" ")),i+=e.dump);e.tag=n,e.dump="["+i+"]"}function Kt(e,r,t,i){var n="",o=e.tag,s,a,l;for(s=0,a=t.length;s<a;s+=1)l=t[s],e.replacer&&(l=e.replacer.call(t,String(s),l)),(I(e,r+1,l,!0,!0,!1,!0)||typeof l>"u"&&I(e,r+1,null,!0,!0,!1,!0))&&((!i||n!=="")&&(n+=tt(e,r)),e.dump&&ue===e.dump.charCodeAt(0)?n+="-":n+="- ",n+=e.dump);e.tag=o,e.dump=n||"[]"}function lo(e,r,t){var i="",n=e.tag,o=Object.keys(t),s,a,l,c,d;for(s=0,a=o.length;s<a;s+=1)d="",i!==""&&(d+=", "),e.condenseFlow&&(d+='"'),l=o[s],c=t[l],e.replacer&&(c=e.replacer.call(t,l,c)),I(e,r,l,!1,!1)&&(e.dump.length>1024&&(d+="? "),d+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),I(e,r,c,!1,!1)&&(d+=e.dump,i+=d));e.tag=n,e.dump="{"+i+"}"}function co(e,r,t,i){var n="",o=e.tag,s=Object.keys(t),a,l,c,d,u,p;if(e.sortKeys===!0)s.sort();else if(typeof e.sortKeys=="function")s.sort(e.sortKeys);else if(e.sortKeys)throw new S("sortKeys must be a boolean or a function");for(a=0,l=s.length;a<l;a+=1)p="",(!i||n!=="")&&(p+=tt(e,r)),c=s[a],d=t[c],e.replacer&&(d=e.replacer.call(t,c,d)),I(e,r+1,c,!0,!0,!0)&&(u=e.tag!==null&&e.tag!=="?"||e.dump&&e.dump.length>1024,u&&(e.dump&&ue===e.dump.charCodeAt(0)?p+="?":p+="? "),p+=e.dump,u&&(p+=tt(e,r)),I(e,r+1,d,!0,u)&&(e.dump&&ue===e.dump.charCodeAt(0)?p+=":":p+=": ",p+=e.dump,n+=p));e.tag=o,e.dump=n||"{}"}function Qt(e,r,t){var i,n,o,s,a,l;for(n=t?e.explicitTypes:e.implicitTypes,o=0,s=n.length;o<s;o+=1)if(a=n[o],(a.instanceOf||a.predicate)&&(!a.instanceOf||typeof r=="object"&&r instanceof a.instanceOf)&&(!a.predicate||a.predicate(r))){if(t?a.multi&&a.representName?e.tag=a.representName(r):e.tag=a.tag:e.tag="?",a.represent){if(l=e.styleMap[a.tag]||a.defaultStyle,Sr.call(a.represent)==="[object Function]")i=a.represent(r,l);else if(Tr.call(a.represent,l))i=a.represent[l](r,l);else throw new S("!<"+a.tag+'> tag resolver accepts not "'+l+'" style');e.dump=i}return!0}return!1}function I(e,r,t,i,n,o,s){e.tag=null,e.dump=t,Qt(e,t,!1)||Qt(e,t,!0);var a=Sr.call(e.dump),l=i,c;i&&(i=e.flowLevel<0||e.flowLevel>r);var d=a==="[object Object]"||a==="[object Array]",u,p;if(d&&(u=e.duplicates.indexOf(t),p=u!==-1),(e.tag!==null&&e.tag!=="?"||p||e.indent!==2&&r>0)&&(n=!1),p&&e.usedDuplicates[u])e.dump="*ref_"+u;else{if(d&&p&&!e.usedDuplicates[u]&&(e.usedDuplicates[u]=!0),a==="[object Object]")i&&Object.keys(e.dump).length!==0?(co(e,r,e.dump,n),p&&(e.dump="&ref_"+u+e.dump)):(lo(e,r,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object Array]")i&&e.dump.length!==0?(e.noArrayIndent&&!s&&r>0?Kt(e,r-1,e.dump,n):Kt(e,r,e.dump,n),p&&(e.dump="&ref_"+u+e.dump)):(ao(e,r,e.dump),p&&(e.dump="&ref_"+u+" "+e.dump));else if(a==="[object String]")e.tag!=="?"&&no(e,e.dump,r,o,l);else{if(a==="[object Undefined]")return!1;if(e.skipInvalid)return!1;throw new S("unacceptable kind of an object to dump "+a)}e.tag!==null&&e.tag!=="?"&&(c=encodeURI(e.tag[0]==="!"?e.tag.slice(1):e.tag).replace(/!/g,"%21"),e.tag[0]==="!"?c="!"+c:c.slice(0,18)==="tag:yaml.org,2002:"?c="!!"+c.slice(18):c="!<"+c+">",e.dump=c+" "+e.dump)}return!0}function uo(e,r){var t=[],i=[],n,o;for(it(e,t,i),n=0,o=i.length;n<o;n+=1)r.duplicates.push(t[i[n]]);r.usedDuplicates=new Array(o)}function it(e,r,t){var i,n,o;if(e!==null&&typeof e=="object")if(n=r.indexOf(e),n!==-1)t.indexOf(n)===-1&&t.push(n);else if(r.push(e),Array.isArray(e))for(n=0,o=e.length;n<o;n+=1)it(e[n],r,t);else for(i=Object.keys(e),n=0,o=i.length;n<o;n+=1)it(e[i[n]],r,t)}function po(e,r){r=r||{};var t=new Zn(r);t.noRefs||uo(e,t);var i=e;return t.replacer&&(i=t.replacer.call({"":i},"",i)),I(t,0,i,!0,!0)?t.dump+`
`:""}var ho=po,fo={dump:ho};function ct(e,r){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+r+" instead, which is now safe by default.")}}var go=k,mo=Zt,vo=ir,bo=lr,xo=cr,yo=ot,wo=Cr.load,Ao=Cr.loadAll,_o=fo.dump,Eo=S,$o={binary:fr,float:ar,map:rr,null:nr,pairs:mr,set:vr,timestamp:pr,bool:or,int:sr,merge:hr,omap:gr,seq:tr,str:er},ko=ct("safeLoad","load"),Co=ct("safeLoadAll","loadAll"),So=ct("safeDump","dump"),he={Type:go,Schema:mo,FAILSAFE_SCHEMA:vo,JSON_SCHEMA:bo,CORE_SCHEMA:xo,DEFAULT_SCHEMA:yo,load:wo,loadAll:Ao,dump:_o,YAMLException:Eo,types:$o,safeLoad:ko,safeLoadAll:Co,safeDump:So};var To=["targets","source","source_attribute","mode","mapping","thresholds","template","enabled","priority"];function Hr(e){let r={...e};delete r.id,delete r.created,delete r.updated,delete r.source_kind,e.enabled!==!1&&delete r.enabled,e.source||delete r.source,(e.source_attribute===null||e.source_attribute===void 0)&&delete r.source_attribute,e.priority===10&&delete r.priority;let t={};for(let i of To)i in r&&(t[i]=r[i]);return t}var jr={indent:2,lineWidth:100,noRefs:!0};function Ur(e){return he.dump(Hr(e),jr)}function Br(e){return he.dump({rules:e.map(r=>Hr(r))},jr)}function Yr(e){let r=e.split(`
`);if(!/^rules:/m.test(e))return[{start:0,end:r.length}];let t=/^[ ]{0,4}-[ ]/,i=[];for(let n=0;n<r.length;n++)t.test(r[n])&&i.push(n);return i.map((n,o)=>({start:n,end:o+1<i.length?i[o+1]:r.length}))}function fe(e){let r;try{r=he.load(e)}catch(t){return Ro(t)}if(r==null)return{rules:[],parseError:"Empty YAML \u2014 paste a rule above."};if(typeof r!="object"||Array.isArray(r))return{rules:[],parseError:"YAML must be a single rule (mapping) or a top-level `rules:` list.",errorLine:1};if("rules"in r){let t=r.rules;if(!Array.isArray(t))return{rules:[],parseError:"Top-level `rules:` must be a list of rule mappings.",errorLine:Mo(e,/^rules:/)};let i=[];for(let n=0;n<t.length;n++){let o=t[n];if(o===null||typeof o!="object"||Array.isArray(o))return{rules:[],parseError:`Rule ${n+1} is not a mapping \u2014 each entry under \`rules:\` must be a YAML object.`,errorRuleIndex:n};i.push(o)}return{rules:i,parseError:null}}return{rules:[r],parseError:null}}function Ro(e){if(e instanceof he.YAMLException){let r=e.mark;return r?{rules:[],parseError:`Line ${r.line+1}, col ${r.column+1}: ${e.reason}`,errorLine:r.line+1,errorColumn:r.column+1}:{rules:[],parseError:e.reason??e.message}}if(e&&typeof e=="object"&&"message"in e){let r=e.message;if(typeof r=="string")return{rules:[],parseError:r}}return{rules:[],parseError:String(e)}}function Mo(e,r){let t=e.split(`
`);for(let i=0;i<t.length;i++)if(r.test(t[i]))return i+1}var Lo=0;function W(){return Lo++}var R=class extends L{constructor(){super(...arguments);this.errorMessage="";this.working=this.blankState();this.codeMode=!1;this.codeText="";this.codeError="";this.observedStates=[];this._observedStatesCache=new Map;this._observedStatesEntityId="";this.toggleCodeView=()=>{if(this.codeMode){let{rules:t,parseError:i}=fe(this.codeText);if(i){this.codeError=i;return}let n=t[0];if(!n){this.codeError="YAML did not contain a rule.";return}this.working=this.hydrate(this.partialToRule(n)),this.codeMode=!1,this.codeError=""}else{let t=this.serialize();this.codeText=Ur(this.partialToRule(t)),this.codeError="",this.codeMode=!0}};this.cancelClicked=()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))};this.addGlob=()=>{this.working={...this.working,targetGlobs:[...this.working.targetGlobs,{value:"",_key:W()}]}};this.addThreshold=()=>{this.working={...this.working,thresholds:[...this.working.thresholds,{lt:0,color:"",icon:"",_key:W()}]}};this.addMapping=()=>{this.working={...this.working,mapping:[...this.working.mapping,{key:"",color:"",icon:"",_key:W()}]}};this.save=()=>{let t;if(this.codeMode){let{rules:i,parseError:n}=fe(this.codeText);if(n){this.codeError=n;return}let o=i[0];if(!o){this.codeError="YAML did not contain a rule.";return}t=o,this.working.id&&(t.id=this.working.id)}else t=this.serialize();this.dispatchEvent(new CustomEvent("save",{detail:t,bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback();for(let t of["ha-icon-picker","ha-selector"])customElements.get(t)||customElements.whenDefined(t).then(()=>this.requestUpdate()).catch(()=>{})}willUpdate(t){t.has("rule")&&(this.working=this.rule?this.hydrate(this.rule):this.blankState());let i=this.observedSourceForAutocomplete();i!==this._observedStatesEntityId&&(this._observedStatesEntityId=i,this.refreshObservedStates(i))}observedSourceForAutocomplete(){let t=this.working.source.trim();return t||this.working.targetEntities[0]||""}async refreshObservedStates(t){if(!t||!this.hass){this.observedStates=[];return}let i=this._observedStatesCache.get(t);if(i){this.observedStates=i;return}let n=this.hass.states[t]?.state;n&&(this.observedStates=[n]);let o=new Set;n&&o.add(n);try{let a=new Date,l=new Date(a.getTime()-10080*60*1e3),d=(await this.hass.connection.sendMessagePromise({type:"history/history_during_period",start_time:l.toISOString(),end_time:a.toISOString(),entity_ids:[t],minimal_response:!0,no_attributes:!0}))?.[t];if(Array.isArray(d))for(let u of d){let p=u.s??u.state;typeof p=="string"&&p&&o.add(p)}}catch{}if(t!==this._observedStatesEntityId)return;let s=[...o].sort();this._observedStatesCache.set(t,s),this.observedStates=s}renderIconField(t,i){return customElements.get("ha-icon-picker")&&this.hass?g`
        <ha-icon-picker
          .hass=${this.hass}
          .value=${t}
          .label=${"Icon"}
          @value-changed=${n=>i(n.detail?.value??"")}
        ></ha-icon-picker>
      `:g`
      <div class="icon-input">
        ${t?g`<ha-icon class="icon-preview" .icon=${t}></ha-icon>`:g`<span class="icon-preview placeholder" aria-hidden="true"></span>`}
        <input
          type="text"
          placeholder="mdi:icon"
          .value=${t}
          @input=${n=>i(n.target.value)}
        />
      </div>
    `}get entityIds(){return this.hass?Object.keys(this.hass.states).sort():[]}renderEntityField(t,i,n,o,s=!1){return customElements.get("ha-selector")&&this.hass?g`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{entity:{}}}
            .value=${n}
            .label=${t}
            @value-changed=${a=>o(a.detail?.value??"")}
          ></ha-selector>
        </div>
      `:g`
      <label class="field">
        <span class="label">${t}</span>
        <input
          type="text"
          list="smart-icons-entities"
          ?required=${s}
          placeholder=${i}
          .value=${n}
          @input=${a=>o(a.target.value)}
        />
      </label>
    `}render(){return g`
      <datalist id="smart-icons-entities">
        ${this.entityIds.map(t=>g`<option value=${t}></option>`)}
      </datalist>
      <datalist id="smart-icons-source-attributes">
        ${this.sourceAttributes.map(t=>g`<option value=${t}></option>`)}
      </datalist>
      <datalist id="smart-icons-observed-states">
        ${this.observedStates.map(t=>g`<option value=${t}></option>`)}
      </datalist>

      ${this.codeMode?this.renderCodeView():this.renderVisualView()}

      ${this.errorMessage?g`<div class="error">${this.errorMessage}</div>`:null}

      <div class="actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
        >
          ${this.codeMode?"Show visual editor":"Show code editor"}
        </button>
        <div class="actions-right">
          <ha-button @click=${this.cancelClicked}>Cancel</ha-button>
          <ha-button
            variant="brand"
            ?disabled=${this.saveDisabled}
            @click=${this.save}
          >Save</ha-button>
        </div>
      </div>
    `}renderCodeView(){return g`
      <header class="dialog-header">
        <label class="enabled-toggle">
          <ha-switch
            .checked=${this.working.enabled}
            @change=${t=>this.patch({enabled:t.target.checked})}
          ></ha-switch>
          <span>${this.working.enabled?"Enabled":"Disabled"}</span>
        </label>
      </header>
      ${this.codeError?g`<div class="inline-error" role="alert">${this.codeError}</div>`:null}
      <textarea
        class="yaml-area"
        .value=${this.codeText}
        @input=${t=>{this.codeText=t.target.value,this.codeError&&(this.codeError="")}}
      ></textarea>
    `}renderVisualView(){return g`
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
        ${this.targetsError?g`<div class="inline-error">${this.targetsError}</div>`:null}
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
        ${this.modeError?g`<div class="inline-error">${this.modeError}</div>`:null}
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

    `}get saveDisabled(){return this.codeMode?!this.codeText.trim():this.validationErrors.length>0}partialToRule(t){return{id:this.working.id??"",targets:t.targets??[],source:t.source??"",source_attribute:t.source_attribute??null,mode:t.mode??"mapping",thresholds:t.thresholds,mapping:t.mapping,template:t.template,enabled:t.enabled??!0,priority:t.priority??10,created:"",updated:"",source_kind:"ui"}}submit(){return this.validationErrors.length>0?!1:(this.save(),!0)}get validationErrors(){return[this.targetsError,this.sourceError,this.modeError].filter(t=>t!==null)}get targetsError(){let t=this.working.targetEntities,i=this.working.targetGlobs.map(n=>n.value.trim()).filter(n=>n.length>0);return t.length===0&&i.length===0?"Pick at least one target entity or add a glob pattern.":null}get sourceError(){return null}get modeError(){if(this.working.mode==="thresholds"){if(!this.working.thresholds.some(i=>this.thresholdComparator(i)!==null||i.color||i.icon))return"Thresholds mode needs at least one entry."}else if(this.working.mode==="mapping"){if(!this.working.mapping.some(i=>i.key.trim().length>0))return"Mapping mode needs at least one state \u2192 decoration entry."}else if(this.working.mode==="template"&&!this.working.template.trim())return"Template mode requires a non-empty Jinja template.";return null}get sourceEntityForDisplay(){let t=this.working.source.trim();return t||this.working.targetEntities[0]||"(entity)"}get isPerTarget(){if(this.working.source.trim())return!1;let t=this.working.targetEntities,i=this.working.targetGlobs.filter(n=>n.value.trim());return t.length>1||i.length>0}renderWatchingHint(){let t=this.working.source_attribute.trim();if(this.isPerTarget)return t?g`Per-target: each matched entity's
            <code>.${t}</code> attribute drives its own decoration.`:g`Per-target: each matched entity reacts to its own state.
            Set a state attribute (e.g. <code>brightness</code>) to use
            an attribute instead.`;let i=this.sourceEntityForDisplay;return t?g`Watching <code>${i}.${t}</code>`:g`Watching the state of <code>${i}</code>. Pick a state
          attribute (e.g. <code>azimuth</code>) for numeric-attribute rules.`}get sourceAttributes(){let t=this.sourceEntityForDisplay,i=this.hass?.states?.[t]?.attributes;return i?Object.keys(i).sort():[]}renderThresholds(){let t=this.working.thresholds;return g`
      <fieldset>
        <legend>
          Threshold entries — first matching wins; the entry with no
          comparator is the "else" branch. Use ↑ ↓ to reorder.
        </legend>
        ${t.length===0?g`<p class="fieldset-hint">
              No threshold entries yet. Each entry has a comparator
              (e.g. <code>&lt; 18</code>) plus a color or icon to apply.
              The first matching entry wins.
            </p>`:null}
        ${t.map((i,n)=>g`
            <div class="row threshold-row">
              <div class="reorder-buttons">
                <button
                  class="btn-icon"
                  ?disabled=${n===0}
                  @click=${()=>this.moveThreshold(n,-1)}
                  title="Move up"
                >↑</button>
                <button
                  class="btn-icon"
                  ?disabled=${n===t.length-1}
                  @click=${()=>this.moveThreshold(n,1)}
                  title="Move down"
                >↓</button>
              </div>
              <select
                .value=${this.thresholdComparator(i)}
                @change=${o=>this.setThresholdComparator(n,o.target.value)}
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
                .value=${this.thresholdValue(i)}
                ?disabled=${this.thresholdComparator(i)===""}
                @input=${o=>this.setThresholdValue(n,o.target.value)}
              />
              ${this.renderColorInput(i.color??"",o=>this.updateThreshold(n,{color:o}))}
              ${this.renderIconField(i.icon??"",o=>this.updateThreshold(n,{icon:o}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeThreshold(n)}
                title="Remove"
              >×</button>
            </div>
          `)}
        <button class="btn-text add-button" @click=${this.addThreshold}>
          + Add entry
        </button>
      </fieldset>
    `}moveThreshold(t,i){let n=t+i;if(n<0||n>=this.working.thresholds.length)return;let o=[...this.working.thresholds];[o[t],o[n]]=[o[n],o[t]],this.working={...this.working,thresholds:o}}renderMapping(){let t=this.working.mapping,i=t.every(n=>!n.key.trim());return g`
      <fieldset>
        <legend>
          State → decoration. <code>_else</code> is the fallback bucket.
        </legend>
        ${i?g`<p class="fieldset-hint">
              Add one entry per state value (e.g. <code>on</code>,
              <code>off</code>) — or use <code>_else</code> as a catch-all
              fallback. Each entry can set a color, an icon, or both.
            </p>`:null}
        ${this.observedStates.length>0?g`<p class="fieldset-hint">
              Autocomplete suggests states
              <code>${this._observedStatesEntityId}</code> has been in
              recently (last 7 days, via recorder).
            </p>`:null}
        ${t.map((n,o)=>g`
            <div class="row">
              <input
                type="text"
                placeholder="state"
                list="smart-icons-observed-states"
                .value=${n.key}
                @input=${s=>this.updateMapping(o,{key:s.target.value})}
              />
              ${this.renderColorInput(n.color,s=>this.updateMapping(o,{color:s}))}
              ${this.renderIconField(n.icon,s=>this.updateMapping(o,{icon:s}))}
              <button
                class="btn-icon"
                @click=${()=>this.removeMapping(o)}
                title="Remove"
              >×</button>
            </div>
          `)}
        <button class="btn-text add-button" @click=${this.addMapping}>
          + Add state
        </button>
      </fieldset>
    `}renderTemplate(){return g`
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
    `}renderColorInput(t,i){return g`
      <div class="swatch-input">
        <input
          type="color"
          .value=${this.colorAsHex(t)}
          @input=${n=>i(n.target.value)}
          title="Pick a color"
        />
        <input
          type="text"
          placeholder="#hex, name, or var(--…)"
          .value=${t}
          @input=${n=>i(n.target.value)}
        />
      </div>
    `}colorAsHex(t){if(!t)return"#888888";if(/^#[0-9a-fA-F]{6}$/.test(t))return t;if(/^#[0-9a-fA-F]{3}$/.test(t))return"#"+t.slice(1).split("").map(i=>i+i).join("");try{let i=document.createElement("canvas").getContext("2d");if(!i)return"#888888";i.fillStyle=t;let n=i.fillStyle;return/^#[0-9a-fA-F]{6}$/.test(n)?n:"#888888"}catch{return"#888888"}}patch(t){this.working={...this.working,...t}}hydrate(t){let i=[],n=[];for(let s of t.targets)/[*?[]/.test(s)?n.push({value:s,_key:W()}):i.push(s);let o=i[0];return{id:t.id,targetEntities:i,targetGlobs:n,source:t.source===o?"":t.source,source_attribute:t.source_attribute??"",mode:t.mode,thresholds:(t.thresholds??[]).map(s=>({...s,_key:W()})),mapping:t.mapping?Object.entries(t.mapping).map(([s,a])=>({key:s,color:a.color??"",icon:a.icon??"",_key:W()})):[],template:t.template??"",enabled:t.enabled,priority:t.priority}}blankState(){return{targetEntities:[],targetGlobs:[],source:"",source_attribute:"",mode:"mapping",thresholds:[],mapping:[{key:"",color:"",icon:"",_key:W()}],template:"",enabled:!0,priority:10}}renderTargetEntitiesField(){return customElements.get("ha-selector")&&this.hass?g`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{entity:{multiple:!0}}}
            .value=${this.working.targetEntities}
            .label=${"Target entities"}
            @value-changed=${t=>this.patch({targetEntities:t.detail?.value??[]})}
          ></ha-selector>
        </div>
      `:g`
      <label class="field">
        <span class="label">Target entities (comma-separated)</span>
        <input
          type="text"
          list="smart-icons-entities"
          placeholder="light.kitchen, light.living_room"
          .value=${this.working.targetEntities.join(", ")}
          @input=${t=>this.patch({targetEntities:t.target.value.split(",").map(i=>i.trim()).filter(i=>i.length>0)})}
        />
      </label>
    `}renderTargetGlobsField(){return g`
      <fieldset>
        <legend>
          Glob patterns (optional) — match many entities at once.
          E.g. <code>light.kitchen_*</code> or <code>sensor.temp_?</code>.
        </legend>
        ${this.working.targetGlobs.length===0?g`<p class="fieldset-hint">
              No patterns. Use the picker above for individual entities,
              or click <strong>+ Add pattern</strong> to target a group.
            </p>`:null}
        ${this.working.targetGlobs.map((t,i)=>g`
            <div class="target-row">
              <input
                type="text"
                placeholder="e.g. light.kitchen_*"
                .value=${t.value}
                @input=${n=>this.updateGlob(i,n.target.value)}
              />
              <button
                class="btn-icon"
                @click=${()=>this.removeGlob(i)}
                title="Remove pattern"
              >×</button>
            </div>
            ${this.renderGlobPreview(t.value)}
          `)}
        <button class="btn-text add-button" @click=${this.addGlob}>
          + Add pattern
        </button>
      </fieldset>
    `}renderGlobPreview(t){let i=t.trim();if(!i||!/[*?[]/.test(i)||!this.hass)return null;let n=this.matchGlob(i);if(n.length===0)return g`<div class="target-hint target-hint--empty">
        No entities match this pattern yet.
      </div>`;let o=n.slice(0,3).join(", "),s=n.length>3?` (+${n.length-3} more)`:"";return g`<div class="target-hint">
      Matches ${n.length}
      ${n.length===1?"entity":"entities"}:
      <code>${o}</code>${s}
    </div>`}matchGlob(t){let i=new RegExp("^"+t.replace(/[.+^$()|\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");return Object.keys(this.hass?.states??{}).filter(n=>i.test(n)).sort()}updateGlob(t,i){this.working={...this.working,targetGlobs:this.working.targetGlobs.map((n,o)=>o===t?{...n,value:i}:n)}}removeGlob(t){this.working={...this.working,targetGlobs:this.working.targetGlobs.filter((i,n)=>n!==t)}}thresholdComparator(t){for(let i of["lt","lte","gt","gte","eq"])if(t[i]!==void 0)return i;return""}thresholdValue(t){for(let i of["lt","lte","gt","gte","eq"])if(t[i]!==void 0)return String(t[i]);return""}setThresholdComparator(t,i){let n=this.working.thresholds[t],o={...n};for(let s of["lt","lte","gt","gte","eq"])delete o[s];if(i){let s=this.thresholdValue(n),a=Number(s),l=i==="eq"&&Number.isNaN(a)?s:Number.isNaN(a)?0:a;o[i]=l}this.working={...this.working,thresholds:this.working.thresholds.map((s,a)=>a===t?o:s)}}setThresholdValue(t,i){let n=this.working.thresholds[t],o=this.thresholdComparator(n);if(!o)return;let s=Number(i),a=o==="eq"&&Number.isNaN(s)?i:s;this.working={...this.working,thresholds:this.working.thresholds.map((l,c)=>c===t?{...l,[o]:a}:l)}}updateThreshold(t,i){this.working={...this.working,thresholds:this.working.thresholds.map((n,o)=>o===t?{...n,...i}:n)}}removeThreshold(t){this.working={...this.working,thresholds:this.working.thresholds.filter((i,n)=>n!==t)}}updateMapping(t,i){this.working={...this.working,mapping:this.working.mapping.map((n,o)=>o===t?{...n,...i}:n)}}removeMapping(t){this.working={...this.working,mapping:this.working.mapping.filter((i,n)=>n!==t)}}serialize(){let t=this.working.targetEntities,i=this.working.targetGlobs.map(c=>c.value.trim()).filter(c=>c.length>0),n=[...t,...i],s=this.working.source.trim()||t[0]||"",a=this.working.source_attribute.trim(),l={targets:n,source:s,mode:this.working.mode,enabled:this.working.enabled,priority:this.working.priority};if(a&&(l.source_attribute=a),this.working.id&&(l.id=this.working.id),this.working.mode==="thresholds")l.thresholds=this.working.thresholds.map(({_key:c,...d})=>{let u={};for(let p of["lt","lte","gt","gte","eq"])d[p]!==void 0&&(u[p]=d[p]);return d.color&&(u.color=d.color),d.icon&&(u.icon=d.icon),u});else if(this.working.mode==="mapping"){let c={};for(let d of this.working.mapping){if(!d.key)continue;let u={};d.color&&(u.color=d.color),d.icon&&(u.icon=d.icon),c[d.key]=u}l.mapping=c}else this.working.mode==="template"&&(l.template=this.working.template);return l}};R.styles=Nt,y([D({attribute:!1})],R.prototype,"rule",2),y([D({attribute:!1})],R.prototype,"hass",2),y([D({type:String})],R.prototype,"errorMessage",2),y([_()],R.prototype,"working",2),y([_()],R.prototype,"codeMode",2),y([_()],R.prototype,"codeText",2),y([_()],R.prototype,"codeError",2),y([_()],R.prototype,"observedStates",2),R=y([ke("smart-icons-rule-editor")],R);var $=class extends L{constructor(){super(...arguments);this.narrow=!1;this.rules=[];this.editing=null;this.dialogOpen=!1;this.editorError="";this.pendingDelete=null;this.actionError="";this.codeMode=!1;this.codeText="";this.codeInitialText="";this.codeError=null;this.codeSubmitting=!1;this.pendingDiscard=!1;this.codeTextareaRef=Mt();this.clearActionError=()=>{this.actionError=""};this.addRule=()=>{this.editing=null,this.editorError="",this.dialogOpen=!0};this.cancelEdit=()=>{this.dialogOpen=!1,this.editing=null,this.editorError=""};this.onEditorSave=async t=>{let i=t.detail;this.editorError="";try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:i}),this.dialogOpen=!1,this.editing=null}catch(n){this.editorError=this.errorMessage(n)}};this.cancelDelete=()=>{this.pendingDelete=null};this.toggleCodeView=()=>{if(!this.codeSubmitting)if(this.codeMode){if(this.codeText!==this.codeInitialText){this.pendingDiscard=!0;return}this.exitCodeMode()}else{let t=Br(this.rules);this.codeText=t,this.codeInitialText=t,this.codeError=null,this.codeMode=!0}};this.cancelDiscard=()=>{this.pendingDiscard=!1};this.confirmDiscard=()=>{this.exitCodeMode()};this.saveCodeChanges=async()=>{let t=fe(this.codeText);if(t.parseError){this.codeError={message:t.parseError,jumpLine:t.errorLine,jumpColumn:t.errorColumn,jumpRule:t.errorRuleIndex},this.updateComplete.then(()=>this.autoJumpToFirstError());return}this.codeError=null,this.codeSubmitting=!0;try{await this.hass.connection.sendMessagePromise({type:"smart_icons/replace_all",rules:t.rules}),this.codeSubmitting=!1,this.exitCodeMode(),this.actionError=`Saved ${t.rules.length} rule${t.rules.length===1?"":"s"}.`}catch(i){this.codeSubmitting=!1;let n=i;n.rule_errors&&n.rule_errors.length>0?this.codeError={ruleErrors:n.rule_errors}:this.codeError={message:this.errorMessage(i)},this.updateComplete.then(()=>this.autoJumpToFirstError())}};this.confirmDelete=async()=>{let t=this.pendingDelete;if(this.pendingDelete=null,!!t)try{await this.hass.connection.sendMessagePromise({type:"smart_icons/delete",rule_id:t.id}),this.actionError=""}catch(i){let n=t.targets[0]??t.id;this.actionError=`Couldn't delete rule for ${n}: ${this.errorMessage(i)}`}}}connectedCallback(){super.connectedCallback(),this.initStore()}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.(),this.store?.disconnect()}render(){return g`
      <ha-card>
        <header>
          <h1>Smart Icons</h1>
          ${this.codeMode?b:g`<ha-button raised @click=${this.addRule}>+ Add rule</ha-button>`}
        </header>
        ${this.actionError?g`
              <div class="action-error" role="alert">
                <span>${this.actionError}</span>
                <button
                  class="action-error-dismiss"
                  @click=${this.clearActionError}
                  aria-label="Dismiss"
                >×</button>
              </div>
            `:b}
        ${this.codeMode?this.renderCodeView():this.renderVisualView()}
      </ha-card>
      ${this.dialogOpen?this.renderDialog():b}
      ${this.pendingDelete?this.renderDeleteConfirm():b}
      ${this.pendingDiscard?this.renderDiscardConfirm():b}
    `}renderVisualView(){return g`
      ${this.rules.length===0?this.renderEmpty():this.renderTable()}
      <div class="panel-actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
        >
          Show code editor
        </button>
      </div>
    `}renderCodeView(){return g`
      <textarea
        class="yaml-area panel-yaml"
        spellcheck="false"
        ${Lt(this.codeTextareaRef)}
        .value=${this.codeText}
        @input=${t=>{this.codeText=t.target.value,this.codeError&&(this.codeError=null)}}
        ?disabled=${this.codeSubmitting}
      ></textarea>
      ${this.codeError?this.renderCodeError(this.codeError):b}
      <div class="panel-actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
          ?disabled=${this.codeSubmitting}
        >
          Show visual editor
        </button>
        <ha-button
          variant="brand"
          ?disabled=${this.codeSubmitting||!this.codeText.trim()}
          @click=${this.saveCodeChanges}
        >${this.codeSubmitting?"Saving\u2026":"Save"}</ha-button>
      </div>
    `}renderCodeError(t){let i=t.ruleErrors&&t.ruleErrors.length>0;return g`
      <div class="inline-error" role="alert">
        <div class="inline-error-message">${i?"Save aborted \u2014 rules unchanged.":"Rules unchanged."}</div>
        ${i?g`
              <ul class="rule-error-list">
                ${t.ruleErrors.map(o=>g`
                    <li>
                      ${this.renderClickableError(`Rule ${o.index+1}: ${o.message}`,()=>this.jumpToRule(o.index))}
                    </li>
                  `)}
              </ul>
            `:b}
        ${t.message?this.renderMessageMaybeClickable(t):b}
      </div>
    `}renderMessageMaybeClickable(t){let i=this.jumpHandlerFor(t);return i?this.renderClickableError(t.message,i):g`<div class="inline-error-message">${t.message}</div>`}renderClickableError(t,i){return g`
      <button
        type="button"
        class="rule-error-item"
        @click=${i}
        title="Jump to the error"
      >${t}</button>
    `}jumpHandlerFor(t){if(t.jumpRule!==void 0){let i=t.jumpRule;return()=>this.jumpToRule(i)}if(t.jumpLine!==void 0){let i=t.jumpLine,n=t.jumpColumn;return()=>this.jumpToLine(i,n)}return null}jumpToRule(t){let i=this.codeTextareaRef.value;if(!i)return;let o=Yr(i.value)[t];if(!o)return;let s=i.value.split(`
`),a=0;for(let c=0;c<o.start;c++)a+=s[c].length+1;let l=a;for(let c=o.start;c<o.end;c++)l+=s[c].length+1;l=Math.min(l,i.value.length),i.focus(),i.setSelectionRange(a,l)}jumpToLine(t,i){let n=this.codeTextareaRef.value;if(!n)return;let o=n.value.split(`
`);if(t<1||t>o.length)return;let s=t-1,a=0;for(let c=0;c<s;c++)a+=o[c].length+1;let l=a+o[s].length;if(n.focus(),i&&i>=1&&i<=o[s].length+1){let c=a+(i-1);n.setSelectionRange(c,c)}else n.setSelectionRange(a,l)}renderDeleteConfirm(){let t=this.pendingDelete,i=t.targets.length===1?t.targets[0]:`${t.targets.length} targets (${t.targets[0]}\u2026)`;return g`
      <ha-dialog
        open
        heading="Delete rule?"
        @closed=${this.cancelDelete}
      >
        <p>
          This permanently removes the rule for <code>${i}</code>.
          The color override (and on the next state update, the icon
          override) will be cleared.
        </p>
        <!-- Buttons live in the dialog body (unnamed slot), not in
             slot="primaryAction" / "secondaryAction" — modern ha-dialog
             dropped those named slots so slotted children are silently
             hidden by the browser. The rule editor uses the same
             content-area pattern (rule-editor.ts .actions div). -->
        <div class="dialog-actions">
          <ha-button @click=${this.cancelDelete}>Cancel</ha-button>
          <ha-button variant="danger" @click=${this.confirmDelete}
            >Delete</ha-button
          >
        </div>
      </ha-dialog>
    `}renderEmpty(){return g`
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
    `}renderTable(){let t=[...this.rules].sort((i,n)=>{let o=i.targets[0]??"",s=n.targets[0]??"";return o===s?n.priority-i.priority:o.localeCompare(s)});return g`
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
            ${t.map(i=>this.renderRow(i))}
          </tbody>
        </table>
      </div>
    `}renderRow(t){let i=t.targets[0]??"",n=t.targets.length<=1?i:`${i} (+${t.targets.length-1} more)`,o=t.targets.length===1&&t.source===i,s=(()=>{let a=o?"\u2014":t.source;return t.source_attribute?a==="\u2014"?`(target).${t.source_attribute}`:`${a}.${t.source_attribute}`:a})();return g`
      <tr>
        <td data-label="Targets" title=${t.targets.join(", ")}>${n}</td>
        <td data-label="Source">${s}</td>
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
    `}renderDialog(){return g`
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
    `}get dialogTitle(){return this.editing?this.editing.id?"Edit rule":"Duplicate rule":"Add rule"}async initStore(){this.store=new Me,this.store.hydrateFromCache(),this.unsubscribe=this.store.subscribe(t=>{this.rules=t});try{await this.store.connect(this.hass.connection)}catch(t){console.error("[smart-icons-panel] failed to connect WS",t)}}editRule(t){this.editing=t,this.editorError="",this.dialogOpen=!0}duplicateRule(t){this.editing={...t,id:"",created:"",updated:""},this.editorError="",this.dialogOpen=!0}async toggleRule(t,i,n){try{await this.hass.connection.sendMessagePromise({type:"smart_icons/upsert",rule:{...t,enabled:i}}),this.actionError=""}catch(o){n.checked=t.enabled,this.actionError=`Couldn't ${i?"enable":"disable"} rule: ${this.errorMessage(o)}`}}deleteRule(t){this.pendingDelete=t}exitCodeMode(){this.codeMode=!1,this.codeError=null,this.pendingDiscard=!1}renderDiscardConfirm(){return g`
      <ha-dialog
        open
        heading="Discard changes?"
        @closed=${this.cancelDiscard}
      >
        <p>
          You have unsaved changes in the code editor. Switching back
          to the visual editor will discard them.
        </p>
        <!-- See note on the delete-confirm modal above: ha-dialog's
             primaryAction / secondaryAction named slots don't exist in
             modern HA, so buttons go in the content area. -->
        <div class="dialog-actions">
          <ha-button @click=${this.cancelDiscard}>Cancel</ha-button>
          <ha-button variant="danger" @click=${this.confirmDiscard}
            >Discard</ha-button
          >
        </div>
      </ha-dialog>
    `}autoJumpToFirstError(){let t=this.codeError;if(!t)return;if(t.ruleErrors&&t.ruleErrors.length>0){this.jumpToRule(t.ruleErrors[0].index);return}let i=this.jumpHandlerFor(t);i&&i()}errorMessage(t){if(t&&typeof t=="object"&&"message"in t){let i=t.message;if(typeof i=="string")return i}return String(t)}};$.styles=Ft,y([D({attribute:!1})],$.prototype,"hass",2),y([D({type:Boolean,reflect:!0})],$.prototype,"narrow",2),y([_()],$.prototype,"rules",2),y([_()],$.prototype,"editing",2),y([_()],$.prototype,"dialogOpen",2),y([_()],$.prototype,"editorError",2),y([_()],$.prototype,"pendingDelete",2),y([_()],$.prototype,"actionError",2),y([_()],$.prototype,"codeMode",2),y([_()],$.prototype,"codeText",2),y([_()],$.prototype,"codeInitialText",2),y([_()],$.prototype,"codeError",2),y([_()],$.prototype,"codeSubmitting",2),y([_()],$.prototype,"pendingDiscard",2),$=y([ke("smart-icons-panel")],$);
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
lit-html/directive.js:
lit-html/async-directive.js:
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

lit-html/directive-helpers.js:
lit-html/directives/ref.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
