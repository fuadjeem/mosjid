# Mosjid - Storefront & Admin Dashboard

A high-performance grocery storefront and administrative dashboard built for **BAK Linz** (Bangladesh Asiatische Kulturzentrum Linz).

## 🚀 Quick Start for Contributors

### 1. Setup
This project is built using vanilla HTML/JS and Tailwind CSS. No complex build steps are required.
- **Clone the repository**: `git clone https://github.com/fuadjeem/mosjid.git`
- **Environment Variables**: 
  - For frontend variables, copy `js/env.example.js` to `js/env.js` and add your Supabase credentials.
  - For python automation scripts, set the `ADMIN_TOKEN` environment variable (`export ADMIN_TOKEN="your_jwt_token"`).
- **Run locally**: You can open `index.html` directly in your browser, or use a "Live Server" extension in VS Code for a better experience.
### 2. Technology Stack
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (via Play CDN).
- **Backend**: Supabase (Database, Auth, and Realtime).
- **Icons**: Material Symbols Outlined.
- **Typography**: Inter.

### 3. Key Files
- `index.html`: Main storefront.
- `admin.html`: Administrative dashboard for managing orders and products.
- `js/app.js`: Core storefront logic (product loading, cart management, filters).
- `js/auth.js`: Authentication logic and Supabase client initialization.
- `js/config.js`: Global configuration and security utilities.

### 4. Database Setup
If you need to update the database schema, refer to the `.sql` files in the root directory:
- `init_db.sql`: Initial table structures.
- `enable_realtime.sql`: Configuration for real-time updates on the admin dashboard.
- `fix_admin_rls.sql`: Row Level Security policies for administrative access.

## 🛠 Contribution Guidelines
- **Branches**: Please create a new branch for each feature or fix (`git checkout -b feature/your-feature-name`).
- **Pull Requests**: Submit a PR to the `main` branch with a clear description of your changes.
- **Design System**: Follow the "No-Line" UI aesthetic using Tailwind's tonal layering (e.g., `bg-surface-container-low`, `border-outline-variant`).

---
**Questions/Problems?** Contact the leads:
- Nazmus Shakib Beg
- Fuad Sarker Jeem
