# Deployment Guide

Complete guide for deploying the Container Stock Monitoring System to production.

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Pros:**
- Zero config for Next.js
- Automatic deployments on git push
- Free tier includes 100GB bandwidth
- Global CDN
- Environment variables UI

**Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
     ```
   - Click Save

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Access your live URL

5. **Custom Domain (Optional)**
   - In Settings > Domains
   - Add your domain
   - Update DNS records per instructions
   - Use auto-HTTPS

### Option 2: Netlify

**Steps:**

1. **Connect Repository**
   - Go to https://netlify.com
   - Click "New site from Git"
   - Select repository

2. **Build Configuration**
   - Build command: `npm run build`
   - Publish directory: `.next`

3. **Environment Variables**
   - Site settings > Build & deploy > Environment
   - Add Supabase credentials

4. **Deploy**
   - Auto-deploys on git push

### Option 3: Railway

**Steps:**

1. **Create Project**
   - Go to https://railway.app
   - Create new project
   - Select GitHub repository

2. **Environment Variables**
   - Project settings > Variables
   - Add Supabase URL and Key

3. **Deploy**
   - Railway auto-deploys

### Option 4: Docker + Self-Hosted

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
```

**Deploy:**
```bash
npm run build
docker build -t csmmi .
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=... csmmi
```

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] ESLint passes: `npm run lint`
- [ ] No console.log statements in production code
- [ ] Error handling on all API calls
- [ ] Loading states for async operations

### Security
- [ ] Never commit `.env.local`
- [ ] `.env.local` is in `.gitignore`
- [ ] Environment variables use `NEXT_PUBLIC_` prefix only for public data
- [ ] HTTPS enforced
- [ ] CORS properly configured in Supabase

### Performance
- [ ] Build succeeds: `npm run build`
- [ ] No warnings during build
- [ ] Images optimized
- [ ] Lazy loading implemented for heavy components
- [ ] Database indexes created

### Testing
- [ ] Tested login flow
- [ ] Tested map rendering
- [ ] Tested realtime updates
- [ ] Tested all CRUD operations
- [ ] Mobile responsive

### Database
- [ ] All tables created
- [ ] All indexes created
- [ ] Realtime enabled for required tables
- [ ] Row Level Security configured
- [ ] Backups configured

### Documentation
- [ ] README.md updated
- [ ] API documented
- [ ] Setup instructions clear
- [ ] Database schema documented

## Production Environment Variables

In your deployment platform, set:

```env
# REQUIRED - From Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key-here]

# OPTIONAL
NEXT_PUBLIC_APP_NAME=Container Stock Monitoring
NODE_ENV=production
```

## Database Backup Strategy

### Automatic Backups (Supabase)

1. Go to **Settings > Backups**
2. Select backup frequency:
   - Daily (recommended)
   - Weekly
   - Monthly

3. Backups stored for:
   - Daily: 7 days
   - Weekly: 4 weeks
   - Monthly: 12 months

### Manual Backups

1. In Supabase, go to **Settings > Backups**
2. Click "Request manual backup"
3. Download backup file
4. Store securely (S3, cloud storage, etc.)

### Restore from Backup

1. Only available via Supabase support
2. Provide: Project ID + desired backup date
3. Supabase team restores database

## Monitoring

### Error Tracking
Setup error monitoring service:

```typescript
// Example: Sentry integration
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Performance Monitoring
Use:
- Vercel Analytics (built-in)
- Google Analytics
- New Relic
- DataDog

### Database Monitoring
- Supabase dashboard shows query performance
- Monitor slow queries in Database > Logs

## Scaling Considerations

### As Traffic Grows

1. **Database**
   - Add more indexes
   - Consider read replicas
   - Archive old route data

2. **API**
   - Use caching headers
   - Implement pagination
   - Rate limiting via Supabase

3. **Frontend**
   - Implement service workers for offline
   - Increase code splitting
   - Use CDN for images

4. **Infrastructure**
   - Upgrade Supabase plan
   - Use global CDN
   - Add rate limiting

## Rollback Procedure

If deployment breaks:

### Via Vercel
1. Go to Deployments
2. Click on previous stable deployment
3. Click "Promote to Production"

### Via GitHub
```bash
git revert [commit-hash]
git push origin main
```

### Database Rollback
1. Contact Supabase support
2. Request restore to previous backup
3. Provide backup timestamp

## SSL/TLS Certificates

### Vercel
- Automatic for `*.vercel.app`
- Automatic for custom domains

### Self-Hosted
```bash
# Using Let's Encrypt (free)
certbot certonly --standalone -d yourdomain.com

# Renew every 90 days
certbot renew
```

## DNS Configuration

### For Custom Domain

| Type | Name | Value |
|------|------|-------|
| CNAME | www | cname.vercel-dns.com |
| CNAME | @ | cname.vercel-dns.com |
| A | @ | 76.76.19.20 |
| AAAA | @ | 2620:4d:4d00:510::1 |

(Values vary by platform - check deployment service)

## CDN Configuration

### CloudFlare (Free)

1. Go to https://cloudflare.com
2. Add your domain
3. Update nameservers at registrar
4. Enable:
   - Automatic HTTPS
   - Caching
   - Security rules

### Cloudfront (AWS)

1. Create CloudFront distribution
2. Point to Vercel domain
3. Set cache TTL
4. Attach SSL certificate

## Maintenance Window

For planned updates:

1. **Communicate**
   - Email users in advance
   - Show maintenance page

2. **Deploy**
   - Deploy during low-traffic time (3-5 AM UTC)
   - Have rollback ready

3. **Verify**
   - Test all critical flows
   - Monitor error rates

4. **Communicate**
   - Send "back online" notification

## Monitoring Checklist (After Deployment)

- [ ] App loads without errors
- [ ] Login works
- [ ] Dashboard displays data
- [ ] Map loads and responds
- [ ] Real-time updates work
- [ ] Create/edit operations work
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] HTTPS working
- [ ] Error logging enabled

## Post-Deployment

### Week 1
- Monitor error rates
- Check performance metrics
- Gather user feedback
- Test on various browsers/devices

### Week 2-4
- Optimize based on metrics
- Fix any issues discovered
- Plan next features
- Document learnings

## Troubleshooting Deployment Issues

### Build Fails
```bash
# Locally
npm run build

# Check for TS errors
npx tsc --noEmit

# Try fresh install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Loading
- Verify variable names match
- Ensure no typos
- Restart deployment process

### Realtime Not Working
- Check Supabase realtime is enabled
- Verify auth token is valid
- Check CORS configuration

### Performance Issues
- Monitor database query times
- Reduce payload sizes
- Implement caching
- Use CDN for static assets

---

**Deployment complete! 🚀**

For support:
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs/deployment
