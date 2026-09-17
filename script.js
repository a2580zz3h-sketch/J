/* =========================================================
   NEXUS WORLD
   Client Engine
========================================================= */

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    PointerLockControls
} from
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/PointerLockControls.js";

import {
    initializeApp
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    update,
    push,
    onValue,
    remove,
    onDisconnect
} from
    "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {

    apiKey:
        "AIzaSyD3Pwd-YAufk7LMMobSagfnRnPi8n3OOU4",

    authDomain:
        "nexus-39896.firebaseapp.com",

    databaseURL:
        "https://nexus-39896-default-rtdb.firebaseio.com",

    projectId:
        "nexus-39896",

    storageBucket:
        "nexus-39896.firebasestorage.app",

    messagingSenderId:
        "171087365242",

    appId:
        "1:171087365242:android:19881ef916c0d20b2567c3"
};

const firebaseApp =
    initializeApp(firebaseConfig);

const auth =
    getAuth(firebaseApp);

const db =
    getDatabase(firebaseApp);


/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);

const loadingScreen =
    $("loadingScreen");

const authScreen =
    $("authScreen");

const usernameScreen =
    $("usernameScreen");

const gameContainer =
    $("gameContainer");

const canvas =
    $("gameCanvas");


/* =========================================================
   USER STATE
========================================================= */

let currentUser = null;

let playerProfile = null;

let playerID = null;


/* =========================================================
   WORLD
========================================================= */

let scene;

let camera;

let renderer;

let controls;

let worldGroup;

let remotePlayers =
    new Map();

let blockMap =
    new Map();

let selectedSlot = 0;

let gameStarted = false;


/* =========================================================
   PLAYER
========================================================= */

const player = {

    position:
        new THREE.Vector3(
            0,
            8,
            0
        ),

    velocity:
        new THREE.Vector3(),

    height: 1.75,

    speed: 6,

    jump: 8,

    grounded: false

};


/* =========================================================
   INPUT
========================================================= */

const keys = {};

let mouseDown = false;

let pointerLocked = false;


/* =========================================================
   WORLD SETTINGS
========================================================= */

const WORLD_SIZE = 70;

const BLOCK_SIZE = 1;

const GRAVITY = 22;

let worldTime = 12 * 60;

let lastTime = performance.now();


/* =========================================================
   INVENTORY
========================================================= */

const inventory = {

    wood: 0,

    stone: 0,

    dirt: 0,

    plank: 0,

    fiber: 3,

    table: 0,

    bed: 0
};


/* =========================================================
   BLOCK TYPES
========================================================= */

const BLOCKS = {

    grass: {

        name: "grass",

        color: 0x4e9d45
    },

    dirt: {

        name: "dirt",

        color: 0x765032
    },

    stone: {

        name: "stone",

        color: 0x777d86
    },

    wood: {

        name: "wood",

        color: 0x704628
    },

    leaves: {

        name: "leaves",

        color: 0x347d3b
    },

    plank: {

        name: "plank",

        color: 0xb9824c
    }
};


/* =========================================================
   MATERIALS
========================================================= */

const materials = {};

for (
    const [name, data]
    of Object.entries(BLOCKS)
) {

    materials[name] =
        new THREE.MeshStandardMaterial({

            color:
                data.color,

            roughness: .85,

            metalness: 0

        });
}


/* =========================================================
   LOADING
========================================================= */

function loading(percent, text) {

    $("loadingProgress")
        .style.width =
            percent + "%";

    $("loadingText")
        .textContent =
            text;
}


/* =========================================================
   AUTH UI
========================================================= */

$("openRegister")
    .onclick = () => {

        $("loginPanel")
            .classList
            .add("hidden");

        $("registerPanel")
            .classList
            .remove("hidden");
    };


$("openLogin")
    .onclick = () => {

        $("registerPanel")
            .classList
            .add("hidden");

        $("loginPanel")
            .classList
            .remove("hidden");
    };


/* =========================================================
   REGISTER
========================================================= */

$("registerButton")
    .onclick = async () => {

        const email =
            $("registerEmail")
                .value
                .trim();

        const password =
            $("registerPassword")
                .value;

        $("authError")
            .textContent = "";

        if (!email || password.length < 6) {

            $("authError")
                .textContent =
                "أدخل بريدًا صحيحًا وكلمة مرور 6 أحرف على الأقل.";

            return;
        }

        try {

            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            $("authError")
                .textContent =
                firebaseError(error);
        }
    };


/* =========================================================
   LOGIN
========================================================= */

$("loginButton")
    .onclick = async () => {

        const email =
            $("loginEmail")
                .value
                .trim();

        const password =
            $("loginPassword")
                .value;

        $("authError")
            .textContent = "";

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            $("authError")
                .textContent =
                firebaseError(error);
        }
    };


