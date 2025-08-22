# QuoteFlow

A Next.js application with Firebase Functions for quote management and RFQ processing.

## 🚀 Features

### Core Functionality
- **Role-Based Access Control**: User authentication with Admin, Sales, and Purchasing roles
- **Dynamic WLID Generation**: Automatic WLID generation based on product categories (FT** format)
- **Real-Time Notifications**: Multi-channel notification system with in-app and desktop alerts
- **Dashboard Interface**: Specialized dashboards for Sales and Purchasing roles
- **Image Management**: Product image upload with preview and enlargement capabilities

### User Management
- **Admin Controls**: Create, manage, and deactivate user accounts
- **Role Assignment**: Assign specific roles with tailored permissions
- **Password Management**: Secure password generation and reset functionality

### RFQ & Quote Management
- **RFQ Creation**: Streamlined request for quotation creation process
- **Quote Submission**: Purchasing agents can submit competitive quotes
- **Status Tracking**: Real-time tracking of RFQ and quote statuses
- **Product Management**: Detailed product specifications and categorization

### International Support
- **Multi-language**: Support for English, German, and Chinese
- **Auto-locale Detection**: Automatically switches based on user's configured locale
- **Localized Notifications**: Notifications adapt to user's language preference

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.3.3, React 18, TypeScript
- **Backend**: Firebase Functions (Node.js 20)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage (for image uploads)
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Deployment**: Firebase App Hosting

## 📋 Prerequisites

- Node.js 20 or higher
- Firebase CLI
- A Firebase project with the following services enabled:
  - Authentication
  - Firestore Database
  - Cloud Functions
  - Storage
  - App Hosting

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd quoteflow
```

### 2. Install Dependencies

```bash
# Install main project dependencies
npm install

# Install function dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Configuration

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com)

2. **Enable required services**:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Functions
   - Storage
   - App Hosting

3. **Configure environment variables**:
   Create `.env.production` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Set up Firestore Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isAdmin() {
         return request.auth != null && 
                exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
       }
       
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
                      (request.auth.uid == userId || isAdmin());
       }
       
       match /rfqs/{document=**} {
         allow read, write: if request.auth != null;
       }
       
       match /notifications/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### 4. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
# - Storage
```

### 5. Deploy Functions

```bash
# Deploy Firebase Functions
firebase deploy --only functions
```

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:9002](http://localhost:9002) to see the application.

## 🏗️ Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── login/              # Authentication pages
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── *.tsx               # Custom components
│   ├── contexts/               # React contexts
│   │   ├── auth-context.tsx    # Authentication context
│   │   ├── i18n-context.tsx    # Internationalization
│   │   └── notification-context.tsx
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions and configurations
│   │   ├── firebase.ts         # Firebase configuration
│   │   ├── types.ts            # TypeScript definitions
│   │   └── utils.ts            # Utility functions
├── functions/                  # Firebase Functions
│   ├── src/
│   │   ├── create-user.ts      # User creation function
│   │   └── index.ts            # Functions entry point
├── public/
│   └── locales/                # Translation files
│       ├── en.json             # English translations
│       ├── de.json             # German translations
│       └── zh.json             # Chinese translations
├── firestore.rules             # Firestore security rules
├── firebase.json               # Firebase configuration
└── package.json
```

## 👥 User Roles & Permissions

### Admin
- ✅ Create and manage user accounts
- ✅ Access user management dashboard
- ✅ View all RFQs and quotes
- ✅ Access recycle bin
- ✅ System-wide statistics

### Sales
- ✅ Create new RFQs
- ✅ Assign RFQs to purchasing agents
- ✅ View sales statistics
- ✅ Accept/reject quotes
- ✅ Manage customer communications

### Purchasing
- ✅ View assigned RFQs
- ✅ Submit quotes for products
- ✅ Update quote information
- ✅ View purchasing statistics
- ✅ Access assigned product details

## 🔧 Configuration

### WLID Generation Prefixes

Product series use specific WLID prefixes:
- **Wig**: `FTCV****`
- **Hair Extension**: `FTCE****`
- **Topper**: `FTCP****`
- **Toupee**: `FTCU****`
- **Synthetic Product**: `FTCS****`

### Notification System

The application supports:
- **In-app notifications**: Real-time updates within the application
- **Desktop notifications**: Browser-based desktop notifications
- **Multi-language notifications**: Notifications adapt to user's language

## 🚀 Deployment

### Firebase App Hosting

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

The application will be available at your Firebase App Hosting URL.

### Environment-Specific Configurations

- **Development**: `http://localhost:9002`
- **Production**: Your Firebase App Hosting domain

## 🌍 Internationalization

### Supported Languages
- **English** (en)
- **German** (de)
- **Chinese** (zh)

### Adding New Languages

1. Create a new translation file in `public/locales/[locale].json`
2. Update the `Language` type in `src/lib/types.ts`
3. Add the new option to language selectors in components

## 🔐 Security

### Authentication
- Email/password authentication via Firebase Auth
- Role-based access control
- Secure session management

### Data Protection
- Firestore security rules prevent unauthorized access
- User roles verified server-side
- Sensitive operations require admin privileges

### Best Practices
- Environment variables for sensitive configuration
- Secure file upload handling
- Input validation and sanitization

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Database Schema

#### Users Collection
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Sales' | 'Purchasing';
  status: 'Active' | 'Inactive';
  language: 'en' | 'de' | 'zh';
  registrationDate: string;
  lastLoginTime: string | null;
  avatar: string;
}
```

#### RFQs Collection
```typescript
interface RFQ {
  id: string;
  code: string;
  status: 'Waiting for Quote' | 'Quotation in Progress' | 'Quotation Completed' | 'Archived';
  inquiryTime: string;
  creatorId: string;
  assignedPurchaserIds: string[];
  customerType: string;
  customerEmail: string;
  products: Product[];
  quotes: Quote[];
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the Firebase Console for deployment logs

## 🚀 Future Enhancements

- [ ] Advanced reporting and analytics
- [ ] Email notification system
- [ ] Mobile application
- [ ] API integrations
- [ ] Enhanced file management
- [ ] Audit logging
- [ ] Advanced search and filtering

---

**Built with ❤️ using Next.js and Firebase**# QuoteFlow

A Next.js application with Firebase Functions for quote management and RFQ processing.
