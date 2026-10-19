/* About, credits & disclaimer page (EN/ES). Plain text on purpose: edit the CONTENT object below, nothing else needs to change.
   This is information for the user, not legal advice. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const CONTENT = {
        en: {
            title: 'About & credits',
            lead: 'Project 4192 is the companion app for the Project 4192 tabletop game: build your army, track your games and read the rules.',
            sections: [
                ['Rules and data', ['All rules, factions, units, points and missions in this app belong to the Project 4192 game. Edit them in the data files described in README.md.']],
                ['Your data', ['Rosters and games are stored on this device (in your browser). Export backups from Data & Offline. If you create an account, only what you choose to save to the cloud, a league or a live game is sent to the server.']],
                ['Feedback', ['Found a mistake or have an idea? Use "Report a bug / suggest" in the menu.']],
                ['No warranty', ['The app is provided "as is", without warranty of any kind.']]
            ],
            version: 'Version', dataLabel: 'Data build', back: 'Back'
        },
        es: {
            title: 'Acerca de y créditos',
            lead: 'Project 4192 es la app del juego de mesa Project 4192: arma tu ejército, lleva tus partidas y consulta las reglas.',
            sections: [
                ['Reglas y datos', ['Todas las reglas, facciones, unidades, puntos y misiones de esta app pertenecen al juego Project 4192. Se editan en los archivos de datos descritos en README.md.']],
                ['Tus datos', ['Los ejércitos y las partidas se guardan en este dispositivo (en tu navegador). Exporta copias de seguridad desde Datos y sin conexión. Si creas una cuenta, solo se envía al servidor lo que decidas guardar en la nube, en una liga o en una partida en vivo.']],
                ['Comentarios', ['¿Encontraste un error o tienes una idea? Usa "Reportar error / sugerir" en el menú.']],
                ['Sin garantía', ['La app se ofrece "tal cual", sin garantía de ningún tipo.']]
            ],
            version: 'Versión', dataLabel: 'Datos', back: 'Volver'
        }
    };
    function render() {
        const root = document.getElementById('about-root'); if (!root) return;
        const c = CONTENT[lang()];
        let v = ''; try { v = (window.BL_BUILD || '').toString(); } catch (e) {}
        root.innerHTML = `<div style="max-width:760px; margin:0 auto; padding:18px 16px 40px;">
            <h2 style="margin:0 0 10px; color:#fff;">${esc(c.title)}</h2>
            <p style="color:#e5c15a; font-weight:700; line-height:1.5; margin:0 0 18px;">${esc(c.lead)}</p>
            ${c.sections.map(([h, ps]) => `<section style="background:#161d27; border:1px solid #2a3546; border-radius:12px; padding:14px 16px; margin-bottom:12px;"><h3 style="margin:0 0 8px; color:var(--accent); font-size:1rem;">${esc(h)}</h3>${ps.map(p => `<p style="color:#cfd8e3; line-height:1.55; margin:0 0 8px;">${esc(p)}</p>`).join('')}</section>`).join('')}
            <div style="color:#667; font-size:0.78rem; margin-top:14px;">${esc(c.version)}: ${esc(v || '—')} · ${esc(c.dataLabel)}: ${esc(window.BL_DATA_V || '—')}</div></div>`;
    }
    window.ABOUT = { render, text: lang => CONTENT[lang || 'en'] };
    // one-line notice used by the PDF footer and the datasheet / roster screens
    window.FAN_NOTICE = { en: 'Project 4192 companion app.', es: 'App complementaria de Project 4192.' };
    const base = window.switchView;
    if (base) window.switchView = function (v, p) { const r = base.apply(this, arguments); if (v === 'about') render(); return r; };
    document.addEventListener('DOMContentLoaded', render);
})();
