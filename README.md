# Posture Checker Desktop App

This project runs the Posture Checker as a desktop application using:
- Python (FastAPI backend)
- Vite (frontend)
- Electron (desktop wrapper)
- PyInstaller (bundles backend)

---

## 🚀 Setup & Run (First Time)

### 1. Create and activate Python virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

### 2. Install backend dependencies

```powershell
pip install -r requirements.txt
pip install pyinstaller
```

---

### 3. Install frontend & Electron dependencies

```powershell
cd ..
npm run install-all
```

---

### 4. Run the app

```powershell
npm start
```

---

## 🔁 Running again later

Every time you open a new terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
cd ..
npm start
```

---

## 📦 Build Installer (Optional)

```powershell
npm run dist
```

> If this fails on Windows with a permissions error, run PowerShell as Administrator and try again.

---

## 📁 Project Structure

```
Posture-checker/
├── backend/
│   ├── capstoneStat.py
│   ├── requirements.txt
│   └── .venv/ (created locally)
├── frontend/
│   ├── src/
│   └── dist/ (generated)
├── electron/
│   ├── main.js
│   ├── package.json
│   └── out/ (generated)
├── package.json (root scripts)
└── .gitignore
```

---

## 🛠 Troubleshooting

### ❌ "No module named PyInstaller"
Make sure the virtual environment is activated:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
```

Then install:

```powershell
pip install pyinstaller
```

---

### ❌ Blank Electron window
- Make sure `frontend/dist` exists  
- Make sure files were copied to `electron/out`

---

### ❌ Build errors
Try a clean rebuild:

```powershell
Remove-Item backend\dist -Recurse -Force
Remove-Item frontend\dist -Recurse -Force
Remove-Item electron\out -Recurse -Force

npm start
```

---

## ✅ Summary

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller

cd ..
npm run install-all
npm start
```

---

## 📌 Notes

- Do NOT commit:
  - `node_modules/`
  - `backend/dist/`
  - `frontend/dist/`
  - `electron/out/`
- These are generated automatically when running the app.
