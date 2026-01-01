# KinkyForex - USDT Trading Profit Tracker

A full-stack application for tracking USDT forex trading profits with multi-user workspace support, card management, and partnership profit splitting.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Authentication** - Email/password registration with JWT tokens, Google OAuth support
- **Multi-Tenant Workspaces** - Isolated data per workspace with role-based access (Owner, Admin, Member)
- **Partnership Support** - Invite team members and automatically split profits based on configurable percentages
- **Card Management** - Track multiple trading cards with monthly utilization limits
- **Transaction Tracking** - Record buys/sells with automatic profit calculations based on exchange rates
- **Dashboard Analytics** - Visual charts showing profit trends, card utilization, and partner distributions
- **CSV Export** - Export transaction data for external reporting
- **Theme Support** - Light, dark, and system-based themes

## Tech Stack

### Backend
- **Runtime**: Node.js 20 + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + HTTP-only refresh tokens, Passport.js for OAuth
- **Validation**: Zod schemas
- **Security**: Helmet.js, CORS, bcrypt

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **UI Components**: Radix UI primitives

### Infrastructure
- **Database**: PostgreSQL 16
- **Hosting**: Netlify (frontend) + Railway (backend) + Supabase (database)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or cloud)

### Local Development

1. **Clone and configure**
   ```bash
   cd kinkyforex
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   ```

2. **Setup database** (choose one option)
   
   **Option A: Local PostgreSQL**
   ```bash
   # Install PostgreSQL locally, then create database
   createdb kinkyforex
   # Update DATABASE_URL in .env:
   # DATABASE_URL=postgresql://postgres:password@localhost:5432/kinkyforex
   ```
   
   **Option B: Cloud (Supabase - recommended)**
   - Create free account at [supabase.com](https://supabase.com)
   - Create project → Copy connection string to .env

3. **Setup server**
   ```bash
   cd server
   npm install
   npx prisma migrate dev
   npm run dev
   ```

4. **Setup client** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001/api

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide using:
- **Netlify** (frontend) - Free
- **Railway** (backend) - $5 free credits/month  
- **Supabase** (database) - Free 500MB

## Project Structure

```
kinkyforex/
├── netlify.toml                # Frontend deployment config
├── .env.example                # Environment template
│
├── server/                     # Backend API
│   ├── railway.json            # Railway deployment config
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── index.ts            # Entry point
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth, validation
│       ├── routes/             # API routes
│       ├── utils/              # JWT, calculations
│       └── validators/         # Zod schemas
│
└── client/                     # Frontend SPA
    └── src/
        ├── main.tsx            # Entry point
        ├── App.tsx             # Router setup
        ├── api/                # API client
        ├── components/         # UI components
        ├── hooks/              # React Query hooks
        ├── pages/              # Page components
        ├── stores/             # Zustand stores
        └── types/              # TypeScript types
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout and clear tokens |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google` | Google OAuth redirect |

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces/onboard` | Complete onboarding |
| GET | `/api/workspaces/current` | Get current workspace |
| GET | `/api/workspaces/members` | List workspace members |
| POST | `/api/workspaces/invite` | Invite new member |
| POST | `/api/workspaces/invite/:token/accept` | Accept invitation |
| PATCH | `/api/workspaces/members/:id/split` | Update profit split |

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cards` | List all cards |
| POST | `/api/cards` | Create new card |
| GET | `/api/cards/:id` | Get card details |
| PATCH | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |
| GET | `/api/cards/utilization` | Get cards with usage |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (filterable) |
| POST | `/api/transactions` | Create transaction |
| GET | `/api/transactions/:id` | Get transaction details |
| PATCH | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/export` | Export as CSV |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get summary stats |
| GET | `/api/dashboard/monthly` | Monthly breakdown |
| GET | `/api/dashboard/recent` | Recent activity |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get workspace settings |
| PATCH | `/api/settings` | Update settings |
| PATCH | `/api/settings/rates` | Update default rates |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3001 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT signing |
| `JWT_EXPIRES_IN` | No | 15m | Access token expiry |
| `REFRESH_TOKEN_EXPIRES_IN` | No | 7d | Refresh token expiry |
| `CLIENT_URL` | No | http://localhost:5173 | Frontend URL for CORS |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth secret |
| `VITE_API_URL` | No | /api | API base URL for frontend |

## Profit Calculation

Transactions calculate profit based on:

1. **Buy Transaction**: `profit = usdtAmount × usdtToMvrRate - usdAmount × usdToMvrRate`
2. **Sell Transaction**: `profit = usdAmount × usdToMvrRate - usdtAmount × usdtToMvrRate`

For partnerships, profits are automatically split based on each member's configured percentage.

## Security Features

- JWT access tokens (15 min expiry) + HTTP-only refresh tokens (7 days)
- Password hashing with bcrypt (10 rounds)
- Workspace isolation - users can only access their workspace data
- Role-based access control (Owner > Admin > Member)
- Input validation with Zod on all endpoints
- CORS configured for specific origins
- Security headers via Helmet.js
- SQL injection prevention via Prisma parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
