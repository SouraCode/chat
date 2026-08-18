# Nebula Chat - Real-Time Glassmorphic MERN Chat Application

Nebula Chat is a premium, state-of-the-art real-time messaging application designed with modern glassmorphism aesthetics. Built on the robust MERN stack (MongoDB, Express, React, Node.js), it integrates real-time bi-directional communication using Socket.io and features user-created communities, instant messaging with typing indicators, audio/video call simulation, profile customization, and secure authentication.

---

## 🌟 Key Features

### 💬 Real-Time Messaging & Dynamic Interactions
- **Instant Messaging**: Seamless messages delivered instantly with Socket.io.
- **Typing Indicators**: Real-time feedback showing when a user is typing a message in a conversation.
- **Online/Offline Status Tracking**: Automatic connection status updates with "last seen" timestamps when users disconnect.
- **Multimedia Type Framework**: Schema-ready fields for handling text, image, video, audio, and file messages.

### 👥 Chats & Communities
- **Direct 1-on-1 Chats**: Secure private messaging between any two users in the system.
- **Community Groups**: Large chat rooms created by users where anyone can join, leave, and converse in real-time.
- **User Discovery**: Instant global search to find users and start new direct messages or discover public communities.

### 📞 Audio & Video Calling Simulation
- **VoIP Signaling Panel**: A calling overlay simulating dialing, incoming rings, caller details (avatar and username), call acceptance, declining, minimizing, and ending calls.
- **Call Duration Counter**: Real-time timer indicating active call duration.
- **Simulated Hardware Controls**: Toggle controls for mute/unmute microphone, enable/disable camera, speaker volume, and screen share state.

### 🛡️ Security & Privacy
- **User Blocking**: Block/unblock feature preventing blocked users from initiating chats or calling.
- **Rate Limiting**: Express middleware restricting API request abuse.
- **Secure Authentication**: Password hashing using bcryptjs, token-based verification using JSON Web Tokens (JWT), and HTTP-only cookie storage fallback.

### 🎨 Premium Glassmorphic UI
- Deep neon-infused dark mode theme (`#0c0c0f` background) with organic glass panels (`backdrop-blur-2xl` and transparent borders).
- Interactive ambient glows and slide-in components.
- Responsive mobile layout transitions (`channels` -> `chat_window` -> `call_screen`).

---

## 🛠️ Technology Stack

| Layer | Technology | Key Packages / Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 19 (Vite), Tailwind CSS 3.4 | `socket.io-client`, `lucide-react`, `postcss`, `autoprefixer` |
| **Backend** | Node.js, Express.js | `socket.io`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `morgan` |
| **Database** | MongoDB | `mongoose` (ODM) |
| **Linter** | Oxlint | `oxlint` (Ultra-fast JavaScript/TypeScript linter) |

---

## 📂 Project Directory Structure

```text
chat-application/
├── backend/
│   ├── config/               # Database connection setup
│   ├── controllers/          # Business logic handlers (auth, chats, messages, etc.)
│   ├── middleware/           # Auth guarding & global error handler
│   ├── models/               # Mongoose schemas (User, Conversation, Message)
│   ├── routes/               # Express endpoints mapped to controllers
│   ├── services/             # Socket.io connection & event handling
│   ├── .env                  # Port, MongoDB URI, and JWT secret config
│   ├── server.js             # Main backend Entry point
│   └── package.json
├── frontend/
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── assets/           # Custom images and styles
│   │   ├── components/       # Modular UI components (Dock, Sidebar, ChatList, ChatWindow, CallPanel)
│   │   ├── context/          # Global React state (AuthContext, ChatContext, SocketContext)
│   │   ├── pages/            # View Pages (Auth screen, Main Dashboard workspace)
│   │   ├── App.jsx           # Main routing & state setup
│   │   ├── index.css         # Styling system including glassmorphic styles
│   │   └── main.jsx          # React app mount entry point
│   ├── tailwind.config.js    # Tailwind layout utility configuration
│   ├── vite.config.js        # Vite bundling and dev-server configuration
│   └── package.json
└── README.md                 # Main documentation
```

