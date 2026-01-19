# FlowAI - Where notes turn into goals
An AI Web Tool which focus on enhacing your productivity by making notes, creating goals, schedulings and automatic synchronize with Your Google Calendar. It creates a seamless workflow between note-taking and goal execution:

* **📝 AI Note Assistant:** Instantly summarizes notes, extracts key points, and generates actionable checklists with deadline suggestions (Optimized for Vietnamese context).
* **📊 Productivity Tracker:** A centralized dashboard to track habits, manage goals (Todo/Doing/Done), and sync directly with Google Calendar.
<p align="center">
  <img src="https://github.com/user-attachments/assets/ff60265e-059b-4eaf-b082-8c98ad1c04cc" width="32%" />
  <img src="https://github.com/user-attachments/assets/818b6a6c-001e-4328-b6d7-bd8f7bbbdd27" width="32%" />
  <img src="https://github.com/user-attachments/assets/a8e453b1-25b6-4712-a7fb-86ec506c2b37" width="32%" />
</p>

## 🛠️ Built With

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

> *Note: The system is designed to be LLM-agnostic. Currently configured with **Google Gemini** for cost-efficiency (Free Tier).*

### DevOps & Tools
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Conda](https://img.shields.io/badge/conda-342B029.svg?&style=for-the-badge&logo=anaconda&logoColor=white)

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
# 3. Install and use Node.js version 22
nvm install 22
nvm use 22

# Verify version (Should be v22.x.x)
node -v

# Try running the app again
npm run dev
```

## License
- This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
- Any questions please contact via baodinhtfb@gmail.com

> If you find this project useful, please give it a star ⭐️! Contributions are also welcome.
