# Deployment Guide

This project combines a Vite React frontend and an Express Node.js backend. Depending on the hosting provider, you will need to deploy this project differently.

## 1. Render (Recommended for Full-Stack)

Render natively supports long-running Node.js servers, making it perfect for our Express backend (which runs Telegram polling intervals) alongside our Vite frontend.

1. Go to your **Render Dashboard** and click **New+** > **Web Service**.
2. Connect your GitHub repository.
3. Use the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Node Version:** Add an environment variable `NODE_VERSION` set to `20`.
4. Render will automatically build the frontend into `dist/` and compile the server, then start the Express app!

We have included a `render.yaml` file in the root if you prefer to use Blueprint deployment.

## 2. Vercel

Vercel is optimized for serverless functions, so long-running Node.js processes (like our `setInterval` for Telegram polling) might not work natively on Vercel unless you refactor the backend. However, if you are just hosting the React frontend, Vercel works great out-of-the-box.

1. Go to **Vercel** and import the repository.
2. Vercel automatically detects **Vite**.
3. Set the **Build Command** to `npm run build` by default.
4. Note: Your backend Express API (`server.ts`) will need to be exported as a standard Node Serverless function inside an `/api/` directory if you wish to host the API on Vercel as well. Currently, a basic `vercel.json` rewrite configuration is provided.

## 3. Cloudflare Pages

Cloudflare Pages also excels at hosting the static frontend build.

1. Go to **Cloudflare Dashboard** > **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Use these build settings:
   - **Framework Preset:** `None`
   - **Build command:** `npx vite build`
   - **Build output directory:** `dist`

4. *Note on full-stack support:* Cloudflare Pages supports edge Functions, but because we are using Express (`express` framework relies on Node HTTP modules), our backend cannot run on Cloudflare Workers natively without a polyfill adapter (like `@cloudflare/kv-asset-handler` or replacing Express with `Hono`). If you deploy to Cloudflare, you will likely need to separate the Node Express server onto Render/Railway/Fly.io and just host the frontend on Cloudflare.