---

## 🔌 API Endpoints Reference

All API routes require authentication unless marked as **Public**. Authentication is verified using a bearer JWT token in the `Authorization` header (`Bearer <token>`).

### 🔑 Authentication (`/api/auth`)
- `POST /register` [**Public**]: Registers a new user. Expects `{ username, email, password, avatar }`. Returns the user profile and JWT token.
- `POST /login` [**Public**]: Authenticates a user. Expects `{ emailOrUsername, password }`. Sets cookies and returns user data with JWT token.
- `POST /logout` [**Private**]: Logs out the user, updates status to `offline`, updates last seen, and clears cookies.
- `GET /me` [**Private**]: Returns the logged-in user profile, status, and block list.

### 👤 Users (`/api/users`)
- `GET /` [**Private**]: Search users by username. Query param: `?search=<query>`.
- `PUT /profile` [**Private**]: Update profile avatar URL or username. Expects `{ username, avatar }`.
- `POST /block` [**Private**]: Blocks a user. Expects `{ userId }`.
- `POST /unblock` [**Private**]: Unblocks a user. Expects `{ userId }`.

### 💬 Chats/Conversations (`/api/chats`)
- `GET /` [**Private**]: Fetch all active conversations (both direct 1-on-1 and communities) the user is part of.
- `POST /` [**Private**]: Initiates or retrieves an existing direct chat with a user. Expects `{ recipientId }`.

### ✉️ Messages (`/api/messages`)
- `GET /:conversationId` [**Private**]: Fetches all messages from a specific conversation.
- `POST /` [**Private**]: Sends a message. Expects `{ conversationId, content, type }`.

### 👥 Communities (`/api/communities`)
- `GET /` [**Private**]: Gets public communities that the logged-in user has *not* joined yet.
- `POST /` [**Private**]: Creates a new community. Expects `{ name, avatar }`.
- `POST /:id/join` [**Private**]: Adds the logged-in user to the community participant list.
- `POST /:id/leave` [**Private**]: Removes the user from the community.

---

## ⚡ WebSocket / Socket.io Events

The WebSocket connection handles bi-directional messaging and events on port `3000`.

### 📤 Outgoing Client Events
- `joinChat` (payload: `conversationId`): Joins a socket room for a specific conversation.
- `leaveChat` (payload: `conversationId`): Leaves a conversation socket room.
- `typing` (payload: `{ conversationId }`): Signals that the user is typing.
- `stopTyping` (payload: `{ conversationId }`): Signals that the user stopped typing.
- `sendMessage` (payload: `{ conversationId, content, type }`): Dispatches a new message.
- `callUser` (payload: `{ userToCall, signalData, from, name }`): Initiates an outgoing call.
- `answerCall` (payload: `{ to, signal }`): Accepts an incoming call.
- `declineCall` (payload: `{ to }`): Rejects an incoming call.
- `endCall` (payload: `{ to }`): Ends an active call.

### 📥 Incoming Server Events
- `messageReceived` (payload: `messageObj`): Emitted when a new message is posted in a joined conversation room.
- `typing` / `stopTyping` (payload: `{ conversationId, userId }`): Broadcasts typing indicators to other participants.
- `incomingCall` (payload: `{ signal, from, name, avatar }`): Notifies client of an incoming call invitation.
- `callAccepted` (payload: `{ signal }`): Notifies caller that call was accepted.
- `callDeclined` (payload: `{ message }`): Notifies caller that call was declined.
- `callEnded`: Notifies client that call has been terminated.
- `userStatusChange` (payload: `{ userId, status, lastSeen }`): Broadcasts when a user goes online or offline.
- `errorMsg` (payload: `{ message }`): Emits server validation or permission errors (e.g. sending messages to blocked users).

---

## 🚀 Setup & Installation Instructions

Follow these steps to run both the backend and frontend services locally.

### 1. Prerequisites
- **Node.js** (v18.x or above recommended)
- **MongoDB Instance** (Local MongoDB Server or MongoDB Atlas cloud connection URI)

