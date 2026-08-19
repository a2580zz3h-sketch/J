const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const resultBox = document.getElementById('result-box');
const finalLink = document.getElementById('final-link');

// 🔒 قائمة الامتدادات المحظورة أمنياً
const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'js', 'php', 'py', 'html'];

dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
});

async function processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    // 1. فحص الأمان
    if (forbiddenExts.includes(ext)) {
        showError('❌ عذراً، هذا الامتداد محظور لأسباب أمنية!');
        return;
    }

    // 2. فحص الحجم (الحد الأقصى 100 ميجابايت)
    if (file.size > 100 * 1024 * 1024) {
        showError('❌ حجم الملف كبير جداً! الحد الأقصى 100 ميجابايت.');
        return;
    }

    // إظهار حالة التحميل
    status.style.color = '#58a6ff';
    status.innerText = '⏳ [Klein] جاري تأمين الملف ورفعه برابط دائم...';
    resultBox.classList.add('hidden');

    try {
        // رفع الميديا عبر خوادم التخزين الدائم المباشرة
        const link = await uploadMediaPermanently(file);

        finalLink.value = link;
        status.style.color = '#3fb950';
        status.innerText = '✅ تم استخراج الرابط الدائم بنجاح!';
        resultBox.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        showError(`❌ حدث خطأ أثناء الرفع: ${err.message || 'فشل الاتصال بالسيرفر'}`);
    }
}

// ☁️ دالة الرفع على خوادم التخزين الدائم (Catbox / Pomf)
async function uploadMediaPermanently(file) {
    // المحاولة الأولى: Catbox Engine (روابط دائمة ولا تحذف أبداً)
    try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', file);

        const res = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const text = await res.text();
            if (text && text.startsWith('http')) {
                return text.trim();
            }
        }
    } catch (e) {
        console.warn('Catbox Engine unavailable, switching to backup server...');
    }

    // المحاولة الثانية الاحتياطية: Pomf Engine
    const formDataBackup = new FormData();
    formDataBackup.append('files[]', file);

    const resBackup = await fetch('https://pomf.lain.la/upload.php', {
        method: 'POST',
        body: formDataBackup
    });

    if (!resBackup.ok) throw new Error('تعذر الاتصال بخوادم الرفع الدائم');

    const json = await resBackup.json();
    if (json && json.success && json.files && json.files[0]) {
        return json.files[0].url;
    }

    throw new Error('لم يتم استلام رابط صحيح من السيرفر');
}

function showError(msg) {
    status.style.color = '#f85149';
    status.innerText = msg;
}

function copyLink() {
    finalLink.select();
    document.execCommand('copy');
    alert('تم نسخ الرابط الدائم بنجاح!');
}
