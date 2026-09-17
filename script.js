import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get,
    update,
    onValue,
    push,
    remove
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyD3Pwd-YAufk7LMMobSagfnRnPi8n3OOU4",
    authDomain: "nexus-39896.firebaseapp.com",
    databaseURL: "https://nexus-39896-default-rtdb.firebaseio.com",
    projectId: "nexus-39896",
    storageBucket: "nexus-39896.firebasestorage.app",
    messagingSenderId: "171087365242",
    appId: "1:171087365242:android:19881ef916c0d20b2567c3"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);


/* =========================================================
   ELEMENTS
========================================================= */

const authScreen = document.getElementById("authScreen");
const usernameScreen = document.getElementById("usernameScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");

const usernameInput = document.getElementById("usernameInput");

const authMessage = document.getElementById("authMessage");
const usernameMessage = document.getElementById("usernameMessage");

const myUsername = document.getElementById("myUsername");

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const requestsList = document.getElementById("requestsList");

const board = document.getElementById("board");
const cells = [...document.querySelectorAll(".cell")];

const turnText = document.getElementById("turnText");

const playerXName = document.getElementById("playerXName");
const playerOName = document.getElementById("playerOName");

const gameMessage = document.getElementById("gameMessage");

const inviteModal = document.getElementById("inviteModal");
const inviteFrom = document.getElementById("inviteFrom");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let currentGameId = null;
let currentGame = null;

let requestListener = null;
let gameListener = null;

let pendingInviteId = null;


/* =========================================================
   HELPERS
========================================================= */

function showScreen(screen) {

    [
        authScreen,
        usernameScreen,
        lobbyScreen,
        gameScreen
    ].forEach(x => x.classList.add("hidden"));

    screen.classList.remove("hidden");
}


function toast(text) {

    const el = document.getElementById("toast");

    el.textContent = text;
    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 2500);
}


function normalizeUsername(name) {

    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}


function validUsername(name) {

    return /^[a-zA-Z0-9_]{3,20}$/.test(name);
}


function errorText(error) {

    const code = error?.code || "";

    const messages = {
        "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
        "auth/user-not-found": "الحساب غير موجود.",
        "auth/wrong-password": "كلمة المرور غير صحيحة.",
        "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.",
        "auth/email-already-in-use": "هذا البريد مستخدم بالفعل.",
        "auth/weak-password": "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",
        "auth/network-request-failed": "مشكلة في الاتصال بالإنترنت."
    };

    return messages[code] || error?.message || "حدث خطأ غير معروف.";
}


/* =========================================================
   AUTH UI
========================================================= */

document.getElementById("showRegisterBtn")
    .onclick = () => {

        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        authMessage.textContent = "";
    };


document.getElementById("showLoginBtn")
    .onclick = () => {

        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        authMessage.textContent = "";
    };


/* =========================================================
   REGISTER
========================================================= */

document.getElementById("registerBtn")
    .onclick = async () => {

        const email = registerEmail.value.trim();
        const password = registerPassword.value;

        authMessage.textContent = "";

        if (!email || !password) {

            authMessage.textContent =
                "اكتب البريد وكلمة المرور.";

            return;
        }

        try {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            authMessage.textContent =
                errorText(error);
        }
    };


/* =========================================================
   LOGIN
========================================================= */

document.getElementById("loginBtn")
    .onclick = async () => {

        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        authMessage.textContent = "";

        if (!email || !password) {

            authMessage.textContent =
                "اكتب البريد وكلمة المرور.";

            return;
        }

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            authMessage.textContent =
                errorText(error);
        }
    };


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, async user => {

    if (!user) {

        currentUser = null;
        currentProfile = null;

        showScreen(authScreen);

        return;
    }

    currentUser = user;

    try {

        const snapshot =
            await get(ref(db, `users/${user.uid}`));

        if (!snapshot.exists()) {

            showScreen(usernameScreen);

        } else {

            currentProfile = snapshot.val();

            enterLobby();

        }

    } catch (error) {

        console.error(error);

        authMessage.textContent =
            "تعذر الاتصال بقاعدة البيانات.";
    }
});


/* =========================================================
   USERNAME
========================================================= */