### 2. Clone and Configure Environment
Copy or create a `.env` file inside the `backend/` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_uri_here
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Install Dependencies & Run Server (Backend)
Open a terminal inside the workspace:
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Run the backend in development mode (with hot reloading via nodemon)
npm run dev
```
The server will start on [http://localhost:3000](http://localhost:3000). You can check health at [http://localhost:3000/health](http://localhost:3000/health).

### 4. Install Dependencies & Run Client (Frontend)
Open a new terminal window in the workspace root:
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the frontend in development mode (using Vite)
npm run dev
```
The Vite development server will start, typically exposing the application on [http://localhost:5173](http://localhost:5173). Open this URL in your web browser.

---

## 🛠️ Developer Scripts

### Backend (`/backend`)
- `npm run dev`: Launches Express server using `nodemon` for auto-reloading upon file changes.
- `npm start`: Standard node command to start the server in production environments.

### Frontend (`/frontend`)
- `npm run dev`: Starts the local Vite dev server.
- `npm run build`: Bundles assets for production deployment into the `dist` directory.
- `npm run lint`: Runs Oxlint for fast static code analysis.
- `npm run preview`: Launches a local preview server for production builds.

---

## 🚀 Step-by-Step Deployment Guide

Since this project is organized as a monorepo containing both `backend/` and `frontend/` directories, you can deploy both using the same GitHub repository.

### 🌐 Step 1: Push Your Code to GitHub
1. Make sure your local changes are committed and pushed to a remote GitHub repository.

---

### 🖥️ Step 2: Deploy the Backend on Render
[Render](https://render.com) is ideal for hosting Node.js express APIs and Socket.io web services.

1. Sign up/Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the chat application.
4. Configure the Web Service settings:
   - **Name**: `nebula-chat-backend` (or your preferred name)
   - **Root Directory**: `backend` *(This is crucial! It tells Render to deploy from the backend folder)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Scroll down and click **Advanced** -> **Add Environment Variable**. Add the following variables:
   - `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_super_secret_jwt_key_here` (make it complex)
   - `JWT_EXPIRE`: `7d`
   - `NODE_ENV`: `production`
6. Click **Create Web Service**.
7. Once deployed, Render will provide you with a live URL (e.g. `https://nebula-chat-backend.onrender.com`). **Copy this URL**, as we will need it for the frontend.

> [!NOTE]
> Since we are using Render's Free tier, the backend web service will spin down (sleep) after 15 minutes of inactivity. When a user opens the app again, it can take up to 50 seconds to boot up (a "cold start").

---

### 🎨 Step 3: Deploy the Frontend on Netlify
[Netlify](https://www.netlify.com) is perfect for building and hosting React/Vite frontend sites.

1. Sign up/Log in to [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** -> **Import an existing project**.
3. Select **GitHub** and authorize Netlify to access your repository.
4. Select the repository containing the chat application.
5. Configure the Build & Deploy settings:
   - **Base directory**: `frontend` *(This is crucial! It tells Netlify to build inside the frontend folder)*
   - **Build command**: `npm run build`
   - **Publish directory**: `dist` *(This is Vite's default output directory)*
6. Add the API URL Environment Variable:
   - Go to the **Environment variables** section (or under **Site Configuration** later).
   - Click **Add a variable** -> **Add single variable**.
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-service-url.onrender.com` *(Paste your live Render backend URL here)*
7. Click **Deploy site**.
8. Netlify will build and deploy your React frontend. It will provide you with a custom live URL (e.g. `https://nebula-chat.netlify.app`).

#### 🚨 Crucial: Handling Single Page Application (SPA) Refresh 404s
React uses client-side routing. If a user refreshes their browser on page paths like `/dashboard`, Netlify will return a `404 Not Found` because it looks for a static file at `/dashboard/index.html`.
To fix this, create a file named `_redirects` inside your frontend `public` directory:
- Path: `frontend/public/_redirects`
- Content:
  ```text
  /*    /index.html   200
  ```
This tells Netlify to redirect all routes to React's main `index.html` file, letting React handle the routing internally.

# Nebula Chat - Real-Time Glassmorphic MERN Chat Application

Nebula Chat is a premium, state-of-the-art real-time messaging application designed with modern glassmorphism aesthetics. Built on the robust MERN stack (MongoDB, Express, React, Node.js), it integrates real-time bi-directional communication using Socket.io and features user-created communities, instant messaging with typing indicators, audio/video call simulation, profile customization, and secure authentication.

---

## 🌟 Key Features

### 💬 Real-Time Messaging & Dynamic Interactions
- **Instant Messaging**: Seamless messages delivered instantly with Socket.io.
- **Typing Indicators**: Real-time feedback showing when a user is typing a message in a conversation.
- **Online/Offline Status Tracking**: Automatic connection status updates with "last seen" timestamps when users disconnect.
- **Multimedia Type Framework**: Schema-ready fields for handling text, image, video, audio, and file messages.

### 👥 Chats & Communities
- **Direct 1-on-1 Chats**: Secure private messaging between any two users in the system.
- **Community Groups**: Large chat rooms created by users where anyone can join, leave, and converse in real-time.
- **User Discovery**: Instant global search to find users and start new direct messages or discover public communities.

### 📞 Audio & Video Calling Simulation
- **VoIP Signaling Panel**: A calling overlay simulating dialing, incoming rings, caller details (avatar and username), call acceptance, declining, minimizing, and ending calls.
- **Call Duration Counter**: Real-time timer indicating active call duration.
- **Simulated Hardware Controls**: Toggle controls for mute/unmute microphone, enable/disable camera, speaker volume, and screen share state.

### 🛡️ Security & Privacy
- **User Blocking**: Block/unblock feature preventing blocked users from initiating chats or calling.
- **Rate Limiting**: Express middleware restricting API request abuse.
- **Secure Authentication**: Password hashing using bcryptjs, token-based verification using JSON Web Tokens (JWT), and HTTP-only cookie storage fallback.

### 🎨 Premium Glassmorphic UI
- Deep neon-infused dark mode theme (`#0c0c0f` background) with organic glass panels (`backdrop-blur-2xl` and transparent borders).
- Interactive ambient glows and slide-in components.
- Responsive mobile layout transitions (`channels` -> `chat_window` -> `call_screen`).

---

## 🛠️ Technology Stack

| Layer | Technology | Key Packages / Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 19 (Vite), Tailwind CSS 3.4 | `socket.io-client`, `lucide-react`, `postcss`, `autoprefixer` |
| **Backend** | Node.js, Express.js | `socket.io`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `morgan` |
| **Database** | MongoDB | `mongoose` (ODM) |
| **Linter** | Oxlint | `oxlint` (Ultra-fast JavaScript/TypeScript linter) |

---

## 📂 Project Directory Structure

```text
chat-application/
├── backend/
│   ├── config/               # Database connection setup
│   ├── controllers/          # Business logic handlers (auth, chats, messages, etc.)
│   ├── middleware/           # Auth guarding & global error handler
│   ├── models/               # Mongoose schemas (User, Conversation, Message)
│   ├── routes/               # Express endpoints mapped to controllers
│   ├── services/             # Socket.io connection & event handling
│   ├── .env                  # Port, MongoDB URI, and JWT secret config
│   ├── server.js             # Main backend Entry point
│   └── package.json
├── frontend/
│   ├── public/               # Static assets
│   │   └── _redirects        # Netlify SPA redirection rules
│   ├── src/
│   │   ├── assets/           # Custom images and styles
│   │   ├── components/       # Modular UI components (Dock, Sidebar, ChatList, ChatWindow, CallPanel)
│   │   ├── context/          # Global React state (AuthContext, ChatContext, SocketContext)
│   │   ├── pages/            # View Pages (Auth screen, Main Dashboard workspace)
│   │   ├── App.jsx           # Main routing & state setup
│   │   ├── index.css         # Styling system including glassmorphic styles
│   │   └── main.jsx          # React app mount entry point
│   ├── .npmrc                # Custom npm peer dependency resolution setting
│   ├── tailwind.config.js    # Tailwind layout utility configuration
│   ├── vite.config.js        # Vite bundling and dev-server configuration
│   └── package.json
└── README.md                 # Main documentation
```

---

## 🔌 API Endpoints Reference

All API routes require authentication unless marked as **Public**. Authentication is verified using a bearer JWT token in the `Authorization` header (`Bearer <token>`).

### 🔑 Authentication (`/api/auth`)
- `POST /register` [**Public**]: Registers a new user. Expects `{ username, email, password, avatar }`. Returns the user profile and JWT token.
- `POST /login` [**Public**]: Authenticates a user. Expects `{ emailOrUsername, password }`. Sets cookies and returns user data with JWT token.
- `POST /logout` [**Private**]: Logs out the user, updates status to `offline`, updates last seen, and clears cookies.
- `GET /me` [**Private**]: Returns the logged-in user profile, status, and block list.

### 👤 Users (`/api/users`)
- `GET /` [**Private**]: Search users by username. Query param: `?search=<query>`.
- `PUT /profile` [**Private**]: Update profile avatar URL or username. Expects `{ username, avatar }`.
- `POST /block` [**Private**]: Blocks a user. Expects `{ userId }`.
- `POST /unblock` [**Private**]: Unblocks a user. Expects `{ userId }`.

### 💬 Chats/Conversations (`/api/chats`)
- `GET /` [**Private**]: Fetch all active conversations (both direct 1-on-1 and communities) the user is part of.
- `POST /` [**Private**]: Initiates or retrieves an existing direct chat with a user. Expects `{ recipientId }`.

### ✉️ Messages (`/api/messages`)
- `GET /:conversationId` [**Private**]: Fetches all messages from a specific conversation.
- `POST /` [**Private**]: Sends a message. Expects `{ conversationId, content, type }`.

### 👥 Communities (`/api/communities`)
- `GET /` [**Private**]: Gets public communities that the logged-in user has *not* joined yet.
- `POST /` [**Private**]: Creates a new community. Expects `{ name, avatar }`.
- `POST /:id/join` [**Private**]: Adds the logged-in user to the community participant list.
- `POST /:id/leave` [**Private**]: Removes the user from the community.

---

## ⚡ WebSocket / Socket.io Events

The WebSocket connection handles bi-directional messaging and events on port `3000`.

### 📤 Outgoing Client Events
- `joinChat` (payload: `conversationId`): Joins a socket room for a specific conversation.
- `leaveChat` (payload: `conversationId`): Leaves a conversation socket room.
- `typing` (payload: `{ conversationId }`): Signals that the user is typing.
- `stopTyping` (payload: `{ conversationId }`): Signals that the user stopped typing.
- `sendMessage` (payload: `{ conversationId, content, type }`): Dispatches a new message.
- `callUser` (payload: `{ userToCall, signalData, from, name }`): Initiates an outgoing call.
- `answerCall` (payload: `{ to, signal }`): Accepts an incoming call.
- `declineCall` (payload: `{ to }`): Rejects an incoming call.
- `endCall` (payload: `{ to }`): Ends an active call.

### 📥 Incoming Server Events
- `messageReceived` (payload: `messageObj`): Emitted when a new message is posted in a joined conversation room.
- `typing` / `stopTyping` (payload: `{ conversationId, userId }`): Broadcasts typing indicators to other participants.
- `incomingCall` (payload: `{ signal, from, name, avatar }`): Notifies client of an incoming call invitation.
- `callAccepted` (payload: `{ signal }`): Notifies caller that call was accepted.
- `callDeclined` (payload: `{ message }`): Notifies caller that call was declined.
- `callEnded`: Notifies client that call has been terminated.
- `userStatusChange` (payload: `{ userId, status, lastSeen }`): Broadcasts when a user goes online or offline.
- `errorMsg` (payload: `{ message }`): Emits server validation or permission errors (e.g. sending messages to blocked users).

---

## 🚀 Setup & Installation Instructions

Follow these steps to run both the backend and frontend services locally.

### 1. Prerequisites
- **Node.js** (v18.x or above recommended)
- **MongoDB Instance** (Local MongoDB Server or MongoDB Atlas cloud connection URI)

### 2. Clone and Configure Environment
Copy or create a `.env` file inside the `backend/` directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_uri_here
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Install Dependencies & Run Server (Backend)
Open a terminal inside the workspace:
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Run the backend in development mode (with hot reloading via nodemon)
npm run dev
```
The server will start on [http://localhost:3000](http://localhost:3000). You can check health at [http://localhost:3000/health](http://localhost:3000/health).

### 4. Install Dependencies & Run Client (Frontend)
Open a new terminal window in the workspace root:
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the frontend in development mode (using Vite)
npm run dev
```
The Vite development server will start, typically exposing the application on [http://localhost:5173](http://localhost:5173). Open this URL in your web browser.

---

## 🛠️ Developer Scripts

### Backend (`/backend`)
- `npm run dev`: Launches Express server using `nodemon` for auto-reloading upon file changes.
- `npm start`: Standard node command to start the server in production environments.

### Frontend (`/frontend`)
- `npm run dev`: Starts the local Vite dev server.
- `npm run build`: Bundles assets for production deployment into the `dist` directory.
- `npm run lint`: Runs Oxlint for fast static code analysis.
- `npm run preview`: Launches a local preview server for production builds.

---

## 🚀 Step-by-Step Deployment Guide

Since this project is organized as a monorepo containing both `backend/` and `frontend/` directories, you can deploy both using the same GitHub repository.

### 🌐 Step 1: Push Your Code to GitHub
1. Make sure your local changes are committed and pushed to a remote GitHub repository.

---

### 🖥️ Step 2: Deploy the Backend on Render
[Render](https://render.com) is ideal for hosting Node.js express APIs and Socket.io web services.

1. Sign up/Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the chat application.
4. Configure the Web Service settings:
   - **Name**: `nebula-chat-backend` (or your preferred name)
   - **Root Directory**: `backend` *(This is crucial! It tells Render to deploy from the backend folder)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Scroll down and click **Advanced** -> **Add Environment Variable**. Add the following variables:
   - `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_super_secret_jwt_key_here` (make it complex)
   - `JWT_EXPIRE`: `7d`
   - `NODE_ENV`: `production`
6. Click **Create Web Service**.
7. Once deployed, Render will provide you with a live URL (e.g. `https://nebula-chat-backend.onrender.com`). **Copy this URL**, as we will need it for the frontend.

> [!NOTE]
> Since we are using Render's Free tier, the backend web service will spin down (sleep) after 15 minutes of inactivity. When a user opens the app again, it can take up to 50 seconds to boot up (a "cold start").

---

### 🎨 Step 3: Deploy the Frontend on Netlify
[Netlify](https://www.netlify.com) is perfect for building and hosting React/Vite frontend sites.

1. Sign up/Log in to [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** -> **Import an existing project**.
3. Select **GitHub** and authorize Netlify to access your repository.
4. Select the repository containing the chat application.
5. Configure the Build & Deploy settings:
   - **Base directory**: `frontend` *(This is crucial! It tells Netlify to build inside the frontend folder)*
   - **Build command**: `npm run build`
   - **Publish directory**: `dist` *(This is Vite's default output directory)*
6. Add the API URL Environment Variable:
   - Go to the **Environment variables** section (or under **Site Configuration** later).
   - Click **Add a variable** -> **Add single variable**.
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-service-url.onrender.com` *(Paste your live Render backend URL here)*
7. Click **Deploy site**.
8. Netlify will build and deploy your React frontend. It will provide you with a custom live URL (e.g. `https://nebula-chat.netlify.app`).

#### 🚨 Crucial: Resolving Peer Dependency & SPA Routing Issues
- **Peer Dependency resolution**: Because of version differences between React 19 and older packages like Lucide Icons, we have created a `frontend/.npmrc` file with `legacy-peer-deps=true`. Netlify will automatically use this config to bypass installation blocking.
- **Refreshes (404s)**: To prevent routing errors on client-side refresh, a `_redirects` file is included in your frontend `public` directory.
