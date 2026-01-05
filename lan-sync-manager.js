// lan-sync-manager.js - Advanced LAN Synchronization System
class LANSyncManager {
    constructor() {
        this.peers = new Map();
        this.connections = new Map();
        this.isHost = false;
        this.roomCode = null;
        this.syncInterval = null;
        this.broadcastChannel = null;
        this.wsConnection = null;
        this.initialized = false;
        
        // Configuration
        this.config = {
            syncInterval: 3000,
            maxRetries: 3,
            retryDelay: 1000,
            discoveryTimeout: 10000
        };
    }

    // Initialize LAN Sync
    async initialize() {
        // Check if already initialized
        if (this.initialized) {
            console.log('LAN Sync already initialized');
            return true;
        }
        
        try {
            console.log('🚀 Initializing LAN Sync Manager...');
            
            this.setupBroadcastChannel();
            this.setupStorageListeners();
            
            // WebSocket connection is optional, don't fail if it doesn't work
            try {
                await this.setupWebSocket();
            } catch (wsError) {
                console.warn('WebSocket connection failed, continuing with local sync only:', wsError);
            }
            
            this.startPeriodicSync();
            this.initialized = true;
            
            console.log('✅ LAN Sync Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ LAN Sync initialization failed:', error);
            return false;
        }
    }

    // Setup BroadcastChannel for same-browser tab synchronization
    setupBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('cable_management_sync');
            
            this.broadcastChannel.addEventListener('message', (event) => {
                this.handleSyncMessage(event.data);
            });
            