document.getElementById("saveUsernameBtn")
    .onclick = async () => {

        const username =
            usernameInput.value.trim();

        usernameMessage.textContent = "";

        if (!validUsername(username)) {

            usernameMessage.textContent =
                "استخدم 3-20 حرفًا أو رقمًا أو _ فقط.";

            return;
        }

        const key =
            normalizeUsername(username);

        try {

            const usernameRef =
                ref(db, `usernames/${key}`);

            const usernameSnapshot =
                await get(usernameRef);

            if (usernameSnapshot.exists()) {

                usernameMessage.textContent =
                    "هذا الـ Username مستخدم بالفعل.";

                return;
            }


            await set(usernameRef, currentUser.uid);


            await set(
                ref(db, `users/${currentUser.uid}`),
                {
                    uid: currentUser.uid,
                    username: username,
                    usernameLower: key,
                    email: currentUser.email,
                    online: true,
                    createdAt: Date.now()
                }
            );


            currentProfile = {
                uid: currentUser.uid,
                username,
                usernameLower: key,
                email: currentUser.email,
                online: true
            };


            enterLobby();

        } catch (error) {

            console.error(error);

            usernameMessage.textContent =
                "حدث خطأ أثناء حفظ Username.";
        }
    };


/* =========================================================
   LOBBY
========================================================= */

function enterLobby() {

    showScreen(lobbyScreen);

    myUsername.textContent =
        "@" + currentProfile.username;

    startRequestsListener();
}


document.getElementById("logoutBtn")
    .onclick = async () => {

        if (currentUser) {

            await update(
                ref(db, `users/${currentUser.uid}`),
                {
                    online: false
                }
            );
        }

        await signOut(auth);
    };


/* =========================================================
   SEARCH PLAYERS
========================================================= */

document.getElementById("searchBtn")
    .onclick = searchPlayer;


searchInput.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        searchPlayer();
    }
});


async function searchPlayer() {

    const username =
        searchInput.value.trim();

    searchResults.innerHTML = "";

    if (!username) return;

    const key =
        normalizeUsername(username);

    try {

        const usernameSnap =
            await get(
                ref(db, `usernames/${key}`)
            );

        if (!usernameSnap.exists()) {

            searchResults.innerHTML = `
                <div class="empty">
                    اللاعب غير موجود.
                </div>
            `;

            return;
        }


        const uid = usernameSnap.val();

        if (uid === currentUser.uid) {

            searchResults.innerHTML = `
                <div class="empty">
                    لا يمكنك تحدي نفسك 😄
                </div>
            `;

            return;
        }


        const userSnap =
            await get(ref(db, `users/${uid}`));

        if (!userSnap.exists()) {

            return;
        }

        const user = userSnap.val();


        searchResults.innerHTML = `
            <div class="player-result">

                <div>
                    <div class="name">
                        @${escapeHtml(user.username)}
                    </div>

                    <div class="online">
                        ${user.online ? "● متصل" : "○ غير متصل"}
                    </div>
                </div>

                <button
                    class="challenge-btn"
                    id="challengeBtn"
                    ${user.online ? "" : "disabled"}
                >
                    تحدي
                </button>

            </div>
        `;


        const challengeBtn =
            document.getElementById("challengeBtn");

        challengeBtn.onclick = () => {

            sendChallenge(
                user.uid,
                user.username
            );
        };

    } catch (error) {

        console.error(error);

        toast("حدث خطأ أثناء البحث.");
    }
}


/* =========================================================
   SEND CHALLENGE
========================================================= */

async function sendChallenge(
    targetUid,
    targetUsername
) {

    try {

        const existing =
            await get(
                ref(
                    db,
                    `requests/${targetUid}`
                )
            );

        const requests =
            existing.exists()
                ? existing.val()
                : {};


        for (const id in requests) {

            const request =
                requests[id];

            if (
                request.fromUid === currentUser.uid &&
                request.status === "pending"
            ) {

                toast("لديك طلب مرسل بالفعل.");

                return;
            }
        }


        const requestRef =
            push(
                ref(
                    db,
                    `requests/${targetUid}`
                )
            );


        await set(requestRef, {

            id: requestRef.key,

            fromUid: currentUser.uid,

            fromUsername:
                currentProfile.username,

            toUid: targetUid,

            toUsername: targetUsername,

            status: "pending",

            createdAt: Date.now()
        });


        toast(
            `تم إرسال التحدي إلى @${targetUsername}`
        );

    } catch (error) {

        console.error(error);

        toast("تعذر إرسال التحدي.");
    }
}


/* =========================================================
   REQUESTS LISTENER
========================================================= */

function startRequestsListener() {

    if (requestListener) {
        requestListener();
    }


    const requestsRef =
        ref(
            db,
            `requests/${currentUser.uid}`
        );


    requestListener =
        onValue(
            requestsRef,
            snapshot => {

                const data =
                    snapshot.val();

                renderRequests(data);
            }
        );
}


