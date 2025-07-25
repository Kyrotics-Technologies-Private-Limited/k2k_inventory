# K2K Inventory Management System

A comprehensive full-stack inventory management system built with React, TypeScript, Node.js, and Firebase. This system provides a complete solution for managing products, variants, orders, customers, and administrative operations for K2K's inventory needs.

## 🚀 Features

### 🔐 Authentication & Authorization
- **Firebase Authentication** integration
- **Protected Routes** for admin access
- **Role-based access control**
- **Secure login/signup system**

### 📦 Product Management
- **Product CRUD operations** (Create, Read, Update, Delete)
- **Variant management** with different weights and pricing
- **Image management** (main, gallery, banner images)
- **Stock status tracking** (in_stock, low_stock, out_of_stock)
- **Category organization** (ghee, oils, honey)
- **SKU management**
- **Warehouse tracking**

### 🛒 Order Management
- **Order processing and tracking**
- **Order details and history**
- **Status management**
- **Customer order association**

### 👥 Customer Management
- **Customer profiles and details**
- **Order history per customer**
- **Customer analytics**

### 📊 Dashboard & Analytics
- **Real-time dashboard** with key metrics
- **Chart visualizations** using ApexCharts and Chart.js
- **Sales analytics**
- **Inventory insights**

### 🎨 Modern UI/UX
- **Responsive design** with Tailwind CSS
- **Material-UI components**
- **Shadcn/ui components**
- **Smooth animations** with Framer Motion
- **Toast notifications**
- **Loading states and error handling**

## 🏗️ Architecture

### Frontend (Client)
- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Redux Toolkit** for state management
- **React Hook Form** with Zod validation
- **Tailwind CSS** for styling
- **Material-UI** and **Shadcn/ui** for components

### Backend (Server)
- **Node.js** with Express.js
- **Firebase Admin SDK** for authentication
- **RESTful API** architecture
- **CORS** enabled for cross-origin requests
- **Environment-based configuration**

### Database & Services
- **Firebase** for authentication and data storage
- **Firebase Admin SDK** for server-side operations

## 📁 Project Structure

```
k2k_inventory/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   └── admin/
│   │   │       └── layout/          # Admin layout components
│   │   ├── context/                 # React context providers
│   │   ├── pages/
│   │   │   └── admin/               # Admin pages
│   │   ├── services/
│   │   │   ├── api/                 # API service functions
│   │   │   └── firebase/            # Firebase configuration
│   │   ├── types/                   # TypeScript type definitions
│   │   └── utils/                   # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── server/                          # Backend Node.js application
│   ├── controllers/                 # Route controllers
│   ├── firebase/                    # Firebase configuration
│   ├── middleware/                  # Express middleware
│   ├── routes/                      # API routes
│   ├── index.js                     # Server entry point
│   └── package.json
└── README.md
```

## 🛠️ Technology Stack

### Frontend
- **React 19.1.0** - UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 6.2.6** - Build tool
- **React Router DOM 7.5.0** - Routing
- **Redux Toolkit 2.7.0** - State management
- **React Hook Form 7.55.0** - Form handling
- **Zod 3.24.2** - Schema validation
- **Tailwind CSS 4.1.4** - Utility-first CSS
- **Material-UI 7.0.2** - Component library
- **Shadcn/ui 0.0.4** - UI components
- **Framer Motion 12.7.2** - Animations
- **ApexCharts 4.5.0** - Charts
- **Chart.js 4.4.8** - Charts
- **Axios 1.8.4** - HTTP client
- **Firebase 11.6.0** - Backend services

### Backend
- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **Firebase Admin SDK 13.2.0** - Firebase integration
- **CORS 2.8.5** - Cross-origin resource sharing
- **Dotenv 16.4.7** - Environment variables
- **Nodemon 3.1.9** - Development server
- **UUID 11.1.0** - Unique identifiers

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Firebase project** with authentication enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd k2k_inventory
   ```

2. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../server
   npm install
   ```