function firebaseError(error) {

    const map = {

        "auth/invalid-email":
            "البريد الإلكتروني غير صحيح.",

        "auth/invalid-credential":
            "البريد أو كلمة المرور غير صحيحة.",

        "auth/email-already-in-use":
            "البريد مستخدم بالفعل.",

        "auth/weak-password":
            "كلمة المرور ضعيفة.",

        "auth/network-request-failed":
            "تحقق من الإنترنت."
    };

    return map[error.code]
        || "حدث خطأ.";
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            currentUser = null;

            loading(
                100,
                "جاهز"
            );

            loadingScreen
                .classList
                .add("hidden");

            authScreen
                .classList
                .remove("hidden");

            return;
        }

        currentUser = user;

        loading(
            35,
            "تحميل بيانات اللاعب..."
        );

        const snapshot =
            await get(
                ref(
                    db,
                    `users/${user.uid}`
                )
            );

        if (!snapshot.exists()) {

            loadingScreen
                .classList
                .add("hidden");

            usernameScreen
                .classList
                .remove("hidden");

        } else {

            playerProfile =
                snapshot.val();

            playerID =
                user.uid;

            await enterWorld();
        }
    }
);


/* =========================================================
   CREATE USERNAME
========================================================= */

$("createUsername")
    .onclick = async () => {

        const username =
            $("usernameInput")
                .value
                .trim();

        $("usernameError")
            .textContent = "";

        if (
            !/^[A-Za-z0-9_]{3,20}$/
                .test(username)
        ) {

            $("usernameError")
                .textContent =
                "استخدم 3 إلى 20 حرفًا أو رقمًا أو _.";

            return;
        }

        const usernameKey =
            username.toLowerCase();

        const usernameRef =
            ref(
                db,
                `usernames/${usernameKey}`
            );

        const exists =
            await get(usernameRef);

        if (exists.exists()) {

            $("usernameError")
                .textContent =
                "هذا الاسم مستخدم بالفعل.";

            return;
        }

        try {

            await set(
                usernameRef,
                currentUser.uid
            );

            const profile = {

                uid:
                    currentUser.uid,

                username,

                usernameLower:
                    usernameKey,

                email:
                    currentUser.email,

                createdAt:
                    Date.now(),

                online:
                    true,

                inventory: {

                    wood: 0,

                    stone: 0,

                    dirt: 0,

                    plank: 0,

                    fiber: 3,

                    table: 0,

                    bed: 0
                }
            };

            await set(
                ref(
                    db,
                    `users/${currentUser.uid}`
                ),
                profile
            );

            playerProfile =
                profile;

            playerID =
                currentUser.uid;

            await enterWorld();

        } catch (error) {

            console.error(error);

            $("usernameError")
                .textContent =
                "تعذر إنشاء اللاعب.";
        }
    };


/* =========================================================
   ENTER WORLD
========================================================= */

async function enterWorld() {

    loadingScreen
        .classList
        .remove("hidden");

    usernameScreen
        .classList
        .add("hidden");

    authScreen
        .classList
        .add("hidden");

    loading(
        45,
        "إنشاء العالم..."
    );

    if (
        playerProfile.inventory
    ) {

        Object.assign(
            inventory,
            playerProfile.inventory
        );
    }

    await initThree();

    loading(
        65,
        "إنشاء الطبيعة..."
    );

    generateWorld();

    loading(
        80,
        "تحميل اللاعب..."
    );

    createPlayer();

    loading(
        90,
        "الاتصال باللاعبين..."
    );

    setupOnline();

    updateHUD();

    loading(
        100,
        "العالم جاهز"
    );

    setTimeout(() => {

        loadingScreen
            .classList
            .add("hidden");

        gameContainer
            .classList
            .remove("hidden");

        gameStarted = true;

    }, 400);
}


/* =========================================================
   THREE INIT
========================================================= */

async function initThree() {

    scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(
            0x8bc8ef
        );

    scene.fog =
        new THREE.Fog(
            0x8bc8ef,
            25,
            100
        );


    camera =
        new THREE.PerspectiveCamera(
            70,
            innerWidth / innerHeight,
            .05,
            250
        );


    renderer =
        new THREE.WebGLRenderer({

            canvas,

            antialias: true,

            powerPreference:
                "high-performance"
        });


    renderer.setSize(
        innerWidth,
        innerHeight
    );

    renderer.setPixelRatio(
        Math.min(
            devicePixelRatio,
            2
        )
    );


    renderer.shadowMap.enabled =
        true;

    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;


    const ambient =
        new THREE.HemisphereLight(
            0xc9e8ff,
            0x445533,
            1.7
        );

    scene.add(ambient);


    const sun =
        new THREE.DirectionalLight(
            0xffffff,
            2.5
        );

    sun.position.set(
        40,
        70,
        30
    );

    sun.castShadow =
        true;

    sun.shadow.mapSize.set(
        2048,
        2048
    );

    scene.add(sun);

    window.sunLight =
        sun;


    worldGroup =
        new THREE.Group();

    scene.add(
        worldGroup
    );


    controls =
        new PointerLockControls(
            camera,
            canvas
        );


    controls.addEventListener(
        "lock",
        () => {

            pointerLocked =
                true;
        }
    );


    controls.addEventListener(
        "unlock",
        () => {

            pointerLocked =
                false;
        }
    );


    canvas.addEventListener(
        "click",
        () => {

            if (
                gameStarted &&
                !pointerLocked
            ) {

                controls.lock();
            }
        }
    );


    window.addEventListener(
        "resize",
        resize
    );

    setupInput();

    requestAnimationFrame(
        animate
    );
}


