import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, MapPin, Users, BarChart3, AlertTriangle, Phone } from 'lucide-react'

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-red-600" />
              <span className="text-xl font-bold text-gray-900">UberRescue</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Emergency Evacuation
              <br />
              <span className="text-red-600">Ride Service</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              When disasters strike, UberRescue connects you to safety. Our emergency ride-hailing service 
              uses real-time hazard mapping and safe route optimization to evacuate people from danger zones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-danger text-lg px-8 py-4">
                Request Emergency Ride
              </Link>
              <Link to="/register" className="btn-outline text-lg px-8 py-4">
                Become a Rescue Driver
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How UberRescue Saves Lives
            </h2>
            <p className="text-xl text-gray-600">
              Advanced technology meets emergency response
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">SOS Emergency Button</h3>
              <p className="text-gray-600">
                One-tap emergency evacuation with priority driver matching and immediate response.
              </p>
            </div>

            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Hazard Mapping</h3>
              <p className="text-gray-600">
                Live disaster zone tracking with dynamic route optimization to avoid danger areas.
              </p>
            </div>

            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Rescue Drivers</h3>
              <p className="text-gray-600">
                Background-checked drivers equipped with emergency supplies and safety training.
              </p>
            </div>

            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe Route Optimization</h3>
              <p className="text-gray-600">
                AI-powered pathfinding algorithm calculates safest evacuation routes in real-time.
              </p>
            </div>

            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Emergency Coordination</h3>
              <p className="text-gray-600">
                Direct communication with emergency services and automatic family notifications.
              </p>
            </div>

            <div className="card-hover text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safety Analytics</h3>
              <p className="text-gray-600">
                Track evacuation history, safety scores, and route efficiency for continuous improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Stats */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Emergency Response Statistics
            </h2>
            <p className="text-xl text-gray-600">
              Every second counts in disaster situations
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-red-600 mb-2">2.5M</div>
              <div className="text-gray-600">People evacuated safely</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">89%</div>
              <div className="text-gray-600">Faster than traditional emergency services</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">15K</div>
              <div className="text-gray-600">Verified rescue drivers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">24/7</div>
              <div className="text-gray-600">Emergency response availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready When Disaster Strikes
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Join thousands who trust UberRescue for emergency evacuation. 
            Sign up now and be prepared for any situation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=rider" className="bg-white text-red-600 font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors">
              Sign Up as Rider
            </Link>
            <Link to="/register?role=driver" className="border-2 border-white text-white font-semibold px-8 py-4 rounded-lg hover:bg-white hover:text-red-600 transition-colors">
              Become a Driver
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-red-600" />
              <span className="text-lg font-bold">UberRescue</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400">
                Emergency evacuation service • Available 24/7 • Saving lives through technology
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home