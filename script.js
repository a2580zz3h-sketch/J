import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase, ref, set, get, push, onChildAdded, onValue, update
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3Pwd-YAufk7LMMobSagfnRnPi8n3OOU4",
  databaseURL: "https://nexus-39896-default-rtdb.firebaseio.com",
  projectId: "nexus-39896",
  storageBucket: "nexus-39896.firebasestorage.app",
  messagingSenderId: "171087365242",
  appId: "1:171087365242:android:19881ef916c0d20b2567c3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------- عناصر DOM الرئيسية ---------- */
const authModal = document.getElementById("authModal");
const stepEmail = document.getElementById("stepEmail");
const stepOtp = document.getElementById("stepOtp");
const stepProfile = document.getElementById("stepProfile");
const emailInput = document.getElementById("emailInput");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const otpInput = document.getElementById("otpInput");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpInfoText = document.getElementById("otpInfoText");
const avatarInput = document.getElementById("avatarInput");
const avatarPreviewLabel = document.getElementById("avatarPreviewLabel");
const usernameInput = document.getElementById("usernameInput");
const displayNameInput = document.getElementById("displayNameInput");
const completeRegisterBtn = document.getElementById("completeRegisterBtn");

const appContainer = document.getElementById("appContainer");
const developerBtn = document.getElementById("developerBtn");
const developerModal = document.getElementById("developerModal");
const closeDevModal = document.getElementById("closeDevModal");

const mySidebarAvatar = document.getElementById("mySidebarAvatar");
const mySidebarName = document.getElementById("mySidebarName");
const mySidebarUsername = document.getElementById("mySidebarUsername");
const chatsList = document.getElementById("chatsList");
const globalSearchInput = document.getElementById("globalSearchInput");

const chatSection = document.getElementById("chatSection");
const backToSidebar = document.getElementById("backToSidebar");
const activeChatAvatar = document.getElementById("activeChatAvatar");
const activeChatTitle = document.getElementById("activeChatTitle");
const activeChatStatus = document.getElementById("activeChatStatus");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("form");
const textInput = document.getElementById("text");
const sendMsgBtn = document.getElementById("sendMsgBtn");

const attachMediaBtn = document.getElementById("attachMediaBtn");
const attachFileBtn = document.getElementById("attachFileBtn");
const recordVoiceBtn = document.getElementById("recordVoiceBtn");
const makeStickerBtn = document.getElementById("makeStickerBtn");
const mediaFileInput = document.getElementById("mediaFileInput");
const anyFileInput = document.getElementById("anyFileInput");

const stickerModal = document.getElementById("stickerModal");
const stickerFileinput = document.getElementById("stickerFileinput");
const stickerPreviewArea = document.getElementById("stickerPreviewArea");
const sendStickerBtn = document.getElementById("sendStickerBtn");
const closeStickerModal = document.getElementById("closeStickerModal");

const openNewGroupBtn = document.getElementById("openNewGroupBtn");
const groupModal = document.getElementById("groupModal");
const groupNameInput = document.getElementById("groupNameInput");
const createGroupConfirmBtn = document.getElementById("createGroupConfirmBtn");
const closeGroupModal = document.getElementById("closeGroupModal");

let currentUser = null;
let currentChatId = null;
let currentChatType = 'private'; // 'private' or 'group'
let generatedOtp = "";
let tempEmail = "";
let tempAvatarBase64 = "";

/* ---------- زر المطور المنبثق ---------- */
developerBtn.addEventListener("click", () => developerModal.classList.remove("hidden"));
closeDevModal.addEventListener("click", () => developerModal.classList.add("hidden"));

/* ---------- نظام المصققة وإنشاء الحساب ---------- */
sendOtpBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();
  if(!email || !email.includes("@")) { alert("الرجاء إدخال بريد إلكتروني صحيح"); return; }
  tempEmail = email;
  generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otpInfoText.textContent = `تم إرسال رمز التحقق التجريبي إلى ${tempEmail} (الرمز هو: ${generatedOtp})`;
  stepEmail.classList.add("hidden");
  stepOtp.classList.remove("hidden");
});

verifyOtpBtn.addEventListener("click", () => {
  if(otpInput.value.trim() !== generatedOtp) { alert("رمز التحقق غير صحيح"); return; }
  stepOtp.classList.add("hidden");
  stepProfile.classList.remove("hidden");
});

avatarInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (uploadEvent) => {
    tempAvatarBase64 = uploadEvent.target.result;
    avatarPreviewLabel.innerHTML = `<img src="${tempAvatarBase64}">`;
  };
  reader.readAsDataURL(file);
});

completeRegisterBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const displayName = displayNameInput.value.trim();

  if(!username || username.length < 3) { alert("يجب إدخال يوزرنيم صالح (أحرف إنجليزية وأرقام فقط)"); return; }
  if(!displayName) { alert("الرجاء إدخال اسمك الظاهر"); return; }

  // التحقق من أن اليوزرنيم غير مأخوذ
  const userRef = ref(db, `usernames/${username}`);
  const snap = await get(userRef);
  if(snap.exists()) { alert("هذا اليوزرنيم مستخدم مسبقاً، اختر يوزرنيم آخر غيره!"); return; }

  const userId = "user_" + Math.random().toString(36).slice(2, 10);
  currentUser = {
    id: userId,
    email: tempEmail,
    username: username,
    displayName: displayName,
    avatar: tempAvatarBase64 || ""
  };

  // حفظ بيانات المستخدم
  await set(ref(db, `users/${userId}`), currentUser);
  await set(ref(db, `usernames/${username}`), userId);

  localStorage.setItem("nexus_user_id", userId);
  initApp();
});

/* التحقق من وجود جلسة سابقة */
window.addEventListener("load", async () => {
  const savedUserId = localStorage.getItem("nexus_user_id");
  if(savedUserId) {
    const snap = await get(ref(db, `users/${savedUserId}`));
    if(snap.exists()) {
      currentUser = snap.val();
      initApp();
    }
  }
});

function initApp(){
  authModal.classList.add("hidden");
  appContainer.classList.remove("hidden");

  mySidebarName.textContent = currentUser.displayName;
  mySidebarUsername.textContent = "@" + currentUser.username;
  if(currentUser.avatar) {
    mySidebarAvatar.innerHTML = `<img src="${currentUser.avatar}">`;
  }

  loadChats();
  openMySelfChat();
}

/* الشات الخاص بالمستخدم (أول شات يظهر له مع نفسه) */
async function openMySelfChat(){
  const myChatId = `self_${currentUser.id}`;
  // التأكد من وجود الشات الذاتي
  await set(ref(db, `chats/${myChatId}/meta`), {
    type: 'self',
    name: currentUser.displayName + " (محادثتي الخاصة)",
    username: currentUser.username,
    avatar: currentUser.avatar
  });
  openChat(myChatId, currentUser.displayName + " (محادثتي الخاصة)", currentUser.avatar, 'self');
}

/* ---------- إدارة قائمة المحادثات والبحث عن أصدقاء ---------- */
async function loadChats(){
  const chatListRef = ref(db, `users_chats/${currentUser.id}`);
  onValue(chatListRef, (snapshot) => {
    chatsList.innerHTML = "";
    // إضافة المحادثة الخاصة دائماً في البداية
    appendChatToList(`self_${currentUser.id}`, currentUser.displayName + " (محادثتي الخاصة)", currentUser.avatar, "محادثتك الخاصة وحفظ الملفات");

    if(snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        const chatData = childSnap.val();
        appendChatToList(chatData.chatId, chatData.title, chatData.avatar, chatData.lastMessage || "انقر للبدء بالدردشة");
      });
    }
  });
}

function appendChatToList(chatId, title, avatar, subtitle){
  const div = document.createElement("div");
  div.className = "chat-item" + (currentChatId === chatId ? " active" : "");
  div.innerHTML = `
    <div class="avatar-sm">${avatar ? `<img src="${avatar}">` : title.charAt(0)}</div>
    <div class="chat-item-info" style="flex:1; overflow:hidden;">
      <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</h4>
      <p style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${subtitle}</p>
    </div>
  `;
  div.addEventListener("click", () => {
    openChat(chatId, title, avatar, 'private');
    if(window.innerWidth <= 768){
      document.getElementById("sidebar").classList.add("hidden-mobile");
      chatSection.classList.add("active-mobile");
      backToSidebar.classList.remove("hidden");
    }
  });
  chatsList.appendChild(div);
}

backToSidebar.addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("hidden-mobile");
  chatSection.classList.remove("active-mobile");
  backToSidebar.classList.add("hidden");
});