/* =========================================================
   WORLD GENERATION
========================================================= */

function generateWorld() {

    const half =
        WORLD_SIZE / 2;


    for (
        let x = -half;
        x < half;
        x++
    ) {

        for (
            let z = -half;
            z < half;
            z++
        ) {

            const height =
                terrainHeight(
                    x,
                    z
                );


            for (
                let y = 0;
                y <= height;
                y++
            ) {

                let type =
                    "stone";


                if (
                    y === height
                ) {

                    type =
                        "grass";

                } else if (
                    y >= height - 2
                ) {

                    type =
                        "dirt";
                }


                addBlock(
                    x,
                    y,
                    z,
                    type,
                    false
                );
            }


            if (
                Math.random() <
                .025 &&
                Math.abs(x) > 3 &&
                Math.abs(z) > 3
            ) {

                createTree(
                    x,
                    height + 1,
                    z
                );
            }
        }
    }


    createGroundDetails();
}


function terrainHeight(
    x,
    z
) {

    const n =
        Math.sin(x * .12) * 2 +
        Math.cos(z * .13) * 2 +
        Math.sin(
            (x + z) * .07
        ) * 3;

    return Math.max(
        1,
        Math.floor(
            5 + n
        )
    );
}


/* =========================================================
   BLOCK
========================================================= */

function blockKey(
    x,
    y,
    z
) {

    return `${x}:${y}:${z}`;
}


function addBlock(
    x,
    y,
    z,
    type,
    dynamic = true
) {

    const key =
        blockKey(
            x,
            y,
            z
        );

    if (
        blockMap.has(key)
    ) return;


    const geometry =
        new THREE.BoxGeometry(
            BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
        );


    const mesh =
        new THREE.Mesh(
            geometry,
            materials[type]
        );


    mesh.position.set(
        x,
        y,
        z
    );


    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;


    mesh.userData = {

        type,

        x,

        y,

        z,

        dynamic
    };


    worldGroup.add(
        mesh
    );

    blockMap.set(
        key,
        mesh
    );
}


function removeBlock(
    x,
    y,
    z
) {

    const key =
        blockKey(
            x,
            y,
            z
        );

    const mesh =
        blockMap.get(key);

    if (!mesh) return;


    worldGroup.remove(
        mesh
    );

    mesh.geometry.dispose();

    blockMap.delete(
        key
    );
}


/* =========================================================
   TREE
========================================================= */

function createTree(
    x,
    y,
    z
) {

    const trunkHeight =
        3 +
        Math.floor(
            Math.random() * 3
        );


    for (
        let i = 0;
        i < trunkHeight;
        i++
    ) {

        addBlock(
            x,
            y + i,
            z,
            "wood",
            false
        );
    }


    const top =
        y + trunkHeight;


    for (
        let dx = -2;
        dx <= 2;
        dx++
    ) {

        for (
            let dy = -1;
            dy <= 2;
            dy++
        ) {

            for (
                let dz = -2;
                dz <= 2;
                dz++
            ) {

                const distance =
                    Math.abs(dx) +
                    Math.abs(dz) +
                    Math.abs(dy) * .5;


                if (
                    distance < 3.2 &&
                    Math.random() > .12
                ) {

                    addBlock(
                        x + dx,
                        top + dy,
                        z + dz,
                        "leaves",
                        false
                    );
                }
            }
        }
    }
}


/* =========================================================
   VEGETATION
========================================================= */

function createGroundDetails() {

    const grassMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0x4ba94e,

            side:
                THREE.DoubleSide
        });


    for (
        let i = 0;
        i < 300;
        i++
    ) {

        const x =
            Math.floor(
                Math.random() *
                WORLD_SIZE
            ) -
            WORLD_SIZE / 2;

        const z =
            Math.floor(
                Math.random() *
                WORLD_SIZE
            ) -
            WORLD_SIZE / 2;

        const y =
            terrainHeight(
                x,
                z
            ) + .5;


        const geometry =
            new THREE.ConeGeometry(
                .08,
                .35,
                4
            );


        const grass =
            new THREE.Mesh(
                geometry,
                grassMaterial
            );


        grass.position.set(
            x,
            y,
            z
        );


        grass.castShadow =
            true;


        worldGroup.add(
            grass
        );
    }
}


/* =========================================================
   PLAYER
========================================================= */

let playerModel;


function createPlayer() {

    playerModel =
        new THREE.Group();


    const bodyMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x536dff,

            roughness:
                .7
        });


    const skinMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0xf0b58e,

            roughness:
                .8
        });


    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                .65,
                .85,
                .38
            ),
            bodyMaterial
        );

    body.position.y =
        1.15;


    const head =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                .58,
                .58,
                .58
            ),
            skinMaterial
        );

    head.position.y =
        1.85;


    const leg1 =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                .25,
                .65,
                .3
            ),
            bodyMaterial
        );

    const leg2 =
        leg1.clone();


    leg1.position.set(
        -.18,
        .45,
        0
    );

    leg2.position.set(
        .18,
        .45,
        0
    );


    playerModel.add(
        body,
        head,
        leg1,
        leg2
    );


    scene.add(
        playerModel
    );


    camera.position.set(
        player.position.x,
        player.position.y +
            player.height,
        player.position.z
    );


    playerModel.visible =
        false;
}


