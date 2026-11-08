const P = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  cols: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
};

const RULES = [
  [/^(delete|purge|wipe|erase|remove all|clear all)/, 'trash'],
  [/^(new|add|create|grant)\b/, 'plus'],
  [/^(save|update)\b/, 'save'],
  [/^(approve|confirm|apply|done|accept|validate|verify|mark|resolve|ok\b)/, 'check'],
  [/^(cancel|close|dismiss|clear|reject|decline|discard|remove)/, 'x'],
  [/^(edit|rename|modify)/, 'pencil'],
  [/^(refresh|reload|retry|try again|sync)/, 'refresh'],
  [/^(export|download)/, 'download'],
  [/^(import|upload|choose|attach|browse)/, 'upload'],
  [/^(search|find)/, 'search'],
  [/^(copy|duplicate|clone)/, 'copy'],
  [/^(run|start|execute|play|launch)\b/, 'play'],
  [/^(view|open|preview|details|show)\b/, 'eye'],
  [/^(back|return|previous|prev)\b/, 'left'],
  [/^(next|continue)\b/, 'right'],
  [/^(send|post|publish|reply|notify|broadcast)/, 'send'],
  [/^(restore|undo|reset|revert)/, 'undo'],
  [/^(ban|block|suspend|revoke|disable|deactivate)/, 'ban'],
  [/^(lock|unlock)\b/, 'lock'],
  [/^(sign out|log out|logout)/, 'logout'],
  [/^filter/, 'filter'],
  [/^print/, 'print'],
  [/^(share|link)\b/, 'link'],
  [/^columns/, 'cols'],
];

function iconFor(el) {
  if (el.hasAttribute('data-xa-skip') || el.querySelector('svg, img') || el.closest('.sidebar, .xa-toasts')) return '';
  const t = (el.textContent || '').trim();
  if (t.length < 2 || t.length > 32 || !/^[A-Za-z]/.test(t)) return '';
  const low = t.toLowerCase();
  for (const [re, name] of RULES) if (re.test(low)) return name;
  return '';
}

function tag(el) {
  const want = iconFor(el);
  const has = el.getAttribute('data-xa-ico') || '';
  if (want && want !== has) el.setAttribute('data-xa-ico', want);
  else if (!want && has) el.removeAttribute('data-xa-ico');
}

let timer = 0;
const scan = () => { timer = 0; document.querySelectorAll('button').forEach(tag); };
const schedule = () => { if (!timer) timer = window.setTimeout(scan, 80); };

export function startAutoIcons() {
  if (typeof document === 'undefined' || window.__xaIcons) return;
  window.__xaIcons = true;
  const st = document.createElement('style');
  const rules = Object.keys(P).map((k) => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" + P[k] + '</svg>';
    return 'button[data-xa-ico="' + k + '"]{--xa-ico:url("data:image/svg+xml,' + encodeURIComponent(svg) + '")}';
  }).join('\n');
  st.textContent = rules + '\nbutton[data-xa-ico]::before{content:"";display:inline-block;width:1.05em;height:1.05em;flex:0 0 auto;margin-right:6px;vertical-align:-0.15em;background:currentColor;-webkit-mask:var(--xa-ico) center/contain no-repeat;mask:var(--xa-ico) center/contain no-repeat}\n.neu-btn[data-xa-ico]::before{margin-right:0}';
  document.head.appendChild(st);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}
