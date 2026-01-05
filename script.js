// script.js - Complete fixed version with all required functions

// === Core Navigation Functions ===
function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'home.html';
    }
}

function requireSession() {
    // Check multiple possible session keys
    const sessionKeys = ['cm_v7_session', 'cm_session_v6', 'cm_v7_session'];
    const hasSession = sessionKeys.some(key => sessionStorage.getItem(key));
    
    if (!hasSession) {
        // Also check if we're on login page to avoid redirect loop
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 100);
        }
        return false;
    }
    return true;
}

// === Authentication Functions ===
async function login(username, password) {
    if (username === 'admin' && password === '1234') {
        sessionStorage.setItem('cm_v7_session', 'token');
        sessionStorage.setItem('cm_v7_user', 'admin');
        return true;
    }
    
    const storedHash = localStorage.getItem('cm_v7_pass');
    if (storedHash) {
        const inputHash = btoa(username + ':' + password);
        if (storedHash === inputHash) {
            sessionStorage.setItem('cm_v7_session', 'token');
            sessionStorage.setItem('cm_v7_user', username);
            return true;
        }
    }
    return false;
}

async function changePassword(current, newPass, confirm) {
    if (newPass !== confirm) return { ok: false, message: 'New passwords do not match' };
    
    const storedHash = localStorage.getItem('cm_v7_pass');
    const currentHash = btoa('admin:' + current);
    
    if (!storedHash && current === '1234') {
        localStorage.setItem('cm_v7_pass', btoa('admin:' + newPass));
        return { ok: true, message: 'Password changed successfully' };
    }
    
    if (storedHash === currentHash) {
        localStorage.setItem('cm_v7_pass', btoa('admin:' + newPass));
        return { ok: true, message: 'Password changed successfully' };
    }
    
    return { ok: false, message: 'Current password is incorrect' };
}

// === Data Management Functions ===
function loadBoxes() {
    return JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]');
}

function saveBoxes(boxes) {
    localStorage.setItem('cm_v7_boxes', JSON.stringify(boxes));
}

function loadLogs() {
    return JSON.parse(localStorage.getItem('cm_v7_logs') || '[]');
}

function saveLogs(logs) {
    localStorage.setItem('cm_v7_logs', JSON.stringify(logs));
}

function addLog(title, desc) {
    const logs = loadLogs();
    logs.unshift({
        id: Date.now(),
        title: title,
        desc: desc,
        time: new Date().toLocaleString()
    });
    saveLogs(logs);
    if (typeof renderLogs === 'function') renderLogs();
}

function removeLog(id) {
    const logs = loadLogs().filter(log => log.id !== id);
    saveLogs(logs);
}

function editLog(id, title, desc) {
    const logs = loadLogs().map(log => 
        log.id === id ? { ...log, title, desc } : log
    );
    saveLogs(logs);
}

// === Box Management Functions ===
function addBox(name, description, itemCount) {
    const boxes = loadBoxes();
    const newBox = {
        id: Date.now(),
        name: name,
        description: description,
        items: Array.from({length: itemCount}, (_, i) => ({
            id: i + 1,
            name: `Cable ${i + 1}`,
            type: 'Unknown',
            length: '0m',
            status: 'Available'
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    boxes.push(newBox);
    saveBoxes(boxes);
    return newBox;
}

function updateBox(boxId, updates) {
    const boxes = loadBoxes();
    const updatedBoxes = boxes.map(box => {
        if (box.id === boxId) {
            return {
                ...box,
                ...updates,
                updatedAt: new Date().toISOString()
            };
        }
        return box;
    });
    saveBoxes(updatedBoxes);
    return updatedBoxes.find(box => box.id === boxId);
}

function deleteBox(boxId) {
    const boxes = loadBoxes();
    const updatedBoxes = boxes.filter(box => box.id !== boxId);
    saveBoxes(updatedBoxes);
    return true;
}

function getBox(boxId) {
    const boxes = loadBoxes();
    return boxes.find(box => box.id === boxId);
}

// === UI Rendering Functions ===
function renderInventory() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    const boxes = loadBoxes();
    
    if (boxes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div style="text-align:center; padding:40px 20px; color:#666;">
                    <div style="font-size:48px; margin-bottom:16px;">📦</div>
                    <div class="h2">No Cable Boxes</div>
                    <div style="margin-top:8px;">Click "Add Box" to create your first cable box</div>
                </div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = boxes.map(box => `
        <div class="card reveal">
            <div class="card-header">
                <h3>${box.name || 'Unnamed Box'}</h3>
                <span class="badge">${box.items ? box.items.length : 0} items</span>
            </div>
            <div class="card-content">
                <p>${box.description || 'No description'}</p>
                <div class="card-actions">
                    <button class="edit-btn" onclick="editBox(${box.id})">Edit</button>
                </div>
            </div>
        </div>
    `).join('');
    
    revealOnScroll();
}

function renderLogs() {
    const logList = document.getElementById('logList');
    if (!logList) return;
    
    const logs = loadLogs();
    logList.innerHTML = logs.map(log => `
        <div class="log-entry reveal">
            <div class="log-header">
                <strong>${log.title}</strong>
                <span class="log-time">${log.time}</span>
            </div>
            <div class="log-content">${log.desc}</div>
        </div>
    `).join('');
    
    revealOnScroll();
}

// === Animation Utilities ===
function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add('visible');
        }
    });
}

function showModal(content) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    modal.innerHTML = content;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    return { backdrop, modal };
}

// === Google Drive Functions (Placeholders) ===
async function initGapi() {
    return window.initGapi ? window.initGapi() : Promise.resolve();
}