/* =========================================================
   INPUT
========================================================= */

function setupInput() {

    window.addEventListener(
        "keydown",
        e => {

            keys[e.code] =
                true;


            if (
                e.code === "Space" &&
                player.grounded
            ) {

                player.velocity.y =
                    player.jump;

                player.grounded =
                    false;
            }


            if (
                e.code.startsWith("Digit")
            ) {

                const number =
                    Number(
                        e.code.replace(
                            "Digit",
                            ""
                        )
                    );

                if (
                    number >= 1 &&
                    number <= 8
                ) {

                    selectSlot(
                        number - 1
                    );
                }
            }


            if (
                e.code === "KeyE"
            ) {

                toggleMenu();
            }


            if (
                e.code === "KeyF"
            ) {

                breakTarget();
            }


            if (
                e.code === "KeyG"
            ) {

                placeBlock();
            }
        }
    );


    window.addEventListener(
        "keyup",
        e => {

            keys[e.code] =
                false;
        }
    );


    window.addEventListener(
        "mousedown",
        e => {

            if (
                !gameStarted ||
                !pointerLocked
            ) return;


            if (
                e.button === 0
            ) {

                breakTarget();

            } else if (
                e.button === 2
            ) {

                placeBlock();
            }
        }
    );


    window.addEventListener(
        "contextmenu",
        e =>
            e.preventDefault()
    );


    document
        .querySelectorAll(
            ".hotbar-slot"
        )
        .forEach(
            slot => {

                slot.onclick =
                    () => {

                        selectSlot(
                            Number(
                                slot.dataset.slot
                            )
                        );
                    };
            }
        );
}


/* =========================================================
   MOVEMENT
========================================================= */

function updatePlayer(
    delta
) {

    if (
        !gameStarted
    ) return;


    const direction =
        new THREE.Vector3();


    if (
        keys.KeyW
    ) direction.z -= 1;

    if (
        keys.KeyS
    ) direction.z += 1;

    if (
        keys.KeyA
    ) direction.x -= 1;

    if (
        keys.KeyD
    ) direction.x += 1;


    if (
        direction.lengthSq()
    ) {

        direction.normalize();


        const yaw =
            camera.rotation.y;


        const x =
            direction.x *
                Math.cos(yaw) -
            direction.z *
                Math.sin(yaw);

        const z =
            direction.x *
                Math.sin(yaw) +
            direction.z *
                Math.cos(yaw);


        player.velocity.x =
            x * player.speed;

        player.velocity.z =
            z * player.speed;

    } else {

        player.velocity.x *=
            .82;

        player.velocity.z *=
            .82;
    }


    player.velocity.y -=
        GRAVITY * delta;


    player.position.x +=
        player.velocity.x *
        delta;

    player.position.z +=
        player.velocity.z *
        delta;

    player.position.y +=
        player.velocity.y *
        delta;


    const ground =
        getGroundHeight(
            player.position.x,
            player.position.z
        );


    if (
        player.position.y <=
        ground + .1
    ) {

        player.position.y =
            ground + .1;

        player.velocity.y =
            0;

        player.grounded =
            true;
    }


    camera.position.set(
        player.position.x,
        player.position.y +
            player.height,
        player.position.z
    );


    playerModel.position.copy(
        player.position
    );
}


/* =========================================================
   GROUND COLLISION
========================================================= */

function getGroundHeight(
    x,
    z
) {

    const bx =
        Math.round(x);

    const bz =
        Math.round(z);


    let highest = 0;


    for (
        let y = 0;
        y < 30;
        y++
    ) {

        if (
            blockMap.has(
                blockKey(
                    bx,
                    y,
                    bz
                )
            )
        ) {

            highest =
                y + .5;
        }
    }

    return highest;
}


/* =========================================================
   RAYCAST
========================================================= */

const raycaster =
    new THREE.Raycaster();

const center =
    new THREE.Vector2(
        0,
        0
    );


function getTargetBlock() {

    raycaster.setFromCamera(
        center,
        camera
    );


    const hits =
        raycaster.intersectObjects(
            worldGroup.children,
            false
        );


    return hits.length
        ? hits[0]
        : null;
}


/* =========================================================
   BREAK BLOCK
========================================================= */

async function breakTarget() {

    if (
        !gameStarted
    ) return;


    const hit =
        getTargetBlock();


    if (!hit) return;


    if (
        hit.distance > 6
    ) {

        notify(
            "العنصر بعيد جدًا."
        );

        return;
    }


    const data =
        hit.object.userData;


    if (
        data.type === "leaves"
    ) {

        addItem(
            "fiber",
            1
        );

    } else {

        addItem(
            data.type === "wood"
                ? "wood"
                : data.type === "stone"
                    ? "stone"
                    : "dirt",
            1
        );
    }


    removeBlock(
        data.x,
        data.y,
        data.z
    );


    saveBlockChange(
        data,
        null
    );
}


