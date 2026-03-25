(function () {
    const N = 4200;
    const CONV_STORAGE_KEY = 'mentallight_conv_v1';
    const TREE_STORAGE_KEY = 'mentallight_tree_params_v1';
    const DIARY_STORAGE_KEY = 'mentallight_garden_diary_v1';
    const DIARY_STARS_TOTAL_KEY = 'mentallight_stars_total_v1';
    let currentMood = 'calm';
    let appView = 'home';

    /* 全屏底图：填相对路径则与 CSS 渐变叠化（画布透明处可见）。可按意境为各心情换图。 */
    const MOOD_BACKGROUND_IMAGES = {
        calm: 'assets/bg-calm-nebula.png',
        sad: 'assets/bg-calm-rain.png',
        angry: 'assets/bg-angry-volcano.png',
        joy: 'assets/bg-joy-spiral.png',
        anxious: 'assets/bg-anxious.png',
        tired: 'assets/bg-tired.svg',
        hopeful: 'assets/bbeb1da18335d73cfc979c78404fc63a.png',
        fearful: 'assets/bg-fearful-forest-rain.png',
        warm: 'assets/bg-warm-water.png',
        jealous: 'assets/bg-jealous.png'
    };

    function visualMode(mood) {
        if (mood === 'anxious' || mood === 'hopeful') return 'calm';
        if (mood === 'tired') return 'sad';
        if (mood === 'warm') return 'calm';
        return mood;
    }
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.08, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 0.4, 10);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 22;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    function makeSoftTexture() {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        grd.addColorStop(0.7, 'rgba(255,255,255,0.12)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 64, 64);
        const t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
    }

    function makeJoyParticleTexture() {
        const s = 128;
        const c = document.createElement('canvas');
        c.width = c.height = s;
        const g = c.getContext('2d');
        const cx = s / 2;
        const cy = s / 2;
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(0.18, 'rgba(255,255,255,0.95)');
        grd.addColorStop(0.42, 'rgba(255,255,255,0.52)');
        grd.addColorStop(0.68, 'rgba(255,255,255,0.18)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
        g.globalCompositeOperation = 'lighter';
        const g2 = g.createRadialGradient(cx * 0.88, cy * 0.88, 0, cx * 0.88, cy * 0.88, s * 0.35);
        g2.addColorStop(0, 'rgba(255,255,255,0.28)');
        g2.addColorStop(0.55, 'rgba(255,255,255,0.08)');
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = g2;
        g.fillRect(0, 0, s, s);
        const t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
    }

    /** 细长柔边，像慢雨丝 / 泪滴下落时的光条 */
    function makeSadDropTexture() {
        const w = 36;
        const h = 72;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        const grd = g.createLinearGradient(w / 2, 0, w / 2, h);
        grd.addColorStop(0, 'rgba(255,255,255,0)');
        grd.addColorStop(0.12, 'rgba(255,255,255,0.12)');
        grd.addColorStop(0.38, 'rgba(255,255,255,0.92)');
        grd.addColorStop(0.58, 'rgba(255,255,255,0.45)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(w / 2, h * 0.4, w * 0.32, h * 0.42, 0, 0, Math.PI * 2);
        g.fill();
        const t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
    }

    const texParticle = makeSoftTexture();
    const texJoy = makeJoyParticleTexture();
    const texSad = makeSadDropTexture();

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) seeds[i] = Math.random() * Math.PI * 2;

    const pos = positions;
    const vel = velocities;

    const joyOx = new Float32Array(N);
    const joyOy = new Float32Array(N);
    const joyOz = new Float32Array(N);
    const joyOvx = new Float32Array(N);
    const joyOvy = new Float32Array(N);
    const joyOvz = new Float32Array(N);

    function resetJoyScatter() {
        for (let j = 0; j < N; j++) {
            joyOx[j] = 0;
            joyOy[j] = 0;
            joyOz[j] = 0;
            joyOvx[j] = 0;
            joyOvy[j] = 0;
            joyOvz[j] = 0;
        }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.14,
        map: texParticle,
        vertexColors: true,
        transparent: true,
        opacity: 0.97,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    const TREE_CAP = 5200;
    const treeGeom = new THREE.BufferGeometry();
    const treePos = new Float32Array(TREE_CAP * 3);
    const treeCol = new Float32Array(TREE_CAP * 3);
    const treeBase = new Float32Array(TREE_CAP * 3);
    const treePhase = new Float32Array(TREE_CAP);
    treeGeom.setAttribute('position', new THREE.BufferAttribute(treePos, 3));
    treeGeom.setAttribute('color', new THREE.BufferAttribute(treeCol, 3));
    const treeMat = new THREE.PointsMaterial({
        size: 0.21,
        map: texParticle,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    const treePoints = new THREE.Points(treeGeom, treeMat);
    scene.add(treePoints);

    const treeParams = {
        vectorDepth: 9,
        syncIndex: 0.93,
        growthFac: 2.75,
        height: 12,
        radius: 5.4,
        pointSize: 0.28,
        thickness: 2.55,
        wind: 0.72,
        growthStep: 4.4,
        burst: 0.04,
        burstCenterY: 0.8,
        crown1: 140,
        crown2: 135,
        crown3: 130,
        crown4: 125
    };
    let treeCount = 0;
    let treeRebuildRaf = 0;

    function getPourCountFromStorage() {
        try {
            const raw = localStorage.getItem(CONV_STORAGE_KEY);
            if (!raw) return 0;
            const a = JSON.parse(raw);
            return Array.isArray(a) ? a.length : 0;
        } catch (e) {
            return 0;
        }
    }

    /** 生命树养分：倾诉 + 日记 + 星星（有上限），驱动粒子树体量 */
    function getLifeTreeGrowthScore() {
        const pour = getPourCountFromStorage();
        let diaryN = 0;
        let stars = 0;
        try {
            diaryN = loadDiaries().length;
        } catch (e) { /* ignore */ }
        try {
            stars = loadDiaryTotalStars();
        } catch (e) { /* ignore */ }
        return pour * 4.6 + diaryN * 2.2 + Math.min(160, stars) * 0.11;
    }

    function getLifeTreeProgressPercent() {
        const cap = 88;
        const p = (getLifeTreeGrowthScore() / cap) * 100;
        return Math.max(0, Math.min(100, Math.round(p)));
    }

    const LIFE_TREE_PRESETS = {
        serene: {
            vectorDepth: 7,
            syncIndex: 0.96,
            growthFac: 2.15,
            height: 10,
            radius: 4.1,
            pointSize: 0.24,
            thickness: 2.15,
            wind: 0.38,
            growthStep: 3.6,
            burst: 0,
            burstCenterY: 0.6,
            crown1: 95,
            crown2: 100,
            crown3: 95,
            crown4: 90,
            particleDensity: 0.72,
            branchSpread: 0.42,
            canopySpread: 0.82,
            bloomGlow: 0.88,
            shimmerSpeed: 0.65,
            colorHue: 0.02,
            mirrorSymmetry: 1
        },
        lush: {
            vectorDepth: 11,
            syncIndex: 0.88,
            growthFac: 3.2,
            height: 14,
            radius: 6.8,
            pointSize: 0.3,
            thickness: 3,
            wind: 0.55,
            growthStep: 5.2,
            burst: 0.02,
            burstCenterY: 1.2,
            crown1: 175,
            crown2: 180,
            crown3: 170,
            crown4: 165,
            particleDensity: 1.35,
            branchSpread: 0.72,
            canopySpread: 1.25,
            bloomGlow: 1.12,
            shimmerSpeed: 1.05,
            colorHue: 0.06,
            mirrorSymmetry: 1
        },
        stardust: {
            vectorDepth: 9,
            syncIndex: 0.72,
            growthFac: 2.6,
            height: 12,
            radius: 5.8,
            pointSize: 0.34,
            thickness: 2.3,
            wind: 0.95,
            growthStep: 6.2,
            burst: 0.35,
            burstCenterY: 1.6,
            crown1: 150,
            crown2: 120,
            crown3: 160,
            crown4: 140,
            particleDensity: 1.08,
            branchSpread: 0.55,
            canopySpread: 1.1,
            bloomGlow: 1.45,
            shimmerSpeed: 1.55,
            colorHue: 0.14,
            mirrorSymmetry: 1
        }
    };

    function pushTreePoint(nref, x, y, z, cr, cg, cb, ph) {
        if (nref.n >= TREE_CAP) return;
        const i = nref.n * 3;
        treeBase[i] = x;
        treeBase[i + 1] = y;
        treeBase[i + 2] = z;
        treePos[i] = x;
        treePos[i + 1] = y;
        treePos[i + 2] = z;
        treeCol[i] = cr;
        treeCol[i + 1] = cg;
        treeCol[i + 2] = cb;
        treePhase[nref.n] = ph;
        nref.n++;
    }

    function rebuildMoodTree() {
        const P = treeParams;
        const lifeScore = getLifeTreeGrowthScore();
        const growthMul =
            (0.2 + Math.min(4.35, lifeScore * 0.112)) * Math.max(0.34, P.growthFac / 2.5);
        const maxDepth = Math.max(3, Math.min(15, Math.round(P.vectorDepth)));
        const h = P.height * 0.086;
        const rSpread = P.radius * 0.095 * (P.canopySpread > 0.15 ? P.canopySpread : 1);
        const hue = Math.max(0, Math.min(1, P.colorHue));
        const nref = { n: 0 };
        let rnd = ((Math.floor(lifeScore * 47) | 0) + 884422) >>> 0;
        function rand() {
            rnd = (rnd * 1664525 + 1013904223) >>> 0;
            return rnd / 4294967296;
        }
        function clamp01(x) {
            return Math.max(0, Math.min(1, x));
        }
        function hueShiftRgb(r, g, b) {
            const hr = r + hue * (0.42 * g + 0.28 - r * 0.32);
            const hg = g + hue * (0.12 * (1 - g));
            const hb = b + hue * (0.22 * r - b * 0.18 + 0.08);
            return { r: clamp01(hr), g: clamp01(hg), b: clamp01(hb) };
        }
        function whisperTrunk(t) {
            const tr = 0.05 + t * 0.14;
            const tg = 0.74 + t * 0.22;
            const tb = 0.82 + t * 0.16;
            return hueShiftRgb(tr, tg, tb);
        }
        function whisperCrown(t, rnd01) {
            let r = 0.78 + rnd01 * 0.2;
            let g = 0.86 + rnd01 * 0.12;
            let b = 0.98 + rnd01 * 0.02;
            if (rand() < 0.16 + hue * 0.22) {
                r = 0.58 + rnd01 * 0.22;
                g = 0.62 + rnd01 * 0.18;
                b = 1;
            }
            if (rand() < 0.12) {
                r = 0.72 + rnd01 * 0.15;
                g = 0.68 + rnd01 * 0.12;
                b = 0.95;
            }
            return hueShiftRgb(r, g, b);
        }
        const GOLD = Math.PI * (3 - Math.sqrt(5));
        let branchIx = 0;
        const y0 = -h * 2.12;
        const y1 = y0 + h * 1.28;

        const rootN = Math.max(6, Math.round(10 + growthMul * 6));
        for (let r = 0; r < rootN; r++) {
            const t = r / rootN;
            const ang = r * GOLD;
            const rad = (0.06 + t * 0.44) * (0.78 + growthMul * 0.1);
            const tc = whisperTrunk(t * 0.32);
            pushTreePoint(nref, Math.cos(ang) * rad, y0 + t * 0.06, Math.sin(ang) * rad, tc.r * 0.92, tc.g * 0.96, tc.b, t * 4);
        }

        const trunkSegs = Math.max(14, Math.round(28 * (P.thickness / 2.4)));
        for (let s = 0; s <= trunkSegs; s++) {
            const t = s / trunkSegs;
            const y = y0 + (y1 - y0) * t;
            const tc = whisperTrunk(t);
            const helix = Math.sin(t * Math.PI * 4.2 + lifeScore * 0.05) * 0.035 * P.thickness;
            pushTreePoint(nref, helix, y, Math.cos(t * Math.PI * 3) * 0.028 * P.thickness, tc.r, tc.g, tc.b, t * 6);
            for (let k = 0; k < 3; k++) {
                const j = (rand() - 0.5) * 0.055 * P.thickness;
                const kz = (rand() - 0.5) * 0.055 * P.thickness;
                pushTreePoint(
                    nref,
                    j,
                    y + (rand() - 0.5) * 0.02,
                    kz,
                    tc.r * 0.9,
                    tc.g * 0.96,
                    Math.min(1, tc.b + 0.05),
                    t + k * 0.21
                );
            }
        }

        const queue = [];
        queue.push({ sx: 0, sy: y1, sz: 0, dx: 0, dy: 1, dz: 0, len: h * 1.02 * growthMul, depth: 0 });
        const dens = Math.max(0.35, Math.min(2.4, P.particleDensity));
        const bSpr = Math.max(0.22, Math.min(1.2, P.branchSpread));
        while (queue.length && nref.n < TREE_CAP - 620) {
            const seg = queue.shift();
            const steps = Math.max(6, Math.round(13 * (P.thickness / 2.25)));
            let ex = seg.sx;
            let ey = seg.sy;
            let ez = seg.sz;
            const vlen = Math.hypot(seg.dx, seg.dy, seg.dz) || 1;
            const ux = seg.dx / vlen;
            const uy = seg.dy / vlen;
            const uz = seg.dz / vlen;
            for (let s = 0; s <= steps; s++) {
                const u = s / steps;
                const px = seg.sx + ux * seg.len * u;
                const py = seg.sy + uy * seg.len * u;
                const pz = seg.sz + uz * seg.len * u;
                const tw = whisperTrunk(0.28 + seg.depth * 0.055 + u * 0.3);
                pushTreePoint(nref, px, py, pz, tw.r, tw.g, tw.b, seg.depth * 2.4 + u + branchIx * 0.01);
                ex = px;
                ey = py;
                ez = pz;
            }
            if (seg.depth >= maxDepth) {
                const weights = [P.crown1, P.crown2, P.crown3, P.crown4];
                const wsum =
                    weights.reduce(function (a, b) {
                        return a + b;
                    }, 0) || 1;
                const cloudPts = Math.min(
                    1650,
                    Math.round(132 * growthMul * (wsum / 400) * dens)
                );
                for (let c = 0; c < cloudPts && nref.n < TREE_CAP; c++) {
                    const q = c % 4;
                    if (rand() > (weights[q] / wsum) * 2.85) continue;
                    const t = (c + 0.5) / cloudPts;
                    const R =
                        rSpread *
                        (0.38 + 0.92 * Math.sqrt(1 - t * 0.88)) *
                        (0.88 + growthMul * 0.07);
                    const th = c * GOLD + branchIx * 0.15;
                    const phi = Math.acos(Math.max(-1, Math.min(1, 1 - t * 1.15))) * 0.52;
                    let ox = R * Math.sin(phi) * Math.cos(th);
                    let oz = R * Math.sin(phi) * Math.sin(th);
                    if (q === 1) ox *= 1.22;
                    if (q === 2) oz *= 1.18;
                    if (q === 3) {
                        ox *= 0.78;
                        oz *= 0.78;
                    }
                    const py = ey + R * Math.cos(phi) * 0.52 + (rand() - 0.5) * h * 0.08;
                    const cc = whisperCrown(t, rand());
                    pushTreePoint(nref, ex + ox, py, ez + oz, cc.r, cc.g, cc.b, c * 0.07 + phi);
                }
                continue;
            }
            branchIx++;
            const ba = branchIx * GOLD + seg.depth * 0.55 + (rand() - 0.5) * 0.35;
            const ba2 = ba + 2.15 + (rand() - 0.5) * 0.4;
            const spread = (0.28 + rand() * 0.17) * (0.5 + bSpr * 1.05);
            function rotDir(dx, dy, dz, a) {
                const ca = Math.cos(a);
                const sa = Math.sin(a);
                return { x: dx * ca - dz * sa, y: dy + (rand() - 0.5) * 0.08, z: dx * sa + dz * ca };
            }
            const L = seg.len;
            const d1 = rotDir(ux * 0.84 + spread * 0.9, uy * 0.91 + 0.36, uz * 0.84 + spread * 0.45, ba);
            const d2 = rotDir(ux * 0.84 + spread * 0.65, uy * 0.89 + 0.34, uz * 0.84 + spread * 0.85, ba2);
            const n1 = Math.hypot(d1.x, d1.y, d1.z);
            const n2 = Math.hypot(d2.x, d2.y, d2.z);
            const l1 = L * (0.69 + rand() * 0.12);
            const l2 = L * (0.67 + rand() * 0.12);
            function pushChild(dx, dy, dz, len) {
                const n = Math.hypot(dx, dy, dz) || 1;
                queue.push({
                    sx: ex,
                    sy: ey,
                    sz: ez,
                    dx: dx / n,
                    dy: dy / n,
                    dz: dz / n,
                    len: len,
                    depth: seg.depth + 1
                });
            }
            pushChild(d1.x, d1.y, d1.z, l1);
            pushChild(d2.x, d2.y, d2.z, l2);
            if (P.mirrorSymmetry > 0.5) {
                pushChild(-d1.x, d1.y, -d1.z, l1);
                pushChild(-d2.x, d2.y, -d2.z, l2);
            }
        }
        treeCount = nref.n;
        treeGeom.setDrawRange(0, treeCount);
        treeGeom.attributes.position.needsUpdate = true;
        treeGeom.attributes.color.needsUpdate = true;
        const glow = Math.max(0.4, Math.min(2.35, P.bloomGlow));
        treeMat.size = Math.max(0.052, Math.min(0.44, P.pointSize * 0.086 * glow));
        treeMat.opacity = Math.min(1, 0.68 + glow * 0.16);
    }

    function stepTree(dt, time) {
        if (treeCount <= 0) return;
        const P = treeParams;
        const sync = P.syncIndex;
        const sh = Math.max(0.25, Math.min(2.6, P.shimmerSpeed || 1));
        const wind = P.wind * 0.035 * sh;
        const gs = P.growthStep * 0.42 * sh;
        const burst = P.burst * 0.12;
        const bcy = P.burstCenterY;
        for (let i = 0; i < treeCount; i++) {
            const ix = i * 3;
            const ph = treePhase[i];
            const s0 = Math.sin(time * gs + ph * (3.5 - sync * 3.2));
            const s1 = Math.cos(time * gs * 0.91 + ph * 1.1);
            const by = treeBase[ix + 1];
            const burstY = burst * Math.exp(-Math.pow(by - bcy, 2) * 0.35);
            treePos[ix] = treeBase[ix] + s0 * wind * (1 + burst * 0.5);
            treePos[ix + 1] = treeBase[ix + 1] + s1 * wind * 0.55 + burstY;
            treePos[ix + 2] = treeBase[ix + 2] + s1 * wind * 0.85;
        }
        treeGeom.attributes.position.needsUpdate = true;
    }

    function scheduleTreeRebuild() {
        if (treeRebuildRaf) cancelAnimationFrame(treeRebuildRaf);
        treeRebuildRaf = requestAnimationFrame(function () {
            treeRebuildRaf = 0;
            rebuildMoodTree();
        });
    }

    function updateGardenStatusPill() {
        const el = document.getElementById('garden-status-pill');
        if (!el) return;
        const pour = getPourCountFromStorage();
        let diaryN = 0;
        try {
            diaryN = loadDiaries().length;
        } catch (e) { /* ignore */ }
        const pct = getLifeTreeProgressPercent();
        if (pour === 0 && diaryN === 0) {
            el.textContent = '生命树 0% · 去倾诉或写日记，让粒子树长大';
        } else {
            el.textContent =
                '生命树 ' + pct + '% · 倾诉 ' + pour + ' · 日记 ' + diaryN + ' · 粒子树随养分生长';
        }
    }

    function fillLifeTreeModal() {
        const pct = getLifeTreeProgressPercent();
        const fill = document.getElementById('life-progress-fill');
        const pctEl = document.getElementById('life-progress-pct');
        if (fill) fill.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
        const stats = document.getElementById('life-tree-stats');
        if (stats) {
            const pour = getPourCountFromStorage();
            let diaryN = 0;
            try {
                diaryN = loadDiaries().length;
            } catch (e) { /* ignore */ }
            const stars = loadDiaryTotalStars();
            const score = getLifeTreeGrowthScore();
            stats.innerHTML =
                '<div class="life-stat-row"><span>倾诉条数（对话卡片）</span><span>' +
                pour +
                '</span></div>' +
                '<div class="life-stat-row"><span>花园日记篇数</span><span>' +
                diaryN +
                ' 篇</span></div>' +
                '<div class="life-stat-row"><span>累计星星</span><span>' +
                stars +
                '</span></div>' +
                '<div class="life-stat-row"><span>养分合计（内部值）</span><span>' +
                score.toFixed(1) +
                '</span></div>';
        }
    }

    function openLifeTreeModal() {
        fillLifeTreeModal();
        document.body.classList.add('life-tree-modal-open');
        const m = document.getElementById('life-tree-modal');
        const bd = document.getElementById('life-tree-modal-backdrop');
        if (m) m.setAttribute('aria-hidden', 'false');
        if (bd) bd.setAttribute('aria-hidden', 'false');
    }

    function closeLifeTreeModal() {
        document.body.classList.remove('life-tree-modal-open');
        const m = document.getElementById('life-tree-modal');
        const bd = document.getElementById('life-tree-modal-backdrop');
        if (m) m.setAttribute('aria-hidden', 'true');
        if (bd) bd.setAttribute('aria-hidden', 'true');
    }

    function refreshLifeTreeModalIfOpen() {
        if (document.body.classList.contains('life-tree-modal-open')) fillLifeTreeModal();
    }

    function applyLifeTreePreset(presetKey) {
        const preset = LIFE_TREE_PRESETS[presetKey];
        if (!preset) return;
        const keys = Object.keys(preset);
        for (let ki = 0; ki < keys.length; ki++) {
            const k = keys[ki];
            if (Object.prototype.hasOwnProperty.call(treeParams, k)) {
                treeParams[k] = preset[k];
            }
        }
        try {
            localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(treeParams));
        } catch (e) { /* ignore */ }
        const ranges = document.querySelectorAll('#life-tree-params-body input[type="range"]');
        for (let ri = 0; ri < ranges.length; ri++) {
            const rng = ranges[ri];
            const id = rng.id.replace(/^garden-/, '');
            if (Object.prototype.hasOwnProperty.call(treeParams, id)) {
                rng.value = String(treeParams[id]);
                rng.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        scheduleTreeRebuild();
        fillLifeTreeModal();
    }

    function initLifeTreeModalUi() {
        const openB = document.getElementById('btn-life-tree');
        if (openB) openB.addEventListener('click', openLifeTreeModal);
        const closeB = document.getElementById('life-tree-modal-close');
        if (closeB) closeB.addEventListener('click', closeLifeTreeModal);
        const bdb = document.getElementById('life-tree-modal-backdrop');
        if (bdb) bdb.addEventListener('click', closeLifeTreeModal);
        const presets = document.querySelectorAll('.life-preset-row button[data-preset]');
        for (let pi = 0; pi < presets.length; pi++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    applyLifeTreePreset(btn.getAttribute('data-preset'));
                });
            })(presets[pi]);
        }
        const paramBtn = document.getElementById('btn-open-tree-params');
        if (paramBtn) {
            paramBtn.addEventListener('click', function () {
                const det = document.getElementById('life-tree-params-details');
                if (det) {
                    det.open = true;
                    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }
    }

    function initGardenControls() {
        const body = document.getElementById('life-tree-params-body');
        if (!body) return;
        try {
            const raw = localStorage.getItem(TREE_STORAGE_KEY);
            if (raw) {
                const o = JSON.parse(raw);
                if (o && typeof o === 'object') {
                    const keys = Object.keys(treeParams);
                    for (let ki = 0; ki < keys.length; ki++) {
                        const k = keys[ki];
                        if (Object.prototype.hasOwnProperty.call(o, k) && typeof o[k] === typeof treeParams[k]) {
                            treeParams[k] = o[k];
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }
        const specs = [
            { key: 'vectorDepth', label: '向量深度', min: 3, max: 14, step: 1 },
            { key: 'syncIndex', label: '同步指数', min: 0, max: 1, step: 0.01 },
            { key: 'growthFac', label: '生长因子', min: 0.5, max: 6, step: 0.1 },
            { key: 'height', label: '高度', min: 4, max: 18, step: 0.5 },
            { key: 'radius', label: '半径', min: 2, max: 9, step: 0.25 },
            { key: 'pointSize', label: '粒子大小', min: 0.08, max: 0.45, step: 0.01 },
            { key: 'thickness', label: '粗细', min: 0.8, max: 4, step: 0.1 },
            { key: 'wind', label: '风力', min: 0, max: 3, step: 0.05 },
            { key: 'growthStep', label: '生长步长', min: 1, max: 10, step: 0.25 },
            { key: 'burst', label: '迸发', min: 0, max: 1, step: 0.02 },
            { key: 'burstCenterY', label: '迸发中心高度', min: -2, max: 5, step: 0.1 },
            { key: 'crown1', label: '树冠区域 1', min: 20, max: 250, step: 5 },
            { key: 'crown2', label: '树冠区域 2', min: 20, max: 250, step: 5 },
            { key: 'crown3', label: '树冠区域 3', min: 20, max: 250, step: 5 },
            { key: 'crown4', label: '树冠区域 4', min: 20, max: 250, step: 5 },
            { key: 'particleDensity', label: '粒子密度', min: 0.35, max: 2.35, step: 0.05 },
            { key: 'branchSpread', label: '分枝张开', min: 0.22, max: 1.18, step: 0.02 },
            { key: 'canopySpread', label: '树冠扩散', min: 0.5, max: 2, step: 0.05 },
            { key: 'bloomGlow', label: '光晕强度', min: 0.4, max: 2.3, step: 0.05 },
            { key: 'shimmerSpeed', label: '闪烁波动', min: 0.3, max: 2.5, step: 0.05 },
            { key: 'colorHue', label: '色彩偏移', min: 0, max: 1, step: 0.02 },
            { key: 'mirrorSymmetry', label: '对称分叉', min: 0, max: 1, step: 1 }
        ];
        function fmtVal(spec, v) {
            if (spec.key === 'syncIndex') return (v * 100).toFixed(1) + '%';
            if (spec.key === 'colorHue') return (v * 100).toFixed(0) + '%';
            if (spec.key === 'mirrorSymmetry') return v >= 0.5 ? '开' : '关';
            if (spec.step >= 1 && spec.key === 'vectorDepth') return String(Math.round(v));
            if (spec.step >= 0.25) return v.toFixed(2);
            if (spec.step >= 0.1) return v.toFixed(2);
            if (spec.step >= 0.05) return v.toFixed(2);
            if (spec.step >= 0.02) return v.toFixed(2);
            if (spec.step >= 0.01) return v.toFixed(2);
            return String(v);
        }
        body.innerHTML = '';
        for (let si = 0; si < specs.length; si++) {
            const spec = specs[si];
            const row = document.createElement('div');
            row.className = 'garden-row';
            const lab = document.createElement('label');
            lab.setAttribute('for', 'garden-' + spec.key);
            lab.textContent = spec.label;
            const out = document.createElement('output');
            out.id = 'garden-out-' + spec.key;
            const rng = document.createElement('input');
            rng.type = 'range';
            rng.id = 'garden-' + spec.key;
            rng.min = String(spec.min);
            rng.max = String(spec.max);
            rng.step = String(spec.step);
            rng.value = String(treeParams[spec.key]);
            out.textContent = fmtVal(spec, treeParams[spec.key]);
            rng.addEventListener('input', function () {
                const v = parseFloat(rng.value);
                treeParams[spec.key] = v;
                out.textContent = fmtVal(spec, v);
                scheduleTreeRebuild();
            });
            rng.addEventListener('change', function () {
                try {
                    localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(treeParams));
                } catch (e) { /* ignore */ }
            });
            row.appendChild(lab);
            row.appendChild(out);
            row.appendChild(rng);
            body.appendChild(row);
        }
    }

    const DIARY_MAX_ENTRIES = 48;
    const DIARY_MAX_IMAGES = 6;
    var diaryDraftImages = [];

    function loadDiaryTotalStars() {
        try {
            const v = parseInt(localStorage.getItem(DIARY_STARS_TOTAL_KEY) || '0', 10);
            return isNaN(v) || v < 0 ? 0 : v;
        } catch (e) {
            return 0;
        }
    }

    function saveDiaryTotalStars(n) {
        try {
            localStorage.setItem(DIARY_STARS_TOTAL_KEY, String(Math.max(0, n)));
        } catch (e) { /* ignore */ }
    }

    function updateDiaryTotalStarsUi() {
        const n = loadDiaryTotalStars();
        const el = document.getElementById('diary-stars-total-num');
        if (el) el.textContent = String(n);
        const pg = document.getElementById('garden-diary-stars-pill');
        if (pg) pg.textContent = '累计获得星星 ★ ' + n;
    }

    function diaryStarsFromCharCount(len) {
        return Math.floor(Math.max(0, len) / 100);
    }

    function updateDiaryComposerStars() {
        const ta = document.getElementById('diary-textarea');
        const wrap = document.getElementById('diary-session-stars');
        const cnt = document.getElementById('diary-char-count');
        if (!ta || !wrap) return;
        const len = ta.value.length;
        if (cnt) cnt.textContent = String(len);
        const n = diaryStarsFromCharCount(len);
        wrap.innerHTML = '';
        if (n === 0) {
            wrap.textContent = '（暂未获得）';
            return;
        }
        for (let i = 0; i < n; i++) {
            const s = document.createElement('span');
            s.className = 'diary-star';
            s.textContent = '★';
            s.setAttribute('aria-hidden', 'true');
            wrap.appendChild(s);
        }
    }

    function loadDiaries() {
        try {
            const raw = localStorage.getItem(DIARY_STORAGE_KEY);
            if (!raw) return [];
            const a = JSON.parse(raw);
            return Array.isArray(a) ? a : [];
        } catch (e) {
            return [];
        }
    }

    function saveDiaries(arr) {
        localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(arr));
    }

    function resetDiaryComposer() {
        const ta = document.getElementById('diary-textarea');
        if (ta) ta.value = '';
        diaryDraftImages = [];
        const prev = document.getElementById('diary-img-preview');
        if (prev) prev.innerHTML = '';
        updateDiaryComposerStars();
    }

    function openDiaryModal() {
        resetDiaryComposer();
        updateDiaryTotalStarsUi();
        document.body.classList.add('diary-modal-open');
        const m = document.getElementById('diary-modal');
        const bd = document.getElementById('diary-modal-backdrop');
        if (m) {
            m.setAttribute('aria-hidden', 'false');
        }
        if (bd) bd.setAttribute('aria-hidden', 'false');
        setTimeout(function () {
            const t = document.getElementById('diary-textarea');
            if (t) t.focus();
        }, 80);
    }

    function closeDiaryModal() {
        document.body.classList.remove('diary-modal-open');
        const m = document.getElementById('diary-modal');
        const bd = document.getElementById('diary-modal-backdrop');
        if (m) m.setAttribute('aria-hidden', 'true');
        if (bd) bd.setAttribute('aria-hidden', 'true');
        resetDiaryComposer();
    }

    function compressImageToDataUrl(file, maxW, quality) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            const u = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(u);
                let w = img.width;
                let h = img.height;
                if (w > maxW) {
                    h = (h * maxW) / w;
                    w = maxW;
                }
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(w));
                c.height = Math.max(1, Math.round(h));
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, c.width, c.height);
                let q = quality;
                let data = c.toDataURL('image/jpeg', q);
                let approx = data.length;
                while (q > 0.45 && approx > 900000) {
                    q -= 0.08;
                    data = c.toDataURL('image/jpeg', q);
                    approx = data.length;
                }
                resolve(data);
            };
            img.onerror = function () {
                URL.revokeObjectURL(u);
                reject(new Error('image'));
            };
            img.src = u;
        });
    }

    function renderDiaryImgPreview() {
        const prev = document.getElementById('diary-img-preview');
        if (!prev) return;
        prev.innerHTML = '';
        for (let i = 0; i < diaryDraftImages.length; i++) {
            const item = diaryDraftImages[i];
            const wrap = document.createElement('div');
            wrap.className = 'diary-img-thumb';
            const im = document.createElement('img');
            im.src = item.dataUrl;
            im.alt = item.name || '图';
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.textContent = '×';
            rm.setAttribute('aria-label', '移除');
            rm.addEventListener(
                'click',
                (function (index) {
                    return function () {
                        diaryDraftImages.splice(index, 1);
                        renderDiaryImgPreview();
                    };
                })(i)
            );
            wrap.appendChild(im);
            wrap.appendChild(rm);
            prev.appendChild(wrap);
        }
    }

    function updateDiaryCountBadge() {
        const b = document.getElementById('diary-count-badge');
        if (!b) return;
        const n = loadDiaries().length;
        b.textContent = n ? '（' + n + ' 篇）' : '';
    }

    function formatDiaryTime(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return (
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0') +
            ' ' +
            String(d.getHours()).padStart(2, '0') +
            ':' +
            String(d.getMinutes()).padStart(2, '0')
        );
    }

    function renderDiaryCards() {
        const box = document.getElementById('diary-cards-container');
        if (!box) return;
        const list = loadDiaries();
        box.innerHTML = '';
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (!it || it.text == null) continue;
            const card = document.createElement('article');
            card.className = 'diary-card';
            card.setAttribute('data-diary-id', it.id || String(i));
            const head = document.createElement('div');
            head.className = 'diary-card-head';
            const meta = document.createElement('span');
            meta.textContent = formatDiaryTime(it.iso) || '日记';
            const starSpan = document.createElement('span');
            starSpan.className = 'diary-card-stars';
            const se = it.starsEarned != null ? it.starsEarned : diaryStarsFromCharCount((it.text || '').length);
            starSpan.textContent = '本篇 +' + se + ' ★';
            const actions = document.createElement('div');
            actions.className = 'diary-card-actions';
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.textContent = '复制';
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '删除';
            copyBtn.addEventListener('click', function () {
                let t = '【花园日记】' + formatDiaryTime(it.iso) + '\n\n' + (it.text || '');
                if (it.images && it.images.length) {
                    t += '\n\n（含 ' + it.images.length + ' 张图片，请在页面中查看）';
                }
                copyTextToClipboard(t);
                const prev = copyBtn.textContent;
                copyBtn.textContent = '已复制';
                setTimeout(function () {
                    copyBtn.textContent = prev;
                }, 1200);
            });
            delBtn.addEventListener('click', function () {
                if (!confirm('删除这篇日记？')) return;
                const next = loadDiaries().filter(function (x) {
                    return x.id !== it.id;
                });
                saveDiaries(next);
                renderDiaryCards();
                updateDiaryCountBadge();
                updateGardenStatusPill();
                scheduleTreeRebuild();
                refreshLifeTreeModalIfOpen();
            });
            actions.appendChild(copyBtn);
            actions.appendChild(delBtn);
            head.appendChild(meta);
            head.appendChild(starSpan);
            head.appendChild(actions);
            const body = document.createElement('div');
            body.className = 'diary-card-text';
            body.textContent = it.text || '';
            card.appendChild(head);
            card.appendChild(body);
            if (it.images && it.images.length) {
                const imgs = document.createElement('div');
                imgs.className = 'diary-card-imgs';
                for (let j = 0; j < it.images.length; j++) {
                    const im = document.createElement('img');
                    im.src = it.images[j].dataUrl || it.images[j];
                    im.alt = it.images[j].name || '';
                    imgs.appendChild(im);
                }
                card.appendChild(imgs);
            }
            box.appendChild(card);
        }
        updateDiaryCountBadge();
    }

    function saveDiaryEntry() {
        const ta = document.getElementById('diary-textarea');
        if (!ta) return;
        const text = ta.value.trim();
        if (!text) {
            alert('先写一点内容再保存吧。');
            return;
        }
        const starsEarned = diaryStarsFromCharCount(text.length);
        const entry = {
            id: 'd-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
            iso: new Date().toISOString(),
            text: text,
            starsEarned: starsEarned,
            images: diaryDraftImages.map(function (x) {
                return { name: x.name, dataUrl: x.dataUrl };
            })
        };
        const list = loadDiaries();
        list.unshift(entry);
        while (list.length > DIARY_MAX_ENTRIES) {
            list.pop();
        }
        try {
            saveDiaries(list);
        } catch (e) {
            alert('保存失败：本地存储可能已满，请删掉部分日记或减少图片后再试。');
            return;
        }
        saveDiaryTotalStars(loadDiaryTotalStars() + starsEarned);
        renderDiaryCards();
        updateDiaryTotalStarsUi();
        updateGardenStatusPill();
        scheduleTreeRebuild();
        refreshLifeTreeModalIfOpen();
        closeDiaryModal();
    }

    function initDiaryUi() {
        const openBtn = document.getElementById('btn-open-diary');
        if (openBtn) openBtn.addEventListener('click', openDiaryModal);
        const closeBtn = document.getElementById('diary-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeDiaryModal);
        const cancelBtn = document.getElementById('diary-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeDiaryModal);
        const saveBtn = document.getElementById('diary-save');
        if (saveBtn) saveBtn.addEventListener('click', saveDiaryEntry);
        const bd = document.getElementById('diary-modal-backdrop');
        if (bd) {
            bd.addEventListener('click', closeDiaryModal);
        }
        const ta = document.getElementById('diary-textarea');
        if (ta) {
            ta.addEventListener('input', updateDiaryComposerStars);
        }
        const imgIn = document.getElementById('diary-img-input');
        if (imgIn) {
            imgIn.addEventListener('change', function () {
                const files = imgIn.files;
                if (!files || !files.length) return;
                const room = DIARY_MAX_IMAGES - diaryDraftImages.length;
                if (room <= 0) {
                    alert('最多 ' + DIARY_MAX_IMAGES + ' 张图片。');
                    imgIn.value = '';
                    return;
                }
                let todo = Math.min(files.length, room);
                let done = 0;
                const addNext = function (idx) {
                    if (idx >= files.length || done >= todo) {
                        imgIn.value = '';
                        renderDiaryImgPreview();
                        return;
                    }
                    compressImageToDataUrl(files[idx], 720, 0.82)
                        .then(function (dataUrl) {
                            diaryDraftImages.push({ name: files[idx].name || 'image', dataUrl: dataUrl });
                            done++;
                            addNext(idx + 1);
                        })
                        .catch(function () {
                            addNext(idx + 1);
                        });
                };
                addNext(0);
            });
        }
        renderDiaryCards();
        updateDiaryCountBadge();
        updateDiaryTotalStarsUi();
        updateGardenStatusPill();
    }

    const raycaster = new THREE.Raycaster();
    const jealousDrag = { active: false, world: new THREE.Vector3(), speed: 0, lx: 0, ly: 0 };

    const tmpColor = new THREE.Color();
    const moodClickFlash = {
        calm: [new THREE.Color(0xa8fff8), new THREE.Color(0xc4d0ff)],
        sad: [new THREE.Color(0xa8d4ec), new THREE.Color(0x4a6070)],
        angry: [new THREE.Color(0xff4422), new THREE.Color(0xffee66)],
        joy: [new THREE.Color(0xffcce8), new THREE.Color(0xb8f6ff)],
        anxious: [new THREE.Color(0xff4a6a), new THREE.Color(0xa868ff)],
        tired: [new THREE.Color(0xd8e4f0), new THREE.Color(0xa8b8c8)],
        hopeful: [new THREE.Color(0xffe8b8), new THREE.Color(0xb8e8ff)],
        fearful: [new THREE.Color(0x5080b0), new THREE.Color(0x284060)],
        warm: [new THREE.Color(0xffd0d8), new THREE.Color(0xffe8c8)],
        jealous: [new THREE.Color(0x56c090), new THREE.Color(0x7868c8)]
    };
    const moodPalettes = {
        calm: { fog: 0x0c1a16, near: 6, far: 26, accent: new THREE.Color(0x6ee7de), secondary: new THREE.Color(0x8899ff), size: 0.11, auto: 0.35, blending: 'add', opacity: 0.92 },
        sad: {
            fog: 0x0c121c,
            near: 9,
            far: 48,
            accent: new THREE.Color(0x8ec8e0),
            secondary: new THREE.Color(0x556878),
            deep: new THREE.Color(0x243444),
            mist: new THREE.Color(0xa0b0c0),
            size: 0.1,
            auto: 0.045,
            blending: 'normal',
            opacity: 0.9
        },
        angry: {
            fog: 0x060201,
            near: 4,
            far: 28,
            accent: new THREE.Color(0xff2a0a),
            secondary: new THREE.Color(0xff9500),
            blaze: new THREE.Color(0xffee66),
            ember: new THREE.Color(0x1a0302),
            size: 0.108,
            auto: 0.42,
            blending: 'add',
            opacity: 0.94
        },
        joy: { fog: 0x284058, near: 14, far: 56, rose: new THREE.Color(0xffb8dc), lake: new THREE.Color(0x7ee8ff), halo: new THREE.Color(0xffffff), size: 0.2, auto: 0.15, blending: 'add', opacity: 0.88 },
        anxious: {
            fog: 0x060818,
            near: 4,
            far: 28,
            accent: new THREE.Color(0xc45cff),
            secondary: new THREE.Color(0xff2d55),
            deep: new THREE.Color(0x2848c8),
            size: 0.095,
            auto: 0.72,
            blending: 'add',
            opacity: 0.92
        },
        tired: { fog: 0x1c2028, near: 9, far: 42, accent: new THREE.Color(0xc8d4e0), secondary: new THREE.Color(0x708090), size: 0.11, auto: 0.06, blending: 'normal', opacity: 0.94 },
        hopeful: { fog: 0x1a2832, near: 7, far: 30, accent: new THREE.Color(0xffd890), secondary: new THREE.Color(0x88c8f0), size: 0.12, auto: 0.28, blending: 'add', opacity: 0.9 },
        fearful: {
            fog: 0x03060c,
            near: 5,
            far: 44,
            accent: new THREE.Color(0x1a3a5c),
            secondary: new THREE.Color(0x0a1018),
            abyss: new THREE.Color(0x020408),
            ice: new THREE.Color(0x4a6a8c),
            size: 0.1,
            auto: 0.34,
            blending: 'normal',
            opacity: 0.94
        },
        warm: {
            fog: 0x181420,
            near: 8,
            far: 48,
            rose: new THREE.Color(0xffa0b0),
            lake: new THREE.Color(0xffcc98),
            halo: new THREE.Color(0xfff6ee),
            accent: new THREE.Color(0xffc8a8),
            secondary: new THREE.Color(0xffb0c0),
            size: 0.12,
            auto: 0.2,
            blending: 'add',
            opacity: 0.84
        },
        jealous: {
            fog: 0x030806,
            near: 5,
            far: 26,
            accent: new THREE.Color(0x1e8f5c),
            secondary: new THREE.Color(0x2d5a44),
            cold: new THREE.Color(0x5860a8),
            shadow: new THREE.Color(0x080c14),
            size: 0.092,
            auto: 0.55,
            blending: 'add',
            opacity: 0.9
        }
    };

    function setSceneMood(mood) {
        const p = moodPalettes[mood] || moodPalettes.calm;
        scene.fog = new THREE.Fog(p.fog, p.near * 0.92, p.far * 1.1);
        renderer.setClearColor(new THREE.Color(p.fog), 0);
        mat.size = p.size;
        mat.opacity = Math.min(1, (p.opacity != null ? p.opacity : 0.92) * 1.06);
        mat.blending = p.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
        mat.map = mood === 'joy' ? texJoy : mood === 'sad' || mood === 'tired' ? texSad : texParticle;
        mat.needsUpdate = true;
        controls.autoRotateSpeed = p.auto;
    }

    function randSphereShell(minR, maxR, ix) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const r = minR + Math.random() * (maxR - minR);
        positions[ix] = r * Math.sin(phi) * Math.cos(theta);
        positions[ix + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[ix + 2] = r * Math.cos(phi);
    }

    function initParticles(mood) {
        resetJoyScatter();
        const p = moodPalettes[mood] || moodPalettes.calm;
        const vis = visualMode(mood);
        for (let i = 0; i < N; i++) {
            const ix = i * 3;
            const s = seeds[i];
            if (vis === 'calm') {
                if (mood === 'warm') {
                    if (i < N * 0.2) {
                        const petal = i / N;
                        const ang = petal * Math.PI * 5 + s;
                        const rr = 0.55 + (i % 4) * 0.32;
                        positions[ix] = Math.cos(ang) * rr + (Math.random() - 0.5) * 0.4;
                        positions[ix + 1] = (Math.random() - 0.5) * 0.65;
                        positions[ix + 2] = Math.sin(ang) * rr + (Math.random() - 0.5) * 0.4;
                    } else {
                        randSphereShell(1.6, 8.4, ix);
                    }
                    velocities[ix] = (Math.random() - 0.5) * 0.0026;
                    velocities[ix + 1] = (Math.random() - 0.5) * 0.0026;
                    velocities[ix + 2] = (Math.random() - 0.5) * 0.0026;
                } else {
                    const petal = i / N;
                    if (i < N * 0.35) {
                        const layers = 6;
                        const layer = (i % layers) / layers;
                        const ang = petal * Math.PI * 8 + s;
                        const rr = 1.2 + layer * 3.2;
                        positions[ix] = Math.cos(ang) * rr + (Math.random() - 0.5) * 0.4;
                        positions[ix + 1] = (Math.random() - 0.5) * 1.2;
                        positions[ix + 2] = Math.sin(ang) * rr + (Math.random() - 0.5) * 0.4;
                    } else {
                        randSphereShell(3.5, 9, ix);
                    }
                    const vj = mood === 'anxious' ? 0.0072 : 0.004;
                    velocities[ix] = (Math.random() - 0.5) * vj;
                    velocities[ix + 1] = (Math.random() - 0.5) * vj;
                    velocities[ix + 2] = (Math.random() - 0.5) * vj;
                }
            } else if (vis === 'sad') {
                if (mood === 'sad') {
                    positions[ix] = (Math.random() - 0.5) * 15;
                    positions[ix + 1] = 2.8 + Math.random() * 11;
                    positions[ix + 2] = (Math.random() - 0.5) * 15;
                    const drift = (seeds[i] % 1 - 0.5) * 0.052;
                    velocities[ix] = drift + (Math.random() - 0.5) * 0.026;
                    velocities[ix + 1] = -0.05 - Math.random() * 0.072;
                    velocities[ix + 2] = (Math.random() - 0.5) * 0.032;
                } else {
                    positions[ix] = (Math.random() - 0.5) * 12;
                    positions[ix + 1] = 2.5 + Math.random() * 10;
                    positions[ix + 2] = (Math.random() - 0.5) * 12;
                    velocities[ix] = 0.08 + Math.random() * 0.12;
                    velocities[ix + 1] = -0.38 - Math.random() * 0.28;
                    velocities[ix + 2] = (Math.random() - 0.5) * 0.06;
                }
            } else if (vis === 'fearful') {
                positions[ix] = (Math.random() - 0.5) * 13;
                positions[ix + 1] = (Math.random() - 0.5) * 7.5;
                positions[ix + 2] = (Math.random() - 0.5) * 13;
                velocities[ix] = (Math.random() - 0.5) * 0.52;
                velocities[ix + 1] = (Math.random() - 0.5) * 0.52;
                velocities[ix + 2] = (Math.random() - 0.5) * 0.52;
            } else if (vis === 'angry') {
                if (mood === 'angry') {
                    const ang = Math.random() * Math.PI * 2;
                    const rr = Math.random() * 1.65;
                    positions[ix] = Math.cos(ang) * rr;
                    positions[ix + 1] = -4.65 - Math.random() * 0.85;
                    positions[ix + 2] = Math.sin(ang) * rr;
                    const out = 0.1 + Math.random() * 0.26;
                    velocities[ix] = Math.cos(ang) * out + (Math.random() - 0.5) * 0.08;
                    velocities[ix + 1] = 0.12 + Math.random() * 0.14;
                    velocities[ix + 2] = Math.sin(ang) * out + (Math.random() - 0.5) * 0.08;
                }
            } else if (vis === 'jealous') {
                randSphereShell(0.32, 4.9, ix);
                velocities[ix] = (Math.random() - 0.5) * 0.15;
                velocities[ix + 1] = (Math.random() - 0.5) * 0.15;
                velocities[ix + 2] = (Math.random() - 0.5) * 0.15;
            } else if (vis === 'joy') {
                const u = Math.random() * Math.PI * 2;
                const v = Math.random() * Math.PI * 2;
                velocities[ix] = u;
                velocities[ix + 1] = v;
                velocities[ix + 2] = 0;
                const R = 4.05;
                const r = 0.92;
                const cosu = Math.cos(u);
                const sinu = Math.sin(u);
                const cosv = Math.cos(v);
                const sinv = Math.sin(v);
                positions[ix] = (R + r * cosv) * cosu;
                positions[ix + 1] = r * sinv;
                positions[ix + 2] = (R + r * cosv) * sinu;
            }
            if (mood === 'joy') {
                const u = vel[ix];
                const v = vel[ix + 1];
                const jp = moodPalettes.joy;
                const mix = 0.5 + 0.5 * Math.sin(u * 2.2 + v * 0.6);
                tmpColor.copy(jp.lake).lerp(jp.rose, mix * 0.78 + 0.12 * Math.sin(v * 3));
                tmpColor.lerp(jp.halo, 0.14 + 0.22 * Math.sin(v * 2.1));
                if (i % 29 === 0) {
                    tmpColor.lerp(jp.rose, 0.45);
                } else if (i % 31 === 0) {
                    tmpColor.lerp(jp.lake, 0.4);
                }
            } else if (mood === 'warm') {
                const wp = moodPalettes.warm;
                const rr = Math.sqrt(
                    positions[ix] * positions[ix] + positions[ix + 1] * positions[ix + 1] + positions[ix + 2] * positions[ix + 2]
                );
                const tw = 0.5 + 0.5 * Math.sin(s * 2.6 + rr * 0.5);
                tmpColor.copy(wp.lake).lerp(wp.rose, tw * 0.7 + 0.14 * Math.sin(s * 3.8 + i * 0.02));
                tmpColor.lerp(wp.halo, 0.22 + 0.2 * Math.sin(s * 2.2 + rr * 0.35));
                if (i % 27 === 0) {
                    tmpColor.lerp(wp.rose, 0.35);
                } else if (i % 33 === 0) {
                    tmpColor.lerp(wp.lake, 0.32);
                }
            } else if (mood === 'angry') {
                const pa = moodPalettes.angry;
                const yh = Math.max(0, (positions[ix + 1] + 4.6) / 9.8);
                tmpColor.copy(pa.ember).lerp(pa.accent, Math.min(1, yh * 1.05 + Math.random() * 0.14));
                tmpColor.lerp(pa.secondary, yh * 0.52 * (0.5 + Math.random() * 0.5));
                if (pa.blaze) {
                    tmpColor.lerp(pa.blaze, (0.22 + yh * 0.35) * Math.random());
                }
            } else if (mood === 'jealous') {
                const jp = moodPalettes.jealous;
                const rr = Math.sqrt(
                    positions[ix] * positions[ix] + positions[ix + 1] * positions[ix + 1] + positions[ix + 2] * positions[ix + 2]
                );
                const flick = 0.5 + 0.5 * Math.sin(s * 3.2 + i * 0.019);
                tmpColor.copy(jp.shadow).lerp(jp.accent, 0.28 + flick * 0.42 + Math.random() * 0.12);
                tmpColor.lerp(jp.cold, (1 - flick) * 0.38 + (rr / 6) * 0.15);
                tmpColor.lerp(jp.secondary, 0.15 + Math.random() * 0.25);
            } else if (mood === 'anxious') {
                const ap = moodPalettes.anxious;
                const t = Math.random();
                tmpColor.copy(ap.deep).lerp(ap.accent, 0.35 + t * 0.45);
                tmpColor.lerp(ap.secondary, (1 - t) * 0.42 + Math.random() * 0.28);
            } else if (mood === 'fearful') {
                const fp = moodPalettes.fearful;
                const flick = 0.5 + 0.5 * Math.sin(s * 4.2 + i * 0.021);
                tmpColor.copy(fp.abyss).lerp(fp.secondary, 0.35 + Math.random() * 0.35);
                tmpColor.lerp(fp.accent, flick * 0.45 + Math.random() * 0.2);
                tmpColor.lerp(fp.ice, (1 - flick) * 0.22);
                tmpColor.multiplyScalar(0.75 + Math.random() * 0.2);
            } else if (mood === 'sad') {
                const sp = moodPalettes.sad;
                const yNorm = THREE.MathUtils.clamp((positions[ix + 1] + 4) / 14, 0, 1);
                const wisp = 0.5 + 0.5 * Math.sin(seeds[i] * 2.7 + i * 0.01);
                tmpColor.copy(sp.deep).lerp(sp.secondary, yNorm * 0.72 + wisp * 0.22);
                tmpColor.lerp(sp.accent, (1 - yNorm) * 0.55 + Math.random() * 0.12);
                tmpColor.lerp(sp.mist, 0.08 + 0.12 * wisp);
                tmpColor.multiplyScalar(0.88 + 0.14 * Math.random());
            } else {
                tmpColor.copy(p.accent).lerp(p.secondary, Math.random());
            }
            colors[ix] = tmpColor.r;
            colors[ix + 1] = tmpColor.g;
            colors[ix + 2] = tmpColor.b;
        }
        geom.attributes.position.needsUpdate = true;
        geom.attributes.color.needsUpdate = true;
    }

    function stepParticles(dt, time) {
        const mood = currentMood;
        const vis = visualMode(mood);
        const pMood = moodPalettes[mood] || moodPalettes.calm;

        if (vis === 'calm') {
            const isWarm = mood === 'warm';
            const isAnxious = mood === 'anxious';
            for (let i = 0; i < N; i++) {
                const ix = i * 3;
                pos[ix] += vel[ix];
                pos[ix + 1] += vel[ix + 1];
                pos[ix + 2] += vel[ix + 2];
                const rr = Math.sqrt(pos[ix] * pos[ix] + pos[ix + 1] * pos[ix + 1] + pos[ix + 2] * pos[ix + 2]);
                let target = 3.8 + (seeds[i] % 1) * 4.5;
                let pullMul = isWarm ? 0.68 : mood === 'hopeful' ? 1.17 : 1;
                let gather = 0;
                let scatter = 0;
                if (isAnxious && !isWarm) {
                    const breathe = Math.sin(time * 2.05 + seeds[i] * 0.17);
                    gather = Math.max(0, breathe);
                    scatter = Math.max(0, -breathe);
                    target = THREE.MathUtils.lerp(target, 1.15 + (seeds[i] % 1) * 1.05, gather * 0.94);
                    pullMul *= 1 + gather * 2.65;
                }
                const pull = (target - rr) * 0.00012 * pullMul;
                if (rr > 0.001) {
                    pos[ix] += (pos[ix] / rr) * pull;
                    pos[ix + 1] += (pos[ix + 1] / rr) * pull;
                    pos[ix + 2] += (pos[ix + 2] / rr) * pull;
                }
                if (isAnxious && !isWarm && scatter > 0.04 && rr > 0.12) {
                    const burst = scatter * 0.00038 * rr;
                    pos[ix] += (pos[ix] / rr) * burst;
                    pos[ix + 1] += (pos[ix + 1] / rr) * burst;
                    pos[ix + 2] += (pos[ix + 2] / rr) * burst;
                }
                if (mood === 'hopeful' && !isWarm) {
                    pos[ix + 1] += (0.018 + 0.012 * Math.sin(time * 0.55 + seeds[i])) * dt;
                }
                if (isWarm) {
                    pos[ix + 1] += (0.006 + 0.0045 * Math.sin(time * 0.36 + seeds[i])) * dt;
                }
                if (isAnxious && !isWarm) {
                    const jit = 0.013 * dt * 60 * (1.1 + scatter * 1.85 + gather * 0.45);
                    pos[ix] += (Math.random() - 0.5) * jit;
                    pos[ix + 1] += (Math.random() - 0.5) * jit;
                    pos[ix + 2] += (Math.random() - 0.5) * jit;
                }
                const n0 = isAnxious ? 0.00058 + scatter * 0.00034 : isWarm ? 0.000095 : 0.00015;
                vel[ix] += (Math.random() - 0.5) * n0;
                vel[ix + 1] += (Math.random() - 0.5) * n0;
                vel[ix + 2] += (Math.random() - 0.5) * n0;
                const damp = isAnxious ? 0.985 - scatter * 0.004 : isWarm ? 0.9935 : 0.992;
                vel[ix] *= damp;
                vel[ix + 1] *= damp;
                vel[ix + 2] *= damp;
                const tw = 0.5 + 0.5 * Math.sin(time * (isAnxious ? 0.88 : isWarm ? 0.26 : 0.35) + seeds[i]);
                if (isWarm) {
                    const wp = pMood;
                    const tw2 = 0.5 + 0.5 * Math.sin(time * 0.31 + seeds[i] + rr * 0.38);
                    tmpColor.copy(wp.lake).lerp(wp.rose, tw2 * 0.68 + 0.12 * Math.sin(time * 0.85 + seeds[i]));
                    tmpColor.lerp(wp.halo, 0.2 + 0.2 * Math.sin(time * 0.48 + i * 0.018));
                } else if (isAnxious) {
                    const ap = pMood;
                    const flick = 0.5 + 0.5 * Math.sin(time * 13.2 + seeds[i] * 2.8);
                    const flick2 = 0.5 + 0.5 * Math.sin(time * 7.4 + i * 0.031);
                    tmpColor.copy(ap.deep).lerp(ap.accent, flick * 0.52 + flick2 * 0.3 + gather * 0.12);
                    tmpColor.lerp(ap.secondary, (0.38 + 0.42 * flick2) * (0.55 + scatter * 0.45));
                    tmpColor.multiplyScalar(1.04 + 0.14 * flick + 0.08 * scatter);
                } else {
                    tmpColor.copy(pMood.accent).lerp(pMood.secondary, tw * 0.6 + Math.random() * 0.2);
                }
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
            }
            geom.attributes.color.needsUpdate = true;
        } else if (vis === 'sad') {
            if (mood === 'sad') {
                const sp = moodPalettes.sad;
                const wind = Math.sin(time * 0.38) * 0.09 + Math.sin(time * 0.11) * 0.035;
                for (let i = 0; i < N; i++) {
                    const ix = i * 3;
                    const step = dt * 16;
                    const leaf = 0.5 + 0.5 * Math.sin(time * 0.55 + seeds[i] * 1.8);
                    pos[ix] += (vel[ix] + wind) * step;
                    pos[ix + 1] += vel[ix + 1] * step;
                    pos[ix + 2] += vel[ix + 2] * step;
                    pos[ix] += Math.sin(pos[ix + 1] * 0.16 + time * 0.78 + seeds[i] * 2) * 0.032 * dt * 52;
                    pos[ix + 2] += Math.cos(pos[ix + 1] * 0.14 + time * 0.65 + seeds[i]) * 0.026 * dt * 52;
                    const xz = Math.sqrt(pos[ix] * pos[ix] + pos[ix + 2] * pos[ix + 2]);
                    const spread = (0.00012 + leaf * 0.0001) * dt * 60;
                    if (xz > 0.02) {
                        pos[ix] += (pos[ix] / xz) * spread;
                        pos[ix + 2] += (pos[ix + 2] / xz) * spread;
                    }
                    vel[ix] *= 0.999;
                    vel[ix + 2] *= 0.999;
                    if (pos[ix + 1] < -6.8) {
                        pos[ix] = (Math.random() - 0.5) * 15;
                        pos[ix + 1] = 4.5 + Math.random() * 8.5;
                        pos[ix + 2] = (Math.random() - 0.5) * 15;
                        const drift = (seeds[i] % 1 - 0.5) * 0.048;
                        vel[ix] = drift + (Math.random() - 0.5) * 0.024;
                        vel[ix + 1] = -0.048 - Math.random() * 0.068;
                        vel[ix + 2] = (Math.random() - 0.5) * 0.03;
                    }
                    const yN = THREE.MathUtils.clamp((pos[ix + 1] + 6.5) / 15, 0, 1);
                    const dim = 0.65 + 0.35 * Math.sin(time * 1.05 + i * 0.017);
                    tmpColor.copy(sp.deep).lerp(sp.secondary, yN * 0.75 + dim * 0.18);
                    tmpColor.lerp(sp.accent, (1 - yN) * 0.5 + 0.12 * Math.sin(time * 0.42 + seeds[i]));
                    tmpColor.lerp(sp.mist, 0.06 + 0.1 * dim);
                    tmpColor.multiplyScalar(0.86 + 0.1 * leaf);
                    colors[ix] = tmpColor.r;
                    colors[ix + 1] = tmpColor.g;
                    colors[ix + 2] = tmpColor.b;
                }
            } else {
                const wind = Math.sin(time * 0.9) * 0.35 + Math.sin(time * 0.23) * 0.12;
                const slow = 0.58;
                for (let i = 0; i < N; i++) {
                    const ix = i * 3;
                    const step = dt * 42 * slow;
                    pos[ix] += (vel[ix] + wind) * step;
                    pos[ix + 1] += vel[ix + 1] * step;
                    pos[ix + 2] += vel[ix + 2] * step;
                    pos[ix] += Math.sin(pos[ix + 1] * 0.25 + time * 1.2 + seeds[i]) * 0.06 * dt * 40 * slow;
                    if (pos[ix + 1] < -7) {
                        pos[ix] = (Math.random() - 0.5) * 12;
                        pos[ix + 1] = 5 + Math.random() * 9;
                        pos[ix + 2] = (Math.random() - 0.5) * 12;
                        vel[ix] = (0.06 + Math.random() * 0.14) * slow;
                        vel[ix + 1] = (-0.36 - Math.random() * 0.26) * slow;
                        vel[ix + 2] = (Math.random() - 0.5) * 0.06 * slow;
                    }
                    const dim = 0.72 + 0.28 * Math.sin(time * 2.2 + i * 0.02);
                    tmpColor.copy(pMood.accent).lerp(pMood.secondary, dim * 0.42);
                    tmpColor.multiplyScalar(0.95);
                    colors[ix] = tmpColor.r;
                    colors[ix + 1] = tmpColor.g;
                    colors[ix + 2] = tmpColor.b;
                }
            }
            geom.attributes.color.needsUpdate = true;
        } else if (vis === 'fearful') {
            const fp = pMood;
            const chaos = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 3.6));
            const pulse = 0.5 + 0.5 * Math.sin(time * 7.2);
            for (let i = 0; i < N; i++) {
                const ix = i * 3;
                const step = dt * 62;
                pos[ix] += vel[ix] * step;
                pos[ix + 1] += vel[ix + 1] * step;
                pos[ix + 2] += vel[ix + 2] * step;
                const kick = 0.048 * chaos * (0.6 + pulse * 0.4);
                vel[ix] += (Math.random() - 0.5) * kick;
                vel[ix + 1] += (Math.random() - 0.5) * kick * 0.92;
                vel[ix + 2] += (Math.random() - 0.5) * kick;
                if (Math.random() < 0.022 * dt * 60) {
                    vel[ix] += (Math.random() - 0.5) * 0.55;
                    vel[ix + 1] += (Math.random() - 0.5) * 0.5;
                    vel[ix + 2] += (Math.random() - 0.5) * 0.55;
                }
                pos[ix] += Math.sin(time * 8.5 + i * 0.12 + seeds[i]) * 0.095 * dt * 52;
                pos[ix + 1] += Math.sin(time * 6.2 + i * 0.08) * 0.072 * dt * 52;
                pos[ix + 2] += Math.cos(time * 7.9 + i * 0.1) * 0.095 * dt * 52;
                vel[ix] *= 0.978;
                vel[ix + 1] *= 0.978;
                vel[ix + 2] *= 0.978;
                const rr = Math.sqrt(pos[ix] * pos[ix] + pos[ix + 1] * pos[ix + 1] + pos[ix + 2] * pos[ix + 2]);
                if (rr > 14.5 || rr < 0.35) {
                    pos[ix] = (Math.random() - 0.5) * 5;
                    pos[ix + 1] = (Math.random() - 0.5) * 4;
                    pos[ix + 2] = (Math.random() - 0.5) * 5;
                    vel[ix] = (Math.random() - 0.5) * 0.48;
                    vel[ix + 1] = (Math.random() - 0.5) * 0.48;
                    vel[ix + 2] = (Math.random() - 0.5) * 0.48;
                }
                const flick = 0.5 + 0.5 * Math.sin(time * 11 + i * 0.11);
                tmpColor.copy(fp.abyss).lerp(fp.secondary, 0.32 + flick * 0.28);
                tmpColor.lerp(fp.accent, 0.2 + chaos * 0.35 + Math.random() * 0.18);
                tmpColor.lerp(fp.ice, (1 - flick) * 0.18);
                tmpColor.multiplyScalar(0.72 + 0.22 * flick);
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
            }
            geom.attributes.color.needsUpdate = true;
        } else if (vis === 'angry') {
            const pa = pMood;
            const isAngry = mood === 'angry';
            const lift = Math.sin(time * 2.4) * 0.014;
            const tide = isAngry ? 0.5 + 0.5 * Math.sin(time * 2.88) : 0.5;
            const boom = isAngry ? Math.max(0, (tide - 0.52) / 0.48) : 0;
            for (let i = 0; i < N; i++) {
                const ix = i * 3;
                if (isAngry) {
                    const kick = 0.022 + boom * 0.095;
                    vel[ix] += (Math.random() - 0.5) * kick;
                    vel[ix + 2] += (Math.random() - 0.5) * kick;
                    vel[ix + 1] += ((0.021 + boom * 0.11) * (0.55 + Math.random() * 0.45) + lift) * dt * 58;
                    if (boom > 0.38 && Math.random() < 0.035 * dt * 60) {
                        vel[ix] += (Math.random() - 0.5) * 0.62;
                        vel[ix + 1] += 0.22 + Math.random() * 0.52;
                        vel[ix + 2] += (Math.random() - 0.5) * 0.62;
                    }
                } else {
                    vel[ix] += (Math.random() - 0.5) * 0.016;
                    vel[ix + 2] += (Math.random() - 0.5) * 0.016;
                    vel[ix + 1] += (0.019 + lift) * dt * 58;
                }
                pos[ix] += vel[ix] * dt * 52;
                pos[ix + 1] += vel[ix + 1] * dt * 52;
                pos[ix + 2] += vel[ix + 2] * dt * 52;
                pos[ix] += Math.sin(time * 3.5 + pos[ix + 1] * 0.35) * (0.035 + boom * 0.028) * dt * 45;
                if (isAngry) {
                    const jit = 0.038 * boom * dt * 60;
                    pos[ix] += (Math.random() - 0.5) * jit;
                    pos[ix + 1] += (Math.random() - 0.5) * jit * 0.55;
                    pos[ix + 2] += (Math.random() - 0.5) * jit;
                    const xz = Math.sqrt(pos[ix] * pos[ix] + pos[ix + 2] * pos[ix + 2]) + 0.08;
                    const spread = boom * 0.00115 * dt * 60;
                    pos[ix] += (pos[ix] / xz) * spread;
                    pos[ix + 2] += (pos[ix + 2] / xz) * spread;
                }
                if (pos[ix + 1] > 5.2) {
                    if (isAngry) {
                        const ang = Math.random() * Math.PI * 2;
                        const rr = Math.random() * 1.5;
                        pos[ix] = Math.cos(ang) * rr;
                        pos[ix + 1] = -4.6 - Math.random() * 0.75;
                        pos[ix + 2] = Math.sin(ang) * rr;
                        const out = 0.08 + Math.random() * 0.22;
                        vel[ix] = Math.cos(ang) * out + (Math.random() - 0.5) * 0.07;
                        vel[ix + 1] = 0.1 + Math.random() * 0.13;
                        vel[ix + 2] = Math.sin(ang) * out + (Math.random() - 0.5) * 0.07;
                    } else {
                        pos[ix] = (Math.random() - 0.5) * 5.2;
                        pos[ix + 1] = -4.6 - Math.random() * 1.8;
                        pos[ix + 2] = (Math.random() - 0.5) * 5.2;
                        vel[ix] = (Math.random() - 0.5) * 0.048;
                        vel[ix + 1] = 0.055 + Math.random() * 0.09;
                        vel[ix + 2] = (Math.random() - 0.5) * 0.048;
                    }
                }
                const h = (pos[ix + 1] + 4.6) / 9.8;
                const flick = 0.5 + 0.5 * Math.sin(time * 11 + i * 0.12);
                tmpColor.copy(pa.ember).lerp(pa.accent, Math.min(1, h * 1.08 + 0.16 * flick + boom * 0.18));
                tmpColor.lerp(pa.secondary, (0.38 + 0.48 * h) * flick * (0.85 + boom * 0.35));
                if (isAngry && pa.blaze) {
                    tmpColor.lerp(pa.blaze, 0.12 + 0.38 * h * flick + 0.22 * boom);
                    if (i % 19 === 0) {
                        tmpColor.lerp(pa.blaze, 0.48);
                    }
                } else if (i % 37 === 0) {
                    tmpColor.lerp(new THREE.Color(1, 0.92, 0.75), 0.42);
                }
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
            }
            geom.attributes.color.needsUpdate = true;
        } else if (vis === 'jealous') {
            const jp = pMood;
            const phase = Math.sin(time * 2.38);
            const gather = Math.max(0, phase);
            const scatter = Math.max(0, -phase);
            const limX = 5.35;
            const limY = 3.85;
            const limZ = 5.35;
            const rest = 0.76;
            const ax0 = Math.sin(time * 0.64) * 2.35;
            const az0 = Math.cos(time * 0.5) * 2.15;
            const ax1 = Math.sin(time * 0.57 + 2.05) * 2.75;
            const az1 = Math.cos(time * 0.73 + 1.4) * 2.45;
            const ay2 = Math.sin(time * 0.9) * 1.15;
            const ax3 = Math.cos(time * 0.42 + 3.1) * 1.8;
            const az3 = Math.sin(time * 0.68) * 2.6;
            function jealousRepel(ix, ax, ay, az, strength) {
                const dx = pos[ix] - ax;
                const dy = pos[ix + 1] - ay;
                const dz = pos[ix + 2] - az;
                const d2 = dx * dx + dy * dy + dz * dz + 0.38;
                const d = Math.sqrt(d2);
                const f = strength / d2;
                vel[ix] += (dx / d) * f * dt * 52;
                vel[ix + 1] += (dy / d) * f * dt * 48;
                vel[ix + 2] += (dz / d) * f * dt * 52;
            }
            for (let i = 0; i < N; i++) {
                const ix = i * 3;
                jealousRepel(ix, ax0, 0, az0, 0.1);
                jealousRepel(ix, ax1, ay2, az1, 0.088);
                jealousRepel(ix, -ax0 * 0.85, -0.35, -az0 * 0.92, 0.095);
                jealousRepel(ix, ax3, Math.sin(time * 1.08) * 0.5, az3, 0.072);
                if (jealousDrag.active) {
                    const dxp = pos[ix] - jealousDrag.world.x;
                    const dyp = pos[ix + 1] - jealousDrag.world.y;
                    const dzp = pos[ix + 2] - jealousDrag.world.z;
                    const dp2 = dxp * dxp + dyp * dyp + dzp * dzp;
                    if (dp2 < 36 && dp2 > 0.015) {
                        const dp = Math.sqrt(dp2);
                        const push = (1 - dp / 6) * (0.038 + jealousDrag.speed * 0.095) * dt * 58;
                        vel[ix] += (dxp / dp) * push;
                        vel[ix + 1] += (dyp / dp) * push * 0.72;
                        vel[ix + 2] += (dzp / dp) * push;
                    }
                }
                pos[ix] += vel[ix] * dt * 44;
                pos[ix + 1] += vel[ix + 1] * dt * 44;
                pos[ix + 2] += vel[ix + 2] * dt * 44;
                if (pos[ix] > limX) {
                    pos[ix] = limX;
                    vel[ix] *= -rest;
                } else if (pos[ix] < -limX) {
                    pos[ix] = -limX;
                    vel[ix] *= -rest;
                }
                if (pos[ix + 1] > limY) {
                    pos[ix + 1] = limY;
                    vel[ix + 1] *= -rest;
                } else if (pos[ix + 1] < -limY) {
                    pos[ix + 1] = -limY;
                    vel[ix + 1] *= -rest;
                }
                if (pos[ix + 2] > limZ) {
                    pos[ix + 2] = limZ;
                    vel[ix + 2] *= -rest;
                } else if (pos[ix + 2] < -limZ) {
                    pos[ix + 2] = -limZ;
                    vel[ix + 2] *= -rest;
                }
                const rr = Math.sqrt(pos[ix] * pos[ix] + pos[ix + 1] * pos[ix + 1] + pos[ix + 2] * pos[ix + 2]) + 0.02;
                const pull = gather * (2.25 - rr * 0.35) * 0.0002;
                pos[ix] -= (pos[ix] / rr) * pull;
                pos[ix + 1] -= (pos[ix + 1] / rr) * pull;
                pos[ix + 2] -= (pos[ix + 2] / rr) * pull;
                const pushO = scatter * 0.0003 * rr;
                pos[ix] += (pos[ix] / rr) * pushO;
                pos[ix + 1] += (pos[ix + 1] / rr) * pushO;
                pos[ix + 2] += (pos[ix + 2] / rr) * pushO;
                const hor = Math.hypot(pos[ix], pos[ix + 2]) + 0.04;
                const tx = -pos[ix + 2] / hor;
                const tz = pos[ix] / hor;
                const twist = scatter * 0.00045 * dt * 60;
                vel[ix] += tx * twist;
                vel[ix + 2] += tz * twist;
                const j = (i + 97) % N;
                const jix = j * 3;
                let nx = pos[ix] - pos[jix];
                let ny = pos[ix + 1] - pos[jix + 1];
                let nz = pos[ix + 2] - pos[jix + 2];
                const nd2 = nx * nx + ny * ny + nz * nz + 0.025;
                const nd = Math.sqrt(nd2);
                if (nd < 1.32) {
                    const sep = ((1.32 - nd) / nd) * 0.021 * dt * 58;
                    vel[ix] += nx * sep;
                    vel[ix + 1] += ny * sep * 0.82;
                    vel[ix + 2] += nz * sep;
                    vel[jix] -= nx * sep * 0.94;
                    vel[jix + 1] -= ny * sep * 0.8;
                    vel[jix + 2] -= nz * sep * 0.94;
                }
                const j2 = (i + 251) % N;
                const j2x = j2 * 3;
                nx = pos[ix] - pos[j2x];
                ny = pos[ix + 1] - pos[j2x + 1];
                nz = pos[ix + 2] - pos[j2x + 2];
                const nd2b = nx * nx + ny * ny + nz * nz + 0.03;
                const ndb = Math.sqrt(nd2b);
                if (ndb < 1.05) {
                    const sep2 = ((1.05 - ndb) / ndb) * 0.014 * dt * 58;
                    vel[ix] += nx * sep2;
                    vel[ix + 1] += ny * sep2 * 0.78;
                    vel[ix + 2] += nz * sep2;
                    vel[j2x] -= nx * sep2 * 0.88;
                    vel[j2x + 1] -= ny * sep2 * 0.74;
                    vel[j2x + 2] -= nz * sep2 * 0.88;
                }
                if (Math.random() < 0.011 * dt * 60) {
                    vel[ix] += (Math.random() - 0.5) * 0.19;
                    vel[ix + 1] += (Math.random() - 0.5) * 0.15;
                    vel[ix + 2] += (Math.random() - 0.5) * 0.19;
                }
                vel[ix] *= 0.987;
                vel[ix + 1] *= 0.987;
                vel[ix + 2] *= 0.987;
                vel[ix] += (Math.random() - 0.5) * 0.00062;
                vel[ix + 1] += (Math.random() - 0.5) * 0.00052;
                vel[ix + 2] += (Math.random() - 0.5) * 0.00062;
                const flick = 0.5 + 0.5 * Math.sin(time * 9.8 + i * 0.11);
                tmpColor.copy(jp.shadow).lerp(jp.accent, flick * 0.52 + gather * 0.22 + scatter * 0.08);
                tmpColor.lerp(jp.cold, scatter * 0.32 + (1 - flick) * 0.28);
                tmpColor.lerp(jp.secondary, 0.12 + 0.35 * Math.sin(seeds[i] * 2.1 + time * 1.4));
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
            }
            jealousDrag.speed *= Math.pow(0.9, dt * 60);
            geom.attributes.color.needsUpdate = true;
        } else if (vis === 'joy') {
            const jp = pMood;
            let u;
            let v;
            let R;
            let r;
            let cosu;
            let sinu;
            let cosv;
            let sinv;
            let rx;
            let rz;
            let dist;
            for (let i = 0; i < N; i++) {
                const ix = i * 3;
                const ph = seeds[i];
                u = vel[ix];
                v = vel[ix + 1];
                u += (0.00019 + Math.sin(time * 0.33 + i * 0.00085) * 0.00005) * dt * 60;
                v += (Math.cos(time * 0.46 + u * 1.1) * 0.0001 + (Math.random() - 0.5) * 0.000036) * dt * 60;
                v += Math.sin(time * 3.1 + u * 2.4 + ph) * 0.000055 * dt * 60;
                u += Math.cos(time * 2.7 + v * 2.1) * 0.000048 * dt * 60;
                u += 0.0001 * dt * 60;
                R = 4.02 + 0.12 * Math.sin(time * 0.4 + u * 0.52);
                r = 0.9 + 0.06 * Math.sin(time * 0.5 + v * 1.85);
                cosu = Math.cos(u);
                sinu = Math.sin(u);
                cosv = Math.cos(v);
                sinv = Math.sin(v);
                rx = (R + r * cosv) * cosu;
                rz = (R + r * cosv) * sinu;
                dist = Math.sqrt(rx * rx + rz * rz) + 0.001;
                const ringWave = 0.26 * Math.sin(dist * 1.38 - time * 2.85 + ph * 0.3)
                    + 0.14 * Math.sin(dist * 2.25 + time * 1.65 + ph);
                const crossBounce = 0.16 * Math.sin(time * 2.55 + u * 2.3 + ph) * Math.cos(time * 2.15 + v * 1.9);
                const sparkle = 0.1 * Math.sin(time * 3.45 + u * 3.2 + v * 2.6 + ph * 2);
                const bx = rx + 0.04 * Math.sin(time * 2.2 + v * 2.8 + ph);
                const by = r * sinv + ringWave + crossBounce + sparkle + 0.05 * Math.sin(time * 0.36 + u * 0.78);
                const bz = rz + 0.04 * Math.cos(time * 2.05 + u * 2.6 + ph);
                const spr = 5.8;
                const jd = Math.min(dt, 0.05);
                joyOvx[i] *= 0.931;
                joyOvy[i] *= 0.931;
                joyOvz[i] *= 0.931;
                joyOvx[i] -= joyOx[i] * spr * jd;
                joyOvy[i] -= joyOy[i] * spr * jd;
                joyOvz[i] -= joyOz[i] * spr * jd;
                joyOx[i] += joyOvx[i] * jd * 38;
                joyOy[i] += joyOvy[i] * jd * 38;
                joyOz[i] += joyOvz[i] * jd * 38;
                const mag = Math.sqrt(joyOx[i] * joyOx[i] + joyOy[i] * joyOy[i] + joyOz[i] * joyOz[i]);
                const spinRate = 0.12 + 0.62 * (1 - Math.exp(-mag * 2.4));
                const spin = spinRate * jd;
                const co = Math.cos(spin);
                const so = Math.sin(spin);
                let jx = joyOx[i];
                let jz = joyOz[i];
                joyOx[i] = jx * co - jz * so;
                joyOz[i] = jx * so + jz * co;
                jx = joyOvx[i];
                jz = joyOvz[i];
                joyOvx[i] = jx * co - jz * so;
                joyOvz[i] = jx * so + jz * co;
                pos[ix] = bx + joyOx[i];
                pos[ix + 1] = by + joyOy[i];
                pos[ix + 2] = bz + joyOz[i];
                vel[ix] = u;
                vel[ix + 1] = v;
                const mix = 0.5 + 0.5 * Math.sin(u * 2.08 + time * 0.2 + v * 0.4);
                tmpColor.copy(jp.lake).lerp(jp.rose, mix * 0.76 + 0.14 * Math.sin(v * 2.5 + time * 0.12));
                tmpColor.lerp(jp.halo, 0.12 + 0.24 * (0.5 + 0.5 * Math.sin(v * 2.15 + time * 0.14)));
                tmpColor.multiplyScalar(1.06);
                if (i % 29 === 0) {
                    tmpColor.lerp(jp.rose, 0.38);
                } else if (i % 31 === 0) {
                    tmpColor.lerp(jp.lake, 0.35);
                }
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
            }
            geom.attributes.color.needsUpdate = true;
        }

        geom.attributes.position.needsUpdate = true;
    }

    function applyBodyTheme(mood) {
        const layer = document.getElementById('mood-bg');
        const onHome = document.body.classList.contains('app-view-home');
        if (onHome) {
            document.body.classList.remove('mood-bg-on');
            if (layer) layer.style.backgroundImage = 'none';
            return;
        }
        const moods = ['calm', 'sad', 'angry', 'joy', 'anxious', 'tired', 'hopeful', 'fearful', 'warm', 'jealous'];
        for (let mi = 0; mi < moods.length; mi++) {
            document.body.classList.remove('mood-' + moods[mi]);
        }
        document.body.classList.add('mood-' + mood);
        const imgUrl = MOOD_BACKGROUND_IMAGES[mood];
        document.body.classList.toggle('mood-bg-on', !!imgUrl);
        if (layer) {
            if (imgUrl) {
                layer.style.backgroundImage = 'url("' + imgUrl.replace(/"/g, '') + '")';
            } else {
                layer.style.backgroundImage = 'none';
            }
        }
    }

    function setMood(mood) {
        jealousDrag.active = false;
        jealousDrag.speed = 0;
        currentMood = mood;
        setSceneMood(mood);
        initParticles(mood);
        applyBodyTheme(mood);
    }

    points.visible = false;
    treePoints.visible = true;
    scene.fog = null;
    renderer.setClearColor(0x000000, 1);
    camera.position.set(0, 0.25, 12.2);
    controls.target.set(0, 0.45, 0);
    controls.autoRotateSpeed = 0.14;
    initGardenControls();
    rebuildMoodTree();
    updateGardenStatusPill();

    function enterPourMode() {
        closeDiaryModal();
        closeLifeTreeModal();
        appView = 'pour';
        document.body.classList.remove('app-view-home');
        document.body.classList.add('app-view-pour');
        const gh = document.getElementById('garden-home');
        if (gh) gh.setAttribute('aria-hidden', 'true');
        points.visible = true;
        treePoints.visible = false;
        setMood(currentMood);
        setPourOpen(true);
        try {
            localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(treeParams));
        } catch (e) { /* ignore */ }
    }

    function backToGarden() {
        appView = 'home';
        setPourOpen(false);
        document.body.classList.remove('app-view-pour');
        document.body.classList.add('app-view-home');
        const gh = document.getElementById('garden-home');
        if (gh) gh.setAttribute('aria-hidden', 'false');
        points.visible = false;
        treePoints.visible = true;
        scene.fog = null;
        renderer.setClearColor(0x000000, 1);
        camera.position.set(0, 0.25, 12.2);
        controls.target.set(0, 0.45, 0);
        controls.autoRotateSpeed = 0.14;
        applyBodyTheme(currentMood);
        rebuildMoodTree();
        updateGardenStatusPill();
    }

    function onCanvasPointerDown(e) {
        if (appView !== 'pour') return;
        if (e.button !== 0) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.ray.at(7, new THREE.Vector3());
        const flashPair = moodClickFlash[currentMood] || moodClickFlash.calm;
        let colorDirty = false;

        for (let i = 0; i < N; i++) {
            const ix = i * 3;
            const dx = pos[ix] - hit.x;
            const dy = pos[ix + 1] - hit.y;
            const dz = pos[ix + 2] - hit.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (currentMood === 'joy' && d2 < 48) {
                const d = Math.sqrt(d2) + 0.2;
                const fall = (48 - d2) / 48;
                const burst = fall * fall * 0.022;
                const rx = dx / d;
                const ry = dy / d;
                const rz = dz / d;
                joyOvx[i] += rx * burst;
                joyOvy[i] += ry * burst * 0.55;
                joyOvz[i] += rz * burst;
                const hor = Math.sqrt(dx * dx + dz * dz) + 0.18;
                const tx = -dz / hor;
                const tz = dx / hor;
                joyOvx[i] += tx * burst * 0.62;
                joyOvz[i] += tz * burst * 0.62;
            }
            if (d2 < 16) {
                const f = (16 - d2) * 0.0025;
                if (currentMood === 'angry') {
                    pos[ix] += dx * f * 0.085;
                    pos[ix + 1] += dy * f * 0.065;
                    pos[ix + 2] += dz * f * 0.085;
                } else if (currentMood !== 'joy' && currentMood !== 'jealous') {
                    vel[ix] += dx * f;
                    vel[ix + 1] += dy * f;
                    vel[ix + 2] += dz * f;
                }
                const pulse = (16 - d2) / 16;
                tmpColor.setRGB(colors[ix], colors[ix + 1], colors[ix + 2]);
                const pulseW = { sad: 0.55, joy: 0.68, warm: 0.68, angry: 0.72, jealous: 0.7, calm: 0.5, anxious: 0.62, tired: 0.52, hopeful: 0.58, fearful: 0.58 };
                tmpColor.lerp(flashPair[i & 1], pulse * (pulseW[currentMood] != null ? pulseW[currentMood] : 0.52));
                colors[ix] = tmpColor.r;
                colors[ix + 1] = tmpColor.g;
                colors[ix + 2] = tmpColor.b;
                colorDirty = true;
            }
        }
        if (colorDirty) {
            geom.attributes.color.needsUpdate = true;
        }
    }

    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    renderer.domElement.addEventListener('pointermove', function (e) {
        if (appView !== 'pour' || currentMood !== 'jealous' || !jealousDrag.active) return;
        if ((e.buttons & 1) === 0) {
            jealousDrag.active = false;
            return;
        }
        const rect = renderer.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        raycaster.ray.at(6.5, jealousDrag.world);
        const ddx = e.clientX - jealousDrag.lx;
        const ddy = e.clientY - jealousDrag.ly;
        jealousDrag.speed = Math.min(3.2, Math.hypot(ddx, ddy) * 0.032);
        jealousDrag.lx = e.clientX;
        jealousDrag.ly = e.clientY;
    });
    renderer.domElement.addEventListener('pointerup', function () {
        jealousDrag.active = false;
    });
    renderer.domElement.addEventListener('pointerleave', function () {
        jealousDrag.active = false;
    });

    function animate() {
        requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.1);
        const time = performance.now() * 0.001;
        if (appView === 'home') {
            stepTree(dt, time);
            controls.update();
            renderer.render(scene, camera);
            return;
        }
        stepParticles(dt, time);
        if (currentMood === 'anxious') {
            const ap = moodPalettes.anxious;
            mat.size = ap.size * (0.76 + 0.44 * (0.5 + 0.5 * Math.sin(time * 12.6)));
        } else if (currentMood === 'angry') {
            const ag = moodPalettes.angry;
            const pulse = 0.5 + 0.5 * Math.sin(time * 9.2);
            const boom = Math.max(0, (0.5 + 0.5 * Math.sin(time * 2.88) - 0.52) / 0.48);
            mat.size = ag.size * (0.84 + 0.32 * pulse + 0.22 * boom);
        } else if (currentMood === 'jealous') {
            const jv = moodPalettes.jealous;
            mat.size = jv.size * (0.76 + 0.38 * (0.5 + 0.5 * Math.sin(time * 11.4)));
        } else if (currentMood === 'fearful') {
            const fv = moodPalettes.fearful;
            const ch = 0.5 + 0.5 * Math.sin(time * 8.4);
            mat.size = fv.size * (0.82 + 0.28 * ch);
        }
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    /* 多组关键词计分 + 问号/感叹语气加权 + 质问+对象加权（纯前端启发，非云端大模型） */
    function detectMood(raw) {
        const t = raw.trim();
        if (!t) return 'calm';
        const defs = [
            ['jealous', [
                /嫉妒|妒忌|吃醋|眼红|酸了|醋意|酸溜溜|心里不平衡|羡慕嫉妒|见不得别人好|见不得他好|见不得她好|嫉贤妒能|泛酸|醋坛子|凭什么他有|凭什么她有|不甘人后|暗暗较劲|为什么是他|为什么是她|我哪里不如|心里泛酸|酸得要命|好酸|太酸了|羡慕得要死|羡慕死了|眼红死了|心里堵得慌.*(?:他|她|人家)/,
                /(?:他|她|人家)(?:凭什么|怎么)(?:就|能)(?:有|得到|这么好)|比不过|比不上|我哪点不如/
            ]],
            ['angry', [
                /暴怒|抓狂|发飙|发狂|恨死|咬牙切齿|怒不可遏|火冒三丈|气炸|气疯|气死人|气死我|真气|好气|很气|生气|气愤|愤慨|恼火|窝火|憋火|冒火|火大|一肚子气|受气|想打人|骂人|想骂人|骂了|骂他|骂她|骂我|挨骂|被骂|数落|训斥|挨批|太过分|不讲理|忍无可忍|炸毛|可恶|混蛋|瞎指挥|乱骂人|找茬|针对我|烦死了|烦透了|讨厌死了|受不了|有病吧|他有病|你有病|神经病|脑子有病|暴躁|暴怒|怒吼|厌烦透顶|飙了/,
                /抱怨|埋怨|吐槽|发牢骚|碎碎念|想不通|离谱|离大谱|什么鬼|搞什么|搞啥|咋回事|咋这样|真无语|无语了|说不通|不讲道理|双标|甩锅|推诿|糊弄|欺负人|太欺负|为难人|算什么东西|什么玩意|不像话|不像样|一肚子火|憋坏了|窝一肚子气/,
                /凭什么啊|为什么啊|为啥啊|凭啥啊|怎么会这样|怎么能这样|凭什么这样|凭什么不|怎么说得出口|说什么呢|算什么玩意儿|道理在哪|说不过去|无法理喻|欺人太甚|得寸进尺|给脸不要脸|别太过分/,
                /凭什么|为什么|为啥|凭啥|不公|不公平|委屈死|憋屈|憋屈死|气人|气死了|好气啊|真气人|搞不明白|想不通为什么|凭什么是|为什么是我|为什么总|为啥总|凭啥总/
            ]],
            ['fearful', [
                /恐惧|恐怖|吓死|吓哭|吓懵|吓坏了|吓到|吓人|好可怕|太可怕|惧怕|生怕|不敢当|不敢去|不敢想|不敢看|不敢出门|慌张|惊恐|惊慌|心里发毛|发怵|发慌|慌神|六神无主|心里没底|虚得慌|危机感|威胁|逃生|救命|后怕|梦魇|鬼压床|噩梦缠身/,
                /心惊肉跳|提心吊胆|胆战心惊|不寒而栗|脊背发凉|背后发凉|头皮发麻|发麻|发毛|瘆人|阴森|诡异|毛毛的|好瘆|心里发紧|窒息感|喘不上气|想躲|躲起来|藏起来|闭上眼|别过来|离我远点/,
                /黑漆漆|伸手不见五指|黑暗里|夜里怕|一个人怕|独自害怕|未知的|看不清|影子|像有人|跟踪|尾随|被偷拍|不安全/
            ]],
            ['anxious', [
                /焦虑|焦躁|忐忑|心慌|坐立不安|压力大|胡思乱想|慌得要命|紧张兮兮|崩溃边缘|睡不着踏实|心慌意乱|缺乏安全感|惴惴不安|提心吊胆|心烦意乱|七上八下|心神不宁|惴惴|发慌|好慌|慌得很|越想越慌|脑子停不下来|停不下来想|不安|紧张(?!症)/
            ]],
            ['tired', [
                /累瘫|累死了|累坏了|累垮了|累到不行|累得人|精疲力竭|力竭|耗竭|疲惫不堪|身心俱疲|倦怠|倦了|疲乏|乏力|软绵绵|没力气|没劲儿|没劲|透支|睁不开眼|眼皮沉|眼皮打架|眼睛酸|昏昏沉沉|浑浑噩噩|无精打采|打不起精神|骨头散架|体力不支|精力耗尽|干不动了|走不动了|动不了|不想动|不想起床|起不来床|葛优躺|只想躺着|只想睡觉|好想睡|特困|好困|很困|太困|困死|困得不行|犯困|困倦|困意|发困|睡不醒|睡不够|缺觉|睡眠不足|失眠整夜|睡不着(?!踏实)|熬夜|通宵|连轴转|加班累|加了好几天班|疲劳驾驶|社畜|干烧了|烧干了/,
                /好乏|乏死了|提不起精神|喘口气都累|一点劲都没有|浑身酸痛|腰酸背痛|肩颈|久坐累|站久了累|带娃累|带娃带到|被掏空了|被掏空|电量归零|电量不足|需要充电|躺平|摆烂休息|歇会儿|缓不过来/
            ]],
            ['sad', [
                /想哭|哭了|眼泪|泪水|泪流满面|难过|难受死了|伤心|心碎|委屈死了|丧|抑郁|抑郁症|抑郁发作|玉玉症|空落落|绝望|失落|心痛|好想消失|蓝瘦香菇|玉玉|心情不好|低落|郁闷|压抑|没人懂我|emo|委屈|哭|空落|好丧|丧气|颓废|厌世|厌学/,
                /好难受|很难受|难受死了|难受得很|难受啊|心里难受|特别难受|太难受|莫名难受|胸口难受|堵得难受|浑身难受|一阵阵地难受|说不出的难受|说不上来的难受|闷得难受|憋得难受|难受(?:得|到)不行/,
                /(?<![受不])难受(?![受用])/,
                /活着没意思|没意思透了|什么都不想做|对什么都没兴趣|提不起劲|没动力|心如死灰|心灰意冷|万念俱灰|走不出来|心理低谷|空心|麻木了|麻木不仁|像行尸走肉|自我否定|讨厌自己|恨自己|不配|拖累|灰暗|一片灰暗|人生灰暗|撑不下去|撑不住|崩溃|欲哭无泪|哭不出来|沉重|压得喘不过气|喘不过气了/
            ]],
            ['hopeful', [
                /希望|期待|向往|曙光|想试试|会变好|加油|憧憬|也许能行|总会过去|不放弃|相信明天|想努力/
            ]],
            ['warm', [
                /妈妈爱我|爱我妈妈|爸妈爱我|家人爱我|被爱着|把我当宝|避风港|亲情团聚|惦记着我|父母爱|相爱的人/,
                /妈妈|妈咪|老妈|爸|爸爸|爹|爸妈|父母|母爱|父爱|家里人|家人|外公|外婆|姥姥|爷爷|奶奶|港湾|依靠|疼爱|宠溺|被疼|被宠|牵挂|关心我|心疼我|体恤|想家|团圆|亲情/,
                /谢谢|感激|感恩|想念|惦记|抱抱|亲密|被理解|好暖|爱意|恩爱|陪伴|暗恋|爱你|爱我|很爱|好爱|爱情|喜欢着你|喜欢(?:你|他|她)(?!的)/
            ]],
            ['joy', [
                /开心|快乐|高兴|爽歪歪|耶|哈哈哈|太爽|幸福|雀跃|开心死了|高兴坏了|太棒了|美滋滋|乐开花|棒|哈哈|爽|太好了/
            ]],
            ['calm', [
                /平静|淡定|放松|宁和|没什么|就这样|还好吧|算了|心平气和|冷静|淡然|接纳当下|随遇而安|一般般|一般|安静|还好(?!气)/
            ]]
        ];
        const priority = ['jealous', 'angry', 'fearful', 'anxious', 'tired', 'sad', 'hopeful', 'warm', 'joy', 'calm'];
        const scores = {};
        for (let p = 0; p < priority.length; p++) scores[priority[p]] = 0;
        for (let i = 0; i < defs.length; i++) {
            const mood = defs[i][0];
            const patterns = defs[i][1];
            for (let j = 0; j < patterns.length; j++) {
                if (patterns[j].test(t)) scores[mood] += 2;
            }
        }
        if (/[？?！!]/.test(t) && /凭什么|为什么|为啥|凭啥|怎么这样|怎么会|咋会|何以|道理|说不过去|欺负|不公|离谱|抱怨|吐槽|气人|无语/.test(t)) {
            scores.angry += 3;
        }
        if (/凭什么|为什么|为啥|凭啥/.test(t) && /(?:他|她|它|人家|别人|领导|老板|公司|单位|老师|同事|爸妈|老妈|老爸)/.test(t)) {
            scores.angry += 2;
        }
        if (/(?:怕|恐惧|吓|慌神|发毛|瘆|阴森|噩梦|惊恐)/.test(t) && /(?:黑|暗|夜里|深夜|半夜|一个人|独自|陌生|影子|鬼|跟踪|不安全|未知的)/.test(t)) {
            scores.fearful += 3;
        }
        if (/(?:好|很|真|特别|心里|太)难受|难受死了|难受得很|难受啊|胸口难受|堵得难受|浑身难受|说不出的难受|说不上来的难受|闷得难受|憋得难受/.test(t)) {
            scores.sad += 4;
        }
        if (/(?:难受|难过|委屈|伤心)(?:.|){0,8}(?:不想|不想动|没意思|空|麻木)/.test(t) || /(?:不想|没意思|空落)(?:.|){0,10}(?:难受|难过)/.test(t)) {
            scores.sad += 2;
        }
        if (/(?:抑郁|丧|绝望|心如死灰|万念俱灰|灰暗|厌世|麻木|空心|行尸走肉)/.test(t) && /(?:累|无力|空|没意思|不想动|睡不着|睡不好|起不来|吃不下|撑不住|撑不下去|什么都不)/.test(t)) {
            scores.sad += 3;
        }
        if (
            /(?:好累|很累|太累|疲惫|精疲力竭|身心俱疲|通宵|熬夜|缺觉|没力气|没劲|不想动|起不来|睡不够|睡不醒|眼皮|骨头散架|连轴转|加班|困倦|犯困)/.test(t) &&
            !/(?:绝望|万念俱灰|厌世|活着没意思|不想活|想哭|心碎|抑郁(?!症)|心如死灰)/.test(t)
        ) {
            scores.tired += 2;
        }
        let max = 0;
        for (let p = 0; p < priority.length; p++) {
            if (scores[priority[p]] > max) max = scores[priority[p]];
        }
        if (max === 0) return 'calm';
        for (let p = 0; p < priority.length; p++) {
            if (scores[priority[p]] === max) return priority[p];
        }
        return 'calm';
    }

    async function mockAIAnalyze(text) {
        document.getElementById('ai-status').innerHTML = '微光正在感知你的情绪…<span class="hint">分析中</span>';
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(detectMood(text));
            }, 700);
        });
    }

    const statusLines = {
        angry: { main: '火星猛然炸开又四散，像压不住的一口气。', hint: '场景：烈焰与雷暴边缘 · 红橙金' },
        sad: { main: '让雨替你落一会儿，光点慢慢散开，像泪滴和落叶。', hint: '场景：阴霾雨天 · 深蓝灰与冰蓝' },
        joy: { main: '蔷薇色和天湖蓝绕成一圈，慢慢转。', hint: '场景：湖光蔷薇 · 柔光粒子' },
        calm: { main: '星尘与花瓣在远处呼吸。', hint: '场景：花环 · 宁静' },
        anxious: { main: '光点忽聚忽散，像停不下来的念头在胸口乱撞。', hint: '场景：紫红与深蓝 · 闪烁与震颤' },
        tired: { main: '雾在林径上慢慢沉，光点像浮尘，懒得快。', hint: '场景：雾林小径 · 灰褐与枯叶黄' },
        hopeful: { main: '朝雾里有金色在往上浮。', hint: '场景：晨光斜照 · 与底图叠化' },
        fearful: { main: '光点乱撞四散，像黑暗里摸不清边界的慌。', hint: '场景：深海夜林 · 深蓝与黑' },
        warm: { main: '暖色光粒像水面的柔光，轻轻聚了又散。', hint: '场景：夜色水波 · 亲情与惦记' },
        jealous: { main: '光粒互相顶撞又散开，像心里那股拧着的劲。', hint: '场景：深绿与冷紫 · 扭曲涟漪' }
    };

    const MOOD_ZH = { calm: '平静', sad: '难过', angry: '愤怒', joy: '愉悦', anxious: '焦虑', tired: '疲惫', fearful: '恐惧', hopeful: '期待', warm: '温情', jealous: '嫉妒' };

    /** 侧栏打开后短窗内忽略遮罩点击，避免「发送」等操作后误触关闭 */
    var pourBackdropSuppressUntil = 0;

    function setPourOpen(open) {
        document.body.classList.toggle('pour-open', open);
        const tab = document.getElementById('pour-tab');
        const bd = document.getElementById('pour-backdrop');
        if (open) {
            pourBackdropSuppressUntil = performance.now() + 420;
        }
        if (tab) {
            tab.setAttribute('aria-expanded', open ? 'true' : 'false');
            tab.textContent = open ? '收起' : '倾诉';
        }
        if (bd) bd.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    (function initPourShell() {
        const tab = document.getElementById('pour-tab');
        const bd = document.getElementById('pour-backdrop');
        if (tab) {
            tab.addEventListener('click', function (e) {
                e.stopPropagation();
                setPourOpen(!document.body.classList.contains('pour-open'));
            });
        }
        if (bd) {
            bd.addEventListener('click', function () {
                if (performance.now() < pourBackdropSuppressUntil) return;
                setPourOpen(false);
            });
        }
    })();

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    const CONV_CARD_MAX = 60;
    var restoringConv = false;

    function persistConvCards() {
        if (restoringConv) return;
        const wrap = document.getElementById('conv-cards');
        if (!wrap) return;
        const cards = wrap.querySelectorAll('.conv-card');
        const arr = [];
        cards.forEach(function (card) {
            const timeEl = card.querySelector('time');
            const iso = timeEl ? timeEl.getAttribute('datetime') : '';
            const moodTag = card.querySelector('.conv-mood-tag');
            const moodZh = moodTag ? moodTag.textContent.trim() : '';
            let moodKey = 'calm';
            const mk = Object.keys(MOOD_ZH);
            for (let mi = 0; mi < mk.length; mi++) {
                if (MOOD_ZH[mk[mi]] === moodZh) {
                    moodKey = mk[mi];
                    break;
                }
            }
            const userEl = card.querySelector('.conv-card-user');
            const mainEl = card.querySelector('.conv-reply-main');
            const hintEl = card.querySelector('.conv-reply-hint');
            arr.push({
                iso: iso,
                mood: moodKey,
                userText: userEl ? userEl.textContent.trim() : '',
                mainLine: mainEl ? mainEl.textContent.trim() : '',
                hintLine: hintEl ? hintEl.textContent.trim() : ''
            });
        });
        try {
            localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(arr));
        } catch (e) { /* ignore */ }
        updateGardenStatusPill();
        scheduleTreeRebuild();
        refreshLifeTreeModalIfOpen();
    }

    function getConvCardEls() {
        const wrap = document.getElementById('conv-cards');
        return wrap ? wrap.querySelectorAll('.conv-card') : [];
    }

    function updateConvChrome() {
        const n = getConvCardEls().length;
        const badge = document.getElementById('conv-count');
        const toolbar = document.getElementById('conv-toolbar');
        const delSel = document.getElementById('conv-delete-sel');
        const selAll = document.getElementById('conv-select-all');
        if (badge) {
            badge.textContent = n ? '（' + n + ' 条）' : '';
        }
        if (toolbar) {
            toolbar.hidden = n === 0;
        }
        if (delSel) {
            let c = 0;
            getConvCardEls().forEach((card) => {
                const cb = card.querySelector('.conv-cb');
                if (cb && cb.checked) c++;
            });
            delSel.disabled = c === 0;
        }
        if (selAll) {
            if (n) {
                let all = true;
                getConvCardEls().forEach((card) => {
                    const cb = card.querySelector('.conv-cb');
                    if (cb && !cb.checked) all = false;
                });
                selAll.textContent = all ? '取消全选' : '全选';
            } else {
                selAll.textContent = '全选';
            }
        }
    }

    function removeConvEmptyHint(wrap) {
        const h = wrap.querySelector('.conv-empty');
        if (h) h.remove();
    }

    function ensureConvEmptyHint(wrap) {
        if (getConvCardEls().length > 0) return;
        if (wrap.querySelector('.conv-empty')) return;
        const d = document.createElement('div');
        d.className = 'conv-empty';
        d.textContent = '暂无对话卡片。倾诉后会出现在这里；默认折叠，不占视野。';
        wrap.appendChild(d);
    }

    function copyTextToClipboard(text) {
        const t = String(text);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(t).catch(function () {
                copyTextFallback(t);
            });
        }
        copyTextFallback(t);
        return Promise.resolve();
    }

    function copyTextFallback(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (e) { /* ignore */ }
    }

    function buildConvCardCopyText(ts, moodZh, userText, mainLine, hintLine) {
        return (
            '【心绪微光 · 对话摘录】\n' +
            '时间：' +
            ts +
            '\n' +
            '感知情绪：' +
            moodZh +
            '\n\n' +
            '我说的：\n' +
            userText +
            '\n\n' +
            '微光：\n' +
            mainLine +
            '\n' +
            hintLine
        );
    }

    function appendConvCard(userText, mood, mainLine, hintLine, storedIso) {
        const wrap = document.getElementById('conv-cards');
        if (!wrap) return;
        removeConvEmptyHint(wrap);
        const moodZh = MOOD_ZH[mood] || mood;
        let now = storedIso ? new Date(storedIso) : new Date();
        if (isNaN(now.getTime())) now = new Date();
        const ts =
            now.getFullYear() +
            '-' +
            String(now.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(now.getDate()).padStart(2, '0') +
            ' ' +
            String(now.getHours()).padStart(2, '0') +
            ':' +
            String(now.getMinutes()).padStart(2, '0');
        const card = document.createElement('article');
        card.className = 'conv-card';
        card.setAttribute('role', 'article');
        card.setAttribute('data-mood', mood);
        card.innerHTML =
            '<div class="conv-card-head">' +
            '<label class="conv-cb-wrap" title="多选后可批量删除">' +
            '<input type="checkbox" class="conv-cb" aria-label="选中此条">' +
            '</label>' +
            '<div class="conv-card-meta"><time datetime="' +
            escapeHtml(now.toISOString()) +
            '">' +
            escapeHtml(ts) +
            '</time><span class="conv-mood-tag">' +
            escapeHtml(moodZh) +
            '</span></div>' +
            '<div class="conv-card-actions">' +
            '<button type="button" class="conv-copy" title="复制全文">复制</button>' +
            '<button type="button" class="conv-del-one" title="删除此条">删除</button>' +
            '</div></div>' +
            '<div class="conv-card-user">' +
            escapeHtml(userText) +
            '</div>' +
            '<div class="conv-card-reply">' +
            '<span class="conv-reply-label">微光</span>' +
            '<p class="conv-reply-main">' +
            escapeHtml(mainLine) +
            '</p>' +
            '<p class="conv-reply-hint">' +
            escapeHtml(hintLine) +
            '</p></div>';
        wrap.insertBefore(card, wrap.firstChild);
        while (wrap.querySelectorAll('.conv-card').length > CONV_CARD_MAX) {
            const all = wrap.querySelectorAll('.conv-card');
            wrap.removeChild(all[all.length - 1]);
        }
        updateConvChrome();
        if (!restoringConv) persistConvCards();
    }

    (function initConvCardUi() {
        const wrap = document.getElementById('conv-cards');
        const toolbar = document.getElementById('conv-toolbar');
        if (!wrap || !toolbar) return;
        ensureConvEmptyHint(wrap);

        wrap.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('conv-cb')) {
                updateConvChrome();
            }
        });

        wrap.addEventListener('click', function (e) {
            const t = e.target;
            if (t.classList.contains('conv-copy')) {
                const card = t.closest('.conv-card');
                if (!card) return;
                const timeEl = card.querySelector('time');
                const ts = timeEl ? timeEl.textContent.trim() : '';
                const moodEl = card.querySelector('.conv-mood-tag');
                const moodZh = moodEl ? moodEl.textContent.trim() : '';
                const user = card.querySelector('.conv-card-user');
                const main = card.querySelector('.conv-reply-main');
                const hint = card.querySelector('.conv-reply-hint');
                const text = buildConvCardCopyText(
                    ts,
                    moodZh,
                    user ? user.textContent.trim() : '',
                    main ? main.textContent.trim() : '',
                    hint ? hint.textContent.trim() : ''
                );
                copyTextToClipboard(text).then(function () {
                    const prev = t.textContent;
                    t.textContent = '已复制';
                    setTimeout(function () {
                        t.textContent = prev;
                    }, 1400);
                });
                return;
            }
            if (t.classList.contains('conv-del-one')) {
                const card = t.closest('.conv-card');
                if (card) {
                    card.remove();
                    ensureConvEmptyHint(wrap);
                    updateConvChrome();
                    persistConvCards();
                }
            }
        });

        document.getElementById('conv-select-all').addEventListener('click', function () {
            const cards = getConvCardEls();
            if (!cards.length) return;
            let allOn = true;
            cards.forEach(function (card) {
                const cb = card.querySelector('.conv-cb');
                if (cb && !cb.checked) allOn = false;
            });
            const next = !allOn;
            cards.forEach(function (card) {
                const cb = card.querySelector('.conv-cb');
                if (cb) cb.checked = next;
            });
            updateConvChrome();
        });

        document.getElementById('conv-delete-sel').addEventListener('click', function () {
            const cards = Array.prototype.slice.call(getConvCardEls());
            let n = 0;
            cards.forEach(function (card) {
                const cb = card.querySelector('.conv-cb');
                if (cb && cb.checked) {
                    card.remove();
                    n++;
                }
            });
            if (n) {
                ensureConvEmptyHint(wrap);
                updateConvChrome();
                persistConvCards();
            }
        });

        document.getElementById('conv-clear-all').addEventListener('click', function () {
            if (!getConvCardEls().length) return;
            if (!confirm('确定清空全部对话卡片？')) return;
            wrap.querySelectorAll('.conv-card').forEach(function (c) {
                c.remove();
            });
            ensureConvEmptyHint(wrap);
            updateConvChrome();
            persistConvCards();
        });

        restoringConv = true;
        try {
            const raw = localStorage.getItem(CONV_STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    for (let ri = 0; ri < arr.length; ri++) {
                        const it = arr[ri];
                        if (it && it.userText != null) {
                            appendConvCard(
                                it.userText,
                                it.mood || 'calm',
                                it.mainLine || '',
                                it.hintLine || '',
                                it.iso
                            );
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }
        restoringConv = false;
        persistConvCards();

        updateConvChrome();
        updateGardenStatusPill();
    })();
    async function handleEmotion() {
        const input = document.getElementById('emotion-input');
        const statusEl = document.getElementById('ai-status');
        if (!input.value.trim()) return;

        const raw = input.value.trim();
        const mood = await mockAIAnalyze(raw);
        setMood(mood);
        const lines = statusLines[mood] || statusLines.calm;
        statusEl.innerHTML = lines.main + '<span class="hint">' + lines.hint + '</span>';
        appendConvCard(raw, mood, lines.main, lines.hint);
        input.value = '';
        setPourOpen(true);
        pourBackdropSuppressUntil = performance.now() + 480;
        input.focus();
    }

    document.getElementById('send-btn').addEventListener('click', handleEmotion);
    const btnEnterPour = document.getElementById('btn-enter-pour');
    if (btnEnterPour) btnEnterPour.addEventListener('click', enterPourMode);
    const btnBackGarden = document.getElementById('btn-back-garden');
    if (btnBackGarden) btnBackGarden.addEventListener('click', backToGarden);
    initDiaryUi();
    initLifeTreeModalUi();
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('life-tree-modal-open')) {
            e.preventDefault();
            closeLifeTreeModal();
            return;
        }
        if (e.key === 'Escape' && document.body.classList.contains('diary-modal-open')) {
            e.preventDefault();
            closeDiaryModal();
            return;
        }
        if (e.key === 'Escape' && document.body.classList.contains('pour-open')) {
            e.preventDefault();
            setPourOpen(false);
            return;
        }
        if (e.key === 'Enter' && !e.repeat) {
            const t = e.target;
            if (t && t.id === 'emotion-input') {
                e.preventDefault();
                handleEmotion();
            }
        }
    });

    window.addEventListener('resize', () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
    });
})();