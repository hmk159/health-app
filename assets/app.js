const TYPE_LABELS = {
    'weight': '体重',
    'temperature': '体温',
    'blood-pressure': '血压',
    'heart-rate': '心率',
    'steps': '步数',
    'sleep': '睡眠',
    'water': '饮水',
    'symptom': '症状'
};

const TYPE_UNITS = {
    'weight': 'kg',
    'temperature': '°C',
    'blood-pressure': 'mmHg',
    'heart-rate': 'bpm',
    'steps': '步',
    'sleep': '小时',
    'water': 'ml',
    'symptom': ''
};

function loadRecords() {
    const data = localStorage.getItem('health_records');
    return data ? JSON.parse(data) : [];
}

function saveRecords(records) {
    localStorage.setItem('health_records', JSON.stringify(records));
}

function formatTime(ts) {
    const d = new Date(ts);
    return `${d.getMonth()+1}-${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderDashboard() {
    const records = loadRecords();
    const today = formatDate(Date.now());
    const todayRecords = records.filter(r => formatDate(r.time) === today);
    const latest = {};
    todayRecords.forEach(r => {
        if (!latest[r.type] || r.time > latest[r.type].time) latest[r.type] = r;
    });

    const container = document.getElementById('dashboard-cards');
    container.innerHTML = '';
    Object.keys(TYPE_LABELS).forEach(type => {
        const rec = latest[type];
        const value = rec ? (rec.value2 ? `${rec.value}/${rec.value2}` : rec.value) : '未记录';
        const unit = rec && !rec.value2 ? TYPE_UNITS[type] : '';
        container.innerHTML += `
            <div class="card">
                <div class="card-title">${TYPE_LABELS[type]}</div>
                <div class="card-value">${value}${unit}</div>
                <div class="card-sub">${rec ? formatTime(rec.time) : ''}</div>
            </div>
        `;
    });
}

function renderRecords() {
    const records = loadRecords().sort((a, b) => b.time - a.time);
    const container = document.getElementById('records-list');
    if (records.length === 0) {
        container.innerHTML = '<p style="color:#888;">暂无记录</p>';
        return;
    }
    container.innerHTML = records.map(r => {
        const value = r.value2 ? `${r.value}/${r.value2}` : `${r.value}${TYPE_UNITS[r.type]}`;
        return `
            <div class="record-item">
                <div class="record-header">
                    <span class="record-type">${TYPE_LABELS[r.type]}</span>
                    <span class="record-time">${formatTime(r.time)}</span>
                </div>
                <div>${value}</div>
                ${r.note ? `<div style="font-size:13px;color:#888;margin-top:4px;">${r.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderTrends() {
    const records = loadRecords();
    const container = document.getElementById('trends-list');
    const groups = {};
    records.forEach(r => {
        if (!groups[r.type]) groups[r.type] = [];
        groups[r.type].push(r);
    });

    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<p style="color:#888;">暂无足够数据</p>';
        return;
    }

    container.innerHTML = Object.keys(groups).map(type => {
        const list = groups[type].sort((a, b) => a.time - b.time);
        const values = list.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
        const last = values.length ? values[values.length - 1] : '-';
        const max = values.length ? Math.max(...values) : '-';
        const min = values.length ? Math.min(...values) : '-';
        return `
            <div class="trend-card">
                <div class="record-type">${TYPE_LABELS[type]}</div>
                <div style="margin-top:8px;">记录数：${list.length}</div>
                <div>最新：${last}${TYPE_UNITS[type]}　最高：${max}${TYPE_UNITS[type]}　最低：${min}${TYPE_UNITS[type]}</div>
            </div>
        `;
    }).join('');
}

function switchView(view) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.rail-item').forEach(el => el.classList.remove('active'));
    document.getElementById(view).classList.add('active');
    document.querySelector(`.rail-item[data-view="${view}"]`).classList.add('active');
    if (view === 'dashboard') renderDashboard();
    if (view === 'records') renderRecords();
    if (view === 'trends') renderTrends();
}

document.querySelectorAll('.rail-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
});

document.getElementById('add-btn').addEventListener('click', () => {
    document.getElementById('modal').classList.add('active');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
    document.getElementById('modal').classList.remove('active');
});

document.getElementById('type').addEventListener('change', (e) => {
    document.getElementById('value2-wrapper').style.display = e.target.value === 'blood-pressure' ? 'block' : 'none';
});

document.getElementById('save-btn').addEventListener('click', () => {
    const type = document.getElementById('type').value;
    const value = document.getElementById('value').value;
    const value2 = document.getElementById('value2').value;
    const note = document.getElementById('note').value;
    if (!value) return;

    const records = loadRecords();
    records.push({
        type,
        value,
        value2: type === 'blood-pressure' ? value2 : '',
        note,
        time: Date.now()
    });
    saveRecords(records);

    document.getElementById('value').value = '';
    document.getElementById('value2').value = '';
    document.getElementById('note').value = '';
    document.getElementById('modal').classList.remove('active');
    renderDashboard();
});

document.getElementById('clear-data').addEventListener('click', () => {
    if (confirm('确定要清空所有记录吗？')) {
        localStorage.removeItem('health_records');
        renderDashboard();
    }
});

renderDashboard();