/* =========================================================
   PLACE BLOCK
========================================================= */

async function placeBlock() {

    if (
        !gameStarted
    ) return;


    const hit =
        getTargetBlock();


    if (!hit) return;


    if (
        hit.distance > 6
    ) return;


    const normal =
        hit.face.normal;


    const point =
        hit.object.position.clone()
            .add(normal);


    const x =
        Math.round(
            point.x
        );

    const y =
        Math.round(
            point.y
        );

    const z =
        Math.round(
            point.z
        );


    const type =
        selectedBlockType();


    if (
        !canPlace(type)
    ) {

        notify(
            "لا تملك هذا العنصر."
        );

        return;
    }


    const key =
        blockKey(
            x,
            y,
            z
        );


    if (
        blockMap.has(key)
    ) return;


    removeItem(
        type === "wood"
            ? "wood"
            : type === "stone"
                ? "stone"
                : type
    );


    addBlock(
        x,
        y,
        z,
        type,
        true
    );


    saveBlockChange(
        {
            x,
            y,
            z
        },
        type
    );
}


function selectedBlockType() {

    switch (
        selectedSlot
    ) {

        case 0:
            return "wood";

        case 1:
            return "stone";

        case 2:
            return "dirt";

        case 3:
            return "plank";

        default:
            return "grass";
    }
}


function canPlace(type) {

    const item =
        type === "plank"
            ? "plank"
            : type;

    return (
        inventory[item] || 0
    ) > 0;
}


/* =========================================================
   INVENTORY
========================================================= */

function addItem(
    item,
    amount
) {

    inventory[item] =
        (inventory[item] || 0) +
        amount;

    updateInventoryUI();

    saveInventory();
}


function removeItem(
    item,
    amount = 1
) {

    if (
        (inventory[item] || 0)
        < amount
    ) {

        return false;
    }

    inventory[item] -=
        amount;

    updateInventoryUI();

    saveInventory();

    return true;
}


function saveInventory() {

    if (!currentUser)
        return;


    update(
        ref(
            db,
            `users/${currentUser.uid}`
        ),
        {
            inventory
        }
    );
}


