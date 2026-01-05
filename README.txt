CableManagementWeb_v10
---------------------

This package includes a lightweight way to run the app locally so Google Drive OAuth works (OAuth requires http/https origins).

Files:
- login.html, home.html, settings.html, cable_inventory.html, function2.html, function2_setting.html
- style.css, script.js, google_drive.js, wallpaper.svg, server.js
- start_server.bat (Windows) — double-click to run
- start_server.sh (Mac / Linux) — run: ./start_server.sh
- README.txt (this file)

Important steps:
1) Replace CLIENT_ID_PLACEHOLDER in google_drive.js with your Google OAuth Client ID.
2) Make sure your OAuth credentials include http://localhost as an authorized JavaScript origin.
3) Double-click start_server.bat (Windows) or run ./start_server.sh (Linux/Mac) to start a local web server and open the app.
4) Visit http://localhost:8080/login.html if the browser doesn't open automatically.
5) Login with admin / 1234 (default). Connect to Google Drive in Settings, then enable auto-sync if desired.

If you want me to embed your Client ID and regenerate the zip, paste it here and I'll do it for you.


Updated: v11 - Embedded Client ID and renamed app to 'Cable Management System'. Glass header enabled.
