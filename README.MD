# 🚀 Predusk - Portfolio Platform

A modern portfolio platform built with React, Node.js, and MongoDB.

## ✨ Features

- **User Authentication** - Secure login/register system
- **Profile Management** - Complete profile customization
- **Project Showcase** - Display your projects with images
- **Skills Management** - Organize your technical skills
- **Work Experience** - Track your professional journey
- **Social Links** - Connect your social media profiles
- **Search & Discovery** - Find other developers and projects
- **Responsive Design** - Works on all devices

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **Joi** for validation

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or Atlas)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Predusk
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Update .env with your MongoDB URI
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 🌐 Deployment

### Vercel Deployment

This project is configured for easy deployment on Vercel:

1. **Backend Deployment**
   ```bash
   cd backend
   vercel
   ```

2. **Frontend Deployment**
   ```bash
   cd frontend
   vercel
   ```

3. **Environment Variables**
   - Set `MONGODB_URI` in backend
   - Set `VITE_API_URL` in frontend

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
Predusk/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # MongoDB models
│   │   ├── middleware/     # Custom middleware
│   │   └── app.js          # Main server file
│   ├── vercel.json         # Vercel configuration
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   ├── vercel.json         # Vercel configuration
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/predusk
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend-url.vercel.app
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/work` - Add work experience
- `POST /api/profile/skills` - Add skill
- `POST /api/profile/projects` - Add project
- `PUT /api/profile/links` - Update social links

### Search
- `GET /api/search` - Search profiles/projects
- `GET /api/search/suggestions` - Get search suggestions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the [troubleshooting guide](./DEPLOYMENT.md#troubleshooting)
2. Open an issue on GitHub
3. Check the console for error messages

---

**Built with ❤️ for developers**
