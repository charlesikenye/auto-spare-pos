# Auto Spares POS System

A production-ready POS system for auto spares businesses with multiple shop isolation, barcode scanning, and offline support.

## Project Structure
- `/convex`: Backend functions and schema.
- `/mobile`: React Native + Expo app for sales staff.
- `/web`: React + Vite + Tailwind dashboard for managers/admin.

## Deployment Steps

### 1. Backend (Convex)
1. Navigate to `convex/`
2. Run `npm install`
3. Deploy to your Convex project:
   ```bash
   npx convex deploy --cmd "npm run build"
   ```
4. Seed the database:
   ```bash
   npx convex run seed:seed
   ```

### 2. Web Dashboard (Vercel/Netlify)
1. Navigate to `web/`
2. Run `npm install`
3. Set environment variable `VITE_CONVEX_URL` to your Convex deployment URL.
4. Build and deploy:
   ```bash
   npm run build
   ```

### 3. Mobile App (Expo)
1. Navigate to `mobile/`
2. Run `npm install`
3. Update `config.js` with your `CONVEX_URL`.
4. Build for Android/iOS using EAS:
   ```bash
   eas build --platform android --profile production
   ```

## Key Features
- **Shop Isolation**: All queries/mutations are filtered by `shopId`.
- **Barcode Scanning**: Integrated with Expo Barcode Scanner for fast checkouts.
- **Offline Ready**: Convex handles optimistic updates and sync.
- **Simple UI**: Large buttons and clear text for non-tech-savvy staff.
- **Admin Dashboard**: Real-time inventory and sales reports across shops.
