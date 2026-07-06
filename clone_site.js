#!/usr/bin/env node
/*
 * clone_site.js — recursive offline website mirror.
 * Usage: node clone_site.js <url> [outDir] [--max=N]
 *
 * Produces a mirror that works both over http-server AND opened via file://.
 * Beyond plain HTML/CSS/JS/media it handles: WP Rocket delayed JS, image
 * lazyload attrs, RevSlider data-lazyload, Smash Balloon Instagram feeds,
 * absolute/protocol-relative origin URLs inside inline scripts, and modern
 * Vue/Vite/Rollup SPA module chunks (e.g. the Amelia booking modal).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');

const START = process.argv[2];
if (!START) { console.error('Usage: node clone_site.js <url> [outDir] [--max=N]'); process.exit(1); }
const startUrl = new URL(START);
const ROOT_HOST = startUrl.hostname;
const maxArg = process.argv.find(a => a.startsWith('--max='));
const MAX_PAGES = maxArg ? parseInt(maxArg.split('=')[1], 10) : 2000;
const CONCURRENCY = 8;
const OUT = path.resolve(process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : ROOT_HOST);

const ASSET_EXT = new Set(['.css','.js','.mjs','.png','.jpg','.jpeg','.gif','.webp','.avif','.svg','.ico',
  '.mp4','.webm','.ogg','.mov','.m4v','.mp3','.wav','.woff','.woff2','.ttf','.otf','.eot','.json','.xml','.pdf','.txt','.map']);
const TRACKER_RE = /(googletagmanager|google-analytics|googleadservices|doubleclick|connect\.facebook|facebook\.net|hotjar|clarity\.ms|recaptcha|gstatic\.com\/recaptcha|cookiebot|onesignal)/i;
const IGNORE_HREF = /^(mailto:|tel:|javascript:|data:|blob:|#)/i;
const IGNORE_PAGE = /\/(wp-admin|wp-json|xmlrpc\.php|feed\/?$|wp-login)|\?(replytocom|share=|add-to-cart=)/i;

const seenPages = new Set();
const pageQueue = [];
const assets = new Map();
const downloaded = new Set();
let pagesSaved = 0, assetsSaved = 0, chunksSaved = 0, failed = 0;
const errors = [];

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
const isSameSite = h => h === ROOT_HOST || h.endsWith('.' + ROOT_HOST) || ROOT_HOST.endsWith('.' + h);

function fetchUrl(url, asText) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0 (clone_site)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchUrl(new URL(res.headers.location, url).href, asText).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ body: asText ? buf.toString('utf8') : buf, contentType: res.headers['content-type'] || '' });
      });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function pageLocalPath(u) {
  const p = new URL(u);
  let pn = decodeURIComponent(p.pathname);
  if (pn === '' || pn === '/') return path.join(OUT, 'index.html');
  pn = pn.replace(/\/+$/, '');
  if (/\.(html?|php)$/i.test(pn)) return path.join(OUT, pn.replace(/\.php$/i, '.html'));
  return path.join(OUT, pn, 'index.html');
}

function assetLocalPath(u) {
  const p = new URL(u);
  let pn = decodeURIComponent(p.pathname);
  if (pn.endsWith('/') || pn === '') pn += 'index';
  const safe = pn.split('/').map(s => s.replace(/[<>:"|?*\\]/g, '_')).join('/');
  return p.hostname === ROOT_HOST ? path.join(OUT, safe) : path.join(OUT, '_ext', p.hostname, safe);
}

function rel(fromFile, toFile) {
  let r = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  return r.startsWith('.') ? r : './' + r;
}

// Root-relative prefix from a page file back to OUT (for file://-safe inline URLs).
function rootRelFrom(file) {
  let r = path.relative(path.dirname(file), OUT).replace(/\\/g, '/');
  if (!r) return './';
  if (!r.startsWith('.')) r = './' + r;
  return r + '/';
}

function normalizePage(u) {
  const p = new URL(u);
  p.hash = ''; p.search = '';
  p.pathname = p.pathname.replace(/\/+$/, '') || '/';
  return p.href;
}

function looksLikePage(u) {
  let p; try { p = new URL(u); } catch { return false; }
  if (!isSameSite(p.hostname)) return false;
  if (IGNORE_PAGE.test(p.pathname + p.search)) return false;
  const ext = path.extname(p.pathname).toLowerCase();
  return ext === '' || /\.(html?|php)$/i.test(ext);
}

function queueAsset(absUrl) {
  if (TRACKER_RE.test(absUrl)) return null;
  const local = assetLocalPath(absUrl);
  if (!assets.has(absUrl)) assets.set(absUrl, local);
  return local;
}

// Resolve a raw URL (relative/protocol-relative/absolute) found on `pageUrl`,
// queue it for download, and return the path to use from `file`. Returns null
// if it can't be turned into a local asset.
function localizeRef(raw, pageUrl, file) {
  if (!raw || IGNORE_HREF.test(raw)) return null;
  let abs; try { abs = new URL(raw, pageUrl).href; } catch { return null; }
  const local = queueAsset(abs);
  return local ? rel(file, local) : null;
}

function rewriteCss(cssText, cssUrl, cssLocalPath) {
  const handle = (raw) => {
    const cleaned = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!cleaned || IGNORE_HREF.test(cleaned)) return null;
    let abs; try { abs = new URL(cleaned, cssUrl).href; } catch { return null; }
    const local = queueAsset(abs);
    return local ? rel(cssLocalPath, local) : null;
  };
  cssText = cssText.replace(/url\(\s*([^)]+?)\s*\)/gi, (m, g) => { const r = handle(g); return r ? `url(${r})` : m; });
  cssText = cssText.replace(/@import\s+(?:url\()?\s*(['"][^'"]+['"])\s*\)?/gi, (m, g) => { const r = handle(g); return r ? `@import url(${r})` : m; });
  return cssText;
}

function rewriteSrcset(val, baseUrl, fromFile) {
  return val.split(',').map(part => {
    const seg = part.trim(); if (!seg) return '';
    const sp = seg.split(/\s+/); const url = sp[0];
    if (IGNORE_HREF.test(url)) return seg;
    let abs; try { abs = new URL(url, baseUrl).href; } catch { return seg; }
    const local = queueAsset(abs);
    return local ? [rel(fromFile, local), ...sp.slice(1)].join(' ') : seg;
  }).filter(Boolean).join(', ');
}

async function processPage(pageUrl) {
  const res = await fetchUrl(pageUrl, true);
  if (!/text\/html/i.test(res.contentType)) {
    const local = queueAsset(pageUrl); if (local) await downloadAsset(pageUrl, local); return;
  }
  const file = pageLocalPath(pageUrl);
  const $ = cheerio.load(res.body, { decodeEntities: false });

  $('script').each((_, el) => { if (($(el).html() || '').includes('RocketLazyLoadScripts')) $(el).remove(); });

  $('script[type="rocketlazyloadscript"]').each((_, el) => {
    const $el = $(el); const src = $el.attr('data-rocket-src');
    $el.removeAttr('type').removeAttr('data-rocket-type');
    if (!src) { $el.removeAttr('data-rocket-src'); return; }
    if (TRACKER_RE.test(src)) { $el.remove(); return; }
    let abs; try { abs = new URL(src, pageUrl).href; } catch { $el.remove(); return; }
    const local = queueAsset(abs);
    if (local) $el.attr('src', rel(file, local)); else $el.attr('src', abs);
    $el.removeAttr('data-rocket-src');
  });

  $('img').each((_, el) => {
    const $el = $(el);
    const ds = $el.attr('data-src') || $el.attr('data-lazy-src') || $el.attr('data-rocket-lazy-src');
    if (ds && !/^data:/.test(ds)) $el.attr('src', ds);
    const dss = $el.attr('data-srcset') || $el.attr('data-lazy-srcset');
    if (dss) $el.attr('srcset', dss);
    ['data-src','data-lazy-src','data-srcset','data-lazy-srcset','data-rocket-lazy-src'].forEach(a => $el.removeAttr(a));
  });

  const rewriteAttr = (sel, attr, kind) => $(sel).each((_, el) => {
    const $el = $(el); let v = $el.attr(attr); if (!v || IGNORE_HREF.test(v)) return;
    let abs; try { abs = new URL(v, pageUrl).href; } catch { return; }
    if (kind === 'page-or-asset') {
      if (looksLikePage(abs)) { const np = normalizePage(abs); if (!seenPages.has(np)) { seenPages.add(np); pageQueue.push(np); } $el.attr(attr, rel(file, pageLocalPath(abs))); return; }
      const ext = path.extname(new URL(abs).pathname).toLowerCase();
      if (!ASSET_EXT.has(ext)) return;
    }
    if (TRACKER_RE.test(abs) && kind === 'script') { $el.remove(); return; }
    const local = queueAsset(abs);
    if (local) $el.attr(attr, rel(file, local));
  });
  rewriteAttr('link[href]', 'href');
  rewriteAttr('script[src]', 'src', 'script');
  rewriteAttr('img[src]', 'src');
  rewriteAttr('video[src]', 'src');
  rewriteAttr('video[poster]', 'poster');
  rewriteAttr('source[src]', 'src');
  rewriteAttr('audio[src]', 'src');
  rewriteAttr('embed[src]', 'src');
  rewriteAttr('a[href]', 'href', 'page-or-asset');
  $('img[srcset], source[srcset]').each((_, el) => { const $el = $(el); $el.attr('srcset', rewriteSrcset($el.attr('srcset'), pageUrl, file)); });

  $('style').each((_, el) => { const $el = $(el); $el.text(rewriteCss($el.text(), pageUrl, file)); });
  $('[style]').each((_, el) => { const $el = $(el); $el.attr('style', rewriteCss($el.attr('style'), pageUrl, file)); });

  // --- Revolution Slider lazy-load (run AFTER rewriteAttr so we set final
  // local paths directly without them being re-resolved against pageUrl). ---
  $('[data-lazyload]').each((_, el) => {
    const $el = $(el);
    const raw = $el.attr('data-lazyload'); if (!raw || /^data:/.test(raw)) return;
    const local = localizeRef(/^\/\//.test(raw) ? 'https:' + raw : raw, pageUrl, file);
    if (!local) return;
    $el.attr('data-lazyload', local);
    const cur = $el.attr('src') || '';
    if (/dummy\.(png|jpg|gif)|placeholder\.(png|jpg|gif)/i.test(cur)) $el.attr('src', local);
  });

  // --- Smash Balloon Instagram Feed (run AFTER rewriteAttr/style for the same
  // reason — these set final local paths that must not be re-resolved). ---
  $('.sbi_item.sbi_transition').each((_, el) => $(el).removeClass('sbi_transition'));
  $('[data-img-src-set]').each((_, el) => {
    const $el = $(el); const raw = $el.attr('data-img-src-set'); if (!raw) return;
    let obj; try { obj = JSON.parse(raw); } catch { return; }
    let preferred = null;
    for (const [size, u] of Object.entries(obj)) {
      if (typeof u !== 'string' || !/^https?:\/\//.test(u)) continue;
      const local = localizeRef(u, pageUrl, file); if (!local) continue;
      obj[size] = local;
      if (size === 'd' || (!preferred && size === '640') || !preferred) preferred = local;
    }
    $el.attr('data-img-src-set', JSON.stringify(obj));
    if (preferred) {
      const $imgs = $el.find('img').add($el.parent().find('img'));
      $imgs.each((_, img) => {
        const $img = $(img); const src = $img.attr('src') || '';
        if (/placeholder\.(png|jpg|gif)$/i.test(src)) $img.attr('src', preferred);
      });
    }
  });
  $('[data-full-res]').each((_, el) => {
    const $el = $(el); const local = localizeRef($el.attr('data-full-res'), pageUrl, file);
    if (local) $el.attr('data-full-res', local);
  });
  $('[data-avatar-url]').each((_, el) => {
    const $el = $(el); const local = localizeRef($el.attr('data-avatar-url'), pageUrl, file);
    if (!local) return;
    $el.attr('data-avatar-url', local);
    const existing = $el.attr('style') || '';
    if (!/background-image/i.test(existing)) $el.attr('style', (existing ? existing + ';' : '') + `background-image:url(${local})`);
  });
  // Reproduce the plugin's runtime aspect-ratio cropping as static CSS.
  const sbiRatios = new Set();
  $('[data-imageaspectratio]').each((_, el) => {
    const cls = ($(el).attr('class') || ''); const id = ($(el).attr('id') || '');
    if (/\bsbi\b/.test(cls) || id === 'sb_instagram') sbiRatios.add($(el).attr('data-imageaspectratio'));
  });
  if (sbiRatios.size && !$('#sbi-offline-fix').length) {
    let css = '';
    for (const r of sbiRatios) {
      const [w, h] = String(r).split(':'); const ar = (w && h) ? `${w}/${h}` : '1/1';
      css += `[data-imageaspectratio="${r}"] .sbi_photo_wrap{aspect-ratio:${ar};height:auto!important;padding-bottom:0!important;position:relative;overflow:hidden;}`
        + `[data-imageaspectratio="${r}"] .sbi_photo_wrap>a.sbi_photo,[data-imageaspectratio="${r}"] .sbi_photo_wrap>.sbi_photo{position:absolute;inset:0;width:100%;height:100%;display:block;}`
        + `[data-imageaspectratio="${r}"] .sbi_photo_wrap img{width:100%!important;height:100%!important;object-fit:cover!important;}`;
    }
    $('head').append(`<style id="sbi-offline-fix">${css}</style>`);
  }

  // --- Inline-script origin URLs: rewrite https://host/ and //host/ to a
  // root-relative path so JS-driven config works under file://. Skip JSON-LD. ---
  const rootRel = rootRelFrom(file);
  const originRe = new RegExp('(https?:)?\\/\\/(?:www\\.)?' + ROOT_HOST.replace(/\./g, '\\.') + '\\/', 'gi');
  $('script').each((_, el) => {
    const $el = $(el);
    if (($el.attr('type') || '').toLowerCase() === 'application/ld+json') return;
    const txt = $el.html(); if (!txt || !originRe.test(txt)) return;
    originRe.lastIndex = 0;
    $el.text(txt.replace(originRe, rootRel));
  });

  ensureDir(path.dirname(file));
  fs.writeFileSync(file, $.html(), 'utf8');
  pagesSaved++;
  if (pagesSaved % 10 === 0) console.log(`  pages: ${pagesSaved} (queue ${pageQueue.length})`);
}

async function downloadAsset(url, local) {
  if (downloaded.has(url)) return; downloaded.add(url);
  const res = await fetchUrl(url, false);
  ensureDir(path.dirname(local));
  const isCss = /\.css($|\?)/i.test(url) || /text\/css/i.test(res.contentType);
  if (isCss) {
    const rewritten = rewriteCss(res.body.toString('utf8'), url, local);
    fs.writeFileSync(local, rewritten, 'utf8');
  } else {
    fs.writeFileSync(local, res.body);
  }
  assetsSaved++;
}

async function drainAssets() {
  let pending = [...assets.entries()].filter(([u]) => !downloaded.has(u));
  while (pending.length) {
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      await Promise.all(pending.slice(i, i + CONCURRENCY).map(([u, l]) =>
        downloadAsset(u, l).catch(e => { failed++; errors.push(u + ' :: ' + e.message); })));
      if (assetsSaved % 25 < CONCURRENCY) console.log(`  assets: ${assetsSaved}`);
    }
    pending = [...assets.entries()].filter(([u]) => !downloaded.has(u));
  }
}

// Find Vue/Vite/Rollup chunk filenames referenced inside a JS module: relative
// imports (from"./x.js", import("./x.css")) and hashed sibling names
// ("assets/Name.1a2b3c4d.css"). The hashed pattern strips any path prefix and
// resolves the bare name against the source file's dir — Vite/Rollup keep all
// chunks flat in one assets/ folder, so a sibling resolve is correct.
function extractChunkRefs(text) {
  if (!/\bimport\s*\(|from\s*["']\.|modulepreload|["']assets\//.test(text)) return [];
  const refs = new Set();
  const reRelative = /["'`](\.\.?\/[A-Za-z0-9_\-./]+\.(?:js|mjs|css))["'`]/g;
  const reHashed = /[\W_\/]([A-Za-z0-9_\-]+\.[A-Fa-f0-9]{6,12}\.(?:js|mjs|css))(?=[\W_])/g;
  let m;
  while ((m = reRelative.exec(text))) refs.add(m[1]);
  while ((m = reHashed.exec(text))) refs.add(m[1]);
  return [...refs];
}

async function resolveModuleChunks() {
  const scanned = new Set();
  let round = 0;
  while (true) {
    const toScan = [...assets.entries()].filter(([u]) =>
      downloaded.has(u) && !scanned.has(u) && /\.(js|mjs)(\?|$)/i.test(u) && isSameSite(new URL(u).hostname));
    if (!toScan.length) break;
    round++;
    let added = 0;
    for (const [srcUrl, localPath] of toScan) {
      scanned.add(srcUrl);
      let text; try { text = fs.readFileSync(localPath, 'utf8'); } catch { continue; }
      for (const ref of extractChunkRefs(text)) {
        if (/^(https?:)?\/\//.test(ref) || /^data:|^blob:|^#/.test(ref)) continue;
        let abs; try { abs = new URL(ref, srcUrl).href; } catch { continue; }
        if (!isSameSite(new URL(abs).hostname)) continue;
        if (!assets.has(abs)) { queueAsset(abs); added++; }
      }
    }
    if (!added) break;
    const before = assetsSaved;
    console.log(`  chunk round ${round}: +${added} referenced`);
    await drainAssets();
    chunksSaved += Math.max(0, assetsSaved - before);
  }
}

(async () => {
  console.log(`Cloning ${startUrl.href} -> ${OUT}`);
  ensureDir(OUT);
  const first = normalizePage(startUrl.href);
  seenPages.add(first); pageQueue.push(first);

  while (pageQueue.length && pagesSaved < MAX_PAGES) {
    const batch = pageQueue.splice(0, CONCURRENCY);
    await Promise.all(batch.map(u => processPage(u).catch(e => { failed++; errors.push(u + ' :: ' + e.message); })));
  }
  console.log(`\nCrawled ${pagesSaved} pages. Downloading ${assets.size} assets...`);
  await drainAssets();
  console.log(`\nResolving JS module chunks (Vue/Vite SPAs)...`);
  await resolveModuleChunks();

  const report = { site: startUrl.href, out: OUT, pages: pagesSaved, assets: assetsSaved, jsChunks: chunksSaved, failed, sampleErrors: errors.slice(0, 15) };
  fs.writeFileSync(path.join(OUT, 'clone-report.json'), JSON.stringify(report, null, 2));
  console.log(`\nDone. Pages: ${pagesSaved}, Assets: ${assetsSaved}, JS chunks: ${chunksSaved}, Failed: ${failed}`);
  console.log(`Output: ${OUT}`);
  if (errors.length) console.log(`(${errors.length} errors — see clone-report.json)`);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
