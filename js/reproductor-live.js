module.exports = `
(function() {
    var hls = null, _v, _ui, uiTimeout;

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
            :root { --jw-blue: #007aff; --jw-white: #ffffff; }
            * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; outline: none; }
            
            /* Contenedor sin bordes ni fondos extra */
            #tvgo-player { background: #000; font-family: -apple-system, sans-serif; position: relative; width: 100%; height: 100%; overflow: hidden; }
            
            .video-box { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            
            /* Forzar ocultar controles nativos */
            video::-webkit-media-controls { display:none !important; }
            .tvgo-video { width: 100%; height: 100%; object-fit: contain; background: #000; }
            
            /* UI Minimalista: Solo un degradado suave abajo */
            .tvgo-ui { 
                position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; justify-content: flex-end; 
                background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 40%); 
                transition: opacity 0.3s ease; padding: 0 15px 15px; 
            }
            .ui-hidden { opacity: 0; pointer-events: none; }

            /* Barra de Controles */
            .jw-bar { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 45px; }
            .jw-group { display: flex; align-items: center; gap: 25px; }
            .jw-icon { font-size: 20px; color: var(--jw-white); cursor: pointer; filter: drop-shadow(0 0 3px rgba(0,0,0,0.8)); transition: 0.2s; }
            .jw-icon:hover { color: var(--jw-blue); }

            /* Menú de Calidad Flotante */
            .jw-popup { 
                position: absolute; bottom: 65px; right: 15px; background: rgba(20,20,20,0.95); 
                backdrop-filter: blur(10px); border-radius: 10px; width: 160px; display: none; 
                flex-direction: column; z-index: 200; border: 1px solid rgba(255,255,255,0.1); 
                box-shadow: 0 8px 32px rgba(0,0,0,0.5); overflow: hidden;
            }
            .jw-popup.show { display: flex; }
            .jw-item { padding: 12px 15px; font-size: 13px; color: #eee; cursor: pointer; display: flex; justify-content: space-between; transition: 0.2s; }
            .jw-item:hover { background: rgba(255,255,255,0.1); }
            .jw-item.active { color: var(--jw-blue); font-weight: bold; }

            /* Indicador Live */
            .jw-live { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
            .jw-dot { width: 8px; height: 8px; background: #ff3b30; border-radius: 50%; box-shadow: 0 0 8px #ff3b30; animation: blink 1.5s infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

            .loader { 
                position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); 
                border: 3px solid rgba(255,255,255,0.1); border-left-color: var(--jw-blue); 
                border-radius: 50%; width: 45px; height: 45px; animation: spin 1s linear infinite; display: none; z-index: 105; 
            }
            @keyframes spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        \`;
        document.head.appendChild(st);

        c.innerHTML = \`
            <div class="video-box" id="vCont">
                <div class="loader" id="vLoad"></div>
                <video class="tvgo-video" id="v_t" playsinline webkit-playsinline></video>
                <div class="jw-popup" id="sMenu"></div>
                <div class="tvgo-ui" id="ui_l">
                    <div class="jw-bar">
                        <div class="jw-group">
                            <i class="fa-solid fa-play jw-icon" id="mP"></i>
                            <div class="jw-live"><div class="jw-dot"></div> EN VIVO</div>
                        </div>
                        <div class="jw-group">
                            <i class="fa-solid fa-sliders jw-icon" id="btnSet" title="Calidad"></i>
                            <i class="fa-solid fa-expand jw-icon" id="btnFull" title="Pantalla Completa"></i>
                        </div>
                    </div>
                </div>
            </div>\`;

        _v = document.getElementById('v_t'); _ui = document.getElementById('ui_l');
        var _vCont = document.getElementById('vCont'), _sMenu = document.getElementById('sMenu');

        function showUI() { 
            _ui.classList.remove('ui-hidden'); 
            clearTimeout(uiTimeout); 
            uiTimeout = setTimeout(() => { if(!_sMenu.classList.contains('show')) _ui.classList.add('ui-hidden'); }, 3500); 
        }

        // CONTROL PANTALLA COMPLETA (Icono Inteligente)
        document.getElementById('btnFull').onclick = (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (_vCont.requestFullscreen) _vCont.requestFullscreen();
                else if (_vCont.webkitRequestFullscreen) _vCont.webkitRequestFullscreen();
                if(screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        };

        const syncIcon = () => {
            const isFs = document.fullscreenElement || document.webkitFullscreenElement;
            document.getElementById('btnFull').className = isFs ? "fa-solid fa-compress jw-icon" : "fa-solid fa-expand jw-icon";
        };
        document.addEventListener('fullscreenchange', syncIcon);
        document.addEventListener('webkitfullscreenchange', syncIcon);

        function renderMenu() {
            let h = '<div style="padding:12px; font-size:10px; color:#777; font-weight:800; border-bottom:1px solid #333">CALIDAD</div>';
            h += \`<div class="jw-item \${hls.currentLevel===-1?'active':''}" onclick="setQ(-1)">Automático</div>\`;
            hls.levels.forEach((l, i) => {
                h += \`<div class="jw-item \${hls.currentLevel===i?'active':''}" onclick="setQ(\${i})">\${l.height}p</div>\`;
            });
            _sMenu.innerHTML = h;
        }

        window.setQ = (i) => { hls.currentLevel = i; _sMenu.classList.remove('show'); renderMenu(); };

        function load(url) {
            if (Hls.isSupported()) {
                hls = new Hls(); hls.loadSource(url); hls.attachMedia(_v);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { renderMenu(); _v.play(); });
            } else if (_v.canPlayType('application/vnd.apple.mpegurl')) { _v.src = url; _v.play(); }
        }

        _v.onwaiting = () => document.getElementById('vLoad').style.display = 'block';
        _v.onplaying = () => document.getElementById('vLoad').style.display = 'none';

        _vCont.onclick = (e) => { if(e.target.id === 'v_t' || e.target.id === 'ui_l') showUI(); };
        document.getElementById('btnSet').onclick = (e) => { e.stopPropagation(); _sMenu.classList.toggle('show'); };
        document.getElementById('mP').onclick = (e) => { e.stopPropagation(); _v.paused ? _v.play() : _v.pause(); };
        
        _v.onplay = () => document.getElementById('mP').className = "fa-solid fa-pause jw-icon";
        _v.onpause = () => document.getElementById('mP').className = "fa-solid fa-play jw-icon";

        load(c.getAttribute('data-src'));
        showUI();
    }
    loadRes();
})();
`;
