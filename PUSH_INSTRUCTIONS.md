# How to Push to GitHub

Your commit is ready but needs authentication to push. Choose one method:

## Option 1: Personal Access Token (Recommended)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Copy the token
5. Run this command and enter the token when prompted for password:
   ```bash
   cd "C:\Users\admin\Desktop\RHBC project\SYSTEM-PROJECT"
   git push origin main
   ```

## Option 2: SSH Key

1. Generate SSH key (if not already done):
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```
2. Add to GitHub: https://github.com/settings/keys
3. Update remote URL:
   ```bash
   git remote set-url origin git@github.com:allencortez1000/SYSTEM-PROJECT.git
   ```
4. Push:
   ```bash
   git push origin main
   ```

## Current Status

✅ Commit created: "june 22 v2"
✅ Changes staged: backend/src/routes/admin-users.ts, frontend/app/admin-users/page.tsx
✅ Ready to push (waiting for authentication)

Commit hash: 9ec216d
