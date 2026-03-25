// 获取 UI 元素（假设你已经写了对应的 HTML 输入框和按钮）
const inputBtn = document.getElementById('send-btn');
const inputField = document.getElementById('emotion-input');

inputBtn.onclick = () => {
    const text = inputField.value;
    let mood = 'calm';
    
    // 简单的关键词匹配识别（比赛演示用）
    if(text.includes('气') || text.includes('火')) mood = 'angry';
    else if(text.includes('难过') || text.includes('哭')) mood = 'sad';
    else if(text.includes('开心') || text.includes('棒')) mood = 'joy';
    
    // 调用 App 实例的方法
    if(window.myApp) {
        window.myApp.updateMood(mood);
    }
};