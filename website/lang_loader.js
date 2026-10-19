/* Loads the Spanish-only data (detachment/stratagem translations ~370 KB, mission text) only for players who use Spanish, so English players
   do not download or parse it. First switch to Spanish in a session that started in English: reload once to pick the data up (the choice is kept). */
(function () {
    var es = false; try { es = localStorage.getItem('gdm_lang') === 'es'; } catch (e) {}
    window.BL_ES_LOADED = es;
    if (es) { ['detachment_rules_es.js?v=2', 'mission_text_es.js?v=2'].forEach(function (f) { document.write('<script src="' + f + '"><\/script>'); }); return; }
    try {
        var orig = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            orig.apply(this, arguments);
            if (this === window.localStorage && k === 'gdm_lang' && v === 'es' && !window.BL_ES_LOADED) { window.BL_ES_LOADED = true; setTimeout(function () { location.reload(); }, 60); }
        };
    } catch (e) {}
})();