/* البحث عن شخص عبر اليوزرنيم وإرسال طلب/بدء محادثة */
globalSearchInput.addEventListener("keydown", async (e) => {
  if(e.key === "Enter") {
    const queryUsername = globalSearchInput.value.trim().toLowerCase().replace("@", "");
    if(!queryUsername) return;

    if(queryUsername === currentUser.username) {
      alert("هذا هو يوزرنيم الخاص بك!");
      return;
    }

    const uSnap = await get(ref(db, `usernames/${queryUsername}`));
    if(!uSnap.exists()) {
      alert("لم يتم العثور على مستخدم بهذا اليوزرنيم!");
      return;
    }

    const targetUserId = uSnap.val();
    const targetUserSnap = await get(ref(db, `users/${targetUserId}`));
    const targetUser = targetUserSnap.val();

    // إنشاء معرف محادثة مشترك وثابت بين الطرفين
    const chatId = [currentUser.id, targetUserId].sort().join("_");
    
    // ربط المحادثة للطرفين بلا قيود
    await set(ref(db, `chats/${chatId}/meta`), {
      type: 'private',
      participants: { [currentUser.id]: true, [targetUserId]: true }
    });

    await set(ref(db, `users_chats/${currentUser.id}/${chatId}`), {
      chatId: chatId,
      title: targetUser.displayName,
      avatar: targetUser.avatar,
      lastMessage: "بدأت المحادثة الآن"
    });

    await set(ref(db, `users_chats/${targetUserId}/${chatId}`), {
      chatId: chatId,
      title: currentUser.displayName,
      avatar: currentUser.avatar,
      lastMessage: "بدأت المحادثة الآن"
    });

    globalSearchInput.value = "";
    openChat(chatId, targetUser.displayName, targetUser.avatar, 'private');
    if(window.innerWidth <= 768){
      document.getElementById("sidebar").classList.add("hidden-mobile");
      chatSection.classList.add("active-mobile");
      backToSidebar.classList.remove("hidden");
    }
  }
});

/* ---------- فتح غرفة دردشة واستقبال الرسائل ---------- */
let currentMessagesRef = null;

function openChat(chatId, title, avatar, type){
  currentChatId = chatId;
  currentChatType = type;
  activeChatTitle.textContent = title;
  activeChatStatus.textContent = "متصل بلا قيود";
  if(avatar) {
    activeChatAvatar.innerHTML = `<img src="${avatar}">`;
  } else {
    activeChatAvatar.textContent = title.charAt(0);
  }

  messagesEl.innerHTML = "";
  textInput.disabled = false;
  sendMsgBtn.disabled = false;
  textInput.focus();

  if(currentMessagesRef) {
    // إلغاء الاستماع القديم إذا وجد
  }

  currentMessagesRef = ref(db, `chats/${chatId}/messages`);
  onChildAdded(currentMessagesRef, (snap) => {
    renderMessage(snap.val());
  });
}

/* ---------- إرسال الرسائل والوسائط بلا قيود ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if(!text || !currentChatId) return;
  sendMessageData({
    senderId: currentUser.id,
    senderName: currentUser.displayName,
    text: text,
    type: 'text',
    timestamp: Date.now()
  });
  textInput.value = "";
});

function sendMessageData(msgObj){
  push(ref(db, `chats/${currentChatId}/messages`), msgObj);
}

/* إرسال الصور والفيديوهات بلا قيود أو حجم محدد */
attachMediaBtn.addEventListener("click", () => mediaFileInput.click());
mediaFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const base64Data = ev.target.result;
    const isVideo = file.type.startsWith("video");
    sendMessageData({
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      mediaUrl: base64Data,
      type: isVideo ? 'video' : 'image',
      timestamp: Date.now()
    });
  };
  reader.readAsDataURL(file);
});

/* إرسال الملفات */
attachFileBtn.addEventListener("click", () => anyFileInput.click());
anyFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    sendMessageData({
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      fileUrl: ev.target.result,
      fileName: file.name,
      type: 'file',
      timestamp: Date.now()
    });
  };
  reader.readAsDataURL(file);
});

/* تسجيل الفويس نوت (Voice Note) بلا قيود */
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

recordVoiceBtn.addEventListener("click", async () => {
  if(!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          sendMessageData({
            senderId: currentUser.id,
            senderName: currentUser.displayName,
            audioUrl: ev.target.result,
            type: 'audio',
            timestamp: Date.now()
          });
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start();
      isRecording = true;
      recordVoiceBtn.style.color = "var(--danger)";
      recordVoiceBtn.title = "جاري التسجيل... انقر للإيقاف والإرسال";
    } catch(err) {
      alert("تعذر الوصول إلى الميكروفون");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordVoiceBtn.style.color = "";
    recordVoiceBtn.title = "تسجيل فويس نوت";
  }
});

