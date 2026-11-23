/* Team Scaglia — Google Analytics 4 con consentimiento de cookies (Consent Mode v2)
   GA4 NO activa cookies de analítica hasta que el visitante las acepta.
   Preferencia guardada en localStorage; se puede cambiar con window.abrirPreferenciasCookies(). */
(function () {
  var GA_ID = 'G-QNPSLM7JMX';
  var KEY = 'ts_cookie_consent'; // 'granted' | 'denied'

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  // 1) Por defecto: TODO denegado (antes de cargar gtag.js)
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied'
  });

  // 2) Cargar gtag.js (respeta el consentimiento)
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID);

  // 3) Aplicar preferencia guardada
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  // Microsoft Clarity (grabaciones de sesión + mapas de calor) — solo con consentimiento
  var clarityLoaded = false;
  function loadClarity() {
    if (clarityLoaded) return;
    clarityLoaded = true;
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "zibc42uh1j");
  }

  if (stored === 'granted') {
    gtag('consent', 'update', { 'analytics_storage': 'granted' });
    loadClarity();
  }

  function setConsent(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
    gtag('consent', 'update', { 'analytics_storage': val });
    if (val === 'granted') loadClarity();
    hideBanner();
  }

  function hideBanner() {
    var b = document.getElementById('ts-cookie-banner');
    if (b) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.getElementById('ts-cookie-banner')) return;

    if (!document.getElementById('ts-cookie-style')) {
      var st = document.createElement('style');
      st.id = 'ts-cookie-style';
      st.textContent =
        '#ts-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:460px;margin:0 auto;background:#fff;color:#1a1a1a;border:1px solid #e3e6ec;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.18);padding:20px 22px;font-family:Montserrat,-apple-system,Segoe UI,Roboto,sans-serif;animation:tsccup .25s ease}' +
        '@keyframes tsccup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
        '#ts-cookie-banner p{margin:0 0 14px;font-size:13px;line-height:1.6;font-weight:300;color:#33373d}' +
        '#ts-cookie-banner a{color:#253C64;font-weight:500}' +
        '#ts-cookie-banner .ts-cc-row{display:flex;gap:10px;flex-wrap:wrap}' +
        '#ts-cookie-banner button{flex:1;min-width:120px;cursor:pointer;border-radius:9px;padding:11px 16px;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:.04em;transition:opacity .2s,background .2s}' +
        '#ts-cc-accept{background:#253C64;color:#fff;border:1px solid #253C64}' +
        '#ts-cc-accept:hover{opacity:.9}' +
        '#ts-cc-reject{background:#fff;color:#253C64;border:1px solid #c9cedb}' +
        '#ts-cc-reject:hover{background:#f3f5f9}';
      document.head.appendChild(st);
    }

    var b = document.createElement('div');
    b.id = 'ts-cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Aviso de cookies');
    b.innerHTML =
      '<p>Usamos cookies de análisis (Google Analytics y Microsoft Clarity) para entender cómo se usa el sitio y mejorarlo. Más información en nuestra <a href="/privacidad/">Política de privacidad</a>.</p>' +
      '<div class="ts-cc-row">' +
      '<button id="ts-cc-reject" type="button">Rechazar</button>' +
      '<button id="ts-cc-accept" type="button">Aceptar</button>' +
      '</div>';
    document.body.appendChild(b);
    document.getElementById('ts-cc-accept').addEventListener('click', function () { setConsent('granted'); });
    document.getElementById('ts-cc-reject').addEventListener('click', function () { setConsent('denied'); });
  }

  // Permite reabrir el aviso para cambiar la preferencia
  window.abrirPreferenciasCookies = function () { showBanner(); };

  // Mostrar el aviso solo si todavía no hay decisión
  function init() {
    if (stored !== 'granted' && stored !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
