module.exports = `
(function() {
    var hls = null, _v, _ui, uiTimeout;
    var startY, startVal, activeSide, videoMode = 'contain';

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
            :root { --blue: #007aff; --red: #ff3b30; --white: #ffffff; }
            * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; outline: none; }
            #tvgo-player { background: #000; font-family: -apple-system, sans-serif; position: relative; width: 100%; height: 100%; overflow: hidden; color: var(--white); }
            .video-box { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            .tvgo-video { width: 100%; height: 100%; object-fit: contain; transition: object-fit 0.2s ease; }
            
            /* UI Blanca Nitida */
            .tvgo-ui { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; justify-content: space-between; padding: 25px; background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%, rgba(0,0,0,0.6) 100%); transition: 0.3s; }
            .ui-hidden { opacity: 0; pointer-events: none; }
            .fa-solid { color: var(--white); filter: drop-shadow(0 0 3px rgba(0,0,0,0.9)); cursor: pointer; }

            /* Menú Lateral */
            .side-menu { position: absolute; top: 0; right: 0; bottom: 0; width: 280px; background: rgba(10,10,10,0.98); backdrop-filter: blur(20px); z-index: 500; transform: translateX(100%); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 40px 20px; border-left: 1px solid #333; overflow-y: auto; }
            .side-menu.show { transform: translateX(0); }
            .m-label { font-size: 11px; color: #888; font-weight: 800; text-transform: uppercase; margin: 15px 0 10px; display: block; }
            .m-opt { padding: 14px; font-size: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .m-opt.active { background: rgba(255,255,255,0.1); color: var(--blue); }

            /* Gestos Visuales */
            .side-ctrl { position: absolute; top: 50%; transform: translateY(-50%); width: 4px; height: 120px; background: rgba(255,255,255,0.2); border-radius: 10px; display: none; z-index: 150; }
            .side-fill { position: absolute; bottom: 0; width: 100%; background: var(--white); border-radius: 10px; }

            .go-live { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); background: var(--red); color: #fff; padding: 8px 18px; border-radius: 30px; font-size: 12px; font-weight: 900; display: none; z-index: 110; box-shadow: 0 4px 15px rgba(255,0,0,0.4); }
            .loader { position: absolute; border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--white); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; display: none; z-index: 105; }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .live-badge { display: flex; align-items: center; background: rgba(0,0,0,0.5); padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 900; border: 1px solid rgba(255,255,255,0.1); }
            .dot { width: 7px; height: 7px; background: var(--red); border-radius: 50%; margin-right: 8px; animation: blink 1s infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            
            #br-layer { position: fixed; inset: 0; background: #000; pointer-events: none; z-index: 9999; opacity: 0; }
        \`;
        document.head.appendChild(st);

        var brLayer = document.createElement('div'); brLayer.id = 'br-layer'; document.body.appendChild(brLayer);

        c.innerHTML = \`
            <div class="video-box" id="vCont">
                <div class="loader" id="vLoad"></div>
                <div class="go-live" id="btnLive">VOLVER AL VIVO</div>
                <video class="tvgo-video" id="v_t" playsinline></video>
                
                <div class="side-ctrl" style="left:30px" id="ctrl-b"><div class="side-fill" id="fill-b"></div></div>
                <div class="side-ctrl" style="right:30px" id="ctrl-v"><div class="side-fill" id="fill-v"></div></div>
                <div class="side-menu" id="sMenu"></div>

                <div class="tvgo-ui" id="ui_l">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <i class="fa-solid fa-arrow-left" onclick="window.history.back()" style="font-size:22px; padding:5px"></i>
                        <div class="live-badge"><div class="dot"></div> EN VIVO</div>
                    </div>

                    <div style="display:flex; justify-content:space-around; align-items:center">
                        <i class="fa-solid fa-rotate-left" id="skB" style="font-size:28px"></i>
                        <i class="fa-solid fa-play" id="mP" style="font-size:60px"></i>
                        <i class="fa-solid fa-rotate-right" id="skF" style="font-size:28px"></i>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div style="display:flex; gap:30px; align-items:center">
                            <i class="fa-solid fa-sliders" id="btnSet" style="font-size:24px"></i>
                            <i class="fa-solid fa-compress" id="btnAspect" title="Cambiar tamaño" style="font-size:24px"></i>
                        </div>
                        <i class="fa-solid fa-expand" id="btnFull" style="font-size:24px"></i>
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

        // GESTOS
        _vCont.addEventListener('touchstart', (e) => {
            let x = e.touches[0].clientX, w = _vCont.offsetWidth;
            if (x < w * 0.2) activeSide = 'b'; else if (x > w * 0.8) activeSide = 'v'; else activeSide = null;
            startY = e.touches[0].clientY;
            startVal = (activeSide === 'b') ? (1 - parseFloat(brLayer.style.opacity || 0)) : _v.volume;
        });

        _vCont.addEventListener('touchmove', (e) => {
            if (!activeSide) return; e.preventDefault();
            let delta = (startY - e.touches[0].clientY) / 150, val = Math.min(Math.max(startVal + delta, 0), 1);
            if (activeSide === 'b') {
                brLayer.style.opacity = 1 - val;
                document.getElementById('ctrl-b').style.display = 'block';
                document.getElementById('fill-b').style.height = (val * 100) + '%';
            } else {
                _v.volume = val;
                document.getElementById('ctrl-v').style.display = 'block';
                document.getElementById('fill-v').style.height = (val * 100) + '%';
            }
        });

        _vCont.addEventListener('touchend', () => { document.querySelectorAll('.side-ctrl').forEach(d => d.style.display = 'none'); });

        function renderSettings() {
            let h = '<div class="m-section"><span class="m-label">Calidad</span>';
            h += \`<div class="m-opt \${hls.currentLevel===-1?'active':''}" onclick="setQ(-1)">Automático</div>\`;
            hls.levels.forEach((l, i) => { h += \`<div class="m-opt \${hls.currentLevel===i?'active':''}" onclick="setQ(\${i})">\${l.height}p HD</div>\`; });
            h += '</div>';
            _sMenu.innerHTML = h;
        }

        window.setQ = (i) => { hls.currentLevel = i; _sMenu.classList.remove('show'); showUI(); };

        function load(url) {
            if (Hls.isSupported()) {
                hls = new Hls({ liveSyncDuration: 3 });
                hls.loadSource(url); hls.attachMedia(_v);
                hls.on(Hls.Events.MANIFEST_PARSED, () => { renderSettings(); _v.play(); });
            } else if (_v.canPlayType('application/vnd.apple.mpegurl')) { _v.src = url; _v.play(); }
        }

        // PANTALLA COMPLETA ÚNICO
        document.getElementById('btnFull').onclick = (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (_vCont.requestFullscreen) _vCont.requestFullscreen();
                else if (_vCont.webkitRequestFullscreen) _vCont.webkitRequestFullscreen();
                if(screen.orientation) screen.orientation.lock('landscape').catch(()=>{});
                document.getElementById('btnFull').className = "fa-solid fa-compress";
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                document.getElementById('btnFull').className = "fa-solid fa-expand";
            }
        };

        // ASPECT RATIO
        document.getElementById('btnAspect').onclick = (e) => {
            e.stopPropagation();
            const modes = ['contain', 'cover', 'fill'];
            videoMode = modes[(modes.indexOf(videoMode) + 1) % modes.length];
            _v.style.objectFit = videoMode;
        };

        _v.onwaiting = () => document.getElementById('vLoad').style.display = 'block';
        _v.onplaying = () => document.getElementById('vLoad').style.display = 'none';

        _vCont.onclick = (e) => { if(e.target.id === 'v_t' || e.target.id === 'ui_l') showUI(); };
        document.getElementById('btnSet').onclick = (e) => { e.stopPropagation(); _sMenu.classList.toggle('show'); };
        document.getElementById('mP').onclick = () => _v.paused ? _v.play() : _v.pause();
        _v.onplay = () => document.getElementById('mP').className = "fa-solid fa-pause";
        _v.onpause = () => document.getElementById('mP').className = "fa-solid fa-play";
        
        document.getElementById('skB').onclick = () => _v.currentTime -= 10;
        document.getElementById('skF').onclick = () => _v.currentTime += 10;

        load(c.getAttribute('data-src'));
        showUI();
    }
    loadRes();
})();
`;
