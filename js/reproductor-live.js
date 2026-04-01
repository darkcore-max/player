module.exports = `
(function() {
    var hls = null, _v, _ui, uiTimeout;
    var isLocked = false, videoMode = 'contain'; // Modes: contain, cover, fill

    function loadRes() {
        const FA = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
        if (!document.querySelector('link[href*="6.5.1"]')) {
            var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = FA; document.head.appendChild(f);
        }
        if (typeof Hls === 'undefined') {
            var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            s.onload = initPlayer; document.head.appendChild(s);
        } else { initPlayer(); }
    }

    function initPlayer() {
        var c = document.getElementById('tvgo-player');
        if (!c) return;

        var st = document.createElement('style');
        st.innerHTML = \`
            :root { --blue: #007aff; --red: #ff3b30; }
            #tvgo-player { background: #000; font-family: sans-serif; position: relative; width: 100%; height: 100%; overflow: hidden; }
            .video-box { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; }
            .tvgo-video { width: 100%; height: 100%; object-fit: contain; transition: object-fit 0.3s; }
            
            /* UI Premium */
            .tvgo-ui { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 50%, rgba(0,0,0,0.7) 100%); transition: 0.4s; }
            .ui-hidden { opacity: 0; pointer-events: none; }

            /* Menú Lateral Moderno */
            .side-menu { position: absolute; top: 0; right: 0; bottom: 0; width: 260px; background: rgba(15,15,17,0.95); backdrop-filter: blur(20px); z-index: 500; transform: translateX(100%); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 30px 20px; overflow-y: auto; border-left: 1px solid #333; }
            .side-menu.show { transform: translateX(0); }
            .m-section { margin-bottom: 25px; }
            .m-label { font-size: 10px; color: #666; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; display: block; }
            .m-opt { padding: 12px; font-size: 14px; border-radius: 8px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
            .m-opt.active { background: var(--blue); color: #fff; }

            /* Botón Go Live */
            .go-live { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--red); color: #fff; padding: 6px 15px; border-radius: 20px; font-size: 11px; font-weight: 800; display: none; z-index: 110; animation: bounce 2s infinite; }
            @keyframes bounce { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }

            .loader { position: absolute; border: 3px solid rgba(255,255,255,0.1); border-left-color: var(--blue); border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; display: none; z-index: 105; }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .stats-box { position: absolute; top: 70px; left: 20px; background: rgba(0,0,0,0.6); padding: 8px; border-radius: 5px; font-size: 9px; color: #0f0; font-family: monospace; display: none; z-index: 90; }
        \`;
        document.head.appendChild(st);

        c.innerHTML = \`
            <div class="video-box" id="vCont">
                <div class="loader" id="vLoad"></div>
                <div class="stats-box" id="vStats"></div>
                <div class="go-live" id="btnLive"><i class="fa-solid fa-tower-broadcast"></i> VOLVER AL VIVO</div>
                <video class="tvgo-video" id="v_t" playsinline></video>
                
                <div class="side-menu" id="sMenu"></div>

                <div class="tvgo-ui" id="ui_l">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <i class="fa-solid fa-chevron-left" onclick="window.history.back()" style="font-size:22px"></i>
                        <div style="display:flex; align-items:center; gap:10px">
                            <span id="vRes" style="font-size:10px; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:3px">--</span>
                            <div style="background:var(--red); padding:4px 10px; border-radius:5px; font-size:11px; font-weight:900">LIVE</div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-around; align-items:center">
                        <i class="fa-solid fa-rotate-left" id="skB" style="font-size:24px"></i>
                        <i class="fa-solid fa-play" id="mP" style="font-size:45px"></i>
                        <i class="fa-solid fa-rotate-right" id="skF" style="font-size:24px"></i>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div style="display:flex; gap:25px">
                            <i class="fa-solid fa-sliders" id="btnSet" style="font-size:22px"></i>
                            <i class="fa-solid fa-compress" id="btnAspect" style="font-size:22px"></i>
                        </div>
                        <i class="fa-solid fa-expand" id="btnFull" style="font-size:22px"></i>
                    </div>
                </div>
            </div>\`;

        _v = document.getElementById('v_t'); _ui = document.getElementById('ui_l');
        var _sMenu = document.getElementById('sMenu'), _vCont = document.getElementById('vCont');

        function showUI() { 
            _ui.classList.remove('ui-hidden'); 
            clearTimeout(uiTimeout); 
            uiTimeout = setTimeout(() => { _ui.classList.add('ui-hidden'); _sMenu.classList.remove('show'); }, 4000); 
        }

        // CAMBIO DE ASPECT RATIO (FIT/FILL)
        document.getElementById('btnAspect').onclick = (e) => {
            e.stopPropagation();
            const modes = ['contain', 'cover', 'fill'];
            videoMode = modes[(modes.indexOf(videoMode) + 1) % modes.length];
            _v.style.objectFit = videoMode;
            // Notificar modo actual brevemente
        };

        function renderSettings() {
            let h = '<div class="m-section"><span class="m-label">Calidad</span>';
            hls.levels.forEach((l, i) => {
                h += \`<div class="m-opt \${hls.currentLevel===i?'active':''}" onclick="setQ(\${i})">\${l.height}p</div>\`;
            });
            h += '</div>';

            if(hls.audioTracks.length > 1) {
                h += '<div class="m-section"><span class="m-label">Audio / Idioma</span>';
                hls.audioTracks.forEach((t, i) => {
                    h += \`<div class="m-opt \${hls.audioTrack===i?'active':''}" onclick="setAud(\${i})">\${t.name}</div>\`;
                });
                h += '</div>';
            }
            _sMenu.innerHTML = h;
        }

        window.setQ = (i) => { hls.currentLevel = i; renderSettings(); };
        window.setAud = (i) => { hls.audioTrack = i; renderSettings(); };

        function load(url) {
            if (Hls.isSupported()) {
                hls = new Hls({ liveSyncDuration: 3, liveMaxLatencyDuration: 10 });
                hls.loadSource(url); hls.attachMedia(_v);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { renderSettings(); _v.play(); });
                hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
                    document.getElementById('vRes').innerText = hls.levels[data.level].height + 'P';
                });
            }
        }

        // VOLVER AL VIVO SI HAY RETRASO
        _v.ontimeupdate = () => {
            if(hls && (hls.liveSyncPosition - _v.currentTime) > 5) {
                document.getElementById('btnLive').style.display = 'block';
            } else {
                document.getElementById('btnLive').style.display = 'none';
            }
        };

        document.getElementById('btnLive').onclick = () => { _v.currentTime = hls.liveSyncPosition; };
        document.getElementById('skB').onclick = () => _v.currentTime -= 10;
        document.getElementById('skF').onclick = () => _v.currentTime += 10;
        document.getElementById('btnSet').onclick = (e) => { e.stopPropagation(); _sMenu.classList.toggle('show'); };
        
        _vCont.onclick = (e) => { if(e.target.id === 'v_t' || e.target.id === 'ui_l') showUI(); };
        document.getElementById('mP').onclick = () => _v.paused ? _v.play() : _v.pause();
        _v.onplay = () => document.getElementById('mP').className = "fa-solid fa-pause";
        _v.onpause = () => document.getElementById('mP').className = "fa-solid fa-play";

        document.getElementById('btnFull').onclick = () => {
            if (!document.fullscreenElement) _vCont.requestFullscreen();
            else document.exitFullscreen();
        };

        load(c.getAttribute('data-src'));
        showUI();
    }
    loadRes();
})();
`;
