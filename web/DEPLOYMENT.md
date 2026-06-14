# 🚀 Hướng dẫn Triển khai & Phát triển tiếp

## Các bước tiếp theo để đưa vào production

### Phase 1: Backend Integration (2-3 tuần)

#### 1. Database Setup
```bash
# Chọn một trong các options:

# Option A: Neon PostgreSQL (Recommended)
pnpm add pg
# Cấu hình: neon_db_url từ Neon console

# Option B: Supabase PostgreSQL  
# Cấu hình: SUPABASE_URL + SUPABASE_KEY

# Option C: AWS Aurora PostgreSQL
pnpm add aws-sdk
```

#### 2. Tạo API Routes
```
app/api/
├── auth/                # Login/Logout/Session
├── zones/               # CRUD zones & blocks
├── teams/               # CRUD teams
├── processes/           # CRUD processes  
├── tasks/               # CRUD tasks
├── reports/             # Save task reports
├── kpi/                 # Calculate KPI
└── alerts/              # Fetch alerts
```

#### 3. Migration Database Schema
```sql
-- Example migrations
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  area_size FLOAT,
  created_at TIMESTAMP
);

CREATE TABLE blocks (
  id SERIAL PRIMARY KEY,
  zone_id INT REFERENCES zones,
  name VARCHAR(255),
  polygon GEOMETRY,
  status VARCHAR(50)
);

-- ... (other tables)
```

#### 4. Authentication
```bash
# Lựa chọn 1: Better Auth (Recommended for Neon)
pnpm add better-auth

# Lựa chọn 2: NextAuth.js
pnpm add next-auth

# Lựa chọn 3: Supabase Auth (built-in)
```

---

### Phase 2: API Integration (2 tuần)

#### 1. Create API Service Layer
```typescript
// lib/api-client.ts
export const apiClient = {
  zones: {
    list: () => fetch('/api/zones'),
    create: (zone) => fetch('/api/zones', { method: 'POST', body: JSON.stringify(zone) }),
    update: (id, zone) => fetch(`/api/zones/${id}`, { method: 'PUT', body: JSON.stringify(zone) }),
    delete: (id) => fetch(`/api/zones/${id}`, { method: 'DELETE' })
  },
  // ... other resources
}
```

#### 2. Replace Mock Data
```typescript
// Before
const [zones, setZones] = useState([
  { id: '1', name: 'Vùng Đông', ... }
])

// After
useEffect(() => {
  apiClient.zones.list().then(res => res.json()).then(setZones)
}, [])
```

#### 3. Add Error Handling
```typescript
try {
  const res = await apiClient.zones.create(newZone)
  if (!res.ok) throw new Error('Failed to create zone')
  toast.success('Tạo vùng thành công!')
} catch (err) {
  toast.error(err.message)
}
```

---

### Phase 3: Features Implementation (3-4 tuần)

#### 1. Maps Integration
```bash
pnpm add react-leaflet leaflet
# hoặc
pnpm add mapbox-gl @react-map/gl
```

**Sử dụng trong**: `/admin/zones` (vẽ polygon), `/admin/heat-map` (display)

#### 2. File Upload (Photos for Abnormality Reports)
```bash
# Option A: Vercel Blob
pnpm add @vercel/blob

# Option B: AWS S3
pnpm add aws-sdk

# Option C: Firebase Storage
pnpm add firebase
```

**Sử dụng trong**: `/mobile/daily-report` (upload ảnh bất thường)

#### 3. Real-time Notifications
```bash
# Option A: Socket.io
pnpm add socket.io socket.io-client

# Option B: Pusher
pnpm add pusher pusher-js

# Option C: Supabase Realtime
# Built-in if using Supabase
```

**Thực hiện**: Cảnh báo quá hạn/bất thường real-time đến Admin

#### 4. Service Worker & Offline Support
```typescript
// app/mobile/service-worker.ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}

// Lưu reports offline
const saveOfflineReport = (report) => {
  const offlineReports = JSON.parse(localStorage.getItem('offlineReports') || '[]')
  offlineReports.push({ ...report, timestamp: Date.now() })
  localStorage.setItem('offlineReports', JSON.stringify(offlineReports))
}

// Sync khi online
window.addEventListener('online', async () => {
  const reports = JSON.parse(localStorage.getItem('offlineReports') || '[]')
  for (const report of reports) {
    await apiClient.reports.create(report)
  }
  localStorage.removeItem('offlineReports')
})
```

---

### Phase 4: Admin Features (2 tuần)

#### 1. Excel Import
```bash
pnpm add xlsx exceljs
```

**Implement**: `/admin/processes` - Import quy trình từ Excel

