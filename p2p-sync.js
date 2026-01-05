// p2p-sync.js - Fixed Peer-to-Peer LAN Synchronization
class P2PSync {
    constructor() {
        this.peers = new Map();
        this.connection = null;
        this.isHost = false;
        this.roomId = null;
        this.broadcastChannel = null;
        this.syncInterval = null;
    }

    // Generate room ID from device fingerprint
    generateRoomId() {
        const deviceId = localStorage.getItem('p2p_device_id') || 
                        Math.random().toString(36).substring(2, 10);
        localStorage.setItem('p2p_device_id', deviceId);
        return `cable-mgmt-${deviceId}`;
    }

    // Start as host (create room)
    async startHost() {
        try {
            this.isHost = true;
            this.roomId = this.generateRoomId();
            
            this.setupLocalSync();
            
            console.log('P2P Host started with room:', this.roomId);
            return this.roomId;
        } catch (error) {
            console.error('Failed to start P2P host:', error);
            throw error;
        }
    }

    // Setup local synchronization using BroadcastChannel + localStorage events
    setupLocalSync() {
        // Use BroadcastChannel for same-browser tab sync
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('cable_sync');
            this.broadcastChannel.addEventListener('message', (event) => {
                this.handleSyncMessage(event.data);
            });
        }

        // Listen for storage events (other tabs)
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('cm_v7_')) {
                this.handleDataChange(event.key, event.newValue);
            }
        });

        // Set up periodic sync
        this.syncInterval = setInterval(() => {
            this.broadcastState();
        }, 5000);
    }

    // Broadcast current state to other tabs
    broadcastState() {
        const state = {
            boxes: localStorage.getItem('cm_v7_boxes'),
            logs: localStorage.getItem('cm_v7_logs'),
            timestamp: Date.now(),
            deviceId: localStorage.getItem('p2p_device_id')
        };

        // Broadcast to other tabs
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'SYNC_STATE',
                data: state
            });
        }

        // Trigger storage event for same-origin tabs
        localStorage.setItem('cm_v7_last_sync', Date.now().toString());
    }

    // Handle incoming sync messages
    handleSyncMessage(message) {
        if (message.type === 'SYNC_STATE') {
            this.mergeData(message.data);
        }
    }

    // Handle storage changes
    handleDataChange(key, newValue) {
        if (key === 'cm_v7_boxes' || key === 'cm_v7_logs') {
            this.triggerUIUpdate();
        }
    }

    // Merge incoming data with local data
    mergeData(remoteData) {
        try {
            // Skip if this is our own data
            if (remoteData.deviceId === localStorage.getItem('p2p_device_id')) {
                return;
            }

            // Merge boxes
            if (remoteData.boxes) {
                const localBoxes = JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]');
                const remoteBoxes = JSON.parse(remoteData.boxes);
                const mergedBoxes = this.mergeArrays(localBoxes, remoteBoxes, 'id');
                localStorage.setItem('cm_v7_boxes', JSON.stringify(mergedBoxes));
            }

            // Merge logs
            if (remoteData.logs) {
                const localLogs = JSON.parse(localStorage.getItem('cm_v7_logs') || '[]');
                const remoteLogs = JSON.parse(remoteData.logs);
                const mergedLogs = this.mergeArrays(localLogs, remoteLogs, 'id');
                localStorage.setItem('cm_v7_logs', JSON.stringify(mergedLogs));
            }

            this.triggerUIUpdate();
        } catch (error) {
            console.error('Merge error:', error);
        }
    }

    // Smart array merging by ID
    mergeArrays(local, remote, idKey) {
        const merged = [...local];
        const localIds = new Set(local.map(item => item[idKey]));

        remote.forEach(remoteItem => {
            if (!localIds.has(remoteItem[idKey])) {
                merged.push(remoteItem);
            } else {
                // Update existing item if remote is newer
                const existingIndex = merged.findIndex(item => item[idKey] === remoteItem[idKey]);
                if (existingIndex !== -1) {
                    if (remoteItem.timestamp > (merged[existingIndex].timestamp || 0)) {
                        merged[existingIndex] = remoteItem;
                    }
                }
            }
        });

        return merged;
    }

    // Trigger UI updates
    triggerUIUpdate() {
        window.dispatchEvent(new CustomEvent('syncDataUpdate', {
            detail: {
                boxes: JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]'),
                logs: JSON.parse(localStorage.getItem('cm_v7_logs') || '[]')
            }
        }));
    }

    // Export data for manual transfer
    exportData() {
        const data = {
            boxes: JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]'),
            logs: JSON.parse(localStorage.getItem('cm_v7_logs') || '[]'),
            exportDate: new Date().toISOString(),
            version: 'cable_mgmt_v1'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cable-management-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import data from file
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.boxes) {
                        localStorage.setItem('cm_v7_boxes', JSON.stringify(data.boxes));
                    }
                    if (data.logs) {
                        localStorage.setItem('cm_v7_logs', JSON.stringify(data.logs));
                    }
                    
                    this.broadcastState();
                    this.triggerUIUpdate();
                    resolve(true);
                } catch (error) {
                    reject(new Error('Invalid backup file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Stop synchronization
    stopSync() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Initialize global P2P sync instance
window.p2pSync = new P2PSync();