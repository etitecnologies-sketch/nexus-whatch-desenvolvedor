# Nexus Watch - Professional CFTV Monitoring Platform

![Nexus Watch](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)

A **professional-grade CCTV monitoring application** with enterprise features, multi-vendor support, and cybersecurity-inspired dark mode design. Built with React 19, tRPC, and Drizzle ORM.

## 🎯 Features

### Core Capabilities

- **🎥 Live View**: Multi-camera grid (1, 4, 9, 16 channels) with HD/SD quality selection
- **⏪ Playback**: Timeline-based video playback with date/time search and speed control (0.125x - 8x)
- **📡 Device Management**: Add DVRs, NVRs, and IP cameras via IP, DDNS, P2P, or QR Code
- **⭐ Favorites**: Group cameras by location with custom icons and quick access
- **🔔 Notifications**: Real-time alerts for motion detection, alarms, and device status
- **🎛️ PTZ Controls**: Pan, tilt, zoom with preset management for compatible cameras
- **📊 Dashboard**: System overview with device status, connectivity metrics, and event logs
- **⚙️ Settings**: User preferences, notification configuration, video quality, and network settings

### Multi-Vendor Support

Nexus Watch supports **any CCTV manufacturer** through a unified abstraction layer:

| Manufacturer | Connection | Protocol | Status |
|-------------|-----------|----------|--------|
| **Intelbras** | IP, DDNS, P2P Cloud, QR Code | RTSP + Cloud API | ✅ Full |
| **Hikvision** | IP, DDNS | RTSP + ISAPI | ✅ Full |
| **Dahua** | IP, DDNS | RTSP + HTTP API | ✅ Full |
| **Uniview** | IP, DDNS | RTSP + REST API | ✅ Full |
| **Axis** | IP, DDNS | RTSP + ONVIF | ✅ Full |
| **Generic** | IP, DDNS | RTSP/ONVIF | ✅ Full |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Nexus Watch Frontend (React 19)         │
│  Live View | Playback | Devices | Favorites    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│    tRPC Backend (Express + Drizzle ORM)         │
│  Procedures for Devices, Cameras, PTZ, Events  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│     Multi-Vendor Abstraction Layer              │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │ Intelbras    │ Hikvision    │ Dahua        │ │
│  │ Driver       │ Driver       │ Driver       │ │
│  └──────────────┴──────────────┴──────────────┘ │
│  ┌──────────────┬──────────────┬──────────────┐ │
│  │ Uniview      │ Axis         │ RTSP/ONVIF   │ │
│  │ Driver       │ Driver       │ Generic      │ │
│  └──────────────┴──────────────┴──────────────┘ │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      Protocol Layer (RTSP, ONVIF, HTTP)        │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│    Physical Devices (DVR/NVR/IP Cameras)       │
└─────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+
- MySQL 8.0+ or TiDB
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/etitecnologies-sketch/Nexus-Watch.git
cd Nexus-Watch
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/nexus_watch

# OAuth (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_ANON_KEY=your_anon_key

# API Keys
JWT_SECRET=your_jwt_secret
```

4. **Setup database**
```bash
# Generate migrations
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 📚 Documentation

### User Documentation

- **[Getting Started Guide](./docs/getting-started.md)** - Setup and first use
- **[User Manual](./docs/user-manual.md)** - Feature walkthrough
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions

### Developer Documentation

- **[Architecture Guide](./docs/architecture.md)** - System design and components
- **[API Reference](./docs/api-reference.md)** - tRPC procedures and endpoints
- **[Multi-Vendor Integration](./docs/multi-vendor-integration.md)** - Adding new manufacturers
- **[Database Schema](./docs/database-schema.md)** - Data model and relationships
- **[Security Guide](./docs/security.md)** - Security protocols and encryption

### Setup Guides by Manufacturer

- **[Intelbras Setup](./docs/setup/intelbras.md)** - P2P Cloud, IP, DDNS
- **[Hikvision Setup](./docs/setup/hikvision.md)** - ISAPI integration
- **[Dahua Setup](./docs/setup/dahua.md)** - HTTP API integration
- **[Uniview Setup](./docs/setup/uniview.md)** - REST API integration
- **[Axis Setup](./docs/setup/axis.md)** - ONVIF integration
- **[Generic RTSP/ONVIF](./docs/setup/generic-rtsp.md)** - Any compatible device

