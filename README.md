# Idea Collaboration System

A real-time platform for collaborative debate and idea exchange with text and visual representation modes.

## Overview

The Idea Collaboration System is a modern web application designed to facilitate structured debates and collaborative idea development. The system supports both text-based discussions and visual argument mapping, making complex discussions more accessible and engaging for all types of users.

## Features

- **Dual-Mode View**: Toggle between text-based and visual debate representations
- **Real-Time Collaboration**: See arguments, votes, and user presence update instantly
- **Structured Arguments**: Organize discussions with supporting and opposing points
- **Live Voting**: Vote on arguments and see results in real-time
- **User Presence**: See who's currently active in a debate
- **Typing Indicators**: Know when others are composing responses
- **Visual Argument Maps**: View debate structure as an interactive visualization

## Technology Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.io for real-time communication
- TypeScript for type safety
- JWT for authentication

### Frontend
- React with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- D3.js for visual debate maps
- Socket.io client for real-time updates

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (local installation or MongoDB Atlas account)
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/idea-collaboration-system.git
   cd idea-collaboration-system
   ```

2. **Set up the backend**
   ```bash
   cd backend
   
   # Install dependencies
   npm install
   
   # Create environment file
   cp .env.example .env
   ```
   
   Edit the `.env` file to include your MongoDB connection string and other configuration:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/ideacollab
   JWT_SECRET=your_secret_jwt_key
   CLIENT_URL=http://localhost:3000
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   
   # Install dependencies
   npm install
   
   # Create environment file
   cp .env.example .env
   ```
   
   Edit the `.env` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Seed the database**
   ```bash
   cd ../backend
   npm run seed
   ```
   This creates sample users, debates, and arguments for development.

5. **Start the application**
   
   In one terminal window, start the backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   In another terminal window, start the frontend:
   ```bash
   cd frontend
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

   You can log in with the following seeded accounts:
   - Email: `admin@example.com`, Password: `password123`
   - Email: `alex@example.com`, Password: `password123`
   - Email: `jordan@example.com`, Password: `password123`

## Project Structure

### Backend Structure
```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic and services
│   ├── sockets/        # Socket.io handlers
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── validation/     # Request validation schemas
│   ├── app.ts          # Express app setup
│   └── seed/           # Database seeding
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

### Frontend Structure
```
frontend/
├── public/             # Static files
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API and socket services
│   ├── store/          # Redux store and slices
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── App.tsx         # Main application component
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Available Scripts

Backend:
- `npm run dev`: Start the server in development mode with hot reloading
- `npm run build`: Build the TypeScript code to JavaScript
- `npm start`: Start the server from the built files
- `npm test`: Run the test suite
- `npm run seed`: Seed the database with sample data

Frontend:
- `npm start`: Start the development server
- `npm run build`: Build the application for production
- `npm test`: Run the test suite
- `npm run lint`: Lint the code

## Testing Real-Time Features

To test real-time collaboration:
1. Open the application in two different browser windows
2. Log in with different accounts in each window
3. Navigate to the same debate in both windows
4. Create arguments, vote, or reply in one window and observe the real-time updates in the other

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- This project was created as a platform to facilitate better online discussions and debates
- Inspired by argument mapping techniques and collaborative editing platforms