/* صانع الستيكرات عبر الصور */
makeStickerBtn.addEventListener("click", () => stickerModal.classList.remove("hidden"));
closeStickerModal.addEventListener("click", () => stickerModal.classList.add("hidden"));

let selectedStickerBase64 = "";
stickerFileinput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    selectedStickerBase64 = ev.target.result;
    stickerPreviewArea.innerHTML = `<img src="${selectedStickerBase64}" style="max-width:100px; border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
});

sendStickerBtn.addEventListener("click", () => {
  if(!selectedStickerBase64) return;
  sendMessageData({
    senderId: currentUser.id,
    senderName: currentUser.displayName,
    stickerUrl: selectedStickerBase64,
    type: 'sticker',
    timestamp: Date.now()
  });
  selectedStickerBase64 = "";
  stickerPreviewArea.innerHTML = "";
  stickerModal.classList.add("hidden");
});

/* إنشاء المجموعات (قروبات) */
openNewGroupBtn.addEventListener("click", () => groupModal.classList.remove("hidden"));
closeGroupModal.addEventListener("click", () => groupModal.classList.add("hidden"));

createGroupConfirmBtn.addEventListener("click", async () => {
  const groupName = groupNameInput.value.trim();
  if(!groupName) { alert("أدخل اسم المجموعة"); return; }

  const groupId = "group_" + Math.random().toString(36).slice(2, 10);
  await set(ref(db, `chats/${groupId}/meta`), {
    type: 'group',
    name: groupName,
    admin: currentUser.id
  });

  await set(ref(db, `users_chats/${currentUser.id}/${groupId}`), {
    chatId: groupId,
    title: groupName,
    avatar: "",
    lastMessage: "تم إنشاء المجموعة"
  });

  groupNameInput.value = "";
  groupModal.classList.add("hidden");
  openChat(groupId, groupName, "", 'group');
});

/* ---------- عرض الرسائل في الشات ---------- */
function fmtTime(ts){
  if(!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
}

function renderMessage(msg){
  const emptyState = messagesEl.querySelector(".empty");
  if(emptyState) emptyState.remove();

  const isMe = msg.senderId === currentUser.id;
  const row = document.createElement("div");
  row.className = "row " + (isMe ? "me" : "them");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if(msg.type === 'text') {
    bubble.textContent = msg.text;
  } else if(msg.type === 'image') {
    bubble.innerHTML = `<img src="${msg.mediaUrl}">`;
  } else if(msg.type === 'video') {
    bubble.innerHTML = `<video src="${msg.mediaUrl}" controls></video>`;
  } else if(msg.type === 'file') {
    bubble.innerHTML = `<a href="${msg.fileUrl}" download="${msg.fileName}" style="color:#fff; text-decoration:underline;">📁 ${msg.fileName}</a>`;
  } else if(msg.type === 'audio') {
    bubble.innerHTML = `<audio src="${msg.audioUrl}" controls></audio>`;
  } else if(msg.type === 'sticker') {
    bubble.innerHTML = `<img src="${msg.stickerUrl}" style="max-width:120px;">`;
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = (isMe ? "" : `<span style="color:var(--accent);">${msg.senderName}</span> · `) + fmtTime(msg.timestamp);

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.appendChild(meta);

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* خلفية النيون المتصلة بالتوقيع البصري */
const canvas = document.getElementById("nodes");
const ctx = canvas.getContext("2d");
let w, h, particles = [];

function resize(){
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

for(let i=0; i<30; i++){
  particles.push({
    x: Math.random()*w, y: Math.random()*h,
    vx: (Math.random()-0.5)*0.2, vy: (Math.random()-0.5)*0.2
  });
}

function tick(){
  ctx.clearRect(0,0,w,h);
  for(const p of particles){
    p.x += p.vx; p.y += p.vy;
    if(p.x < 0 || p.x > w) p.vx *= -1;
    if(p.y < 0 || p.y > h) p.vy *= -1;
  }
  for(let i=0; i<particles.length; i++){
    for(let j=i+1; j<particles.length; j++){
      const a = particles[i], b = particles[j];
      const dist = Math.hypot(a.x-b.x, a.y-b.y);
      if(dist < 130){
        ctx.strokeStyle = `rgba(124,92,255,${(1 - dist/130) * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  requestAnimationFrame(tick);
}
tick();