function updateInventoryUI() {

    $("countWood")
        .textContent =
        inventory.wood || 0;

    $("countStone")
        .textContent =
        inventory.stone || 0;

    $("countDirt")
        .textContent =
        inventory.dirt || 0;

    $("countPlank")
        .textContent =
        inventory.plank || 0;


    const grid =
        $("inventoryGrid");


    grid.innerHTML = "";


    const icons = {

        wood: "🪵",

        stone: "🪨",

        dirt: "🧱",

        plank: "🪵",

        fiber: "🌿",

        table: "🪑",

        bed: "🛏️"
    };


    Object.entries(
        inventory
    ).forEach(
        ([item, count]) => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "inventory-slot";

            div.innerHTML = `
                ${icons[item] || "📦"}
                <small>${count}</small>
            `;

            grid.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   HOTBAR
========================================================= */

function selectSlot(
    slot
) {

    selectedSlot =
        slot;


    document
        .querySelectorAll(
            ".hotbar-slot"
        )
        .forEach(
            (element, index) => {

                element.classList.toggle(
                    "selected",
                    index === slot
                );
            }
        );
}


/* =========================================================
   CRAFTING
========================================================= */

document
    .querySelectorAll(
        ".craft-item"
    )
    .forEach(
        item => {

            item.onclick =
                () => {

                    craft(
                        item.dataset.recipe
                    );
                };
        }
    );


function craft(recipe) {

    if (
        recipe === "plank"
    ) {

        if (
            !removeItem(
                "wood",
                1
            )
        ) {

            notify(
                "تحتاج إلى خشب."
            );

            return;
        }

        addItem(
            "plank",
            4
        );

        notify(
            "تم صنع 4 ألواح خشب."
        );
    }


    if (
        recipe === "table"
    ) {

        if (
            !removeItem(
                "plank",
                4
            )
        ) {

            notify(
                "تحتاج إلى 4 ألواح."
            );

            return;
        }

        addItem(
            "table",
            1
        );

        notify(
            "تم صنع طاولة."
        );
    }


    if (
        recipe === "bed"
    ) {

        if (
            inventory.plank < 3 ||
            inventory.fiber < 3
        ) {

            notify(
                "تحتاج إلى 3 ألواح و3 ألياف."
            );

            return;
        }


        removeItem(
            "plank",
            3
        );

        removeItem(
            "fiber",
            3
        );

        addItem(
            "bed",
            1
        );

        notify(
            "تم صنع سرير."
        );
    }
}


/* =========================================================
   DAY / NIGHT
========================================================= */

function updateDayNight(
    delta
) {

    worldTime +=
        delta * 2;


    if (
        worldTime >= 1440
    ) {

        worldTime -=
            1440;
    }


    const angle =
        (
            worldTime / 1440
        ) *
        Math.PI * 2;


    const sunX =
        Math.cos(angle) *
        70;

    const sunY =
        Math.sin(angle) *
        70;


    window.sunLight
        .position.set(
            sunX,
            Math.max(
                5,
                sunY
            ),
            30
        );


    const daylight =
        Math.max(
            0.15,
            Math.sin(angle)
        );


    window.sunLight
        .intensity =
        daylight * 2.5;


    const sky =
        new THREE.Color();


    sky.setHSL(
        .56,
        .55,
        .22 +
        daylight * .35
    );


    scene.background =
        sky;

    scene.fog.color =
        sky;


    const hours =
        Math.floor(
            worldTime / 60
        );

    const minutes =
        Math.floor(
            worldTime % 60
        );


    $("worldClock")
        .textContent =
        String(hours)
            .padStart(2,"0")
        + ":" +
        String(minutes)
            .padStart(2,"0");


    $("clockIcon")
        .textContent =
        daylight > .3
            ? "☀"
            : "🌙";
}


/* =========================================================
   ONLINE SYSTEM
========================================================= */

function setupOnline() {

    if (!currentUser)
        return;


    const onlineRef =
        ref(
            db,
            `users/${currentUser.uid}/online`
        );


    set(
        onlineRef,
        true
    );


    onDisconnect(
        onlineRef
    ).set(false);


    listenRemotePlayers();

    listenFriends();

    listenFriendRequests();
}


/* =========================================================
   PLAYER SYNC
========================================================= */

let lastNetworkUpdate = 0;


function syncPlayer() {

    const now =
        performance.now();


    if (
        now - lastNetworkUpdate <
        100
    ) return;


    lastNetworkUpdate =
        now;


    if (!currentUser)
        return;


    update(
        ref(
            db,
            `players/${currentUser.uid}`
        ),
        {

            uid:
                currentUser.uid,

            username:
                playerProfile.username,

            x:
                player.position.x,

            y:
                player.position.y,

            z:
                player.position.z,

            rotation:
                camera.rotation.y,

            updatedAt:
                Date.now()
        }
    );
}


function listenRemotePlayers() {

    onValue(
        ref(db, "players"),
        snapshot => {

            const players =
                snapshot.val()
                || {};


            Object.entries(
                players
            ).forEach(
                ([uid, data]) => {

                    if (
                        uid ===
                        currentUser.uid
                    ) return;


                    updateRemotePlayer(
                        uid,
                        data
                    );
                }
            );
        }
    );
}


function updateRemotePlayer(
    uid,
    data
) {

    let model =
        remotePlayers.get(uid);


    if (!model) {

        model =
            createRemotePlayer(
                data.username
            );

        remotePlayers.set(
            uid,
            model
        );

        scene.add(
            model
        );
    }


    model.position.lerp(
        new THREE.Vector3(
            data.x || 0,
            data.y || 0,
            data.z || 0
        ),
        .25
    );


    model.rotation.y =
        data.rotation || 0;
}


function createRemotePlayer(
    username
) {

    const group =
        new THREE.Group();


    const material =
        new THREE.MeshStandardMaterial({
            color:
                0xff4f91
        });


    const skin =
        new THREE.MeshStandardMaterial({
            color:
                0xf0b58e
        });


    const body =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                .65,
                .85,
                .38
            ),
            material
        );

    body.position.y =
        1.15;


    const head =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                .58,
                .58,
                .58
            ),
            skin
        );

    head.position.y =
        1.85;


    group.add(
        body,
        head
    );


    return group;
}


/* =========================================================
   WORLD SAVE
========================================================= */

async function saveBlockChange(
    data,
    type
) {

    if (!currentUser)
        return;


    const key =
        blockKey(
            data.x,
            data.y,
            data.z
        );


    if (type === null) {

        await remove(
            ref(
                db,
                `world/blocks/${key}`
            )
        );

    } else {

        await set(
            ref(
                db,
                `world/blocks/${key}`
            ),
            {

                type,

                x:
                    data.x,

                y:
                    data.y,

                z:
                    data.z
            }
        );
    }
}


/* =========================================================
   FRIEND SEARCH
========================================================= */

$("searchFriend")
    .onclick =
    searchFriend;


$("friendSearch")
    .addEventListener(
        "keydown",
        e => {

            if (
                e.key === "Enter"
            ) {

                searchFriend();
            }
        }
    );


