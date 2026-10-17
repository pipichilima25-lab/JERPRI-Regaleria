/* =========================================================
   JERPRI · Envío de SMS
   ---------------------------------------------------------
   Para mandar SMS de verdad hace falta una cuenta en un
   servicio de mensajes. Este archivo usa Twilio
   (https://www.twilio.com): completá en servidor/.env
     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM
   Si esos datos están vacíos, el servidor funciona en
   "modo prueba": NO envía el SMS y muestra el mensaje en la
   terminal donde corre "npm start".
   ========================================================= */
'use strict';

function configurado() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

/** Envía un SMS. Devuelve { ok, prueba }. Nunca lanza errores. */
async function enviarSms(numero, texto) {
  if (!configurado()) {
    console.log(`\n  📱 [SMS · modo prueba] Para ${numero}:\n     ${texto}\n     (Para enviar SMS reales, completá los datos TWILIO_ en servidor/.env)\n`);
    return { ok: true, prueba: true };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(sid + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: numero, From: process.env.TWILIO_FROM, Body: texto })
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      console.error(`[sms] Twilio no envió el SMS (${res.status}): ${d.message || 'sin detalle'}`);
      return { ok: false };
    }
    return { ok: true, prueba: false };
  } catch (err) {
    console.error('[sms] No se pudo conectar con Twilio:', err.message);
    return { ok: false };
  }
}

module.exports = { enviarSms, configurado };
