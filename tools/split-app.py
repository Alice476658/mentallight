# -*- coding: utf-8 -*-
"""Split js/app.js into js/mental-light/*.js — run: python tools/split-app.py"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ML = ROOT / "js" / "mental-light"
ML.mkdir(parents=True, exist_ok=True)
lines = (ROOT / "js" / "app.js").read_text(encoding="utf-8").splitlines(keepends=True)


def join_slice(a, b):
    return "".join(lines[a:b])


def unindent_four(s):
    out = []
    for ln in s.splitlines(keepends=True):
        out.append(ln[4:] if ln.startswith("    ") else ln)
    return "".join(out)


# --- config.js ---
(ML / "config.js").write_text(
    """/* 全局配置与存储键 */
(function () {
    'use strict';
    window.MentalLightConfig = {
        N: 4200,
        CONV_STORAGE_KEY: 'mentallight_conv_v1',
        TREE_STORAGE_KEY: 'mentallight_tree_params_v1',
        DIARY_STORAGE_KEY: 'mentallight_garden_diary_v1',
        DIARY_STARS_TOTAL_KEY: 'mentallight_stars_total_v1',
        CONV_CARD_MAX: 60,
        DIARY_MAX_ENTRIES: 48,
        DIARY_MAX_IMAGES: 6,
        MOOD_BACKGROUND_IMAGES: {
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
        }
    };
})();
""",
    encoding="utf-8",
)

# mood: 1-based 2099–2214 => indices 2098:2214 (incl. comment … MOOD_ZH)
mood_inner = unindent_four(join_slice(2098, 2214))
(ML / "mood-detect.js").write_text(
    f"""(function () {{
    'use strict';
{mood_inner}
    window.MentalLightMood = {{
        detectMood: detectMood,
        mockAIAnalyze: mockAIAnalyze,
        statusLines: statusLines,
        MOOD_ZH: MOOD_ZH
    }};
}})();
""",
    encoding="utf-8",
)

# diary: 758–1114 1-based (skip DIARY_MAX_* — declared in wrapper) => 757:1114
diary_body = unindent_four(join_slice(757, 1114))
diary_body = diary_body.replace(
    "        updateGardenStatusPill();\n        scheduleTreeRebuild();\n        refreshLifeTreeModalIfOpen();",
    "        notifyGardenFull();",
)
diary_body = diary_body.replace("        updateGardenStatusPill();", "        notifyGardenPill();")
(ML / "garden-diary.js").write_text(
    f"""(function () {{
    'use strict';
    var C = window.MentalLightConfig;
    var DIARY_STORAGE_KEY = C.DIARY_STORAGE_KEY;
    var DIARY_STARS_TOTAL_KEY = C.DIARY_STARS_TOTAL_KEY;
    var DIARY_MAX_ENTRIES = C.DIARY_MAX_ENTRIES;
    var DIARY_MAX_IMAGES = C.DIARY_MAX_IMAGES;

    function mlCore() {{ return window.MentalLightCoreApi; }}
    function notifyGardenFull() {{
        var a = mlCore();
        if (!a) return;
        if (a.updateGardenStatusPill) a.updateGardenStatusPill();
        if (a.scheduleTreeRebuild) a.scheduleTreeRebuild();
        if (a.refreshLifeTreeModalIfOpen) a.refreshLifeTreeModalIfOpen();
    }}
    function notifyGardenPill() {{
        var a = mlCore();
        if (a && a.updateGardenStatusPill) a.updateGardenStatusPill();
    }}

{diary_body}
    window.MentalLightDiary = {{
        loadDiaries: loadDiaries,
        loadDiaryTotalStars: loadDiaryTotalStars,
        initDiaryUi: initDiaryUi,
        closeDiaryModal: closeDiaryModal
    }};
}})();
""",
    encoding="utf-8",
)

# scene: lines 7–8 + 24–2097 (1-based) => 6:8 + 23:2097
scene_body = join_slice(6, 8) + join_slice(23, 2097)
for old, new in [
    ("localStorage.getItem(CONV_STORAGE_KEY)", "localStorage.getItem(C.CONV_STORAGE_KEY)"),
    ("localStorage.setItem(CONV_STORAGE_KEY", "localStorage.setItem(C.CONV_STORAGE_KEY"),
    ("localStorage.getItem(TREE_STORAGE_KEY)", "localStorage.getItem(C.TREE_STORAGE_KEY)"),
    ("localStorage.setItem(TREE_STORAGE_KEY", "localStorage.setItem(C.TREE_STORAGE_KEY"),
    ("MOOD_BACKGROUND_IMAGES", "C.MOOD_BACKGROUND_IMAGES"),
]:
    scene_body = scene_body.replace(old, new)
scene_body = scene_body.replace(
    "diaryN = loadDiaries().length;",
    "diaryN = window.MentalLightDiary.loadDiaries().length;",
)
scene_body = scene_body.replace(
    "stars = loadDiaryTotalStars();",
    "stars = window.MentalLightDiary.loadDiaryTotalStars();",
)
if "particleDensity:" not in scene_body:
    scene_body = scene_body.replace(
        "        crown4: 125\n    };",
        """        crown4: 125,
        particleDensity: 1,
        branchSpread: 0.58,
        canopySpread: 1,
        bloomGlow: 1,
        shimmerSpeed: 1,
        colorHue: 0,
        mirrorSymmetry: 1
    };""",
    )
scene_body = scene_body.replace(
    "const controls = new THREE.OrbitControls(camera, renderer.domElement);",
    "const controls = new OrbitCtor(camera, renderer.domElement);",
)
scene_body = unindent_four(scene_body)

scene_js = (
    """(function () {
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
    var C = window.MentalLightConfig;
    var N = C.N;
"""
    + scene_body
    + """
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
        enterPourMode: enterPourMode,
        backToGarden: backToGarden,
        updateGardenStatusPill: updateGardenStatusPill,
        scheduleTreeRebuild: scheduleTreeRebuild,
        refreshLifeTreeModalIfOpen: refreshLifeTreeModalIfOpen,
        initLifeTreeModalUi: initLifeTreeModalUi,
        closeLifeTreeModal: closeLifeTreeModal
    };
})();
"""
)
(ML / "scene-tree.js").write_text(scene_js, encoding="utf-8")

# pour: 2216–2622 1-based (skip resize) => indices 2215:2622
pour_body = unindent_four(join_slice(2215, 2622))
pour_body = pour_body.replace("const CONV_CARD_MAX = 60;\n", "")
pour_body = pour_body.replace(
    "while (wrap.querySelectorAll('.conv-card').length > CONV_CARD_MAX)",
    "while (wrap.querySelectorAll('.conv-card').length > C.CONV_CARD_MAX)",
)
pour_body = pour_body.replace("localStorage.getItem(CONV_STORAGE_KEY)", "localStorage.getItem(C.CONV_STORAGE_KEY)")
pour_body = pour_body.replace("localStorage.setItem(CONV_STORAGE_KEY", "localStorage.setItem(C.CONV_STORAGE_KEY")
pour_body = pour_body.replace(
    "        updateGardenStatusPill();\n        scheduleTreeRebuild();\n        refreshLifeTreeModalIfOpen();",
    "        notifyCoreGarden();",
)
pour_body = pour_body.replace("        updateGardenStatusPill();", "        notifyCoreGarden();")
pour_body = pour_body.replace("await mockAIAnalyze(raw)", "await window.MentalLightMood.mockAIAnalyze(raw)")
pour_body = pour_body.replace(
    "const lines = statusLines[mood] || statusLines.calm;",
    "const lines = window.MentalLightMood.statusLines[mood] || window.MentalLightMood.statusLines.calm;",
)
pour_body = pour_body.replace("setMood(mood);", "window.MentalLightCoreApi.setMood(mood);")
pour_body = pour_body.replace(
    "if (btnEnterPour) btnEnterPour.addEventListener('click', enterPourMode);",
    "if (btnEnterPour) btnEnterPour.addEventListener('click', function () { window.MentalLightCoreApi.enterPourMode(); });",
)
pour_body = pour_body.replace(
    "if (btnBackGarden) btnBackGarden.addEventListener('click', backToGarden);",
    "if (btnBackGarden) btnBackGarden.addEventListener('click', function () { window.MentalLightCoreApi.backToGarden(); });",
)
pour_body = pour_body.replace("initDiaryUi();", "window.MentalLightDiary.initDiaryUi();")
pour_body = pour_body.replace("initLifeTreeModalUi();", "window.MentalLightCoreApi.initLifeTreeModalUi();")
pour_body = pour_body.replace(
    "closeLifeTreeModal();",
    "window.MentalLightCoreApi.closeLifeTreeModal();",
)
pour_body = pour_body.replace("closeDiaryModal();", "window.MentalLightDiary.closeDiaryModal();")

(ML / "pour-conv.js").write_text(
    f"""(function () {{
    'use strict';
    var C = window.MentalLightConfig;
    var MOOD_ZH = window.MentalLightMood.MOOD_ZH;

    function notifyCoreGarden() {{
        var a = window.MentalLightCoreApi;
        if (!a) return;
        if (a.updateGardenStatusPill) a.updateGardenStatusPill();
        if (a.scheduleTreeRebuild) a.scheduleTreeRebuild();
        if (a.refreshLifeTreeModalIfOpen) a.refreshLifeTreeModalIfOpen();
    }}
{pour_body}
}})();
""",
    encoding="utf-8",
)

print("ok: js/mental-light/config.js … pour-conv.js")