4. **Environment Setup**

   Create a `.env` file in the server directory:
   ```env
   PORT=5567
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY=your-firebase-private-key
   FIREBASE_CLIENT_EMAIL=your-firebase-client-email
   ```

   Create a `.env` file in the client directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5567/api
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:5567`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   The client will run on `http://localhost:5173`

3. **Access the application**
   - Open your browser and navigate to `http://localhost:5173`
   - You'll be redirected to the admin login page
   - Create an account or log in to access the dashboard

## 📋 Available Scripts

### Frontend (client/)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (server/)
```bash
npm run dev          # Start development server with nodemon
npm test             # Run tests (not configured yet)
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Variants
- `GET /api/variants` - Get all variants
- `POST /api/variants` - Create new variant
- `GET /api/variants/:id` - Get variant by ID
- `PUT /api/variants/:id` - Update variant
- `DELETE /api/variants/:id` - Delete variant

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status

### Cart
- `GET /api/carts` - Get user cart
- `POST /api/carts` - Add item to cart
- `PUT /api/carts/:id` - Update cart item
- `DELETE /api/carts/:id` - Remove item from cart

### Addresses
- `GET /api/addresses` - Get user addresses
- `POST /api/addresses` - Add new address
- `PUT /api/addresses/:id` - Update address
- `DELETE /api/addresses/:id` - Delete address

### Admin
- `GET /api/admin/dashboard` - Get dashboard data
- `GET /api/admin/customers` - Get all customers
- `GET /api/admin/analytics` - Get analytics data

## 🔐 Authentication Flow

1. **User Registration/Login**
   - Users can register or login through Firebase Authentication
   - JWT tokens are used for session management
   - Protected routes require valid authentication

2. **Route Protection**
   - All admin routes are protected using `ProtectedRoute` component
   - Unauthorized users are redirected to login page
   - Session persistence across browser refreshes

## 📊 Data Models

### Product
```typescript
interface Product {
  id: string;
  name: string;
  price: {
    amount: number;
    currency: "INR";
  };
  description: string;
  origin: string;
  sku: string;
  warehouseName: string;
  category: "ghee" | "oils" | "honey";
  images: {
    main: string;
    gallery: string[];
    banner: string;
  };
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  ratings: number;
  reviews: number;
  badges: {
    text: string;
    type: "organic" | "natural" | "premium" | "limited";
  }[];
  benefits: {
    title: string;
    description: string;
    icon: string;
  }[];
}
```

### Product Variant
```typescript
interface ProductVariant {
  weight: string;
  price: number;
  inStock: boolean;
  originalPrice?: number;
  discount?: number;
}
```

## 🎨 UI Components

The application uses a combination of:
- **Material-UI** for core components
- **Shadcn/ui** for modern UI elements
- **Tailwind CSS** for custom styling
- **Framer Motion** for smooth animations
- **React Icons** and **Lucide React** for icons

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🔒 Security Features

- **Firebase Authentication** for secure user management
- **Protected routes** to prevent unauthorized access
- **CORS configuration** for secure API communication
- **Environment variables** for sensitive configuration
- **Input validation** using Zod schemas

## 🚀 Deployment

### Frontend Deployment
1. Build the application:
   ```bash
   cd client
   npm run build
   ```
2. Deploy the `dist` folder to your hosting service (Vercel, Netlify, etc.)

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Deploy to services like:
   - Heroku
   - Railway
   - DigitalOcean App Platform
   - AWS Elastic Beanstalk

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with basic inventory management
- Features: Product management, order tracking, customer management, admin dashboard

## 🎯 Roadmap

- [ ] Customer-facing e-commerce interface
- [ ] Advanced analytics and reporting
- [ ] Multi-warehouse support
- [ ] Barcode scanning integration
- [ ] Mobile app development
- [ ] Advanced inventory forecasting
- [ ] Integration with shipping providers
- [ ] Multi-language support

---

**Built with ❤️ for K2K Inventory Management**

