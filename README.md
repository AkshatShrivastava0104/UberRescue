# UberRescue - Natural Disaster Evacuation System

A comprehensive ride-hailing application optimized for emergency evacuations during natural disasters, featuring real-time hazard mapping, safe route optimization, and SOS functionality.

## 🚨 Features
 
- **Emergency SOS Ride Booking** - Priority evacuation requests
- **Real-Time Hazard Mapping** - Dynamic disaster zone visualization
- **Safe Route Optimization** - Intelligent pathfinding avoiding danger zones
- **Live Ride Tracking** - Real-time driver and rider coordination
- **Driver Safety Scoring** - Track and reward safe evacuation practices
- **Evacuation Analytics** - Comprehensive ride history and safety metrics

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Leaflet.js
- **Backend**: Node.js, Express, Socket.IO, JWT Authentication
- **Database**: PostgreSQL with Sequelize ORM
- **Real-Time**: Socket.IO for live updates
- **Maps**: Leaflet.js with OpenStreetMap

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd uber-rescue
npm run install:all
```

2. **Database Setup:**
```bash
# Create PostgreSQL database
createdb uber_rescue

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

3. **Run Database Migrations:**
```bash
npm run migrate
npm run seed
```

4. **Start Development Servers:**
```bash
npm run dev
```

Access the application at `http://localhost:5173`

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (default: 3001)
- `HAZARD_API_KEY` - External disaster API key (optional)

## 📱 Usage

### For Riders:
1. Register/Login as a rider
2. View real-time hazard map
3. Request normal ride or emergency SOS evacuation
4. Track driver location and ride progress
5. View evacuation history and safety scores

### For Drivers:
1. Register/Login as a driver
2. Set availability status
3. Receive ride requests with safety information
4. Navigate using safe routes avoiding hazard zones
5. Track safety score and completed rescues

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### Backend (Render)
1. Connect your repository to Render
2. Set environment variables in Render dashboard
3. Deploy as Web Service

### Frontend (Netlify/Vercel)
1. Build the frontend: `cd frontend && npm run build`
2. Deploy the `dist` folder to Netlify or Vercel
3. Configure environment variables for production API URL

## 📊 Database Schema

- **Users**: Authentication and profile data
- **Drivers**: Driver-specific information and availability
- **Rides**: Ride requests and status tracking
- **HazardZones**: Dynamic disaster zone data
- **RideHistory**: Completed ride records
- **SafetyScores**: Driver safety metrics

## 🔐 Security

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- CORS configuration
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.
