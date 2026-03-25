(function () {
    'use strict';
    var el = document.getElementById('ml-boot-error');
    function showBootErr(msg) {
        if (el) {
            el.hidden = false;
            el.textContent = msg;
        }
        console.error(msg);
    }
    if (typeof THREE === 'undefined') {
        showBootErr('未能加载 Three.js（请检查网络）。请用本地静态服务器打开本站并允许加载 CDN。');
        return;
    }
    var OrbitCtor = THREE.OrbitControls;
    if (typeof OrbitCtor !== 'function') {
        showBootErr('未能加载 OrbitControls。请刷新页面或检查网络。');
        return;
    }
    if (!window.MentalLightBook || typeof window.MentalLightBook.create !== 'function') {
        showBootErr('未能加载光之书模块（book-of-light.js）。请检查页面脚本顺序。');
        return;
    }
    var C = window.MentalLightConfig;
    var N = C.N;
let currentMood = 'calm';
let appView = 'home';
function syncPourPanelOpen(open) {
    const ui = window.MentalLightPourUi;
    if (ui && typeof ui.setPourOpen === 'function') {
        ui.setPourOpen(open);
    } else {
        document.body.classList.toggle('pour-open', open);
    }
}
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

const controls = new OrbitCtor(camera, renderer.domElement);
camera.position.set(0, 0.4, 10);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 22;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;

const raycaster = new THREE.Raycaster();

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

var bookApi = window.MentalLightBook.create(scene, THREE, texParticle);
var bookRebuildRaf = 0;

function getPourCountFromStorage() {
    try {
        const raw = localStorage.getItem(C.CONV_STORAGE_KEY);
        if (!raw) return 0;
        const a = JSON.parse(raw);
        return Array.isArray(a) ? a.length : 0;
    } catch (e) {
        return 0;
    }
}

function getLifeTreeGrowthScore() {
    const pour = getPourCountFromStorage();
    let diaryN = 0;
    let stars = 0;
    try {
        diaryN = window.MentalLightDiary.loadDiaries().length;
    } catch (e) { /* ignore */ }
    try {
        stars = window.MentalLightDiary.loadDiaryTotalStars();
    } catch (e) { /* ignore */ }
    return pour * 4.6 + diaryN * 2.2 + Math.min(160, stars) * 0.11;
}

function getLifeTreeProgressPercent() {
    const s = getLifeTreeGrowthScore();
    return Math.min(100, Math.round(100 * (1 - Math.exp(-s / 72))));
}

function scheduleTreeRebuild() {
    if (bookRebuildRaf) cancelAnimationFrame(bookRebuildRaf);
    bookRebuildRaf = requestAnimationFrame(function () {
        bookRebuildRaf = 0;
        const s = getLifeTreeGrowthScore();
        const mul = Math.max(0.85, Math.min(1.45, 0.9 + Math.min(0.52, s / 200)));
        bookApi.setGrowthMul(mul);
    });
}

function updateGardenStatusPill() {
    const el = document.getElementById('garden-status-pill');
    if (!el) return;
    const pour = getPourCountFromStorage();
    let diaryN = 0;
    try {
        diaryN = window.MentalLightDiary.loadDiaries().length;
    } catch (e) { /* ignore */ }
    const pct = getLifeTreeProgressPercent();
    if (pour === 0 && diaryN === 0) {
        el.textContent = '光之书 0% · 去倾诉或写日记，让微光更盛';
    } else {
        el.textContent =
            '光之书 ' + pct + '% · 倾诉 ' + pour + ' · 日记 ' + diaryN + ' · 书页随养分更亮';
    }
}

function refreshLifeTreeModalIfOpen() {}

function closeLifeTreeModal() {}

function initLifeTreeModalUi() {}

function setSceneMood(mood) {
    const p = moodPalettes[mood] || moodPalettes.calm;
    const inPour = document.body.classList.contains('app-view-pour');
    scene.fog = new THREE.Fog(p.fog, p.near * (inPour ? 1.05 : 0.92), p.far * (inPour ? 1.35 : 1.1));
    renderer.setClearColor(new THREE.Color(p.fog), 0);
    scene.background = null;
    mat.size = p.size;
    const baseOp = Math.min(1, (p.opacity != null ? p.opacity : 0.92) * 1.06);
    const pourDim = mood === 'calm' || mood === 'hopeful' ? 0.7 : 0.63;
    mat.opacity = inPour ? baseOp * pourDim : baseOp;
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
    const imgUrl = C.MOOD_BACKGROUND_IMAGES[mood];
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
    applyBodyTheme(mood);
    initParticles(mood);
    if (window.MentalLightLiteraryQuotes && window.MentalLightLiteraryQuotes.onMoodChange) {
        window.MentalLightLiteraryQuotes.onMoodChange(mood);
    }
}

points.visible = false;
bookApi.group.visible = true;
scene.fog = null;
renderer.setClearColor(0x000000, 1);
camera.position.set(0, 0.25, 12.2);
controls.target.set(0, 0.45, 0);
controls.autoRotateSpeed = 0.14;
scheduleTreeRebuild();
updateGardenStatusPill();

function enterPourMode() {
    if (window.MentalLightDiary && window.MentalLightDiary.closeDiaryModal) {
        window.MentalLightDiary.closeDiaryModal();
    }
    appView = 'pour';
    document.body.classList.remove('app-view-home');
    document.body.classList.add('app-view-pour');
    const gh = document.getElementById('garden-home');
    if (gh) gh.setAttribute('aria-hidden', 'true');
    points.visible = true;
    bookApi.group.visible = false;
    setMood(currentMood);
    applyBodyTheme(currentMood);
    renderer.setClearColor(0x000000, 0);
    syncPourPanelOpen(true);
    const stEl = document.getElementById('ai-status');
    if (stEl && window.MentalLightMood && window.MentalLightMood.statusLines) {
        const m = currentMood;
        const zh = (window.MentalLightMood.MOOD_ZH && window.MentalLightMood.MOOD_ZH[m]) || m;
        const L = window.MentalLightMood.statusLines[m] || window.MentalLightMood.statusLines.calm;
        stEl.innerHTML =
            '<span class="ai-mood-detected">当前氛围：<strong>' +
            zh +
            '</strong></span>' +
            L.main +
            '<span class="hint">' +
            L.hint +
            '</span>';
    }
}

function backToGarden() {
    appView = 'home';
    syncPourPanelOpen(false);
    document.body.classList.remove('app-view-pour');
    document.body.classList.add('app-view-home');
    const gh = document.getElementById('garden-home');
    if (gh) gh.setAttribute('aria-hidden', 'false');
    points.visible = false;
    bookApi.group.visible = true;
    scene.fog = null;
    renderer.setClearColor(0x000000, 1);
    camera.position.set(0, 0.25, 12.2);
    controls.target.set(0, 0.45, 0);
    controls.autoRotateSpeed = 0.14;
    {
        const p = moodPalettes[currentMood] || moodPalettes.calm;
        mat.opacity = Math.min(1, (p.opacity != null ? p.opacity : 0.92) * 1.06);
        mat.needsUpdate = true;
    }
    applyBodyTheme(currentMood);
    scheduleTreeRebuild();
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
    // 兜底：DOM 视图已切到倾诉，但内部 appView 仍停在 home，会导致光之书继续渲染并盖住底图
    if (appView === 'home' && (document.body.classList.contains('app-view-pour') || document.body.classList.contains('pour-open'))) {
        appView = 'pour';
        points.visible = true;
        bookApi.group.visible = false;
        renderer.setClearColor(0x000000, 0);
    }
    if (appView === 'home') {
        bookApi.step(dt, time);
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

    window.addEventListener('resize', function () {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
    });

    window.MentalLightCoreApi = {
        setMood: setMood,
        getCurrentMood: function () {
            return currentMood;
        },
        enterPourMode: enterPourMode,
        backToGarden: backToGarden,
        updateGardenStatusPill: updateGardenStatusPill,
        scheduleTreeRebuild: scheduleTreeRebuild,
        refreshLifeTreeModalIfOpen: refreshLifeTreeModalIfOpen,
        initLifeTreeModalUi: initLifeTreeModalUi,
        closeLifeTreeModal: closeLifeTreeModal
    };

    /**
     * 兜底：有时用户先点右侧倾诉侧栏（pour-open 已开），但场景还未切到 app-view-pour。
     * 这会导致 applyBodyTheme() 在 app-view-home 分支直接清空 #mood-bg，表现为“背景不对/像卡住”。
     */
    if (document.body.classList.contains('pour-open') && document.body.classList.contains('app-view-home')) {
        try {
            enterPourMode();
        } catch (e) {
            // 不影响主流程；让 Console 暴露错误
            console.error(e);
        }
    }
})();
