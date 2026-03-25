(function () {
    'use strict';
    var C = window.MentalLightConfig;
    var MOOD_ZH = window.MentalLightMood.MOOD_ZH;

    function notifyCoreGarden() {
        var a = window.MentalLightCoreApi;
        if (!a) return;
        if (a.updateGardenStatusPill) a.updateGardenStatusPill();
        if (a.scheduleTreeRebuild) a.scheduleTreeRebuild();
        if (a.refreshLifeTreeModalIfOpen) a.refreshLifeTreeModalIfOpen();
    }

/** 侧栏打开后短窗内忽略遮罩点击，避免「发送」等操作后误触关闭 */
var pourBackdropSuppressUntil = 0;
var moodBgLoadToken = 0;

function ensureEnterPourMode(reason) {
    // 有些情况下 CoreApi 初始化慢，第一次点“倾诉”可能没切到倾诉态
    var tries = 0;
    var maxTries = 20; // ~1s
    var tick = function () {
        tries++;
        if (!document.body.classList.contains('pour-open')) return;
        if (document.body.classList.contains('app-view-pour')) return;
        var api = window.MentalLightCoreApi;
        if (api && api.enterPourMode) {
            try {
                api.enterPourMode();
            } catch (e) {
                console.error(e);
            }
        }
        if (!document.body.classList.contains('app-view-pour') && tries < maxTries) {
            setTimeout(tick, 50);
        } else if (!document.body.classList.contains('app-view-pour')) {
            var st = document.getElementById('ai-status');
            if (st) {
                st.innerHTML =
                    '倾诉场景未进入（' +
                    escapeHtml(reason || 'unknown') +
                    '）。<span class="hint">请刷新或稍后重试</span>';
            }
        }
    };
    setTimeout(tick, 0);
}

function setPourOpen(open) {
    document.body.classList.toggle('pour-open', open);
    const tab = document.getElementById('pour-tab');
    const bd = document.getElementById('pour-backdrop');
    if (open) {
        pourBackdropSuppressUntil = performance.now() + 420;
        ensureEnterPourMode('open-panel');
    }
    if (tab) {
        tab.setAttribute('aria-expanded', open ? 'true' : 'false');
        tab.textContent = open ? '收起' : '倾诉';
    }
    if (bd) bd.setAttribute('aria-hidden', open ? 'false' : 'true');
}

/** scene-tree 的 enterPourMode / backToGarden 需同步侧栏，setPourOpen 不在全局作用域 */
window.MentalLightPourUi = { setPourOpen: setPourOpen };

(function initPourShell() {
    const tab = document.getElementById('pour-tab');
    const bd = document.getElementById('pour-backdrop');
    if (tab) {
        tab.addEventListener('click', function (e) {
            e.stopPropagation();
            const open = document.body.classList.contains('pour-open');
            if (open) {
                setPourOpen(false);
                return;
            }
            if (document.body.classList.contains('app-view-home')) {
                if (window.MentalLightCoreApi && window.MentalLightCoreApi.enterPourMode) {
                    window.MentalLightCoreApi.enterPourMode();
                    return;
                }
                /* 禁止在首页只开侧栏不进倾诉场景，否则会出现光之书仍在、底图全黑 */
                return;
            }
            setPourOpen(true);
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

function applyMoodBackgroundFallback(mood) {
    // 背景切换兜底：即使 3D CoreApi 未及时就绪，也能切换 #mood-bg
    try {
        ensureEnterPourMode('apply-bg');

        // 只要倾诉侧栏开着或处在倾诉视图，就允许切背景；必要时强制切到 app-view-pour
        if (!document.body.classList.contains('pour-open') && !document.body.classList.contains('app-view-pour')) return;
        document.body.classList.remove('app-view-home');
        document.body.classList.add('app-view-pour');
        var cfg = window.MentalLightConfig;
        var layer = document.getElementById('mood-bg');
        var imgUrl = cfg && cfg.MOOD_BACKGROUND_IMAGES ? cfg.MOOD_BACKGROUND_IMAGES[mood] : '';
        var moods = ['calm', 'sad', 'angry', 'joy', 'anxious', 'tired', 'hopeful', 'fearful', 'warm', 'jealous'];
        for (var i = 0; i < moods.length; i++) document.body.classList.remove('mood-' + moods[i]);
        document.body.classList.add('mood-' + (mood || 'calm'));
        document.body.classList.toggle('mood-bg-on', !!imgUrl);
        if (layer) {
            if (imgUrl) {
                var clean = String(imgUrl).replace(/"/g, '');
                var abs = '';
                try {
                    abs = new URL(clean, window.location.href).toString();
                } catch (e) {
                    abs = clean;
                }
                layer.style.backgroundImage = 'url("' + abs + '")';

                // 无 DevTools 自检：预加载失败会在 ai-status 给提示（带重试，避免网络抖动误报）
                var st = document.getElementById('ai-status');
                var token = ++moodBgLoadToken;
                var tries = 0;
                var maxTries = 3;
                function clearFailHint() {
                    if (st && st.innerHTML.indexOf('背景图加载失败') >= 0) {
                        st.innerHTML = st.innerHTML.replace(/<span class="hint">背景图加载失败.*?<\/span>/g, '');
                    }
                }
                function setFailHint() {
                    if (!st) return;
                    clearFailHint();
                    st.innerHTML =
                        st.innerHTML +
                        '<span class="hint">背景图加载失败：' +
                        escapeHtml(clean) +
                        '</span>';
                }
                function tryLoad() {
                    tries++;
                    var img = new Image();
                    img.onload = function () {
                        if (token !== moodBgLoadToken) return;
                        clearFailHint();
                    };
                    img.onerror = function () {
                        if (token !== moodBgLoadToken) return;
                        if (tries < maxTries) {
                            setTimeout(tryLoad, 350);
                            return;
                        }
                        setFailHint();
                    };
                    // 轻量 cache-bust：重试时追加参数，避免偶发缓存/连接中断
                    var u = abs;
                    if (tries > 1) {
                        u = abs + (abs.indexOf('?') >= 0 ? '&' : '?') + 'retry=' + tries + '&t=' + Date.now();
                    }
                    img.src = u;
                }
                tryLoad();
            } else {
                layer.style.backgroundImage = 'none';
            }
        }
    } catch (e) {
        console.error(e);
    }
}

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
        localStorage.setItem(C.CONV_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) { /* ignore */ }
    notifyCoreGarden();
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
    while (wrap.querySelectorAll('.conv-card').length > C.CONV_CARD_MAX) {
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
        const raw = localStorage.getItem(C.CONV_STORAGE_KEY);
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
    notifyCoreGarden();
})();
async function handleEmotion() {
    const input = document.getElementById('emotion-input');
    const statusEl = document.getElementById('ai-status');
    if (!input || !input.value.trim()) return;

    if (document.body.classList.contains('app-view-home')) {
        const api = window.MentalLightCoreApi;
        if (api && api.enterPourMode) {
            api.enterPourMode();
        } else {
            if (statusEl) {
                statusEl.innerHTML =
                    '场景未就绪（请刷新页面或检查网络能否加载 Three.js）。<span class="hint">无法分析</span>';
            }
            return;
        }
    }

    const raw = input.value.trim();
    let mood = 'calm';
    try {
        mood = await window.MentalLightMood.mockAIAnalyze(raw);
    } catch (e) {
        console.error(e);
        if (statusEl) {
            statusEl.innerHTML =
                '分析失败（已捕获异常，请重试）。<span class="hint">已退出等待</span>';
        }
        return;
    }
    const lines = window.MentalLightMood.statusLines[mood] || window.MentalLightMood.statusLines.calm;
    const moodZh = MOOD_ZH[mood] || mood;

    // 核心 API 可能在某些“半加载/切换时序”情况下还没就绪；
    // 但用户至少应该看到“识别结果”和对话卡片，而不是一直卡在“分析中”。
    if (statusEl) {
        statusEl.innerHTML =
            '<span class="ai-mood-detected">感知情绪：<strong>' +
            escapeHtml(moodZh) +
            '</strong></span>' +
            lines.main +
            '<span class="hint">' +
            escapeHtml(lines.hint) +
            '</span>';
    }
    appendConvCard(raw, mood, lines.main, lines.hint);
    applyMoodBackgroundFallback(mood);

    if (window.MentalLightCoreApi && window.MentalLightCoreApi.setMood) {
        window.MentalLightCoreApi.setMood(mood);
    } else {
        console.warn('MentalLightCoreApi.setMood not ready');
    }
    input.value = '';
    setPourOpen(true);
    pourBackdropSuppressUntil = performance.now() + 480;
    input.focus();
}

var sendBtn = document.getElementById('send-btn');
if (sendBtn) sendBtn.addEventListener('click', handleEmotion);
const btnEnterPour = document.getElementById('btn-enter-pour');
if (btnEnterPour && window.MentalLightCoreApi) {
    btnEnterPour.addEventListener('click', function () {
        if (window.MentalLightCoreApi.enterPourMode) window.MentalLightCoreApi.enterPourMode();
    });
}
function bindBackToGarden(btn) {
    if (!btn || !window.MentalLightCoreApi) return;
    btn.addEventListener('click', function () {
        if (window.MentalLightCoreApi.backToGarden) window.MentalLightCoreApi.backToGarden();
    });
}
bindBackToGarden(document.getElementById('btn-back-garden'));
bindBackToGarden(document.getElementById('btn-end-pour'));
if (window.MentalLightDiary && window.MentalLightDiary.initDiaryUi) {
    window.MentalLightDiary.initDiaryUi();
}
function openPourDiarySafe(e) {
    if (e) e.preventDefault();
    if (window.MentalLightDiary && window.MentalLightDiary.openPourDiary) {
        window.MentalLightDiary.openPourDiary();
    }
}
var btnPourDiary = document.getElementById('btn-pour-diary');
if (btnPourDiary) {
    btnPourDiary.addEventListener('click', openPourDiarySafe);
}
window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('diary-modal-open')) {
        e.preventDefault();
        if (window.MentalLightDiary && window.MentalLightDiary.closeDiaryModal) {
            window.MentalLightDiary.closeDiaryModal();
        }
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

})();
