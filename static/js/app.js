async function sendMessage() {

    const input = document.getElementById("message");
    const message = input.value.trim();

    if (message === "") return;


    // ========================================
    // COSMIC CORE ROUTING
    // ========================================

    if (window.CosmicInterface) {

        window.CosmicInterface.processPrompt(message);

    }


    const chat = document.getElementById("response");
    const hero = document.getElementById("hero");
    const chatArea = document.getElementById("chatArea");

    // Remove welcome screen only once

    // ======================================
    // SWITCH TO PRODUCTIVITY MODE
    // ======================================

    if (!chatArea.classList.contains("chat-active")) {

        chatArea.classList.add("chat-active");
        hero.classList.add("hero-minimized");
    }

    const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    // ==========================
    // USER MESSAGE
    // ==========================

    chat.innerHTML += `
        <div class="message user-message">

            <div class="avatar user-avatar">
                R
            </div>

            <div>

                <div class="bubble user-bubble">
                    ${message}
                </div>

                <div class="time">
                    ${time}
                </div>

            </div>

        </div>
    `;

    input.value = "";
    input.focus();

    chat.scrollTop = chat.scrollHeight;

    // ==========================
    // THINKING ANIMATION
    // ==========================

// ==========================
// THINKING
// ==========================

chat.innerHTML += `
<div class="message ai-message" id="thinking">

    <div class="avatar ai-avatar">

        <div class="mini-eye">
            <div class="mini-dot"></div>
        </div>

    </div>

    <div class="bubble ai-bubble thinking-bubble">

        <div class="thinking-header">

            <div class="thinking-core"></div>

            <span class="thinking-title">
                Edith is thinking...
            </span>

        </div>

        <div class="thinking-status" id="thinkingStatus">
            Initializing AI...
        </div>

    </div>

</div>
`;

// Scroll after adding thinking bubble
chat.scrollTop = chat.scrollHeight;

// Thinking animation text
const stages = [

    "Initializing AI...",

    "Searching Memory...",

    "Searching Documents...",

    "Generating Response..."

];

let stage = 0;

const statusInterval = setInterval(() => {

    const label = document.getElementById("thinkingStatus");

    if (label) {

        label.innerHTML = stages[stage % stages.length];

        stage++;

    }

}, 800);
    // ==========================
    // SEND TO FLASK
    // ==========================

    // ========================================
// STREAM RESPONSE
// ========================================

const response = await fetch("/chat_stream", {

    method: "POST",

    headers: {

        "Content-Type": "application/json"

    },

    body: JSON.stringify({

        message: message

    })

});

document.getElementById("thinking").remove();

// Create empty AI message

chat.innerHTML += `

<div class="message ai-message">

    <div class="avatar ai-avatar">

        <div class="mini-eye">

            <div class="mini-dot"></div>

        </div>

    </div>

    <div>

        <div class="bubble ai-bubble streamBubble"></div>

        <div class="time">

            ${time}

        </div>

    </div>

</div>

`;

// Always grab ONLY the newest bubble

const bubbles = document.querySelectorAll(".streamBubble");

const bubble = bubbles[bubbles.length - 1];

const reader = response.body.getReader();

const decoder = new TextDecoder();

let fullText = "";

while(true){

    const {done,value} = await reader.read();

    if(done) break;

    const chunk = decoder.decode(value);

    fullText += chunk;

    bubble.innerHTML = marked.parse(fullText);

    document.querySelectorAll("pre code").forEach((el)=>{

        hljs.highlightElement(el);

    });

    chat.scrollTop = chat.scrollHeight;

}

}
async function uploadPDF() {

    const fileInput = document.getElementById("pdfFile");

    const file = fileInput.files[0];

    if (!file) {

        alert("Choose a PDF first.");

        return;

    }

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/upload", {

        method: "POST",

        body: formData

    });

    const data = await response.json();

    alert(data.message);

}

const glow = document.querySelector(".cursor-glow");

if(glow){

    document.addEventListener("mousemove",(e)=>{

        glow.style.left = e.clientX + "px";
        glow.style.top  = e.clientY + "px";

    });

}

function copyMessage(button){

    const bubble = button.parentElement;

    const text = bubble.innerText.replace("📋 Copy","");

    navigator.clipboard.writeText(text);

    button.innerHTML = "✅ Copied";

    setTimeout(()=>{

        button.innerHTML="📋 Copy";

    },1500);

}

window.onload = () => {

    const fill = document.getElementById("bootFill");
    const boot = document.getElementById("bootScreen");

    if(fill){

        fill.style.width = "100%";

    }

    if(boot){

        setTimeout(()=>{

            boot.style.opacity = "0";

        },2300);

        setTimeout(()=>{

            boot.remove();

        },3300);

    }

};
function startChat(){

    const landing = document.getElementById("landingScreen");
    const workspace = document.getElementById("workspace");
    const chatArea = document.getElementById("chatArea");
    const hero = document.getElementById("hero");

    if(landing){

        landing.style.display = "none";

    }

    if(workspace){

        workspace.classList.remove("hidden-workspace");
        workspace.style.display = "flex";

    }

    if(chatArea){

        chatArea.classList.add("chat-active");

    }

    if(hero){

        hero.classList.add("hero-minimized");

    }

    const input = document.getElementById("message");

    if(input){

        input.focus();

    }

}