(function () {
    'use strict';
    var C = window.MentalLightConfig;
    var DIARY_STORAGE_KEY = C.DIARY_STORAGE_KEY;
    var DIARY_STARS_TOTAL_KEY = C.DIARY_STARS_TOTAL_KEY;
    var DIARY_MAX_ENTRIES = C.DIARY_MAX_ENTRIES;
    var DIARY_MAX_IMAGES = C.DIARY_MAX_IMAGES;

    function mlCore() { return window.MentalLightCoreApi; }
    function notifyGardenFull() {
        var a = mlCore();
        if (!a) return;
        if (a.updateGardenStatusPill) a.updateGardenStatusPill();
        if (a.scheduleTreeRebuild) a.scheduleTreeRebuild();
        if (a.refreshLifeTreeModalIfOpen) a.refreshLifeTreeModalIfOpen();
    }
    function notifyGardenPill() {
        var a = mlCore();
        if (a && a.updateGardenStatusPill) a.updateGardenStatusPill();
    }

var diaryDraftImages = [];
var DIARY_MOODS = ['calm', 'sad', 'angry', 'joy', 'anxious', 'tired', 'fearful', 'hopeful', 'warm', 'jealous'];
var diaryOpenContext = { mood: 'calm', source: 'garden' };

function clearDiarySkin() {
    var m = document.getElementById('diary-modal');
    if (!m) return;
    for (var i = 0; i < DIARY_MOODS.length; i++) {
        m.classList.remove('diary-skin-' + DIARY_MOODS[i]);
    }
}

function applyDiarySkin(mood) {
    clearDiarySkin();
    var modal = document.getElementById('diary-modal');
    var key = mood && DIARY_MOODS.indexOf(mood) >= 0 ? mood : 'calm';
    if (modal) modal.classList.add('diary-skin-' + key);
}

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

function openDiaryModal(opts) {
    opts = opts || {};
    diaryOpenContext = {
        mood: opts.mood || 'calm',
        source: opts.source || 'garden'
    };
    var M = (window.MentalLightMood && window.MentalLightMood.MOOD_ZH) || {};
    var zh = M[diaryOpenContext.mood] || '平静';
    var titleEl = document.getElementById('diary-modal-title');
    if (titleEl) {
        titleEl.textContent =
            diaryOpenContext.source === 'pour' ? zh + ' · 心事日记本' : '灵感花园 · 小记';
    }
    applyDiarySkin(diaryOpenContext.mood);
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
    clearDiarySkin();
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
        let srcTag = '';
        if (it.journalSource === 'pour') {
            const MZ = window.MentalLightMood && window.MentalLightMood.MOOD_ZH;
            const mz = MZ && it.journalMood ? MZ[it.journalMood] : '';
            srcTag = mz ? ' · ' + mz + '心事本' : ' · 倾诉日记';
        } else if (it.journalSource === 'garden') {
            srcTag = ' · 花园';
        }
        meta.textContent = (formatDiaryTime(it.iso) || '日记') + srcTag;
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
            notifyGardenFull();
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
        journalMood: diaryOpenContext.mood,
        journalSource: diaryOpenContext.source,
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
    notifyGardenFull();
    closeDiaryModal();
}

function initDiaryUi() {
    const openBtn = document.getElementById('btn-open-diary');
    if (openBtn) {
        openBtn.addEventListener('click', function () {
            openDiaryModal();
        });
    }
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

    function openPourDiary() {
        var a = mlCore();
        var mood = a && a.getCurrentMood ? a.getCurrentMood() : 'calm';
        openDiaryModal({ mood: mood, source: 'pour' });
    }

    window.MentalLightDiary = {
        loadDiaries: loadDiaries,
        loadDiaryTotalStars: loadDiaryTotalStars,
        initDiaryUi: initDiaryUi,
        openDiaryModal: openDiaryModal,
        openPourDiary: openPourDiary,
        closeDiaryModal: closeDiaryModal
    };
})();
