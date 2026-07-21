// Ported verbatim from index.html's SanzQRIS module: parses a static EMVCo
// QRIS payload, injects a dynamic transaction amount, strips the merchant
// city, and recalculates the CRC16/CCITT-FALSE checksum.

const BASE_QRIS_PAYLOAD =
  '00020101021126570011ID.DANA.WWW011893600915380499016902098049901690303UMI' +
  '51440014ID.CO.QRIS.WWW0215ID10265158097580303UMI' +
  '5204549953033605802ID' +
  '5922SANZXMZZ | ALL PAYMENT' +
  '6010Kota Bogor' +
  '61051613263045672';

function parseTLV(payload) {
  const fields = {};
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) break;
    const tag = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    if (isNaN(len)) break;
    const value = payload.substring(i + 4, i + 4 + len);
    fields[tag] = value;
    i += 4 + len;
  }
  return fields;
}

function tlv(tag, value) {
  const len = String(value).length;
  const lenStr = len < 10 ? '0' + len : String(len);
  return tag + lenStr + value;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let b = 0; b < 8; b++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}

export function generateDynamicPayload(amount, basePayload) {
  const fields = parseTLV(basePayload || BASE_QRIS_PAYLOAD);

  fields['01'] = '12';
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  fields['54'] = String(amt);
  delete fields['60'];

  const order = ['00', '01', '02', '26', '27', '51', '52', '53', '54', '58', '59', '60', '61', '62'];
  let out = '';
  order.forEach((tag) => {
    if (Object.prototype.hasOwnProperty.call(fields, tag)) out += tlv(tag, fields[tag]);
  });
  Object.keys(fields).forEach((tag) => {
    if (order.indexOf(tag) === -1 && tag !== '63') out += tlv(tag, fields[tag]);
  });

  out += '6304';
  const crc = crc16(out);
  return out + crc;
}

// Renders the payload into a container element as a scannable QR code,
// using the globally-loaded QRCode.js (davidshimjs/qrcodejs, same CDN
// script tag as the original index.html). Falls back to plain payload text.
export function renderQRCode(containerEl, amount, basePayload) {
  if (!containerEl) return null;
  const payload = generateDynamicPayload(amount, basePayload);
  containerEl.innerHTML = '';

  if (typeof window !== 'undefined' && window.QRCode) {
    // eslint-disable-next-line no-new
    new window.QRCode(containerEl, {
      text: payload,
      width: 220,
      height: 220,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } else {
    containerEl.innerHTML =
      '<div style="padding:16px;background:#f8f9fa;border-radius:12px;font-family:monospace;font-size:10px;word-break:break-all;color:#374151;">' +
      'QR generator gagal dimuat. Payload manual:<br><br>' + payload + '</div>';
  }
  return payload;
}

export { BASE_QRIS_PAYLOAD };
