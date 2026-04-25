# Whisper AI: 24/7 Hosting & Deployment Guide

To make Whisper a "proper app" that stays online even when your computer is off, you need to move the "brain" (the backend) to the cloud.

## 1. Running Silently (Background Mode)
I have created a **Whisper.vbs** file in your project folder. 
- **What it does:** It launches the entire system (Frontend + Backend) without showing any black console windows (tabs).
- **How to use:** Double-click `Whisper.vbs`. It will start Whisper in the background, and you'll only see the beautiful UI.

---

## 2. Running 24/7 (Even when PC is Off)
To have Whisper available 24/7 on your phone or other devices, you can host it in the cloud.

### Option A: LiveKit Cloud (Easiest)
You are already using LiveKit. You can deploy your Python script (`whisper_agent.py`) to a cloud provider so it stays "alive" even when your local machine is off.

> [!CAUTION]
> **Important Limitation:** If your local PC is off, Whisper **cannot** control your PC (like opening apps or checking local diagnostics). However, she can still talk to you, check the news, weather, and perform cloud-based tasks.

### Option B: Hosting on a VPS (Recommended for Experts)
You can rent a small server (VPS) from providers like **DigitalOcean**, **Linode**, or **Fly.io** (often has a free tier).
1. Copy this project to the server.
2. Run `uv run whisper_agent.py dev` on the server.
3. Whisper will stay online 24/7.

---

## 3. Auto-Start on Windows Boot
If you want Whisper to start automatically every time you turn on your computer:
1. Press `Win + R`, type `shell:startup`, and press Enter.
2. Create a **Shortcut** to `Whisper.vbs` and paste it into that folder.
3. Whisper will now greet you as soon as you log in!

---

## Summary of Files Created:
- **Whisper.vbs**: Launches the app silently (No Tabs).
- **Whisper.bat**: Launches the app with logs (For debugging).
- **desktop_app.py**: Updated to hide all internal backend consoles.