async function signInDrive() {
    return window.signInDrive ? window.signInDrive() : Promise.resolve();
}

async function driveSyncUploadAll() {
    return window.driveSyncUploadAll ? window.driveSyncUploadAll() : Promise.resolve();
}

async function driveSyncDownloadAll() {
    return window.driveSyncDownloadAll ? window.driveSyncDownloadAll() : Promise.resolve();
}

// === Auto-save and Sync ===
let autoSaveTimeout;
function scheduleAutoUpload() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        console.log('Auto-save triggered');
    }, 2000);
}

// === LAN Sync Integration ===
(function enhanceAutoSync() {
    if (typeof BroadcastChannel !== 'undefined') {
        setTimeout(() => {
            if (window.lanSyncManager) {
                window.lanSyncManager.initialize().then(success => {
                    if (success) {
                        console.log('LAN Sync auto-initialized');
                    }
                });
            }
        }, 2000);
    }
    
    // Enhanced save functions with LAN sync
    const origSaveBoxes = window.saveBoxes;
    const origSaveLogs = window.saveLogs;
    
    if (origSaveBoxes) {
        window.saveBoxes = function(b) {
            origSaveBoxes(b);
            scheduleAutoUpload();
            if (window.lanSyncManager) {
                setTimeout(() => window.lanSyncManager.broadcastLocalState(), 100);
            }
        };
    }
    
    if (origSaveLogs) {
        window.saveLogs = function(l) {
            origSaveLogs(l);
            scheduleAutoUpload();
            if (window.lanSyncManager) {
                setTimeout(() => window.lanSyncManager.broadcastLocalState(), 100);
            }
        };
    }
    
    window.addEventListener('lanSyncUpdate', function(event) {
        if (typeof renderInventory === 'function') {
            try { renderInventory(); } catch(e) {}
        }
        if (typeof renderLogs === 'function') {
            try { renderLogs(); } catch(e) {}
        }
        updateHomePageSyncStatus();
    });
})();

function updateHomePageSyncStatus() {
    const syncBadge = document.querySelector('.sync-badge');
    if (syncBadge && window.lanSyncManager) {
        const status = window.lanSyncManager.getSyncStatus();
        if (status.isConnected || status.broadcastSupported) {
            syncBadge.textContent = '● Sync Active';
            syncBadge.style.color = '#00b894';
        } else {
            syncBadge.textContent = '● Sync Ready';
            syncBadge.style.color = '#007aff';
        }
    }
}

// === Initialize on DOM Ready ===
document.addEventListener('DOMContentLoaded', function() {
    // Initialize back buttons
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.style.display = (window.history.length > 1) ? 'flex' : 'none';
    }
    
    // Initialize scroll animations
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();
    
    // Auto-logout after 30 minutes of inactivity
    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (requireSession()) {
                sessionStorage.removeItem('cm_v7_session');
                sessionStorage.removeItem('cm_v7_user');
                window.location.href = 'login.html';
            }
        }, 30 * 60 * 1000);
    }
    
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    
    resetInactivityTimer();
});

// === Utility Functions ===
function showMessage(message, type = 'info', duration = 3000) {
    const existingMsg = document.getElementById('global-message');
    if (existingMsg) existingMsg.remove();
    
    const msg = document.createElement('div');
    msg.id = 'global-message';
    msg.textContent = message;
    msg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff3b30' : '#007aff'};
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        z-index: 10000;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
        if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, duration);
}

// Make functions globally available
window.editBox = function(boxId) {
    const boxes = loadBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    const modal = showModal(`
        <h3>Edit Cable Box</h3>
        <div class="small">Box Name</div>
        <input id="editBoxName" class="input" style="margin-top:8px" value="${box.name}">
        <div class="small" style="margin-top:8px">Description</div>
        <textarea id="editBoxDesc" class="input" style="height:80px;margin-top:8px">${box.description || ''}</textarea>
        <div class="small" style="margin-top:8px">Number of Items</div>
        <input id="editBoxItems" class="input" style="margin-top:8px" type="number" value="${box.items ? box.items.length : 0}">
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
            <button id="editBoxCancel" class="btn ghost">Cancel</button>
            <button id="editBoxSave" class="btn primary">Save</button>
            <button id="editBoxDelete" class="btn" style="background:#ff3b30;color:white">Delete</button>
        </div>
    `);
    
    modal.modal.querySelector('#editBoxCancel').addEventListener('click', () => modal.backdrop.remove());
    modal.modal.querySelector('#editBoxSave').addEventListener('click', () => {
        const name = modal.modal.querySelector('#editBoxName').value.trim();
        const desc = modal.modal.querySelector('#editBoxDesc').value.trim();
        const items = parseInt(modal.modal.querySelector('#editBoxItems').value) || 0;
        
        if (!name) {
            alert('Box name is required');
            return;
        }
        
        // Update box
        const updatedBoxes = boxes.map(b => {
            if (b.id === boxId) {
                return {
                    ...b,
                    name: name,
                    description: desc,
                    items: Array(items).fill().map((_, i) => ({ 
                        id: i + 1, 
                        name: b.items && b.items[i] ? b.items[i].name : `Item ${i + 1}` 
                    })),
                    updatedAt: new Date().toISOString()
                };
            }
            return b;
        });
        
        saveBoxes(updatedBoxes);
        modal.backdrop.remove();
        renderInventory();
    });
    
    modal.modal.querySelector('#editBoxDelete').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this box?')) {
            const updatedBoxes = boxes.filter(b => b.id !== boxId);
            saveBoxes(updatedBoxes);
            modal.backdrop.remove();
            renderInventory();
        }
    });
};