# Setup Guide - Container Stock Monitoring System

Complete step-by-step guide to get the application running.

## Step 1: Prerequisites

Ensure you have:
- Node.js v18+ ([Download](https://nodejs.org/))
- npm or yarn package manager
- A Supabase account ([Create Free](https://supabase.com))
- Git (optional, for version control)

## Step 2: Clone or Initialize Project

If starting fresh:
```bash
cd your-project-directory
npm install
```

If updating existing project:
```bash
git pull
npm install
```

## Step 3: Create Supabase Project

1. Go to https://supabase.com and sign up or log in
2. Click "New Project"
3. Choose a project name, password, and region
4. Wait for project to initialize (2-3 minutes)
5. Copy your credentials:
   - **Project URL**
   - **ANON KEY** (under "Settings > API")

## Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy from Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Never commit `.env.local` to git. It's already in `.gitignore`.

## Step 5: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Create new query
3. Copy and paste the entire content from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
4. Click "Run" button
5. Wait for all tables to be created successfully

Expected output: 4 tables created
- trucks
- containers
- stocks
- truck_routes

## Step 6: Enable Realtime

1. In Supabase, go to **Realtime** (left sidebar)
2. Click on each table and toggle "Enable realtime":
   - trucks
   - containers
   - stocks
   - truck_routes

## Step 7: Enable Authentication

1. In Supabase, go to **Authentication > Providers**
2. Ensure "Email" provider is enabled (default)
3. Go to **Authentication > Email Templates**
4. (Optional) Customize confirmation and reset emails

## Step 8: Install Dependencies

```bash
npm install
```

This installs all packages including:
- Next.js & React
- Supabase client
- Leaflet & React-Leaflet
- Tailwind CSS
- Zustand
- date-fns
- lucide-react

## Step 9: Start Development Server

```bash
npm run dev
```

You should see:
```
> csmmi@0.1.0 dev
> next dev

  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000
  - Environments: .env.local
```

## Step 10: Access the Application

1. Open http://localhost:3000 in your browser
2. You should be redirected to `/auth`
3. Create a new account
4. Confirm your email (check console output or Supabase email logs)
5. Login with your credentials
6. You should see the main dashboard

## Step 11: Add Sample Data

### Option A: Using Supabase Dashboard

1. Open https://your-project.supabase.co in browser
2. Go to SQL Editor
3. Create new query and run:

```sql
-- Insert sample truck
INSERT INTO trucks (driver_name, plate_number, latitude, longitude, status)
VALUES ('John Doe', 'ABC-123', 28.7041, 77.1025, 'Delivering')
RETURNING *;
```

Copy the returned truck ID for next step.

```sql
-- Insert sample container (replace [TRUCK_ID])
INSERT INTO containers (container_id, truck_id, status)
VALUES ('CNT-001', '[TRUCK_ID]', 'In Transit')
RETURNING *;
```

Copy the returned container ID.

```sql
-- Insert sample stocks (replace [CONTAINER_ID])
INSERT INTO stocks (container_id, item_name, quantity, unit)
VALUES 
  ('[CONTAINER_ID]', 'Ceramic Tiles', 500, 'boxes'),
  ('[CONTAINER_ID]', 'Paint Cans', 250, 'cans'),
  ('[CONTAINER_ID]', 'Wood Planks', 1000, 'kg');
```

### Option B: Using Script

Create a file `seed-data.sql` with the above content and run:
```bash
psql [supabase_connection_string] < seed-data.sql
```

## Step 12: Verify Installation

In the application:
1. Go to Dashboard
2. You should see:
   - ✅ Stats showing: 1 Active Truck, 1 Container in Transit, 3 Stock Items
   - ✅ Map with truck marker visible
   - ✅ Truck list populated
3. Click on truck marker
4. You should see truck details and containers panel

## Step 13: Test Real-Time Updates

To test real-time updates:

1. Open Supabase SQL Editor in another window
2. Update truck location:
   ```sql
   UPDATE trucks 
   SET latitude = 28.7200, longitude = 77.1150, updated_at = NOW()
   WHERE plate_number = 'ABC-123';
   ```
3. Watch the map refresh in real-time (within 1-2 seconds)

## Step 14: Deploy (Optional)

### Option A: Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

### Option B: Other Platforms

- **Netlify**: Similar to Vercel
- **Railway**: Push directly from GitHub
- **Self-hosted**: Build with `npm run build` then use Node.js server

## Troubleshooting

### Issue: "Cannot find module '@supabase/supabase-js'"
**Solution**: Run `npm install` again

### Issue: Map not loading
**Solution**: 
- Check browser console for errors
- Verify Supabase credentials in `.env.local`
- Restart dev server: `npm run dev`

### Issue: Real-time updates not working
**Solution**:
- Enable Realtime in Supabase (see Step 6)
- Check browser console for connection errors
- Verify auth session is active

### Issue: Login page shows "Check your email"
**Solution**:
- Email confirmation is sent automatically
- Check spam folder
- In development, check Next.js terminal output for email logs

### Issue: "Cannot read property 'session' of undefined"
**Solution**:
- Wait 2-3 minutes for Supabase project to fully initialize
- Refresh browser and try again

## Next Steps

After successful setup:

1. **Customize Styling**: Edit `app/globals.css` and Tailwind classes
2. **Add More Features**: 
   - Alerts and notifications
   - Advanced filtering
   - Export reports
3. **Set Up Database Backups**: In Supabase > Settings > Backup
4. **Configure Row Level Security**: for production use
5. **Add More Users**: Via Supabase > Authentication

## File Structure After Setup

```
csmmi/
├── node_modules/        # Dependencies (auto-created by npm)
├── .next/              # Build cache (auto-created)
├── app/
├── components/
├── lib/
├── types/
├── public/
├── .env.local          # YOUR CREDENTIALS - NEVER COMMIT
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── DATABASE_SCHEMA.md
├── SETUP_GUIDE.md      # This file
└── README.md
```

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Database Backup (Important!)

Regular backups in Supabase:

1. Go to **Settings > Backups**
2. Set backup frequency (Daily/Weekly)
3. Download backups regularly
4. Store securely

## Support

Having issues? Refer to:
- Original [README.md](./README.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

**You're all set! 🎉 Start tracking trucks now!**
