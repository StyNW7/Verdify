'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  Leaf,
  Zap,
  Wallet,
  Star,
  ArrowRight,
  Train,
  Bus,
  Bike,
  Car,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TreePine,
  Calendar,
  Users,
  Settings,
  RefreshCw,
  CheckCircle,
  Footprints,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Types
interface RouteOption {
  id: string;
  name: string;
  type: 'eco' | 'fast' | 'cheap';
  badge: string;
  badgeColor: string;
  modes: string[];
  duration: number;
  durationText: string;
  co2: number;
  co2Saved: number;
  cost: number;
  points: number;
  steps: string[];
  isRecommended?: boolean;
}

export default function RoutePlannerPage() {
  // Form State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [preference, setPreference] = useState<'eco' | 'fast' | 'cheap'>('eco');
  const [allowedModes, setAllowedModes] = useState({
    rts: true,
    bus: true,
    walking: true,
    biking: true,
    evTaxi: true,
    lrt: true,
  });

  // Results State
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [carbonImpact, setCarbonImpact] = useState({
    totalSaved: 0,
    treesEquivalent: 0,
    moneySaved: 0,
    percentage: 0,
  });

  // Mock data for routes (will be replaced by API call)
  const mockRoutes: RouteOption[] = [
    {
      id: '1',
      name: 'Green Corridor',
      type: 'eco',
      badge: '🌱 RECOMMENDED - Best Eco',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      modes: ['🚇 RTS Link', '🚶 Walk', '🚌 Bus'],
      duration: 45,
      durationText: '45 min',
      co2: 0.8,
      co2Saved: 85,
      cost: 12.5,
      points: 150,
      isRecommended: true,
      steps: [
        'Walk 5 mins to Bukit Indah RTS Station (300m)',
        'Take RTS Link to Woodlands North (20 mins, 8 stops)',
        'Walk 10 mins to bus stop (800m)',
        'Take Bus 170 to destination (10 mins)',
        'Final walk 2 mins to arrival',
      ],
    },
    {
      id: '2',
      name: 'Express Route',
      type: 'fast',
      badge: '⚡ FASTEST',
      badgeColor: 'bg-blue-100 text-blue-700',
      modes: ['🚗 GrabEV', '🚇 RTS Link'],
      duration: 30,
      durationText: '30 min',
      co2: 1.2,
      co2Saved: 70,
      cost: 18.0,
      points: 80,
      steps: [
        'Book GrabEV (3 min wait)',
        'Take GrabEV to RTS Station (10 min)',
        'Take RTS Link to Woodlands North (15 min)',
        'Walk 2 mins to destination',
      ],
    },
    {
      id: '3',
      name: 'Budget Saver',
      type: 'cheap',
      badge: '💰 CHEAPEST',
      badgeColor: 'bg-amber-100 text-amber-700',
      modes: ['🚌 Public Bus Only'],
      duration: 75,
      durationText: '75 min',
      co2: 0.5,
      co2Saved: 90,
      cost: 4.5,
      points: 200,
      steps: [
        'Walk to bus stop (5 min)',
        'Take Bus CW1 to CIQ (25 min)',
        'Transfer to Bus 170 (5 min wait)',
        'Take Bus 170 to destination (35 min)',
        'Walk 5 min to arrival',
      ],
    },
  ];

  // Mock carbon impact
  const mockCarbonImpact = {
    totalSaved: 2.5,
    treesEquivalent: 0.1,
    moneySaved: 8.0,
    percentage: 85,
  };

  // Handle form submission
  const handlePlanRoute = async () => {
    // Validation
    if (!origin.trim()) {
      alert('Please enter your origin location');
      return;
    }
    if (!destination.trim()) {
      alert('Please enter your destination');
      return;
    }
    if (!departureTime) {
      alert('Please select departure time');
      return;
    }

    setIsLoading(true);

    // Simulate API call to AI
    setTimeout(() => {
      setRoutes(mockRoutes);
      setCarbonImpact(mockCarbonImpact);
      setShowResults(true);
      setSelectedRoute('1'); // Auto-select recommended route
      setIsLoading(false);
    }, 2000);
  };

  // Handle route selection
  const handleSelectRoute = (routeId: string) => {
    setSelectedRoute(routeId);
  };

  // Get selected route data
  const getSelectedRouteData = () => {
    return routes.find(route => route.id === selectedRoute);
  };

  // Reset form
  const handleReset = () => {
    setOrigin('');
    setDestination('');
    setDepartureTime('');
    setShowResults(false);
    setSelectedRoute(null);
    setRoutes([]);
  };

  // Toggle transport mode
  const toggleMode = (mode: keyof typeof allowedModes) => {
    setAllowedModes(prev => ({ ...prev, [mode]: !prev[mode] }));
  };

  // Get current date time min (can't select past)
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Plan Your{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Green Journey
              </span>
            </h1>
            <p className="text-gray-500 text-lg">
              Tell us where you're going, and we'll find the most sustainable route
            </p>
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8"
          >
            <div className="p-6 md:p-8">
              {/* Main Input Row */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Origin */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="Bukit Indah, Johor"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Destination */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Woodlands North, Singapore"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Departure Time */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      min={getCurrentDateTime()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Preference Row */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Travel Preference
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setPreference('eco')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      preference === 'eco'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Leaf size={18} />
                    Eco First
                  </button>
                  <button
                    onClick={() => setPreference('fast')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      preference === 'fast'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Zap size={18} />
                    Fastest
                  </button>
                  <button
                    onClick={() => setPreference('cheap')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                      preference === 'cheap'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Wallet size={18} />
                    Cheapest
                  </button>
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-4"
              >
                <Settings size={16} />
                Advanced Options
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Advanced Options Panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                      {/* Passengers */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Users size={16} className="inline mr-2" />
                          Number of Passengers
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map(num => (
                            <button
                              key={num}
                              onClick={() => setPassengers(num)}
                              className={`w-12 h-12 rounded-xl font-medium transition-all ${
                                passengers === num
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Transport Modes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Allowed Transport Modes
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => toggleMode('rts')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.rts
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Train size={16} />
                            RTS Link
                          </button>
                          <button
                            onClick={() => toggleMode('lrt')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.lrt
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Train size={16} />
                            LRT
                          </button>
                          <button
                            onClick={() => toggleMode('bus')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.bus
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Bus size={16} />
                            Bus
                          </button>
                          <button
                            onClick={() => toggleMode('walking')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.walking
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Footprints size={16} />
                            Walking
                          </button>
                          <button
                            onClick={() => toggleMode('biking')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.biking
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Bike size={16} />
                            Biking
                          </button>
                          <button
                            onClick={() => toggleMode('evTaxi')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                              allowedModes.evTaxi
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 opacity-50'
                            }`}
                          >
                            <Car size={16} />
                            EV Taxi
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlanRoute}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Analyzing Routes...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Plan My Green Route
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Results Section */}
          <AnimatePresence>
            {showResults && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
              >
                {/* Journey Summary Bar */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">{origin}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{destination}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    {new Date(departureTime).toLocaleString()}
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-emerald-600 text-sm hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    New Search
                  </button>
                </div>

                {/* Route Tabs/Cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {routes.map((route) => (
                    <motion.div
                      key={route.id}
                      whileHover={{ y: -4 }}
                      onClick={() => handleSelectRoute(route.id)}
                      className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                        selectedRoute === route.id
                          ? 'border-emerald-500 bg-emerald-50/30 shadow-lg'
                          : 'border-gray-200 hover:border-emerald-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${route.badgeColor}`}>
                          {route.badge}
                        </span>
                        {route.isRecommended && (
                          <CheckCircle size={18} className="text-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-3 text-sm text-gray-600">
                        {route.modes.map((mode, idx) => (
                          <span key={idx}>
                            {mode}
                            {idx < route.modes.length - 1 && ' → '}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center py-3 border-y border-gray-100 mb-3">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{route.durationText}</p>
                          <p className="text-xs text-gray-500">Duration</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-600">{route.co2} kg</p>
                          <p className="text-xs text-gray-500">CO₂</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">RM {route.cost}</p>
                          <p className="text-xs text-gray-500">Cost</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Star size={14} />
                          <span className="text-sm font-medium">+{route.points} pts</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRoute(route.id);
                          }}
                          className={`text-sm font-medium ${
                            selectedRoute === route.id
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {selectedRoute === route.id ? 'Selected ✓' : 'Select →'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Selected Route Details */}
                {getSelectedRouteData() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid lg:grid-cols-3 gap-6"
                  >
                    {/* Left: Step-by-Step Directions */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="text-emerald-600" />
                        Step-by-Step Directions
                      </h3>
                      <div className="space-y-4">
                        {getSelectedRouteData()!.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-700">{step}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Button */}
                      <button className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                        <CheckCircle size={18} />
                        Start This Green Journey
                        <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* Right: Carbon Impact Summary */}
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Leaf className="text-emerald-600" />
                        Your Environmental Impact
                      </h3>
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">CO₂ Saved This Trip</p>
                          <p className="text-3xl font-bold text-emerald-600">
                            {carbonImpact.totalSaved} kg
                          </p>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${carbonImpact.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {carbonImpact.percentage}% less than driving alone
                          </p>
                        </div>

                        <div className="flex items-center gap-3 py-3 border-t border-b border-emerald-200">
                          <TreePine className="w-8 h-8 text-emerald-600" />
                          <div>
                            <p className="text-sm text-gray-600">Equivalent to planting</p>
                            <p className="text-xl font-bold text-emerald-600">
                              {carbonImpact.treesEquivalent} trees 🌳
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-2">Green Points Earned</p>
                          <div className="flex items-center gap-2">
                            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                            <p className="text-2xl font-bold text-gray-900">
                              +{getSelectedRouteData()?.points}
                            </p>
                            <span className="text-sm text-gray-500">points</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-2">Money Saved</p>
                          <p className="text-2xl font-bold text-gray-900">
                            RM {carbonImpact.moneySaved}
                          </p>
                          <p className="text-xs text-gray-500">
                            Compared to driving alone
                          </p>
                        </div>
                      </div>

                      {/* Green Tip */}
                      <div className="mt-6 bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-emerald-700">
                          💡 Green Tip: Taking public transport 5 days a week can save up to 
                          500 kg CO₂ per year!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State (Before Search) */}
          {!showResults && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Ready to Go Green?
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Fill in your journey details above and let our AI find the most sustainable route for you.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}