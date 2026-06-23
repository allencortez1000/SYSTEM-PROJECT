# GitHub Push Setup - Step by Step

## Step 1: Generate Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click the **"Generate new token"** button (top right)
3. Select **"Generate new token (classic)"**
4. Fill in the form:
   - **Token name**: `SYSTEM-PROJECT-Push` (or any name)
   - **Expiration**: Select an expiration date (e.g., 90 days)
   - **Select scopes**: Check the box for **`repo`** (full control of private repositories)
5. Click **"Generate token"** at the bottom
6. **COPY THE TOKEN** (you'll only see it once!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Store Token in Git (One-Time Setup)

Run this command in PowerShell/CMD:
```
git config --global credential.helper wincred
```

This tells Git to save credentials securely on Windows.

## Step 3: Push to GitHub

Once you have the token, run these commands:

```bash
cd "C:\Users\admin\Desktop\RHBC project\SYSTEM-PROJECT"
git push origin main
```

When prompted:
- **Username**: your-github-username (e.g., `allencortez1000`)
- **Password**: Paste the token you copied (NOT your GitHub password)

Git will save it securely for future pushes.

## Step 4: Verify Success

After pushing, you should see:
```
To https://github.com/allencortez1000/SYSTEM-PROJECT.git
   2936545..9ec216d  main -> main
```

Then check GitHub: https://github.com/allencortez1000/SYSTEM-PROJECT/commits/main

You should see the new commit "june 22 v2" at the top!

---

## Ready?

Once you have the token, paste it here and I'll run the push command for you!
