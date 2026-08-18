const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from monorepo root
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const { initSocket } = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const communityRoutes = require('./routes/communityRoutes');

// Connect to Database
connectDB();

const app = express();
app.disable('etag');
const server = http.createServer(app);

// Initialize Sockets
initSocket(server);

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// CORS setup
app.use(
  cors({
    origin: true, // Allow all origins for dev simplicity, or set specific origin
    credentials: true
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Chat application backend service is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/communities', communityRoutes);

// Error Handling Middleware (must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server is run on port : ${PORT} `)
})


// Trigger nodemon restart