function renderRequests(data) {

    requestsList.innerHTML = "";

    if (!data) {

        requestsList.innerHTML = `
            <div class="empty">
                لا توجد طلبات حاليًا
            </div>
        `;

        return;
    }


    let found = false;


    Object.entries(data)
        .forEach(([id, request]) => {

            if (
                request.status !== "pending"
            ) return;


            found = true;


            const div =
                document.createElement("div");

            div.className = "request";


            div.innerHTML = `
                <div>
                    <strong>
                        @${escapeHtml(request.fromUsername)}
                    </strong>

                    <div class="muted">
                        يريد اللعب معك
                    </div>
                </div>

                <div class="request-actions">

                    <button
                        class="primary"
                        data-accept="${id}"
                    >
                        قبول
                    </button>

                    <button
                        class="secondary"
                        data-reject="${id}"
                    >
                        رفض
                    </button>

                </div>
            `;


            div.querySelector(
                `[data-accept="${id}"]`
            ).onclick = () => {

                acceptChallenge(
                    id,
                    request
                );
            };


            div.querySelector(
                `[data-reject="${id}"]`
            ).onclick = () => {

                rejectChallenge(id);
            };


            requestsList.appendChild(div);
        });


    if (!found) {

        requestsList.innerHTML = `
            <div class="empty">
                لا توجد طلبات حاليًا
            </div>
        `;
    }
}


/* =========================================================
   ACCEPT CHALLENGE
========================================================= */

async function acceptChallenge(
    requestId,
    request
) {

    try {

        const gameRef =
            push(ref(db, "games"));

        const gameId =
            gameRef.key;


        const game = {

            id: gameId,

            playerX: request.fromUid,

            playerXName:
                request.fromUsername,

            playerO: currentUser.uid,

            playerOName:
                currentProfile.username,

            board: [
                "", "", "",
                "", "", "",
                "", "", ""
            ],

            turn: request.fromUid,

            status: "playing",

            winner: "",

            createdAt: Date.now()

        };


        await set(gameRef, game);


        await update(
            ref(
                db,
                `requests/${currentUser.uid}/${requestId}`
            ),
            {
                status: "accepted",
                gameId
            }
        );


        await set(
            ref(
                db,
                `userGames/${request.fromUid}/${gameId}`
            ),
            true
        );


        await set(
            ref(
                db,
                `userGames/${currentUser.uid}/${gameId}`
            ),
            true
        );


        openGame(gameId);

    } catch (error) {

        console.error(error);

        toast("تعذر إنشاء المباراة.");
    }
}


/* =========================================================
   REJECT
========================================================= */

async function rejectChallenge(id) {

    try {

        await update(
            ref(
                db,
                `requests/${currentUser.uid}/${id}`
            ),
            {
                status: "rejected"
            }
        );

    } catch (error) {

        console.error(error);
    }
}


/* =========================================================
   CHECK SENT CHALLENGES
========================================================= */

function watchMyChallenges() {

    const requestsRef =
        ref(db, "requests");


    onValue(requestsRef, snapshot => {

        const all =
            snapshot.val();

        if (!all) return;


        Object.values(all)
            .forEach(userRequests => {

                Object.values(userRequests || {})
                    .forEach(request => {

                        if (
                            request.fromUid === currentUser.uid &&
                            request.status === "accepted" &&
                            request.gameId
                        ) {

                            openGame(
                                request.gameId
                            );
                        }

                    });

            });

    });
}


/* =========================================================
   GAME
========================================================= */

function openGame(gameId) {

    currentGameId = gameId;

    showScreen(gameScreen);

    if (gameListener) {
        gameListener();
    }


    const gameRef =
        ref(db, `games/${gameId}`);


    gameListener =
        onValue(
            gameRef,
            snapshot => {

                if (!snapshot.exists()) {

                    toast("المباراة غير موجودة.");

                    showScreen(lobbyScreen);

                    return;
                }


                currentGame =
                    snapshot.val();


                renderGame();
            }
        );
}


