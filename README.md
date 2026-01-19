# FlowAI Project

## Installtion Guide

### 📋 Environment Prerequisites
Ensure you have the following installed before proceeding:
* **Python:** 3.10+
* **Node.js:** **20.19+** or **22** (Required for Vite).
* **Conda:** (Optional but recommended for Python environment management).
---

### Backend setup
#### 1. Clone the Repository
Start by cloning the project source code to your machine.
```bash
git clone https://github.com/BAoD1nH/FlowAI.git --recursive
cd FlowAI
```

```bash
conda create -n flowai python=3.10 -y
conda activate flowai

cd flowai-backend
pip install -r requirements.txt
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
### Frontend setup
```bash
cd flowai-frontend
npm install
npm run dev
```
If you encounter errors after 'npm run dev' like crypto.hash is not a function or version mismatch warnings, your Node.js version might be outdated. Follow these steps to update using NVM (Node Version Manager).

```bash
# 1. Install NVM (if not already installed)
curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash

# 2. Reload shell configuration (to use nvm immediately)
source ~/.bashrc  # or source ~/.zshrc
```

```bash
nvm install 22
nvm use 22
node -v
npm run dev
```
