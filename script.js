const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const status = document.getElementById('status');
const resultBox = document.getElementById('result-box');
const finalLink = document.getElementById('final-link');

// 🔒 قائمة التمديدات المحظورة أمنياً منعاً لرفع ملفات خبيثة
const forbiddenExts = ['exe', 'bat', 'cmd', 'sh', 'js', 'php', 'py', 'html'];

// استبدل هذا التوكن برمز توكن شخصي من حسابك على GitHub (Personal Access Token) بصلاحية Gist
// وميزة هذا التوكن أن الملفات ترفع مباشرة على سحابتك الخاصة ولن تحذف أبداً
const GITHUB_TOKEN = 'ضع_توكن_جيت_هب_هنا_إذا_أردت_الربط_المباشر'; 

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

    // حماية أمنية صارمة
    if (forbiddenExts.includes(ext)) {
        status.style.color = '#f85149';
        status.innerText = '❌ عذراً، هذا الامتداد محظور لأسباب أمنية شديدة!';
        return;
    }

    // فحص الحجم أقصى حد 25 ميجابايت لضمان عدم حدوث تعليق
    if (file.size > 25 * 1024 * 1024) {
        status.style.color = '#f85149';
        status.innerText = '❌ حجم الملف كبير جداً! الحد الأقصى 25 ميجابايت.';
        return;
    }

    status.style.color = '#58a6ff';
    status.innerText = '⏳ [Klein] جاري تأمين الملف ورفعـه بشكل دائم...';
    resultBox.classList.add('hidden');

    try {
        // تحويل الملف إلى Base64 أو نص لرفع آمن
        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64Content = event.target.result.split(',')[1];
            const fileName = `klein_${Date.now()}.${ext}`;

            // إذا أردت الرفع الاحترافي الدائم عبر GitHub Gist (بدون أي حذف نهائي)
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: "Klein Permanent Media Storage",
                    public: true,
                    files: {
                        [fileName]: {
                            content: atob(base64Content) // أو رفع البيانات المباشرة
                        }
                    }
                })
            });

            // بديل آخر موثوق 100% في حال لم تستخدم جيت هب وتريد خادماً لا يحذف الروابط أبداً:
            // يمكنك توجيه الطلب لخادمك الخاص (Node.js backend) ليحفظه محلياً أو على سحابتك الخاصة.
            
            const data = await response.json();
            if (data && data.files) {
                const rawUrl = Object.values(data.files)[0].raw_url;
                finalLink.value = rawUrl;
                status.style.color = '#3fb950';
                status.innerText = '✅ تم استخراج الرابط الدائم بنجاح تام!';
                resultBox.classList.remove('hidden');
            } else {
                throw new Error('فشل الستوري الدائم');
            }
        };
        reader.readAsDataURL(file);

    } catch (err) {
        status.style.color = '#f85149';
        status.innerText = '❌ حدث خطأ أثناء الاتصال بالسيرفر الآمن.';
    }
}

function copyLink() {
    finalLink.select();
    document.execCommand('copy');
    alert('تم نسخ الرابط الدائم بنجاح!');
}
