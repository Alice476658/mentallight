/* 全局配置与存储键 */
(function () {
    'use strict';

    /** 内联 SVG 作兜底底图，避免 assets 缺失导致倾诉页纯黑 */
    function moodSvg(inner) {
        return (
            'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice">' +
                    inner +
                    '<rect width="800" height="1200" fill="url(#mlbg)"/></svg>'
            )
        );
    }

    var MOOD_BG_FALLBACK = {
        calm: moodSvg(
            '<defs><radialGradient id="mlbg" cx="32%" cy="20%" r="78%"><stop offset="0%" stop-color="#4eb8d8"/><stop offset="42%" stop-color="#1a3a58"/><stop offset="100%" stop-color="#050a12"/></radialGradient></defs>'
        ),
        sad: moodSvg(
            '<defs><linearGradient id="mlbg" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#3d4f62"/><stop offset="55%" stop-color="#1a2430"/><stop offset="100%" stop-color="#0a0e14"/></linearGradient></defs>'
        ),
        angry: moodSvg(
            '<defs><radialGradient id="mlbg" cx="50%" cy="70%" r="90%"><stop offset="0%" stop-color="#2a1010"/><stop offset="40%" stop-color="#5c2018"/><stop offset="75%" stop-color="#1a0806"/><stop offset="100%" stop-color="#080404"/></radialGradient></defs>'
        ),
        joy: moodSvg(
            '<defs><radialGradient id="mlbg" cx="40%" cy="30%" r="85%"><stop offset="0%" stop-color="#f0a8d8"/><stop offset="35%" stop-color="#6eb8e8"/><stop offset="100%" stop-color="#1a2840"/></radialGradient></defs>'
        ),
        anxious: moodSvg(
            '<defs><linearGradient id="mlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3a2860"/><stop offset="50%" stop-color="#1a1430"/><stop offset="100%" stop-color="#0c0820"/></linearGradient></defs>'
        ),
        hopeful: moodSvg(
            '<defs><linearGradient id="mlbg" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#e8c878"/><stop offset="40%" stop-color="#5a7890"/><stop offset="100%" stop-color="#121820"/></linearGradient></defs>'
        ),
        fearful: moodSvg(
            '<defs><radialGradient id="mlbg" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="#1a3050"/><stop offset="100%" stop-color="#020408"/></radialGradient></defs>'
        ),
        warm: moodSvg(
            '<defs><radialGradient id="mlbg" cx="50%" cy="60%" r="80%"><stop offset="0%" stop-color="#6a4050"/><stop offset="50%" stop-color="#3a2832"/><stop offset="100%" stop-color="#120c10"/></radialGradient></defs>'
        )
    };

    window.MentalLightConfig = {
        N: 5800,
        CONV_STORAGE_KEY: 'mentallight_conv_v1',
        TREE_STORAGE_KEY: 'mentallight_tree_params_v1',
        DIARY_STORAGE_KEY: 'mentallight_garden_diary_v1',
        DIARY_STARS_TOTAL_KEY: 'mentallight_stars_total_v1',
        CONV_CARD_MAX: 60,
        DIARY_MAX_ENTRIES: 48,
        DIARY_MAX_IMAGES: 6,
        QUOTE_LIKES_STORAGE_KEY: 'mentallight_quote_likes_v1',
        MOOD_BACKGROUND_IMAGES: {
            // 优先使用 assets 里的摄影/插画底图；若你删了图片，仍有 SVG 兜底（色彩不会断层）
            calm: 'assets/bg-calm-sea.png',
            sad: MOOD_BG_FALLBACK.sad,
            angry: 'assets/bg-angry-volcano.png',
            joy: 'assets/bg-joy-spiral.png',
            anxious: 'assets/bg-anxious.png',
            tired: 'assets/bg-tired.svg',
            hopeful: MOOD_BG_FALLBACK.hopeful,
            fearful: 'assets/bg-fearful-forest-rain.png',
            warm: 'assets/bg-warm-water.png',
            jealous: 'assets/bg-jealous.png'
        }
    };
})();
