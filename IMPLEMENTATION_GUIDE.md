# Core Studio Pilates - i18n & Responsive Design Implementation Guide

## Overview
This guide documents the complete implementation of internationalization (i18n) with Thai language support and responsive design across the entire application.

## Phase 1: i18n Setup (COMPLETED)

### 1.1 Packages Installed
```bash
npm install next-i18next react-i18next i18next
```

### 1.2 Configuration Files Created
- `next-i18next.config.js` - i18n configuration
- `next.config.mjs` - Updated with i18n settings

### 1.3 Translation Files Structure
```
public/locales/
├── en/
│   ├── common.json      ✓ Created
│   ├── auth.json        ✓ Created
│   ├── customer.json    ✓ Created
│   ├── admin.json       ✓ Created
│   └── teacher.json     (Need to create)
└── th/
    ├── common.json      ✓ Created
    ├── auth.json        ✓ Created
    ├── customer.json    ✓ Created
    ├── admin.json       (Need to create)
    └── teacher.json     (Need to create)
```

## Phase 2: Create Remaining Translation Files

### Thai Admin Translations (`th/admin.json`)
Due to token limits, I'm providing the structure. You'll need to translate all English keys to Thai.

Key sections to translate:
- Navigation items
- Dashboard metrics and charts
- Customer management
- Teacher management
- Finance terms
- Marketing analytics terms

### Teacher Translations (Both EN & TH)
Create `en/teacher.json` and `th/teacher.json` with:
- Dashboard sections
- Schedule management
- Session details
- Student management
- Performance metrics

## Phase 3: Implement i18n in Pages

### Pattern 1: Using i18n in Pages

```typescript
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function MyPage() {
  const { t } = useTranslation('common'); // or 'customer', 'admin', etc.

  return (
    <div>
      <h1>{t('dashboard')}</h1>
      <p>{t('welcome')}</p>
    </div>
  );
}

// IMPORTANT: Add this to every page
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'customer'])),
    },
  };
}
```

### Pattern 2: Language Switcher Component

Create `components/LanguageSwitcher.tsx`:
```typescript
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

export default function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation('common');

  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded ${
          router.locale === 'en' ? 'bg-primary-600 text-white' : 'bg-gray-200'
        }`}
      >
        {t('english')}
      </button>
      <button
        onClick={() => changeLanguage('th')}
        className={`px-3 py-1 rounded ${
          router.locale === 'th' ? 'bg-primary-600 text-white' : 'bg-gray-200'
        }`}
      >
        {t('thai')}
      </button>
    </div>
  );
}
```

## Phase 4: Responsive Design Patterns

### Mobile-First Approach
Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

### Common Responsive Patterns

#### 1. Navigation/Header
```tsx
<header className="px-4 py-4 md:px-6">
  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
    <Logo className="w-32 md:w-48" />

    {/* Mobile menu button */}
    <button className="md:hidden">
      <MenuIcon />
    </button>

    {/* Desktop nav */}
    <nav className="hidden md:flex gap-6">
      {/* nav items */}
    </nav>
  </div>
</header>
```

#### 2. Dashboard Grids
```tsx
{/* Mobile: 1 col, Tablet: 2 cols, Desktop: 3-4 cols */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {cards.map(card => <Card key={card.id} />)}
</div>
```

#### 3. Tables (Responsive)
```tsx
{/* Hide columns on mobile */}
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th className="hidden md:table-cell">Email</th>
      <th className="hidden lg:table-cell">Phone</th>
      <th>Actions</th>
    </tr>
  </thead>
</table>

{/* OR use card layout on mobile */}
<div className="block md:hidden">
  {/* Card layout for mobile */}
</div>
<div className="hidden md:block">
  {/* Table for desktop */}
</div>
```

#### 4. Forms
```tsx
<form className="space-y-4">
  {/* Full width on mobile, half on desktop */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <input className="w-full" />
    <input className="w-full" />
  </div>
</form>
```

#### 5. Charts (Recharts Responsive)
```tsx
<ResponsiveContainer
  width="100%"
  height={300}
  className="text-xs sm:text-sm"
>
  <BarChart data={data}>
    <XAxis
      dataKey="name"
      tick={{ fontSize: 10 }}
      className="sm:text-xs"
    />
  </BarChart>
</ResponsiveContainer>
```

## Phase 5: Priority Pages to Update

### High Priority (User-Facing)
1. Auth pages (login/register)
2. Customer dashboard
3. Customer calendar/booking
4. Customer packages
5. Customer profile

### Medium Priority
6. Admin dashboard
7. Admin customer list
8. Admin teacher list
9. Teacher dashboard
10. Teacher schedule

### Lower Priority
11. Finance pages
12. Marketing pages
13. Admin settings

## Implementation Checklist

### For Each Page:
- [ ] Add `getStaticProps` or `getServerSideProps` with translations
- [ ] Import `useTranslation` hook
- [ ] Replace all hardcoded text with `t('key')`
- [ ] Add responsive classes to containers
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1024px+)
- [ ] Add Language Switcher component

### Specific Responsive Fixes Needed:

#### Admin Dashboard (`/admin/dashboard/page.tsx`)
- [ ] Make executive cards responsive (4 cols → 2 cols → 1 col)
- [ ] Make charts stack vertically on mobile
- [ ] Add horizontal scroll for heatmap on mobile
- [ ] Reduce font sizes on mobile for chart labels
- [ ] Make cohort table scrollable horizontally on mobile

#### Customer Dashboard (`/customer/dashboard/page.tsx`)
- [ ] Stack package cards vertically on mobile
- [ ] Make upcoming sessions list card-based on mobile
- [ ] Adjust spacing and padding for mobile

#### Admin Header (`/admin/layout.tsx`)
- [ ] Create hamburger menu for mobile
- [ ] Hide nav items in drawer on mobile
- [ ] Keep only logo and menu button visible on mobile

#### Customer Header (`/customer/layout.tsx`)
- [ ] Similar mobile navigation pattern
- [ ] Ensure notification bell is accessible on mobile

### Testing Checklist
- [ ] Test language switching maintains state
- [ ] Test Thai text displays correctly (no character issues)
- [ ] Test all layouts at 375px, 768px, 1024px, 1440px
- [ ] Test forms are usable on mobile
- [ ] Test tables/charts don't break layout on small screens
- [ ] Test navigation works on all screen sizes

## Next Steps

1. **Complete Thai Translations**
   - Translate admin.json to Thai
   - Create and translate teacher.json (EN & TH)

2. **Create Language Switcher**
   - Build component
   - Add to all layout headers
   - Style appropriately

3. **Update Each Page Systematically**
   - Start with auth pages
   - Move to customer pages
   - Then admin pages
   - Finally teacher pages

4. **Test Thoroughly**
   - Check each page on mobile/tablet/desktop
   - Verify translations work
   - Check for any layout breaks

## Estimated Time
- Translations: 4-6 hours
- i18n Implementation: 8-10 hours
- Responsive Design: 10-12 hours
- Testing & Fixes: 4-6 hours
**Total: 26-34 hours**

## Need Help?
Refer to:
- next-i18next docs: https://github.com/i18next/next-i18next
- Tailwind responsive docs: https://tailwindcss.com/docs/responsive-design
