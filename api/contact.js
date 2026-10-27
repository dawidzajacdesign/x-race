// Vercel Serverless Function: POST /api/contact
// Przyjmuje zapytanie z formularza X-Race i wysyła je mailem przez Resend (https://resend.com).
//
// Zmienne środowiskowe (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  – klucz API z Resend (wymagany)
//   CONTACT_TO      – adres(y) odbiorcy, np. "hart@hartphp.com.pl" lub kilka po przecinku (wymagany)
//   CONTACT_FROM    – nadawca z domeny zweryfikowanej w Resend, np. "X-Race <formularz@hartphp.com.pl>" (wymagany)

const TYPES = { sklep: 'Sklep', warsztat: 'Warsztat', hurtownia: 'Hurtownia', kierowca: 'Kierowca' };
const LIMITS = { imie: 120, firma: 160, nip: 20, miasto: 80, email: 160, telefon: 30, wiadomosc: 3000, strona: 300 };

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // pułapka na boty: pole ukryte dla ludzi
  if (body.website) return res.status(200).json({ ok: true });

  const d = {};
  for (const k of Object.keys(LIMITS)) d[k] = clean(body[k], LIMITS[k]);
  const typ = TYPES[body.typ] ? body.typ : 'sklep';
  const driver = typ === 'kierowca';

  const errors = [];
  if (!d.miasto) errors.push('miasto');
  if (!/^[+0-9 ()\-]{9,30}$/.test(d.telefon)) errors.push('telefon');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.push('email');
  if (!driver && !d.firma) errors.push('firma');
  if (d.nip && !/^[0-9 \-]{10,13}$/.test(d.nip)) errors.push('nip');
  if (body.zgoda !== true) errors.push('zgoda');
  if (errors.length) return res.status(400).json({ ok: false, error: 'invalid', fields: errors });

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const rows = [
    ['Kim jest', TYPES[typ]],
    d.imie && ['Imię i nazwisko', d.imie],
    !driver && ['Firma', d.firma],
    !driver && d.nip && ['NIP', d.nip],
    ['Miejscowość', d.miasto],
    ['E-mail', d.email],
    ['Telefon', d.telefon],
    [driver ? 'Auto' : 'Wiadomość', d.wiadomosc || '(brak)'],
    ['Zgoda na przetwarzanie danych', 'tak'],
    ['Wysłano ze strony', d.strona || '-'],
  ].filter(Boolean);

  const subject = `X-Race: ${TYPES[typ]} – ${driver ? (d.imie || d.email) : d.firma} (${d.miasto})`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<h2 style="font-family:Arial,sans-serif">Nowe zapytanie X-Race</h2><table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${
    rows.map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(String(v))}</td></tr>`).join('')
  }</table>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO.split(',').map(s => s.trim()).filter(Boolean),
        reply_to: d.email,
        subject,
        text,
        html,
      }),
    });
    if (!r.ok) {
      console.error('contact: resend error', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: exception', err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