async function searchFriend() {

    const query =
        $("friendSearch")
            .value
            .trim();


    if (!query) return;


    let uid = null;


    const usernameSnap =
        await get(
            ref(
                db,
                `usernames/${query.toLowerCase()}`
            )
        );


    if (
        usernameSnap.exists()
    ) {

        uid =
            usernameSnap.val();

    } else {

        const userSnap =
            await get(
                ref(
                    db,
                    `users/${query}`
                )
            );

        if (
            userSnap.exists()
        ) {

            uid = query;
        }
    }


    const result =
        $("friendSearchResult");


    result.innerHTML = "";


    if (
        !uid ||
        uid === currentUser.uid
    ) {

        result.innerHTML =
            `<div class="command-line error">
                اللاعب غير موجود.
            </div>`;

        return;
    }


    const userSnap =
        await get(
            ref(
                db,
                `users/${uid}`
            )
        );


    if (
        !userSnap.exists()
    ) return;


    const user =
        userSnap.val();


    const div =
        document.createElement(
            "div"
        );


    div.className =
        "friend-card";


    div.innerHTML = `

        <div>

            <strong>
                @${escapeHTML(
                    user.username
                )}
            </strong>

            <small>
                ID: ${uid}
            </small>

        </div>

        <div class="friend-actions">

            <button
                class="accept"
                id="sendFriendRequest"
            >
                إضافة
            </button>

        </div>
    `;


    result.appendChild(
        div
    );


    $("sendFriendRequest")
        .onclick =
        () =>
            sendFriendRequest(
                uid,
                user.username
            );
}


/* =========================================================
   FRIEND REQUEST
========================================================= */

async function sendFriendRequest(
    uid,
    username
) {

    const requestRef =
        push(
            ref(
                db,
                `friendRequests/${uid}`
            )
        );


    await set(
        requestRef,
        {

            id:
                requestRef.key,

            from:
                currentUser.uid,

            fromUsername:
                playerProfile.username,

            to:
                uid,

            toUsername:
                username,

            createdAt:
                Date.now(),

            status:
                "pending"
        }
    );


    notify(
        "تم إرسال طلب الصداقة."
    );
}


/* =========================================================
   FRIEND REQUESTS
========================================================= */

function listenFriendRequests() {

    onValue(
        ref(
            db,
            `friendRequests/${currentUser.uid}`
        ),
        snapshot => {

            const data =
                snapshot.val()
                || {};

            renderFriendRequests(
                data
            );
        }
    );
}


function renderFriendRequests(
    data
) {

    const container =
        $("friendRequests");


    container.innerHTML = "";


    const requests =
        Object.entries(data)
            .filter(
                ([,r]) =>
                    r.status ===
                    "pending"
            );


    if (!requests.length) {

        container.textContent =
            "لا توجد طلبات.";

        return;
    }


    requests.forEach(
        ([id, request]) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "friend-card";


            div.innerHTML = `

                <div>

                    <strong>
                        @${escapeHTML(
                            request.fromUsername
                        )}
                    </strong>

                    <small>
                        يريد إضافتك كصديق
                    </small>

                </div>

                <div class="friend-actions">

                    <button
                        class="accept"
                        data-accept="${id}"
                    >
                        قبول
                    </button>

                    <button
                        data-reject="${id}"
                    >
                        رفض
                    </button>

                </div>
            `;


            div.querySelector(
                `[data-accept="${id}"]`
            ).onclick =
                () =>
                    acceptFriend(
                        id,
                        request
                    );


            div.querySelector(
                `[data-reject="${id}"]`
            ).onclick =
                () =>
                    rejectFriend(
                        id
                    );


            container.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   ACCEPT FRIEND
========================================================= */

async function acceptFriend(
    requestId,
    request
) {

    await update(
        ref(
            db,
            `friendRequests/${currentUser.uid}/${requestId}`
        ),
        {
            status:
                "accepted"
        }
    );


    await set(
        ref(
            db,
            `friends/${currentUser.uid}/${request.from}`
        ),
        true
    );


    await set(
        ref(
            db,
            `friends/${request.from}/${currentUser.uid}`
        ),
        true
    );


    notify(
        "تمت إضافة الصديق."
    );
}


/* =========================================================
   REJECT
========================================================= */

async function rejectFriend(
    id
) {

    await update(
        ref(
            db,
            `friendRequests/${currentUser.uid}/${id}`
        ),
        {
            status:
                "rejected"
        }
    );
}


/* =========================================================
   FRIENDS
========================================================= */

function listenFriends() {

    onValue(
        ref(
            db,
            `friends/${currentUser.uid}`
        ),
        async snapshot => {

            const data =
                snapshot.val()
                || {};

            const list =
                $("friendsList");

            list.innerHTML = "";


            const ids =
                Object.keys(data);


            if (!ids.length) {

                list.textContent =
                    "لا يوجد أصدقاء بعد.";

                return;
            }


            for (
                const uid of ids
            ) {

                const snap =
                    await get(
                        ref(
                            db,
                            `users/${uid}`
                        )
                    );


                if (
                    !snap.exists()
                ) continue;


                const user =
                    snap.val();


                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "friend-card";


                div.innerHTML = `

                    <div>

                        <strong>
                            @${escapeHTML(
                                user.username
                            )}
                        </strong>

                        <small>
                            ${
                                user.online
                                ? "🟢 Online"
                                : "⚫ Offline"
                            }
                        </small>

                    </div>
                `;


                list.appendChild(
                    div
                );
            }
        }
    );
}


/* =========================================================
   COMMAND SYSTEM
========================================================= */

$("sendCommand")
    .onclick =
    executeCommand;


$("commandInput")
    .addEventListener(
        "keydown",
        e => {

            if (
                e.key === "Enter"
            ) {

                executeCommand();
            }
        }
    );


function executeCommand() {

    const input =
        $("commandInput");


    const command =
        input.value.trim();


    if (!command)
        return;


    input.value = "";


    outputCommand(
        "> " + command
    );


    const args =
        command.split(/\s+/);


    const cmd =
        args[0]
            .toLowerCase();


    switch(cmd) {

        case "/help":

            outputCommand(
                "/spawn — العودة للسباون",
                "success"
            );

            outputCommand(
                "/time — الوقت",
                "success"
            );

            outputCommand(
                "/pos — موقعك",
                "success"
            );

            outputCommand(
                "/give wood 10",
                "success"
            );

            break;


        case "/spawn":

            player.position.set(
                0,
                8,
                0
            );

            outputCommand(
                "تم نقلك إلى Spawn.",
                "success"
            );

            break;


        case "/time":

            outputCommand(
                formatTime(
                    worldTime
                ),
                "success"
            );

            break;


        case "/pos":

            outputCommand(
                JSON.stringify({
                    x:
                        Math.round(
                            player.position.x
                        ),
                    y:
                        Math.round(
                            player.position.y
                        ),
                    z:
                        Math.round(
                            player.position.z
                        )
                }),
                "success"
            );

            break;


        case "/give":

            if (
                args.length < 3
            ) {

                outputCommand(
                    "/give wood 10",
                    "error"
                );

                break;
            }


            const item =
                args[1];

            const amount =
                Number(args[2]);


            if (
                !Number.isFinite(amount)
            ) {

                outputCommand(
                    "amount غير صحيح.",
                    "error"
                );

                break;
            }


            addItem(
                item,
                amount
            );


            outputCommand(
                `تم إعطاؤك ${amount} ${item}`,
                "success"
            );

            break;


        default:

            outputCommand(
                "Unknown command.",
                "error"
            );
    }
}


function outputCommand(
    text,
    type = ""
) {

    const output =
        $("commandOutput");


    const line =
        document.createElement(
            "div"
        );


    line.className =
        `command-line ${type}`;


    line.textContent =
        text;


    output.appendChild(
        line
    );


    output.scrollTop =
        output.scrollHeight;
}


/* =========================================================
   MENU
========================================================= */

$("menuButton")
    .onclick =
    toggleMenu;


$("closeMenu")
    .onclick =
    toggleMenu;


function toggleMenu() {

    $("gameMenu")
        .classList
        .toggle("hidden");
}


document
    .querySelectorAll(
        "[data-panel]"
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    $("gameMenu")
                        .classList
                        .add("hidden");


                    document
                        .querySelectorAll(
                            ".side-panel"
                        )
                        .forEach(
                            panel =>
                                panel.classList
                                    .add("hidden")
                        );


                    $(
                        button.dataset.panel
                    )
                    .classList
                    .remove("hidden");
                };
        }
    );


