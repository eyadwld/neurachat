# NeuraChat Backend

The backend API for NeuraChat, built with Node.js, Express, and MongoDB. It provides user registration and login, with an AI chat controller implemented using Google Gemini.

## Requirements

- Node.js and npm
- A MongoDB connection string
- A Google Gemini API key for the AI chat functionality

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   PORT=5000
   MONGODB_URL=mongodb://127.0.0.1:27017/neurachat
   JWT_SECRET=replace-with-a-long-random-secret
   GEMINI_API_KEY=your-gemini-api-key
   ```

   `MONGODB_URL` can be a local MongoDB URL or a MongoDB Atlas connection string. `GEMINI_API_KEY` is needed for Gemini requests.

3. Start the development server:

   ```bash
   npm run dev
   ```

   Or start it without nodemon:

   ```bash
   npm start
   ```

The server listens on port `5000` by default. Set `PORT` to use a different port.

## API

The API is mounted at `/api/v1`.

| Method | Endpoint              | Description     |
| ------ | --------------------- | --------------- |
| `GET`  | `/api/v1/user`        | List users      |
| `POST` | `/api/v1/user/signup` | Register a user |
| `POST` | `/api/v1/user/login`  | Log in a user   |

Signup and login requests accept JSON. Signup expects `name`, `email`, and `password`; login expects `email` and `password`.

The project also includes Gemini chat controller logic, but chat endpoints are not currently registered in the chat router.

## Technologies

- Node.js (ES modules)
- Express
- MongoDB with Mongoose
- JSON Web Tokens and bcrypt
- Google Gemini SDK