#### 2. PDF Export
```bash
pnpm add jspdf html2pdf
```

**Implement**: Export báo cáo, KPI thành PDF

#### 3. Data Visualization
```bash
# Recharts (already installed)
# Add more chart types:
- Bar charts (công việc theo vùng)
- Pie charts (phân bố task status)
- Line charts (trend KPI)
```

#### 4. Advanced Filtering & Search
```typescript
// useTaskFilter.ts
export const useTaskFilter = (tasks, filters) => {
  return tasks.filter(task => {
    return (
      (!filters.zone || task.zone === filters.zone) &&
      (!filters.crop || task.crop === filters.crop) &&
      (!filters.status || task.status === filters.status)
    )
  })
}
```

---

### Phase 5: Mobile Features (2 tuần)

#### 1. Camera Integration
```bash
pnpm add react-camera-pro
# hoặc
# Sử dụng native camera API
```

#### 2. Biometric Auth
```typescript
// app/mobile/login/page.tsx
const handleBiometricLogin = async () => {
  if (window.PublicKeyCredential) {
    const credential = await navigator.credentials.get({
      publicKey: { ... }
    })
    // Verify credential
  }
}
```

#### 3. Push Notifications
```bash
pnpm add web-push
```

#### 4. PWA Install Prompt
```typescript
// Tự động hiện khi PWA installable
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  deferredPrompt = e;
  showInstallButton();
});
```

---

### Phase 6: Performance & Security (2 tuần)

#### 1. Performance Optimization
- Code splitting (dynamic imports)
- Image optimization (next/image)
- Caching strategy (SWR, React Query)
- Database indexing
- API pagination

#### 2. Security
- HTTPS everywhere
- CSRF protection
- Rate limiting API
- Input validation & sanitization
- SQL injection prevention (parameterized queries)
- XSS protection (sanitize HTML)

#### 3. Testing
```bash
pnpm add -D vitest @testing-library/react
```

---

## Environment Variables

### Development (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://user:password@localhost:5432/farm
AUTH_SECRET=generate-with: openssl rand -base64 32
```

### Production (.env.production)
```
NEXT_PUBLIC_API_URL=https://app.nongrai.vn/api
DATABASE_URL=postgresql://...production database...
AUTH_SECRET=your-production-secret
BLOB_READ_WRITE_TOKEN=...
PUSHER_KEY=...
```

---

## Deployment Options

### Option 1: Vercel (Recommended)
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Vercel
# Settings → Connected Projects

# 3. Environment variables
# Settings → Environment Variables

# 4. Deploy
vercel deploy --prod
```

### Option 2: Self-hosted (Docker)
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
# Deploy
docker build -t farm-app .
docker run -p 3000:3000 farm-app
```

### Option 3: AWS Amplify / ECS
- Code thần kỳ - Follow AWS docs

---

## Monitoring & Analytics

### 1. Error Tracking
```bash
pnpm add @sentry/nextjs
```

### 2. Analytics
```bash
pnpm add @vercel/analytics
# hoặc
pnpm add posthog
```

### 3. Performance Monitoring
- Vercel Analytics (built-in)
- Web Vitals tracking

---

## Roadmap Tính năng Tiếp theo (Quý 3-4 2024)

- [ ] **Multi-language**: Tiếng Anh, tiếng Trung
- [ ] **Advanced Analytics**: Machine learning predictions
- [ ] **Mobile Native**: React Native app (iOS/Android)
- [ ] **Integration**: Kết nối với Agritech platforms
- [ ] **Marketplace**: Bán/mua dịch vụ
- [ ] **API Public**: Cho third-party integrations
- [ ] **Blockchain**: Traceability & transparency

---

## Support & Resources

### Documentation
- 📖 [README.md](./README.md) - Tổng quan
- 📖 [SCREENS.md](./SCREENS.md) - Chi tiết màn hình
- 📖 [Architecture.md](./ARCHITECTURE.md) - Kiến trúc (TODO)

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Leaflet Maps](https://leafletjs.com)
- [Neon DB](https://neon.tech/docs)

### Community
- Discord: (TODO - setup)
- GitHub Issues: (TODO - enable)
- Email: support@nongrai.vn

---

## Checklist Trước Production

- [ ] Tất cả tests pass
- [ ] Performance metrics OK (LCP < 2.5s, INP < 200ms)
- [ ] Security audit completed
- [ ] Database backups setup
- [ ] Monitoring & logging active
- [ ] Error tracking setup
- [ ] Analytics running
- [ ] Documentation complete
- [ ] Team trained
- [ ] Load testing done

---

**Version**: 1.0.0  
**Last Updated**: 2024-06-15  
**Next Review**: 2024-07-15