            console.log('📡 BroadcastChannel initialized for tab sync');
        } else {
            console.warn('⚠️ BroadcastChannel not supported - tab sync disabled');
        }
    }

    // Setup localStorage event listeners
    setupStorageListeners() {
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('cm_v7_')) {
                this.handleStorageChange(event.key, event.newValue);
            }
        });
    }

    // Setup WebSocket for cross-device LAN synchronization
    async setupWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = this.getWebSocketURL();
                this.wsConnection = new WebSocket(wsUrl);
                
                this.wsConnection.onopen = () => {
                    console.log('🔗 WebSocket connected for LAN sync');
                    this.setupWebSocketHandlers();
                    resolve(true);
                };
                
                this.wsConnection.onerror = (error) => {
                    console.warn('⚠️ WebSocket connection failed:', error);
                    reject(error);
                };
                
                setTimeout(() => {
                    if (this.wsConnection.readyState !== WebSocket.OPEN) {
                        console.warn('⏰ WebSocket connection timeout');
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);
                
            } catch (error) {
                console.warn('⚠️ WebSocket setup failed:', error);
                reject(error);
            }
        });
    }

    // Get WebSocket URL based on current environment
    getWebSocketURL() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = window.location.port || '8080';
        
        const endpoints = [
            `${protocol}//${host}:3001`,
            `${protocol}//${host}:${port}/ws`,
            `ws://localhost:3001`,
        ];
        
        return endpoints[0];
    }

    // Setup WebSocket message handlers
    setupWebSocketHandlers() {
        this.wsConnection.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleNetworkMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.wsConnection.onclose = () => {
            console.log('🔌 WebSocket disconnected - attempting reconnect...');
            setTimeout(() => this.setupWebSocket(), 5000);
        };
    }

    // Start periodic synchronization
    startPeriodicSync() {
        this.syncInterval = setInterval(() => {
            this.broadcastLocalState();
        }, this.config.syncInterval);
    }

    // Broadcast local state to all peers
    broadcastLocalState() {
        const state = this.getLocalState();
        
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'SYNC_STATE',
                data: state,
                timestamp: Date.now(),
                source: 'broadcast'
            });
        }
        
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({
                type: 'SYNC_STATE',
                data: state,
                timestamp: Date.now(),
                source: 'websocket'
            }));
        }
        
        localStorage.setItem('cm_v7_last_sync', Date.now().toString());
    }

    // Get current local state
    getLocalState() {
        return {
            boxes: localStorage.getItem('cm_v7_boxes'),
            logs: localStorage.getItem('cm_v7_logs'),
            charts: this.getAllChartData(),
            calculatorHistory: localStorage.getItem('safety_history'),
            deviceId: this.getDeviceId(),
            timestamp: Date.now(),
            version: 'v1.0'
        };
    }

    // Get or create device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('cm_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('cm_device_id', deviceId);
        }
        return deviceId;
    }

    // Get all chart data
    getAllChartData() {
        try {
            const files = JSON.parse(localStorage.getItem('chart_files_list') || '[]');
            const chartData = {};
            
            files.forEach(file => {
                const data = localStorage.getItem(`chart_file_${file.id}`);
                if (data) {
                    chartData[file.id] = JSON.parse(data);
                }
            });
            
            return chartData;
        } catch (error) {
            console.error('Error getting chart data:', error);
            return {};
        }
    }

    // Handle incoming sync messages
    handleSyncMessage(message) {
        switch (message.type) {
            case 'SYNC_STATE':
                this.mergeRemoteState(message.data);
                break;
            case 'PEER_DISCOVERY':
                this.handlePeerDiscovery(message);
                break;
            case 'DATA_REQUEST':
                this.handleDataRequest(message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    // Handle network messages from WebSocket
    handleNetworkMessage(message) {
        this.handleSyncMessage(message);
    }

    // Handle storage changes
    handleStorageChange(key, newValue) {
        console.log('Storage change detected:', key);
        this.triggerUIUpdate();
    }

    // Merge remote state with local state
    mergeRemoteState(remoteState) {
        try {
            if (remoteState.deviceId === this.getDeviceId()) {
                return;
            }

            console.log('🔄 Merging remote state from:', remoteState.deviceId);

            if (remoteState.boxes) {
                this.mergeData('cm_v7_boxes', remoteState.boxes, 'id');
            }

            if (remoteState.logs) {
                this.mergeData('cm_v7_logs', remoteState.logs, 'id');
            }

            if (remoteState.charts) {
                this.mergeChartData(remoteState.charts);
            }

            if (remoteState.calculatorHistory) {
                this.mergeCalculatorHistory(remoteState.calculatorHistory);
            }

            this.triggerUIUpdate();
            this.showSyncNotification('Data synchronized from peer device');

        } catch (error) {
            console.error('Error merging remote state:', error);
        }
    }

    // Merge data arrays with conflict resolution
    mergeData(localStorageKey, remoteData, idKey) {
        const localData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const remoteArray = JSON.parse(remoteData);
        
        const merged = [...localData];
        const localIds = new Set(localData.map(item => item[idKey]));

        remoteArray.forEach(remoteItem => {
            if (!localIds.has(remoteItem[idKey])) {
                merged.push(remoteItem);
            } else {
                const existingIndex = merged.findIndex(item => item[idKey] === remoteItem[idKey]);
                if (existingIndex !== -1) {
                    const localTimestamp = merged[existingIndex].timestamp || 0;
                    const remoteTimestamp = remoteItem.timestamp || 0;
                    
                    if (remoteTimestamp > localTimestamp) {
                        merged[existingIndex] = remoteItem;
                    }
                }
            }
        });

        localStorage.setItem(localStorageKey, JSON.stringify(merged));
    }

    // Merge chart data
    mergeChartData(remoteCharts) {
        Object.keys(remoteCharts).forEach(fileId => {
            const remoteChart = remoteCharts[fileId];
            const localChart = localStorage.getItem(`chart_file_${fileId}`);
            
            if (!localChart || (remoteChart.lastModified > JSON.parse(localChart).lastModified)) {
                localStorage.setItem(`chart_file_${fileId}`, JSON.stringify(remoteChart));
            }
        });
    }

    // Merge calculator history
    mergeCalculatorHistory(remoteHistory) {
        try {
            const localHistory = JSON.parse(localStorage.getItem('safety_history') || '[]');
            const remoteHistoryArray = JSON.parse(remoteHistory);
            
            const merged = [...localHistory];
            const localTimestamps = new Set(localHistory.map(item => item.timestamp));
            
            remoteHistoryArray.forEach(remoteItem => {
                if (!localTimestamps.has(remoteItem.timestamp)) {
                    merged.push(remoteItem);
                }
            });
            
            merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            localStorage.setItem('safety_history', JSON.stringify(merged));
        } catch (error) {
            console.error('Error merging calculator history:', error);
        }
    }

    // Handle peer discovery
    handlePeerDiscovery(message) {
        console.log('👋 Peer discovered:', message.deviceId);
        
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({
                type: 'SYNC_STATE',
                data: this.getLocalState(),
                timestamp: Date.now()
            }));
        }
    }

    // Handle data requests
    handleDataRequest(message) {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({
                type: 'SYNC_STATE',
                data: this.getLocalState(),
                timestamp: Date.now(),
                requestId: message.requestId
            }));
        }
    }

    // Trigger UI updates
    triggerUIUpdate() {
        window.dispatchEvent(new CustomEvent('lanSyncUpdate', {
            detail: {
                boxes: JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]'),
                logs: JSON.parse(localStorage.getItem('cm_v7_logs') || '[]'),
                timestamp: new Date().toISOString()
            }
        }));
    }

    // Show sync notification
    showSyncNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007aff;
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 8px 25px rgba(0,122,255,0.3);
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Export all data for backup
    exportAllData() {
        const data = {
            boxes: JSON.parse(localStorage.getItem('cm_v7_boxes') || '[]'),
            logs: JSON.parse(localStorage.getItem('cm_v7_logs') || '[]'),
            charts: this.getAllChartData(),
            calculatorHistory: JSON.parse(localStorage.getItem('safety_history') || '[]'),
            exportDate: new Date().toISOString(),
            deviceId: this.getDeviceId(),
            version: 'cable_mgmt_full_backup'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cable-management-full-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return true;
    }

    // Import data from backup file
    importBackupData(file) {
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
                    
                    if (data.charts) {
                        Object.keys(data.charts).forEach(fileId => {
                            localStorage.setItem(`chart_file_${fileId}`, JSON.stringify(data.charts[fileId]));
                        });
                    }
                    
                    if (data.calculatorHistory) {
                        localStorage.setItem('safety_history', JSON.stringify(data.calculatorHistory));
                    }
                    
                    this.broadcastLocalState();
                    this.triggerUIUpdate();
                    this.showSyncNotification('Backup imported successfully!');
                    resolve(true);
                    
                } catch (error) {
                    reject(new Error('Invalid backup file format'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read backup file'));
            reader.readAsText(file);
        });
    }

    // Get sync status
    getSyncStatus() {
        return {
            isConnected: this.wsConnection ? this.wsConnection.readyState === WebSocket.OPEN : false,
            lastSync: localStorage.getItem('cm_v7_last_sync'),
            deviceId: this.getDeviceId(),
            peerCount: this.peers.size,
            broadcastSupported: !!this.broadcastChannel
        };
    }

    // Stop synchronization
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
        if (this.wsConnection) {
            this.wsConnection.close();
        }
        console.log('🛑 LAN Sync stopped');
    }
}

// Initialize global LAN Sync Manager
window.lanSyncManager = new LANSyncManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.lanSyncManager.initialize().then(success => {
            if (success) {
                console.log('🌟 LAN Sync Manager ready');
            }
        });
    }, 1000);
});