## 🎨 Design

### Dark Mode Cybersecurity Theme

Nexus Watch features a professional dark mode design inspired by enterprise CCTV systems:

- **Primary**: Deep Blue (`#0052CC`)
- **Accent**: Cyan (`#00D9FF`)
- **Background**: Very Dark Blue (`#0A0E27`)
- **Cards**: Dark Blue (`#1A1F3A`)

### Responsive Design

- Mobile-first approach
- Tested on 375px, 768px, 1024px, and 1280px viewports
- Touch-friendly controls for mobile devices

## 🔐 Security

- **Supabase Auth** authentication via Google and Magic Links
- **Encrypted credentials** for device connections
- **HTTPS only** for API communications
- **Role-based access control** (admin/user)
- **Audit logging** for all operations

## 📊 Database Schema

Key tables:
- `users` - User accounts and roles
- `devices` - DVRs, NVRs, IP cameras
- `cameras` - Individual camera channels
- `favorites` - Camera groups by location
- `notifications` - Alert history
- `alerts` - Event log for analytics
- `ptzPresets` - Saved camera positions
- `recordings` - Video metadata
- `userPreferences` - User settings

See [Database Schema](./docs/database-schema.md) for complete documentation.

## 🛠️ Development

### Project Structure

```
nexus-watch/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utilities and hooks
│   │   └── index.css      # Global styles
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database queries
│   └── _core/             # Framework code
├── drizzle/               # Database schema
│   └── schema.ts          # Drizzle ORM schema
├── shared/                # Shared types and constants
└── package.json
```

### Development Workflow

1. **Update database schema** in `drizzle/schema.ts`
2. **Generate migrations**: `pnpm drizzle-kit generate`
3. **Create backend procedures** in `server/routers.ts`
4. **Build frontend pages** in `client/src/pages/`
5. **Test with**: `pnpm test`
6. **Build for production**: `pnpm build`

### Available Scripts

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests with Vitest
pnpm format           # Format code with Prettier
pnpm check            # Type check with TypeScript
pnpm db:push          # Apply database migrations
```

## 🧪 Testing

Tests are written with Vitest and located in `server/*.test.ts`:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/auth.logout.test.ts

# Watch mode
pnpm test --watch
```

## 🚢 Deployment

### Docker

```bash
# Build Docker image
docker build -t nexus-watch:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=... \
  nexus-watch:latest
```

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:3306/nexus_watch
JWT_SECRET=your_secure_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 📈 Performance

- **Connection pooling** for database and device connections
- **Caching** for device capabilities and status
- **Adaptive bitrate** for video streaming
- **Lazy loading** for camera grids
- **Optimistic updates** for responsive UI

## 🐛 Troubleshooting

### Common Issues

**Cannot connect to device**
- Verify IP address and port
- Check firewall rules
- Ensure credentials are correct
- Test with RTSP client (VLC)

**High latency or buffering**
- Use sub-stream (lower resolution)
- Reduce frame rate
- Check network bandwidth
- Move closer to device (if wireless)

**Authentication fails**
- Verify username and password
- Check for special characters
- Reset device to factory defaults

See [Troubleshooting Guide](./docs/troubleshooting.md) for more solutions.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/etitecnologies-sketch/Nexus-Watch/issues)
- **Discussions**: [GitHub Discussions](https://github.com/etitecnologies-sketch/Nexus-Watch/discussions)
- **Email**: support@etitecnologies.com

## 🙏 Acknowledgments

- Built with [React 19](https://react.dev)
- Backend powered by [tRPC](https://trpc.io) and [Express](https://expressjs.com)
- Database with [Drizzle ORM](https://orm.drizzle.team)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Styling with [Tailwind CSS 4](https://tailwindcss.com)
- Icons from [lucide-react](https://lucide.dev)

## 📊 Project Status

- ✅ Core features implemented
- ✅ Multi-vendor support architecture
- ✅ Dark mode design system
- ✅ Database schema and migrations
- 🔄 Real-time notifications (in progress)
- 🔄 AI-based motion detection (planned)
- 🔄 Multi-site management (planned)
- 🔄 Mobile app (planned)

---

**Made with ❤️ by ETI Technologies**

For more information, visit [ETI Technologies](https://etitecnologies.com)
