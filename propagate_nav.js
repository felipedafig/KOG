/* Propagate the sign-in + language dropdown into every page's nav (EN default),
 * replace any existing actions block, and shorten the long nav label.
 * Run: node propagate_nav.js
 */
const fs = require('fs'), path = require('path');
const ROOT = 'kogonderhoud.nl';

const NL_FLAG = '<svg viewBox="0 0 60 45"><rect width="60" height="45" fill="#fff"/><rect width="60" height="15" fill="#AE1C28"/><rect y="30" width="60" height="15" fill="#21468B"/></svg>';
const GB_FLAG = '<svg viewBox="0 0 60 45"><clipPath id="kogGbClip"><path d="M0,0 v45 h60 v-45 z"/></clipPath><clipPath id="kogGbDiag"><path d="M30,22.5 h30 v22.5 z v22.5 h-30 z h-30 v-22.5 z v-22.5 h30 z"/></clipPath><g clip-path="url(#kogGbClip)"><path d="M0,0 v45 h60 v-45 z" fill="#012169"/><path d="M0,0 L60,45 M60,0 L0,45" stroke="#fff" stroke-width="9"/><path d="M0,0 L60,45 M60,0 L0,45" clip-path="url(#kogGbDiag)" stroke="#C8102E" stroke-width="6"/><path d="M30,0 v45 M0,22.5 h60" stroke="#fff" stroke-width="15"/><path d="M30,0 v45 M0,22.5 h60" stroke="#C8102E" stroke-width="9"/></g></svg>';

const ACTIONS = `
    <div class="kog-nav-actions">
        <a href="#" class="kog-signin" role="button" tabindex="0">
            <span class="fa fa-user" aria-hidden="true"></span><span class="kog-signin__label">Sign in</span>
        </a>
        <div class="kog-lang">
            <button type="button" class="kog-lang__trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="Language">
                <span class="kog-flag" aria-hidden="true">${GB_FLAG}</span>
                <span class="kog-lang__code">EN</span>
                <span class="kog-caret" aria-hidden="true"></span>
            </button>
            <ul class="kog-lang__menu" role="listbox" aria-label="Choose a language">
                <li>
                    <button type="button" role="option" aria-selected="true" class="kog-lang__item">
                        <span class="kog-flag" aria-hidden="true">${GB_FLAG}</span>
                        <span class="kog-lang__label">English</span>
                    </button>
                </li>
                <li>
                    <button type="button" role="option" aria-selected="false" class="kog-lang__item">
                        <span class="kog-flag" aria-hidden="true">${NL_FLAG}</span>
                        <span class="kog-lang__label">Nederlands</span>
                    </button>
                </li>
            </ul>
        </div>
    </div>
`;

function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(/^(_ext|Assets|bundles|images|media|Css)$/.test(e.name))continue;o=o.concat(walk(p));}else if(e.name.endsWith('.html'))o.push(p);}return o;}

// Remove an existing kog-nav-actions block by matching div nesting.
function stripActions(html){
  const i = html.indexOf('<div class="kog-nav-actions">');
  if (i < 0) return html;
  let depth=0, end=-1;
  const re=/<div\b|<\/div>/g; re.lastIndex=i;
  let mm;
  while((mm=re.exec(html))){
    if(mm[0]==='</div>'){ depth--; if(depth===0){ end=re.lastIndex; break; } }
    else depth++;
  }
  if(end<0) return html;
  // also swallow the leading whitespace/newline we injected
  let start=i;
  while(start>0 && /\s/.test(html[start-1])) start--;
  return html.slice(0,start) + '\n' + html.slice(end);
}

// Return the index just AFTER the </ul> that closes <ul class="vo-main-nav ...">.
function mainNavUlEnd(html){
  const open = html.search(/<ul\b[^>]*vo-main-nav/);
  if (open < 0) return -1;
  let depth=0, end=-1;
  const re=/<ul\b|<\/ul>/g; re.lastIndex=open;
  let mm;
  while((mm=re.exec(html))){
    if(mm[0]==='</ul>'){ depth--; if(depth===0){ end=re.lastIndex; break; } }
    else depth++;
  }
  return end;
}

let done=0, labelFixed=0, missed=[];
for (const f of walk(ROOT)) {
  let html = fs.readFileSync(f, 'utf8');
  const before = html;

  html = html.replace(/>Aerial Platform Service</g, '>Aerial Platform<');
  if (html !== before) labelFixed++;

  html = stripActions(html);

  // Insert actions right after the MAIN nav ul (vo-main-nav) closing tag,
  // found by matching <ul ... </ul> nesting from the vo-main-nav opener.
  const end = mainNavUlEnd(html);
  if (end > 0) {
    html = html.slice(0, end) + ACTIONS + html.slice(end);
    done++;
  } else {
    missed.push(f);
  }

  if (html !== before) fs.writeFileSync(f, html, 'utf8');
}

console.log(`Actions set on ${done} pages, labelFixed on ${labelFixed}.`);
if (missed.length) console.log('MISSED (no nav ul match):\n' + missed.join('\n'));