function renderGame() {

    playerXName.textContent =
        currentGame.playerXName;

    playerOName.textContent =
        currentGame.playerOName;


    const gameBoard =
        currentGame.board || [];


    cells.forEach((cell, index) => {

        const value =
            gameBoard[index] || "";


        cell.textContent = value;

        cell.classList.remove(
            "x",
            "o",
            "locked",
            "win"
        );


        if (value === "X") {

            cell.classList.add("x");

        } else if (value === "O") {

            cell.classList.add("o");
        }


        if (
            value ||
            currentGame.status !== "playing"
        ) {

            cell.classList.add("locked");
        }
    });


    if (currentGame.status === "playing") {

        const mySymbol =
            getMySymbol();

        const turnSymbol =
            currentGame.turn === currentGame.playerX
                ? "X"
                : "O";


        if (turnSymbol === mySymbol) {

            turnText.textContent =
                `دورك — أنت ${mySymbol}`;

        } else {

            turnText.textContent =
                `انتظر دور ${turnSymbol}...`;
        }

    } else {

        handleGameEnd();
    }
}


/* =========================================================
   SYMBOL
========================================================= */

function getMySymbol() {

    if (
        currentUser.uid ===
        currentGame.playerX
    ) {

        return "X";
    }

    if (
        currentUser.uid ===
        currentGame.playerO
    ) {

        return "O";
    }

    return "";
}


/* =========================================================
   PLAY MOVE
========================================================= */

cells.forEach(cell => {

    cell.addEventListener("click", async () => {

        if (!currentGame) return;

        if (
            currentGame.status !== "playing"
        ) return;


        const index =
            Number(cell.dataset.index);


        const mySymbol =
            getMySymbol();


        if (!mySymbol) return;


        if (
            currentGame.turn !==
            currentUser.uid
        ) {

            toast("مش دورك.");

            return;
        }


        if (
            currentGame.board[index]
        ) {

            return;
        }


        const newBoard =
            [
                ...(currentGame.board || [])
            ];


        newBoard[index] =
            mySymbol;


        const result =
            calculateWinner(newBoard);


        const updates = {

            [`games/${currentGameId}/board`]:
                newBoard

        };


        if (result) {

            updates[
                `games/${currentGameId}/status`
            ] = "finished";


            updates[
                `games/${currentGameId}/winner`
            ] = result;


        } else if (
            newBoard.every(Boolean)
        ) {

            updates[
                `games/${currentGameId}/status`
            ] = "draw";


            updates[
                `games/${currentGameId}/winner`
            ] = "draw";


        } else {

            updates[
                `games/${currentGameId}/turn`
            ] =
                mySymbol === "X"
                    ? currentGame.playerO
                    : currentGame.playerX;
        }


        try {

            await update(
                ref(db),
                updates
            );

        } catch (error) {

            console.error(error);

            toast("تعذر تسجيل الحركة.");
        }

    });

});


/* =========================================================
   WINNER
========================================================= */

function calculateWinner(board) {

    const combinations = [

        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],

        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],

        [0, 4, 8],
        [2, 4, 6]

    ];


    for (const combo of combinations) {

        const [a, b, c] = combo;


        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {

            return board[a];
        }
    }


    return null;
}


/* =========================================================
   GAME END
========================================================= */

function handleGameEnd() {

    const winner =
        currentGame.winner;


    if (winner === "draw") {

        turnText.textContent =
            "تعادل 🤝";

        gameMessage.textContent =
            "انتهت المباراة بالتعادل.";

        return;
    }


    if (
        winner === getMySymbol()
    ) {

        turnText.textContent =
            "🎉 فزت بالمباراة!";

        gameMessage.textContent =
            "مبروك! لقد فزت.";

    } else {

        turnText.textContent =
            "المباراة انتهت";

        gameMessage.textContent =
            "حظًا أوفر في المباراة القادمة.";
    }


    const winningSymbol =
        winner;


    const combinations = [

        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]

    ];


    for (const combo of combinations) {

        const [a,b,c] = combo;


        if (
            currentGame.board[a] === winningSymbol &&
            currentGame.board[b] === winningSymbol &&
            currentGame.board[c] === winningSymbol
        ) {

            cells[a].classList.add("win");
            cells[b].classList.add("win");
            cells[c].classList.add("win");

            break;
        }
    }
}


/* =========================================================
   BACK TO LOBBY
========================================================= */

document.getElementById("backLobbyBtn")
    .onclick = () => {

        if (gameListener) {

            gameListener();
            gameListener = null;
        }

        currentGameId = null;
        currentGame = null;

        gameMessage.textContent = "";

        showScreen(lobbyScreen);
    };


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   START CHALLENGE WATCHER
========================================================= */

onAuthStateChanged(auth, user => {

    if (user) {

        setTimeout(() => {

            watchMyChallenges();

        }, 1000);
    }
});