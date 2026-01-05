// data-storage.js - Fixed file storage system for chart data
const FILE_STORAGE_PREFIX = 'chart_file_';
const FILE_LIST_KEY = 'chart_files_list';

// Helper function to get the storage key for a file
function getFileStorageKey(fileId) {
    return `${FILE_STORAGE_PREFIX}${fileId}`;
}

// Save file data
function saveFileData(fileId, data, fileName) {
    try {
        const fileData = {
            ...data,
            lastModified: Date.now(),
            name: fileName || data.name || 'Unnamed Chart'
        };
        
        localStorage.setItem(getFileStorageKey(fileId), JSON.stringify(fileData));
        updateFileList(fileId, fileData.name, fileData.lastModified);
        return { success: true };
    } catch (error) {
        console.error('Error saving file:', error);
        return { success: false, error: error.message };
    }
}

// Load file data
function loadFileData(fileId) {
    try {
        const data = localStorage.getItem(getFileStorageKey(fileId));
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading file:', error);
        return null;
    }
}

// Get all files (from the list)
function getAllFiles() {
    try {
        return JSON.parse(localStorage.getItem(FILE_LIST_KEY) || '[]');
    } catch (error) {
        console.error('Error getting file list:', error);
        return [];
    }
}

// Update the master file list
function updateFileList(fileId, fileName, timestamp) {
    try {
        let fileList = getAllFiles(); // Use the existing function
        
        // Remove existing entry if it exists
        fileList = fileList.filter(file => file.id !== fileId);
        
        // Add new entry to the beginning
        fileList.unshift({
            id: fileId,
            name: fileName,
            lastModified: timestamp
        });
        
        // Keep only recent files (limit to 50)
        fileList = fileList.slice(0, 50);
        
        localStorage.setItem(FILE_LIST_KEY, JSON.stringify(fileList));
    } catch (error) {
        console.error('Error updating file list:', error);
    }
}

// *** NEW FUNCTION ***
// Delete a file
function deleteFile(fileId) {
    try {
        // 1. Remove the file's data
        localStorage.removeItem(getFileStorageKey(fileId));
        
        // 2. Remove the file from the list
        let fileList = getAllFiles();
        fileList = fileList.filter(file => file.id !== fileId);
        localStorage.setItem(FILE_LIST_KEY, JSON.stringify(fileList));
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting file:', error);
        return { success: false, error: error.message };
    }
}

// --- The rest of your file (loadSampledData, etc.) was not provided, ---
// --- but if you have it, you can paste it below this line. ---