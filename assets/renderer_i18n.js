// AntigravityZH Lightweight Renderer DOM Localization Engine
// Expects __AGZH_DICT__, __AGZH_CACHE__, and __AGZH_DEBUG__ in scope (or module.exports for unit tests).

(function initRendererI18n(globalScope) {
  const NEEDS_NORM_RE = /[\u00A0\u200B\u2018\u2019\u201C\u201D\u2026\u202F]/;
  const CJK_CHAR_RE = /[\u4e00-\u9fff]/;

  function normalizeKey(str) {
    if (!NEEDS_NORM_RE.test(str)) return str;
    return str
      .replace(/\u2026/g, '...')       // Unicode ellipsis … -> ...
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes -> '
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes -> "
      .replace(/[\u00A0\u202F]/g, ' ') // Non-breaking / narrow space -> space
      .replace(/\u200B/g, '');         // Zero-width space -> empty
  }

  function createTranslator(dict, initialCache) {
    const exactMap = new Map();
    const addExact = (obj) => {
      if (!obj) return;
      for (const [k, v] of Object.entries(obj)) {
        if (k && v) exactMap.set(normalizeKey(k), v);
      }
    };
    addExact(dict && dict.menus);
    addExact(dict && dict.exact);

    const autoCache = new Map();
    if (initialCache && typeof initialCache === 'object') {
      for (const [k, v] of Object.entries(initialCache)) {
        if (k && v) autoCache.set(normalizeKey(k), v);
      }
    }

    const attrOnlyMap = new Map();
    if (dict && dict.attributes) {
      for (const [k, v] of Object.entries(dict.attributes)) {
        if (!k || !v) continue;
        const nk = normalizeKey(k);
        if (exactMap.get(nk) !== v) {
          attrOnlyMap.set(nk, v);
        }
      }
    }

    const patterns = [];
    const patternsByChar = new Map(); // lowercase char -> Pattern[]
    const digitPatterns = [];
    const fallbackPatterns = [];
    const mixedCjkPatterns = [];
    const CJK_RE = /[\u4e00-\u9fff]/;

    function tryExtractLiteralPrefix(regexStr, flags, replaceStr) {
      if (flags || replaceStr.includes('$')) return null;
      if (!regexStr.startsWith('^') || !regexStr.endsWith('.*$')) return null;
      const body = regexStr.slice(1, -3);
      if (!body) return null;
      let out = '';
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '\\') {
          if (i + 1 >= body.length) return null;
          const next = body[++i];
          if (/[A-Za-z0-9]/.test(next)) return null;
          out += next;
        } else if ('[](){}*+?|.^$'.includes(ch)) {
          return null;
        } else {
          out += ch;
        }
      }
      return out;
    }

    function hasUnescapedPipe(regexStr) {
      for (let i = 0; i < regexStr.length; i++) {
        if (regexStr[i] === '\\') { i++; continue; }
        if (regexStr[i] === '|') return true;
      }
      return false;
    }

    function extractLiteralSuffix(regexStr, flags) {
      if (flags || !regexStr.endsWith('$') || regexStr.endsWith('\\$') || hasUnescapedPipe(regexStr)) return null;
      const body = regexStr.slice(0, -1);
      // Tokenize forward so escapes and quantifiers are parsed unambiguously.
      const tokens = [];
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '\\') {
          if (i + 1 >= body.length) return null;
          const next = body[++i];
          if (/[A-Za-z0-9]/.test(next)) {
            tokens.push({ lit: null });
          } else {
            tokens.push({ lit: next });
          }
        } else if ('[](){}*+?|.^$'.includes(ch)) {
          if ((ch === '?' || ch === '*' || ch === '+') && tokens.length > 0) {
            tokens[tokens.length - 1].lit = null;
          }
          tokens.push({ lit: null });
        } else {
          tokens.push({ lit: ch });
        }
      }
      let out = '';
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].lit === null) break;
        out = tokens[i].lit + out;
      }
      return out.length >= 1 ? out : null;
    }

    function extractLiteralContains(regexStr, flags) {
      if (flags || hasUnescapedPipe(regexStr)) return null;
      let depth = 0;
      let inClass = false;
      let inBrace = false;
      let cur = '';
      let best = '';
      const flush = () => {
        if (cur.length > best.length) best = cur;
        cur = '';
      };
      for (let i = 0; i < regexStr.length; i++) {
        const ch = regexStr[i];
        if (ch === '\\') {
          if (i + 1 >= regexStr.length) break;
          const next = regexStr[++i];
          if (depth === 0 && !inClass && !inBrace && !/[A-Za-z0-9]/.test(next)) {
            const after = regexStr[i + 1] || '';
            if (after === '?' || after === '*' || after === '{') {
              flush();
            } else {
              cur += next;
            }
          } else {
            flush();
          }
          continue;
        }
        if (inClass) {
          if (ch === ']') inClass = false;
          continue;
        }
        if (inBrace) {
          if (ch === '}') inBrace = false;
          continue;
        }
        if (ch === '[') { flush(); inClass = true; continue; }
        if (ch === '(') { flush(); depth++; continue; }
        if (ch === ')') { flush(); if (depth > 0) depth--; continue; }
        if (depth > 0) continue;
        if (ch === '{') { flush(); inBrace = true; continue; }
        if ('}*+?|.^$'.includes(ch)) {
          flush();
          continue;
        }
        const after = regexStr[i + 1] || '';
        if (after === '?' || after === '*' || after === '{') {
          flush();
          continue;
        }
        cur += ch;
      }
      flush();
      return best.length >= 4 ? best : null;
    }

    function extractBucket(regexStr, literalPrefix) {
      if (literalPrefix && literalPrefix.length > 0) {
        const ch = literalPrefix[0];
        if (CJK_RE.test(ch)) return { kind: 'cjk-only' };
        if (ch >= '0' && ch <= '9') return { kind: 'digit' };
        return { kind: 'char', ch: ch.toLowerCase() };
      }
      if (!regexStr || regexStr[0] !== '^') return { kind: 'fallback' };
      const next = regexStr[1];
      if (!next) return { kind: 'fallback' };
      if (CJK_RE.test(next)) return { kind: 'cjk-only' };
      // Escaped literal non-alphanumeric char like ^\+ or ^\(
      if (next === '\\' && regexStr.length >= 3 && !/[A-Za-z0-9]/.test(regexStr[2])) {
        const after = regexStr[3] || '';
        if (after !== '?' && after !== '*' && after !== '|') {
          return { kind: 'char', ch: regexStr[2] };
        }
      }
      // Literal ASCII letter not immediately followed by ?, *, or |
      if (/^[A-Za-z]$/.test(next)) {
        const after = regexStr[2] || '';
        if (after !== '?' && after !== '*' && after !== '|') {
          return { kind: 'char', ch: next.toLowerCase() };
        }
      }
      // Digit-anchored regex like ^(\d+)... or ^\d+...
      if (regexStr.startsWith('^(\\d') || regexStr.startsWith('^\\d')) {
        return { kind: 'digit' };
      }
      return { kind: 'fallback' };
    }

    if (dict && Array.isArray(dict.patterns)) {
      for (let i = 0; i < dict.patterns.length; i++) {
        const p = dict.patterns[i];
        if (!p || !p.regex || typeof p.replace !== 'string') continue;
        try {
          const literalPrefix = tryExtractLiteralPrefix(p.regex, p.flags || '', p.replace);
          let compiled;
          if (literalPrefix !== null) {
            compiled = {
              idx: i,
              prefix: literalPrefix,
              rep: p.replace,
              allowMixedCJK: Boolean(p.allowMixedCJK),
              fullMatch: true
            };
          } else {
            const suffix = extractLiteralSuffix(p.regex, p.flags || '');
            let contains = extractLiteralContains(p.regex, p.flags || '');
            if (contains && suffix && suffix.includes(contains)) {
              contains = null;
            }
            compiled = {
              idx: i,
              re: new RegExp(p.regex, p.flags || ''),
              rep: p.replace,
              allowMixedCJK: Boolean(p.allowMixedCJK),
              fullMatch: p.regex.startsWith('^') && p.regex.endsWith('$'),
              suffix: suffix !== null ? suffix : undefined,
              contains: contains !== null ? contains : undefined
            };
          }
          patterns.push(compiled);
          if (compiled.allowMixedCJK) {
            mixedCjkPatterns.push(compiled);
          }
          const b = extractBucket(p.regex, literalPrefix);
          if (b.kind === 'cjk-only') {
            // Only matches strings with CJK; already in mixedCjkPatterns if allowMixedCJK.
          } else if (b.kind === 'char') {
            let list = patternsByChar.get(b.ch);
            if (!list) {
              list = [];
              patternsByChar.set(b.ch, list);
            }
            list.push(compiled);
          } else if (b.kind === 'digit') {
            digitPatterns.push(compiled);
          } else {
            fallbackPatterns.push(compiled);
          }
        } catch (_) {}
      }
    }

    // Pre-merge each bucket with fallbackPatterns in original priority order (zero runtime allocations).
    const mergedByChar = new Map();
    for (const [ch, list] of patternsByChar.entries()) {
      mergedByChar.set(ch, list.concat(fallbackPatterns).sort((a, b) => a.idx - b.idx));
    }
    const mergedDigits = digitPatterns.concat(fallbackPatterns).sort((a, b) => a.idx - b.idx);

    function getCandidatePatterns(norm, hasCJK) {
      if (hasCJK) return mixedCjkPatterns;
      const code = norm.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return mergedByChar.get(String.fromCharCode(code + 32)) || fallbackPatterns;
      }
      if (code >= 48 && code <= 57) {
        return mergedDigits;
      }
      return mergedByChar.get(norm[0]) || fallbackPatterns;
    }

    const ASCII_LETTER_RE = /[A-Za-z]/;
    const MAX_LEN = 640;

    function lookupTable(normKey, useAttrMap) {
      if (useAttrMap) {
        const attrHit = attrOnlyMap.get(normKey);
        if (attrHit !== undefined) return attrHit;
      }
      return exactMap.get(normKey);
    }

    function translateLine(trimmed, useAttrMap, allowAutoCache) {
      const norm = normalizeKey(trimmed);
      const hasCJK = CJK_RE.test(norm);

      let hit;
      if (!hasCJK) {
        hit = lookupTable(norm, useAttrMap);
        if (hit === undefined && allowAutoCache) {
          hit = autoCache.get(norm);
        }
        if (hit === undefined && norm.includes('\n')) {
          const collapsed = norm.replace(/\s+/g, ' ');
          hit = lookupTable(collapsed, useAttrMap) || (allowAutoCache ? autoCache.get(collapsed) : undefined);
        }
      }
      if (hit === undefined && patterns.length > 0) {
        const candidates = getCandidatePatterns(norm, hasCJK);
        let current = norm;
        let changed = false;
        for (let i = 0; i < candidates.length; i++) {
          const p = candidates[i];
          if (p.prefix !== undefined) {
            if (current.startsWith(p.prefix)) {
              current = p.rep;
              changed = true;
              break;
            }
          } else {
            if (p.suffix !== undefined && !current.endsWith(p.suffix)) continue;
            if (p.contains !== undefined && !current.includes(p.contains)) continue;
            if (p.re.test(current)) {
              const replaced = current.replace(p.re, p.rep);
              if (replaced !== current) {
                current = replaced;
                changed = true;
                if (p.fullMatch) {
                  break;
                }
              }
            }
          }
        }
        if (changed) hit = current;
      }
      return hit;
    }

    function translateString(raw, useAttrMap, allowAutoCache) {
      if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LEN) return null;
      if (!ASCII_LETTER_RE.test(raw)) return null;

      const trimmed = raw.trim();
      if (!trimmed) return null;

      let hit = translateLine(trimmed, useAttrMap, allowAutoCache);

      if (hit === undefined && trimmed.includes('\n')) {
        const lines = trimmed.split('\n');
        let anyChanged = false;
        const out = lines.map((line) => {
          const lt = line.trim();
          if (!lt || !ASCII_LETTER_RE.test(lt)) return line;
          const lh = translateLine(lt, useAttrMap, allowAutoCache);
          if (lh !== undefined && lh !== lt) {
            anyChanged = true;
            return lh;
          }
          return line;
        });
        if (anyChanged) hit = out.join('\n');
      }

      if (hit === undefined) return null;

      const startIdx = raw.indexOf(trimmed);
      const prefix = startIdx > 0 ? raw.slice(0, startIdx) : '';
      const suffix = startIdx + trimmed.length < raw.length ? raw.slice(startIdx + trimmed.length) : '';
      return prefix + hit + suffix;
    }

    return { translateString, exactMap, attrOnlyMap, autoCache, patterns };
  }

  // Export for Node.js unit testing.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTranslator };
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AGZH_INSTALLED__) return;

  const allowFrame = typeof __AGZH_ALLOW_FRAME__ !== 'undefined' && __AGZH_ALLOW_FRAME__;
  const isHttpsLocal = (location.protocol === 'https:' || location.protocol === 'http:') && (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  const titleLooksLikeAG = /antigravity/i.test(document.title || '');
  if (!allowFrame && !isHttpsLocal && !titleLooksLikeAG) {
    return;
  }

  window.__AGZH_INSTALLED__ = true;

  let dict = typeof __AGZH_DICT__ !== 'undefined' ? __AGZH_DICT__ : {};
  let initCache = typeof __AGZH_CACHE__ !== 'undefined' ? __AGZH_CACHE__ : {};
  const debug = typeof __AGZH_DEBUG__ !== 'undefined' && __AGZH_DEBUG__;
  const zhVersion = (dict && typeof dict.version === 'string' && dict.version.trim()) || '2.35.2.3';
  const skipSelector = Array.isArray(dict.skipSelectors) && dict.skipSelectors.length > 0
    ? dict.skipSelectors.join(',')
    : '';
  const { translateString, autoCache } = createTranslator(dict, initCache);
  // Release raw parsed JSON objects immediately so V8 GC can reclaim ~100KB per renderer frame.
  dict = null;
  initCache = null;
  if (typeof __AGZH_DICT__ !== 'undefined') { try { __AGZH_DICT__ = null; } catch (_) {} }
  if (typeof __AGZH_CACHE__ !== 'undefined') { try { __AGZH_CACHE__ = null; } catch (_) {} }

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA',
    'SVG', 'PATH', 'MATH', 'CANVAS', 'IFRAME', 'VIDEO', 'AUDIO'
  ]);
  const ATTR_SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'MATH', 'CANVAS', 'IFRAME', 'VIDEO', 'AUDIO'
  ]);
  const ATTRS = ['placeholder', 'data-placeholder', 'title', 'aria-label'];

  const lastProcessed = new WeakMap();
  const attrCache = new WeakMap();
  const untranslatedSet = debug ? new Set() : null;
  const ATTR_ASCII_RE = /[A-Za-z]/;
  const MAX_AUTO_REQUESTED = 2000;

  // --- On-demand auto-translation ONLY for Plugin Detail / Marketplace / MCP Store descriptions (O(1) cached, zero reflow) ---
  const pendingAutoTexts = new Set();
  const requestedAutoTexts = new Set();
  const autoNodeBindings = new Map(); // normalizedText -> Set<TextNode>
  let autoFlushTimer = null;

  function pruneDisconnectedBindings() {
    for (const [key, set] of autoNodeBindings.entries()) {
      for (const node of set) {
        if (!node || !node.isConnected) set.delete(node);
      }
      if (set.size === 0) autoNodeBindings.delete(key);
    }
  }

  let currentPassId = 1;
  let cachedPluginPagePass = 0;
  let cachedPluginPageVal = false;
  const dialogKindCache = new WeakMap(); // Element -> { pass, kind }

  function getHeadText(root, maxChars) {
    if (!root) return '';
    let out = '';
    try {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while (out.length < maxChars && (n = w.nextNode())) {
        const v = n.nodeValue;
        if (v && v.trim()) out += v.trim() + ' ';
      }
    } catch (_) {}
    return out.slice(0, maxChars);
  }

  function isOnPluginPageCached() {
    if (cachedPluginPagePass === currentPassId) return cachedPluginPageVal;
    cachedPluginPagePass = currentPassId;
    if (/\/(customizations|marketplace|plugins)/i.test(location.pathname + location.hash)) {
      cachedPluginPageVal = true;
      return true;
    }
    const mainEl = document.querySelector('main') || document.body;
    const head = getHeadText(mainEl, 600);
    cachedPluginPageVal = Boolean(
      (head.includes('插件市场') || head.includes('自定义配置') || head.includes('应用内置') || head.includes('已添加') || head.includes('添加') || head.includes('Marketplace') || head.includes('Customizations') || head.includes('Added') || head.includes('Add')) &&
      (head.includes('概览') || head.includes('技能 (Skills)') || head.includes('命令') || head.includes('智能体') || head.includes('工具') || head.includes('权限管理') || head.includes('Overview') || head.includes('Skills') || head.includes('Tools'))
    );
    return cachedPluginPageVal;
  }

  function getDialogKind(dialog) {
    if (!dialog) return 'none';
    const cached = dialogKindCache.get(dialog);
    if (cached && cached.pass === currentPassId) return cached.kind;

    const head = getHeadText(dialog, 420);
    let kind = 'other';
    if (head.includes('添加 MCP 服务') || head.includes('Add MCP Server') ||
        head.includes('搜索 MCP 服务') || head.includes('Search MCP servers')) {
      kind = 'mcp-store';
    } else if (
      (head.includes('设置') || head.includes('Settings')) &&
      (head.includes('外观') || head.includes('Appearance') || head.includes('快捷键') || head.includes('Shortcuts') || head.includes('应用程序') || head.includes('Application') || head.includes('常规') || head.includes('General'))
    ) {
      kind = 'settings';
    } else if (/SKILL\.md|skills\/|agents\/|commands\/|rules\/|plugins\//i.test(head)) {
      kind = 'plugin-item-modal';
    } else {
      const heading = dialog.querySelector('h1, h2, h3, [role="heading"]');
      if (heading && /^\/[a-z0-9_:-]+/i.test((heading.textContent || '').trim())) {
        kind = 'plugin-item-modal';
      } else if (isOnPluginPageCached() && dialog.querySelector('pre, code, .markdown, [class*="markdown" i], [class*="prose" i]')) {
        kind = 'plugin-item-modal';
      }
    }

    dialogKindCache.set(dialog, { pass: currentPassId, kind });
    return kind;
  }

  function isInsidePluginItemModal(el) {
    if (!el || el.nodeType !== 1) return false;
    const dialog = el.closest('[role="dialog"], [aria-modal="true"], dialog');
    if (!dialog) return false;
    return getDialogKind(dialog) === 'plugin-item-modal';
  }

  function isInPluginPageContext(el) {
    if (!el || el.nodeType !== 1) return false;
    // Inside modal dialogs: allow auto-translation ONLY for the Add MCP Server store modal (never Settings or Command/Skill/Agent popups)
    const dialog = el.closest('[role="dialog"], [aria-modal="true"], dialog');
    if (dialog) {
      return getDialogKind(dialog) === 'mcp-store';
    }
    if (el.closest('[data-message-id], .chat-message')) return false;
    return isOnPluginPageCached();
  }

  function isPluginTitleElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('h1, h2, h3, h4, h5, h6, [role="heading"], header, nav')) {
      return true;
    }
    if (el.closest('[class*="title" i], [class*="name" i], [class*="heading" i], [class*="brand" i]')) {
      return true;
    }
    return false;
  }

  function isInlineCodeProse(el) {
    if (!el || el.nodeType !== 1) return false;
    const block = el.closest('p, li');
    return Boolean(block && block.querySelector && block.querySelector('code'));
  }

  function looksLikePluginDescription(text, el) {
    if (!text || text.length > 800) return false;
    if (/[\u4e00-\u9fff]/.test(text)) return false;
    // Skip URLs, file paths, slash command names, CLI flags, version strings
    if (/^(https?:\/\/|\/[a-z0-9_-]+|[A-Za-z]:\\|~\/|--?[a-z0-9-]+|v?\d+\.\d+)/i.test(text)) return false;
    const words = text.split(/\s+/).filter(Boolean);
    const endsWithPunct = /[.!?:。！？：]$/.test(text);
    const inCodeProse = isInlineCodeProse(el);

    if (inCodeProse) {
      // Allow shorter English prose fragments split by inline <code> elements in plugin overview markdown
      if (text.length < 6) return false;
      const letters = (text.match(/[A-Za-z]/g) || []).length;
      return words.length >= 2 && letters >= 5 && letters / text.length >= 0.4;
    }

    if (text.length < 12) return false;
    // Require a sentence or descriptive phrase (at least 4 words, or 3 words ending with sentence punctuation)
    if (words.length < 3 || (words.length < 4 && !endsWithPunct)) return false;
    // Skip Title Case proper-noun plugin/MCP names (e.g. "Atlassian Teamwork Graph CLI", "MongoDB Atlas (Managed MCP)")
    if (!endsWithPunct && words.length <= 6 && text.length < 60) {
      let capCount = 0;
      for (let i = 0; i < words.length; i++) {
        if (/^[A-Z(]/.test(words[i])) capCount++;
      }
      if (capCount / words.length >= 0.65) return false;
    }
    const letters = (text.match(/[A-Za-z]/g) || []).length;
    return letters >= 8 && letters / text.length >= 0.45;
  }

  function flushAutoBatch() {
    autoFlushTimer = null;
    if (pendingAutoTexts.size === 0) return;
    const batch = Array.from(pendingAutoTexts).slice(0, 30);
    for (const item of batch) pendingAutoTexts.delete(item);
    console.debug('__AGZH_TX__' + JSON.stringify(batch));
    if (pendingAutoTexts.size > 0) {
      autoFlushTimer = setTimeout(flushAutoBatch, 250);
    }
  }

  function scheduleAutoTranslate(node, rawText, parentEl, prechecked) {
    const trimmed = rawText.trim();
    const norm = normalizeKey(trimmed);
    if (!prechecked && !looksLikePluginDescription(norm, parentEl)) return;

    let hit = autoCache.get(norm);
    if (hit === undefined && norm.includes('\n')) {
      hit = autoCache.get(norm.replace(/\s+/g, ' '));
    }
    if (hit !== undefined) {
      applySingleNode(node, rawText, trimmed, hit);
      return;
    }

    let set = autoNodeBindings.get(norm);
    if (!set) {
      set = new Set();
      autoNodeBindings.set(norm, set);
    }
    set.add(node);

    if (requestedAutoTexts.has(norm)) return;
    if (requestedAutoTexts.size >= MAX_AUTO_REQUESTED) {
      // Drop oldest entry to keep memory bounded in long sessions.
      const first = requestedAutoTexts.values().next().value;
      if (first !== undefined) requestedAutoTexts.delete(first);
    }
    requestedAutoTexts.add(norm);
    pendingAutoTexts.add(norm);
    if (autoNodeBindings.size > 120) {
      pruneDisconnectedBindings();
    }

    if (!autoFlushTimer) {
      autoFlushTimer = setTimeout(flushAutoBatch, 150);
    }
  }

  function applySingleNode(node, raw, trimmed, hit) {
    if (!node || !node.isConnected) return;
    const startIdx = raw.indexOf(trimmed);
    const prefix = startIdx > 0 ? raw.slice(0, startIdx) : '';
    const suffix = startIdx + trimmed.length < raw.length ? raw.slice(startIdx + trimmed.length) : '';
    const out = prefix + hit + suffix;
    lastProcessed.set(node, out);
    node.nodeValue = out;
  }

  window.__AGZH_APPLY_TX__ = function (resultMap, failedKeys) {
    if (resultMap && typeof resultMap === 'object') {
      for (const [k, v] of Object.entries(resultMap)) {
        if (!k || !v) continue;
        const norm = normalizeKey(k);
        autoCache.set(norm, v);
        const nodes = autoNodeBindings.get(norm);
        if (nodes) {
          for (const node of nodes) {
            if (!node.isConnected) continue;
            const cur = node.nodeValue || '';
            const trimmed = cur.trim();
            if (normalizeKey(trimmed) === norm) {
              applySingleNode(node, cur, trimmed, v);
            }
          }
          autoNodeBindings.delete(norm);
        }
      }
    }
    if (Array.isArray(failedKeys)) {
      for (let i = 0; i < failedKeys.length; i++) {
        autoNodeBindings.delete(normalizeKey(failedKeys[i]));
      }
    }
    if (autoNodeBindings.size > 60) {
      pruneDisconnectedBindings();
    }
  };

  const DIALOG_SELECTOR = '[role="dialog"], [aria-modal="true"], dialog';

  function shouldSkipTextContainer(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (isInsidePluginItemModal(el)) return true;
    if (skipSelector) {
      try {
        if (el.matches(skipSelector) || el.closest(skipSelector)) return true;
      } catch (_) {}
    }
    return false;
  }

  // Fast self-only check for TreeWalker descendants whose ancestors were already checked & pruned.
  function shouldSkipSelfInWalk(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    try {
      if (skipSelector && el.matches(skipSelector)) return true;
      if (el.matches(DIALOG_SELECTOR) && getDialogKind(el) === 'plugin-item-modal') return true;
    } catch (_) {}
    return false;
  }

  const VERSION_ITEM_RE = /^版本\s+([\d.]+)$/;
  function maybeInjectZhVersionMenuItem(node, text) {
    if (!VERSION_ITEM_RE.test(text.trim())) return;
    let row = node.parentElement;
    for (let depth = 0; row && depth < 4; depth++, row = row.parentElement) {
      const container = row.parentElement;
      if (!container) break;
      const next = row.nextElementSibling;
      if (!next) continue;
      const nextTxt = (next.textContent || '').trim();
      if (nextTxt === '检查更新' || nextTxt === 'Check for Updates' || nextTxt === 'Check for Updates...' || nextTxt === '检查更新...') {
        const makeMenuItemClone = (attrName, labelText, titleText, onClick) => {
          const clone = row.cloneNode(true);
          clone.setAttribute(attrName, '1');
          clone.setAttribute('data-agzh-skip', '1');
          clone.removeAttribute('disabled');
          clone.removeAttribute('aria-disabled');
          if (clone.classList) clone.classList.remove('pointer-events-none');
          clone.style.pointerEvents = 'auto';
          clone.style.cursor = 'pointer';
          if (titleText) clone.title = titleText;
          const disabledChildren = clone.querySelectorAll('.pointer-events-none, [disabled], [aria-disabled]');
          for (let i = 0; i < disabledChildren.length; i++) {
            const ch = disabledChildren[i];
            if (ch.classList) ch.classList.remove('pointer-events-none');
            ch.removeAttribute('disabled');
            ch.removeAttribute('aria-disabled');
            ch.style.pointerEvents = 'auto';
          }
          clone.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onClick();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          });
          const tw = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
          let tn;
          while ((tn = tw.nextNode())) {
            if (VERSION_ITEM_RE.test((tn.nodeValue || '').trim())) {
              tn.nodeValue = labelText;
              break;
            }
          }
          return clone;
        };

        if (!container.querySelector('[data-agzh-ver-item]')) {
          const verItem = makeMenuItemClone(
            'data-agzh-ver-item',
            '汉化助手版本 ' + zhVersion,
            'https://github.com/keinx/AntigravityZH',
            () => console.debug('__AGZH_OPEN_HOMEPAGE__')
          );
          container.insertBefore(verItem, next);
        }
        if (!container.querySelector('[data-agzh-skin-menu-item]')) {
          const skinItem = makeMenuItemClone(
            'data-agzh-skin-menu-item',
            '自定义皮肤...',
            '自定义静态图片皮肤设置',
            () => {
              if (typeof window.__AGZH_OPEN_SKIN_PANEL__ === 'function') {
                window.__AGZH_OPEN_SKIN_PANEL__();
              }
            }
          );
          container.insertBefore(skinItem, next);
        }
        return;
      }
    }
  }

  function processTextNode(node, skipChecked) {
    if (!node || node.nodeType !== 3) return;
    const val = node.nodeValue;
    if (!val || lastProcessed.get(node) === val) return;
    if (!ATTR_ASCII_RE.test(val)) {
      lastProcessed.set(node, val);
      return;
    }
    const parent = node.parentElement;
    if (!skipChecked && parent && shouldSkipTextContainer(parent)) {
      lastProcessed.set(node, val);
      return;
    }

    // Fast path: check static O(1) dictionary & bucketed rules first with zero DOM closest() walks.
    const translated = translateString(val, false, false);
    if (translated !== null && translated !== val) {
      lastProcessed.set(node, translated);
      node.nodeValue = translated;
      if (translated.trim().startsWith('版本 ')) {
        maybeInjectZhVersionMenuItem(node, translated);
      }
      return;
    }

    // Only inspect plugin/MCP page context when static lookup missed and text looks like English prose.
    const trimmed = val.trim();
    if (
      parent &&
      trimmed.length >= 6 &&
      !CJK_CHAR_RE.test(trimmed) &&
      ATTR_ASCII_RE.test(trimmed) &&
      isInPluginPageContext(parent) &&
      !isPluginTitleElement(parent) &&
      looksLikePluginDescription(trimmed, parent)
    ) {
      lastProcessed.set(node, val);
      scheduleAutoTranslate(node, val, parent, true);
      return;
    }

    lastProcessed.set(node, val);
    if (untranslatedSet && trimmed.length >= 2 && trimmed.length <= 160 && ATTR_ASCII_RE.test(trimmed)) {
      untranslatedSet.add(trimmed);
    }
  }

  function processAttributes(el) {
    if (!el || el.nodeType !== 1) return;
    if (ATTR_SKIP_TAGS.has(el.tagName) || !el.hasAttributes()) return;
    let seen = attrCache.get(el);
    for (let i = 0; i < ATTRS.length; i++) {
      const attr = ATTRS[i];
      const val = el.getAttribute(attr);
      if (!val || !ATTR_ASCII_RE.test(val)) continue;
      if (seen && seen[attr] === val) continue;
      const translated = translateString(val, true, false);
      if (!seen) {
        seen = Object.create(null);
        attrCache.set(el, seen);
      }
      if (translated !== null && translated !== val) {
        seen[attr] = translated;
        el.setAttribute(attr, translated);
      } else {
        seen[attr] = val;
      }
    }
  }

  function tryTranslateConsecutiveTextRuns(el, skipChecked) {
    if (!el || el.nodeType !== 1) return false;
    const childLen = el.childNodes.length;
    if (childLen <= 1 || childLen > 24) return false;
    if (!skipChecked && shouldSkipTextContainer(el)) return false;

    let anyTranslated = false;
    let i = 0;
    const nodes = el.childNodes;
    while (i < nodes.length) {
      if (nodes[i].nodeType !== 3) {
        i++;
        continue;
      }
      const runStart = i;
      let combined = '';
      while (i < nodes.length && nodes[i].nodeType === 3) {
        combined += nodes[i].nodeValue || '';
        i++;
      }
      if (i - runStart <= 1) continue;
      if (!combined || lastProcessed.get(nodes[runStart]) === combined) continue;

      const translated = translateString(combined, false, false);
      if (translated !== null && translated !== combined) {
        lastProcessed.set(nodes[runStart], translated);
        nodes[runStart].nodeValue = translated;
        for (let k = runStart + 1; k < i; k++) {
          lastProcessed.set(nodes[k], '');
          nodes[k].nodeValue = '';
        }
        if (translated.trim().startsWith('版本 ')) {
          maybeInjectZhVersionMenuItem(nodes[runStart], translated);
        }
        anyTranslated = true;
      }
    }
    return anyTranslated;
  }

  function walkAndTranslate(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      const parent = root.parentElement;
      if (parent) {
        if (shouldSkipTextContainer(parent)) {
          lastProcessed.set(root, root.nodeValue || '');
          return;
        }
        if (tryTranslateConsecutiveTextRuns(parent, true)) {
          return;
        }
      }
      processTextNode(root, true);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 11 && root.nodeType !== 9) return;
    if (root.nodeType === 1) {
      processAttributes(root);
      if (shouldSkipTextContainer(root)) return;
      tryTranslateConsecutiveTextRuns(root, true);
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          if (n.nodeType === 1) {
            processAttributes(n);
            if (shouldSkipSelfInWalk(n)) {
              return NodeFilter.FILTER_REJECT;
            }
            tryTranslateConsecutiveTextRuns(n, true);
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let curr;
    while ((curr = walker.nextNode())) {
      if (curr.nodeType === 3) {
        processTextNode(curr, true);
      }
    }
  }

  const pendingNodes = new Set();
  let rafScheduled = false;

  function hasAncestorInSet(node, set) {
    let p = node.parentNode;
    while (p) {
      if (set.has(p)) return true;
      p = p.parentNode;
    }
    return false;
  }

  function flushPending() {
    rafScheduled = false;
    currentPassId++;
    if (pendingNodes.size === 0) return;
    const snapshot = new Set(pendingNodes);
    pendingNodes.clear();
    const dedup = snapshot.size > 1;
    for (const node of snapshot) {
      if (!node || !node.isConnected) continue;
      if (dedup && hasAncestorInSet(node, snapshot)) continue;
      walkAndTranslate(node);
    }
  }

  function enqueue(node) {
    if (!node || pendingNodes.has(document.body)) return;
    pendingNodes.add(node);
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushPending);
    }
  }

  function isHotSkipTarget(node) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el) return false;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (skipSelector) {
      try {
        if (el.closest(skipSelector)) return true;
      } catch (_) {}
    }
    return false;
  }

  function isHotAttrSkipTarget(el) {
    if (!el || el.nodeType !== 1) return true;
    if (ATTR_SKIP_TAGS.has(el.tagName)) return true;
    if (skipSelector) {
      try {
        if (el.closest(skipSelector)) return true;
      } catch (_) {}
    }
    return false;
  }

  const observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'characterData') {
        const t = m.target;
        const val = t && t.nodeValue;
        if (!val || val.length > 640 || lastProcessed.get(t) === val) continue;
        if (!ATTR_ASCII_RE.test(val)) {
          const prev = t.previousSibling;
          const next = t.nextSibling;
          if ((!prev || prev.nodeType !== 3) && (!next || next.nodeType !== 3)) continue;
        }
        if (!isHotSkipTarget(t)) enqueue(t);
      } else if (m.type === 'attributes') {
        const el = m.target;
        if (!el || el.nodeType !== 1) continue;
        const seen = attrCache.get(el);
        if (seen && m.attributeName && seen[m.attributeName] === el.getAttribute(m.attributeName)) continue;
        if (!isHotAttrSkipTarget(el)) {
          processAttributes(el);
        }
      } else if (m.type === 'childList') {
        if (m.addedNodes.length === 0 || isHotSkipTarget(m.target)) continue;
        for (let j = 0; j < m.addedNodes.length; j++) {
          const added = m.addedNodes[j];
          const nt = added && added.nodeType;
          if (nt !== 1 && nt !== 3) continue;
          if (nt === 1 && ATTR_SKIP_TAGS.has(added.tagName)) continue;
          if (nt === 3) {
            const val = added.nodeValue;
            if (!val || val.length > 640 || lastProcessed.get(added) === val) continue;
            if (!ATTR_ASCII_RE.test(val)) {
              const prev = added.previousSibling;
              const next = added.nextSibling;
              if ((!prev || prev.nodeType !== 3) && (!next || next.nodeType !== 3)) continue;
            }
          }
          enqueue(added);
        }
      }
    }
  });

  function start() {
    if (!document.body) return;
    walkAndTranslate(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  if (debug) {
    window.__AGZH_DUMP_UNTRANSLATED__ = function () {
      return Array.from(untranslatedSet).sort();
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
