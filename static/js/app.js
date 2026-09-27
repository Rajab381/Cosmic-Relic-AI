let statusInterval = null;

async function sendMessage() {

    const input = document.getElementById("message");
    const message = input.value.trim();

    if (message === "") return;

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
                Cosmic Relic is thinking...
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

// Clear any previous interval before starting a new one
if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
}

// Thinking animation text
const stages = [

    "Initializing AI...",

    "Searching Memory...",

    "Searching Documents...",

    "Generating Response..."

];

let stage = 0;

statusInterval = setInterval(() => {

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

    try {
        const response = await fetch("/chat_stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }

        const thinkingElem = document.getElementById("thinking");
        if (thinkingElem) {
            thinkingElem.remove();
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Cosmic stream connection failed.");
        }

        // Create empty AI message container
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

        const bubbles = document.querySelectorAll(".streamBubble");
        const bubble = bubbles[bubbles.length - 1];

        if (!response.body) {
            bubble.textContent = "No response stream received.";
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        let renderPending = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            // Throttle markdown parsing via requestAnimationFrame
            if (!renderPending) {
                renderPending = true;
                requestAnimationFrame(() => {
                    bubble.innerHTML = marked.parse(fullText);
                    chat.scrollTop = chat.scrollHeight;
                    renderPending = false;
                });
            }
        }

        // Final authoritative render and code highlight
        bubble.innerHTML = marked.parse(fullText);
        chat.scrollTop = chat.scrollHeight;
        bubble.querySelectorAll("pre code").forEach((el) => {
            hljs.highlightElement(el);
        });

    } catch (err) {
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
        const thinkingElem = document.getElementById("thinking");
        if (thinkingElem) {
            thinkingElem.remove();
        }

        chat.innerHTML += `
        <div class="message ai-message">
            <div class="avatar ai-avatar" style="border-color: #ff4f91;">
                <div class="mini-eye">
                    <div class="mini-dot" style="background: #ff4f91;"></div>
                </div>
            </div>
            <div>
                <div class="bubble ai-bubble" style="border-color: rgba(255, 79, 145, 0.4);">
                    <p style="color: #ff729f; margin: 0 0 6px 0;">⚡ <strong>[COSMIC CORE NOTICE]</strong></p>
                    <p style="margin: 0; color: #d0e4f7;">${err.message || "An unexpected transmission error occurred."}</p>
                </div>
                <div class="time">${time}</div>
            </div>
        </div>
        `;
        chat.scrollTop = chat.scrollHeight;
    }
}
async function uploadPDF() {

    const fileInput = document.getElementById("pdfFile");
    if (!fileInput) return;

    const file = fileInput.files[0];

    if (!file) {
        fileInput.click();
        return;
    }

    const statusLabel = document.getElementById("uploadStatusText");
    if (statusLabel) {
        statusLabel.textContent = "Uploading & Indexing...";
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (statusLabel) {
            statusLabel.textContent = file.name.length > 20 ? file.name.substring(0, 18) + "..." : file.name;
        }

        showCosmicNotification(data.message || "Document processed into Cosmic Relic RAG.");
    } catch (err) {
        if (statusLabel) {
            statusLabel.textContent = "Upload failed";
        }
        showCosmicNotification("Upload error: " + err.message, true);
    }
}

function showCosmicNotification(msg, isError = false) {
    let toast = document.getElementById("cosmicToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "cosmicToast";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "24px";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "8px";
        toast.style.zIndex = "99999";
        toast.style.fontFamily = "'Orbitron', sans-serif";
        toast.style.fontSize = "13px";
        toast.style.letterSpacing = "0.08em";
        toast.style.transition = "all 0.3s ease";
        toast.style.boxShadow = "0 8px 32px rgba(0,0,0,0.6)";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = isError ? "rgba(255, 60, 100, 0.85)" : "rgba(10, 25, 45, 0.9)";
    toast.style.border = isError ? "1px solid #ff4f91" : "1px solid #42bfff";
    toast.style.color = isError ? "#ffffff" : "#42bfff";
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 3500);
}

function scrollDownToOverview() {
    const landing = document.getElementById("landingScreen");
    const overview = document.getElementById("coresMatrixSection");
    if (landing && overview) {
        landing.scrollTo({
            top: overview.offsetTop - 30,
            behavior: "smooth"
        });
    }
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

    if (fill) {
        fill.style.width = "100%";
    }

    if (boot) {
        setTimeout(() => {
            boot.style.opacity = "0";
        }, 2300);

        setTimeout(() => {
            boot.remove();
        }, 3300);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const msgInput = document.getElementById("message");
    if (msgInput) {
        msgInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

function startChat() {
    const landing = document.getElementById("landingScreen");
    const workspace = document.getElementById("workspace");
    const chatArea = document.getElementById("chatArea");
    const hero = document.getElementById("hero");
    const chat = document.getElementById("response");

    // If already in chat, clean slate session
    if (chatArea && chatArea.classList.contains("chat-active")) {
        if (chat && chat.children.length > 0) {
            chat.innerHTML = "";
            fetch("/reset", { method: "POST" }).catch(() => {});
            showCosmicNotification("Cosmic session reset. Time Core memory cleared.");
        }
    }

    if (landing) {
        landing.style.display = "none";
    }

    if (workspace) {
        workspace.classList.remove("hidden-workspace");
        workspace.style.display = "flex";
    }

    if (chatArea) {
        chatArea.classList.add("chat-active");
    }

    if (hero) {
        hero.classList.add("hero-minimized");
    }

    const input = document.getElementById("message");
    if (input) {
        input.focus();
    }
}