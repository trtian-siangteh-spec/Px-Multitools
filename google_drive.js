// google_drive.js - client-side Google Drive integration (uses gapi.client)
// NOTE: Replace 624470825853-ghm2o342qmestljf9ihgd5a3l3479r2a.apps.googleusercontent.com with your OAuth Client ID before using.
const DRIVE_CLIENT_ID = '624470825853-ghm2o342qmestljf9ihgd5a3l3479r2a.apps.googleusercontent.com';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';
const DRIVE_FILES_KEY = 'cm_v8_drive_files'; // store map of friendly filename -> fileId

console.log('Google Drive JS loaded with Client ID:', DRIVE_CLIENT_ID);

function initGapi() {
  return new Promise((resolve, reject) => {
    if (!window.gapi) return reject('gapi not loaded');
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          clientId: DRIVE_CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: DRIVE_SCOPES
        });
        resolve(true);
      } catch (e) { reject(e); }
    });
  });
}

async function signInDrive() {
  if (!window.gapi) throw 'gapi not loaded';
  const auth = gapi.auth2.getAuthInstance();
  if (!auth) throw 'gapi.auth2 not initialized';
  const user = await auth.signIn();
  return user;
}

function signOutDrive() {
  if (gapi && gapi.auth2) {
    const auth = gapi.auth2.getAuthInstance();
    if (auth && auth.isSignedIn.get()) auth.signOut();
  }
  localStorage.removeItem(DRIVE_FILES_KEY);
}

// helper to call Drive API for finding file by name in appData or root (we use root for simplicity)
async function findDriveFileByName(name) {
  const q = `name='${name.replace(/'/g,"\'")}' and trashed=false`;
  const res = await gapi.client.drive.files.list({ q, fields: 'files(id,name,modifiedTime,size)' });
  return res.result.files && res.result.files[0];
}

async function uploadDriveFile(name, content, mime='application/json') {
  // Check existing
  const existing = await findDriveFileByName(name);
  if (!existing) {
    // create new via multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    const metadata = { name: name, mimeType: mime };
    const base64Data = btoa(unescape(encodeURIComponent(content)));
    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      '\r\n' +
      delimiter +
      'Content-Type: ' + mime + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      close_delim;
    const request = gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody
    });
    const resp = await request;
    const file = resp.result;
    // store mapping
    const map = JSON.parse(localStorage.getItem(DRIVE_FILES_KEY)||'{}');
    map[name] = file.id;
    localStorage.setItem(DRIVE_FILES_KEY, JSON.stringify(map));
    return file;
  } else {
    // update existing
    const fileId = existing.id;
    const media = new Blob([content], { type: mime });
    const r = await gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      body: content
    });
    return r.result;
  }
}

async function downloadDriveFile(name) {
  const file = await findDriveFileByName(name);
  if (!file) return null;
  const res = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
  return res.body || res.result || null;
}

// High-level sync functions
async function driveSyncUploadAll() {
  if (!window.gapi) throw 'gapi not loaded';
  await initGapi();
  if (!gapi.auth2.getAuthInstance().isSignedIn.get()) await signInDrive();
  // upload boxes and logs
  const boxes = localStorage.getItem('cm_v7_boxes') || localStorage.getItem('cm_boxes_v6') || localStorage.getItem('cm_boxes_v5') || '[]';
  const logs = localStorage.getItem('cm_v7_logs') || localStorage.getItem('cm_logs_v6') || localStorage.getItem('cm_logs_v5') || '[]';
  await uploadDriveFile('cable_inventory.json', boxes);
  await uploadDriveFile('logs.json', logs);
  return true;
}

async function driveSyncDownloadAll(mergeLogsFlag=true) {
  if (!window.gapi) throw 'gapi not loaded';
  await initGapi();
  if (!gapi.auth2.getAuthInstance().isSignedIn.get()) await signInDrive();
  const bcont = await downloadDriveFile('cable_inventory.json');
  const lcont = await downloadDriveFile('logs.json');
  if (bcont) { try{ const b = typeof bcont === 'string' ? JSON.parse(bcont) : bcont; localStorage.setItem('cm_v7_boxes', JSON.stringify(b)); }catch(e){} }
  if (lcont) { try{ const l = typeof lcont === 'string' ? JSON.parse(lcont) : lcont; if (mergeLogsFlag){ const local = JSON.parse(localStorage.getItem('cm_v7_logs')||'[]'); const ids = new Set(local.map(x=>x.id)); l.forEach(item=>{ if(!ids.has(item.id)) local.unshift(item); }); localStorage.setItem('cm_v7_logs', JSON.stringify(local)); } else { localStorage.setItem('cm_v7_logs', JSON.stringify(l)); } }catch(e){} }
  return true;
}

// Enhanced error handling for drive functions
async function safeDriveOperation(operation) {
    try {
        return await operation();
    } catch (error) {
        console.error('Drive operation failed:', error);
        throw new Error(`Drive operation failed: ${error.message}`);
    }
}

// Auto-init helper used by v9
async function ensureGapiAutoInit(){
  if(typeof window === 'undefined') return false;
  if(!window.location || window.location.protocol === 'file:'){
    console.warn('Running under file:// — Google OAuth requires http(s).');
    return false;
  }
  if(!window.gapi){
    await new Promise((res, rej)=>{
      const s=document.createElement('script'); s.src='https://apis.google.com/js/api.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
  }
  try{ await initGapi(); return true;}catch(e){ console.warn('gapi init failed',e); return false; }
}