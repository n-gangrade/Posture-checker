# Posture Checker Desktop App

This project runs the Posture Checker as a desktop application using:
- Python (FastAPI backend)
- Vite (frontend)
- Electron (desktop wrapper)
- PyInstaller (bundles backend)

---

# 🚀 Setup & Run (First Time)

---

## 🪟 Windows Setup

### 1. Create and activate Python virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
for mac
source .venv/bin/activate
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

## 🍎 Mac Setup

### 1. Create and activate Python virtual environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

---

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
pip install pyinstaller
```

> If `pip` doesn’t work, try `pip3`

---

### 3. Install frontend & Electron dependencies

```bash
cd ..
npm run install-all
```

---

### 4. Run the app

```bash
npm start
```

---

# 🔁 Running Again Later

## 🪟 Windows
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
cd ..
npm start
```

## 🍎 Mac
```bash
cd backend
source .venv/bin/activate
cd ..
npm start
```

---

# 📦 Build Installer (Optional)

## 🪟 Windows
```powershell
npm run dist
```

> If this fails, run PowerShell as Administrator.

---

## 🍎 Mac
```bash
npm run dist
```

> You may need to allow the app in **System Settings → Privacy & Security**

---

# 📁 Project Structure

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

# 🛠 Troubleshooting

---

### ❌ "No module named PyInstaller"

#### Windows
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install pyinstaller
```

#### Mac
```bash
cd backend
source .venv/bin/activate
pip install pyinstaller
```

---

### ❌ Blank Electron window
- Ensure `frontend/dist` exists  
- Ensure files were copied to `electron/out`

---

### ❌ Build errors (clean rebuild)

#### Windows
```powershell
Remove-Item backend\dist -Recurse -Force
Remove-Item frontend\dist -Recurse -Force
Remove-Item electron\out -Recurse -Force

npm start
```

#### Mac
```bash
rm -rf backend/dist
rm -rf frontend/dist
rm -rf electron/out

npm start
```

---

# ✅ Quick Start Summary

## 🪟 Windows
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

## 🍎 Mac
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller

cd ..
npm run install-all
npm start
```

---

# 📌 Notes

- Do NOT commit:
  - `node_modules/`
  - `backend/dist/`
  - `frontend/dist/`
  - `electron/out/`
- These are generated automatically when running the app.