document
    .querySelectorAll(
        ".close-panel"
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    button
                        .closest(
                            ".side-panel"
                        )
                        .classList
                        .add("hidden");
                };
        }
    );


/* =========================================================
   LOGOUT
========================================================= */

$("logoutGame")
    .onclick =
    async () => {

        if (
            currentUser
        ) {

            await update(
                ref(
                    db,
                    `users/${currentUser.uid}`
                ),
                {
                    online:
                        false
                }
            );
        }

        await signOut(
            auth
        );

        location.reload();
    };


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    if (!playerProfile)
        return;


    $("hudUsername")
        .textContent =
        "@" +
        playerProfile.username;


    $("hudId")
        .textContent =
        "ID: " +
        currentUser.uid;


    updateInventoryUI();
}


/* =========================================================
   NOTIFICATION
========================================================= */

function notify(
    text
) {

    const container =
        $("notifications");


    const div =
        document.createElement(
            "div"
        );


    div.className =
        "notification";


    div.textContent =
        text;


    container.appendChild(
        div
    );


    setTimeout(
        () => {

            div.remove();

        },
        2500
    );
}


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(
    text
) {

    return String(text)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function formatTime(
    minutes
) {

    const h =
        Math.floor(
            minutes / 60
        );

    const m =
        Math.floor(
            minutes % 60
        );

    return (
        String(h).padStart(
            2,
            "0"
        ) +
        ":" +
        String(m).padStart(
            2,
            "0"
        )
    );
}


/* =========================================================
   RESIZE
========================================================= */

function resize() {

    if (!camera || !renderer)
        return;


    camera.aspect =
        innerWidth /
        innerHeight;

    camera.updateProjectionMatrix();


    renderer.setSize(
        innerWidth,
        innerHeight
    );

    renderer.setPixelRatio(
        Math.min(
            devicePixelRatio,
            2
        )
    );
}


/* =========================================================
   ANIMATION
========================================================= */

function animate(
    now
) {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            (now - lastTime) /
            1000,
            .05
        );


    lastTime =
        now;


    if (
        gameStarted
    ) {

        updatePlayer(
            delta
        );

        updateDayNight(
            delta
        );

        syncPlayer();
    }


    renderer.render(
        scene,
        camera
    );
}