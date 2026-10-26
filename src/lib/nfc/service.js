import { toWebNfc } from './ndef.js';

export function checkSupport() {
  return {
    secure: typeof window !== 'undefined' && !!window.isSecureContext,
    api: typeof window !== 'undefined' && 'NDEFReader' in window,
    android: typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent),
  };
}

function decode(rec) {
  try {
    if (rec.recordType === 'text') {
      const text = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
      return { type: 'text', text, lang: rec.lang || '' };
    }
    if (rec.recordType === 'url' || rec.recordType === 'absolute-url')
      return { type: 'url', url: new TextDecoder().decode(rec.data) };
  } catch { /* fall through to unsupported */ }
  return { type: 'unsupported', recordType: rec.recordType, mediaType: rec.mediaType || '', bytes: rec.data ? rec.data.byteLength : 0 };
}

// Resolves with the first tag read; stops scanning afterwards.
export function readTag(outer) {
  return new Promise((resolve, reject) => {
    const ctl = new AbortController();
    let done = false;
    const onAbort = () => finish(reject, Object.assign(new Error('cancelled'), { name: 'AbortError' }));
    const finish = (fn, v) => {
      if (done) return;
      done = true;
      outer?.removeEventListener('abort', onAbort);
      ctl.abort();
      fn(v);
    };
    outer?.addEventListener('abort', onAbort);
    try {
      const reader = new NDEFReader();
      reader.onreading = (e) => finish(resolve, { records: Array.from(e.message.records, decode) });
      reader.onreadingerror = () => finish(reject, Object.assign(new Error('read error'), { name: 'NotReadableError' }));
      reader.scan({ signal: ctl.signal }).catch((err) => finish(reject, err));
    } catch (err) { finish(reject, err); }
  });
}

export async function writeTag(records, signal) {
  const w = new NDEFReader();
  await w.write({ records: toWebNfc(records) }, { overwrite: true, signal });
}

export function mapError(e) {
  const name = e && e.name;
  const M = {
    AbortError: ['cancelled', 'Cancelled.'],
    NotAllowedError: ['denied', 'NFC permission was denied or blocked. Allow NFC for this site in Chrome and try again.'],
    NotSupportedError: ['unsupported', 'NFC is not available. Turn NFC on in Android settings, and use Chrome over HTTPS.'],
    NotReadableError: ['unreadable', 'The tag could not be read. Hold it steady against the back of the phone and retry.'],
    NetworkError: ['uncertain', 'The tag moved during the operation. The write may be incomplete: read the tag to check before retrying.'],
    InvalidStateError: ['busy', 'Another NFC operation is already running.'],
    SyntaxError: ['invalid', 'The message could not be encoded. Check the records.'],
  };
  const m = M[name];
  return m ? { code: m[0], message: m[1] } : { code: 'unknown', message: 'NFC error: ' + String((e && e.message) || e) };
}
