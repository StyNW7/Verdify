# Frontend Verdify - Tasks

# List of Web Pages

# Verdify - Daftar Lengkap Halaman Aplikasi

Berikut adalah seluruh halaman yang perlu dibuat dalam aplikasi Verdify, lengkap dengan penjelasan fungsi, fitur, dan prioritas pengembangan.

---

## Daftar Halaman (Total 11 Halaman)

| No | Halaman | Prioritas | Status | Deskripsi Singkat |
| --- | --- | --- | --- | --- |
| 1 | Landing Page | P0 | ✅ Done | Halaman marketing & onboarding |
| 2 | Route Planner | P0 | 🔴 | Core halaman untuk merencanakan perjalanan |
| 3 | Results Page | P0 | 🔴 | Menampilkan hasil rekomendasi rute |
| 4 | Dashboard | P1 | 🔴 | Statistik personal & history perjalanan |
| 5 | Profile | P1 | 🔴 | Manajemen akun & preferensi |
| 6 | Green Points | P1 | 🔴 | Manajemen poin & reward |
| 7 | Leaderboard | P2 | 🔴 | Peringkat komunitas |
| 8 | History | P1 | 🔴 | Riwayat perjalanan lengkap |
| 9 | Technology | P2 | 🔴 | Informasi tech stack & tentang kami |
| 10 | FAQ | P2 | 🔴 | Pertanyaan umum (bisa di landing) |
| 11 | Admin Dashboard | P2 | 🔴 | Untuk organizer/monitoring |

---

## Halaman 1: Landing Page (✅ Done)

### Deskripsi

Halaman utama website yang berfungsi sebagai **marketing & onboarding** untuk memperkenalkan Verdify kepada pengunjung.

### Fungsi Utama

- Memperkenalkan value proposition Verdify
- Menampilkan fitur-fitur unggulan
- Call-to-action untuk memulai menggunakan
- Navigasi ke halaman lain

### Komponen yang Ada

| Komponen | Status | Keterangan |
| --- | --- | --- |
| Navbar | ✅ | Sudah responsive dengan mobile menu |
| Hero Section | ✅ | Tagline, CTA, statistik |
| About Section | ✅ | 3 card penjelasan Verdify |
| How It Works | ✅ | 4 step proses |
| Features Section | ✅ | 6 card fitur unggulan |
| Statistics Section | ✅ | Impact numbers dengan background hijau |
| Technology Section | ✅ | Google AI Ecosystem stack |
| Testimonials | ✅ | 3 user reviews |
| FAQ Accordion | ✅ | 5 pertanyaan umum |
| CTA Section | ✅ | Call-to-action akhir |
| Footer | ✅ | Links & social media |

### Route / URL

```
/
```

---

## Halaman 2: Route Planner (🔴 P0 - Wajib)

### Deskripsi

Halaman inti aplikasi di mana pengguna **memasukkan detail perjalanan** mereka untuk mendapatkan rekomendasi rute hijau.

### Fungsi Utama

- Input origin & destination
- Pilih waktu keberangkatan
- Set preferensi (eco/fast/cheap)
- Trigger AI untuk merencanakan rute

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│                                             │
│  🚗 Plan Your Green Journey                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📍 From: [Bukit Indah]              │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 🏁 To: [Woodlands North]            │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 🕐 Departure: [Tomorrow, 8:00 AM]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Preference:                               │
│  ○ 🌱 Eco First    ○ ⚡ Fastest    ○ 💰 Cheapest│
│                                             │
│  Advanced Options ▼                        │
│  ┌─────────────────────────────────────┐   │
│  │ 👥 Passengers: [1]                  │   │
│  │ 🚲 Allow Bike?    ✅ Yes             │   │
│  │ 🚶 Allow Walk?    ✅ Yes             │   │
│  │ 🚌 Allow Bus?     ✅ Yes             │   │
│  │ 🚇 Allow RTS?     ✅ Yes             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │     ✨ Plan My Green Route          │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### State Management

| State | Type | Deskripsi |
| --- | --- | --- |
| origin | string | Lokasi asal |
| destination | string | Lokasi tujuan |
| departureTime | Date | Waktu keberangkatan |
| preference | 'eco' | 'fast' |
| passengers | number | Jumlah penumpang |
| allowedModes | array | Moda transportasi yang diizinkan |
| isLoading | boolean | Loading state saat AI memproses |

### API Calls

```
POST /api/plan-route
Body: { origin, destination, departureTime, preference, passengers, allowedModes }
Response: { routes: [], carbonData, pointsEarned }
```

### Route / URL

```
/plan
```

---

## Halaman 3: Results Page (🔴 P0 - Wajib)

### Deskripsi

Halaman yang **menampilkan hasil rekomendasi rute** dari AI setelah pengguna submit form di Route Planner.

### Fungsi Utama

- Menampilkan 3-4 opsi rute dengan perbandingan
- Detail carbon footprint setiap rute
- Green points yang akan didapat
- Tombol untuk memilih dan "start journey"

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  ← Back to Edit                             │
│                                             │
│  🎯 Your Green Route Options                │
│  From: Bukit Indah → To: Woodlands North    │
│  Departure: Tomorrow, 8:00 AM               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🥇 RECOMMENDED - Best Eco           │   │
│  │ ┌───────────────────────────────┐   │   │
│  │ │ 🚇 RTS Link → 🚶 Walk → 🚌 Bus │   │   │
│  │ │ Time: 45 min  |  CO2: 0.8 kg  │   │   │
│  │ │ Cost: RM 12.50 | Points: +150  │   │   │
│  │ └───────────────────────────────┘   │   │
│  │ [🌱 Select This Route]              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🥈 Fastest Route                    │   │
│  │ ┌───────────────────────────────┐   │   │
│  │ │ 🚗 GrabEV → 🚇 RTS Link        │   │   │
│  │ │ Time: 30 min  |  CO2: 1.2 kg  │   │   │
│  │ │ Cost: RM 18.00 | Points: +80   │   │   │
│  │ └───────────────────────────────┘   │   │
│  │ [⚡ Select This Route]              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🥉 Cheapest Route                   │   │
│  │ ┌───────────────────────────────┐   │   │
│  │ │ 🚌 Public Bus Only             │   │   │
│  │ │ Time: 75 min  |  CO2: 0.5 kg  │   │   │
│  │ │ Cost: RM 4.50  | Points: +200  │   │   │
│  │ └───────────────────────────────┘   │   │
│  │ [💰 Select This Route]              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📊 Your Impact This Trip                  │
│  ┌─────────────────────────────────────┐   │
│  │ You'll save 2.5 kg CO2 compared     │   │
│  │ to driving alone! That's like       │   │
│  │ planting 0.1 trees 🌳               │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### State Management

| State | Type | Deskripsi |
| --- | --- | --- |
| routes | array | Data rute dari API |
| selectedRoute | object | Rute yang dipilih user |
| carbonData | object | Data emisi & perbandingan |
| pointsEarned | number | Poin yang akan didapat |

### Route / URL

```
/results
```

(Diakses via POST data dari /plan)

---

## Halaman 4: Dashboard (🔴 P1 - High)

### Deskripsi

Halaman **utama setelah login** yang menampilkan ringkasan statistik personal, aktivitas terbaru, dan rekomendasi.

### Fungsi Utama

- Menampilkan total CO2 saved & poin
- Grafik tren mingguan
- Aktivitas perjalanan terbaru
- Rekomendasi personal dari AI

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  👋 Welcome back, Sarah!                    │
│                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ 🌿 Total    │ │ ⭐ Points   │ │ 🏆 Rank││
│  │ CO2 Saved   │ │  2,450      │ │ #42    ││
│  │ 125 kg      │ │             │ │        ││
│  └─────────────┘ └─────────────┘ └────────┘│
│                                             │
│  📈 Weekly Carbon Savings                   │
│  ┌─────────────────────────────────────┐   │
│  │  [Line Chart: Mon 5kg, Tue 8kg...]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🚀 Quick Actions                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Plan Trip│ │ View     │ │ Redeem   │   │
│  │          │ │ History  │ │ Points   │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                             │
│  📋 Recent Journeys                         │
│  ┌─────────────────────────────────────┐   │
│  │ Today, 8:00 AM - Bukit Indah → CIQ  │   │
│  │ Saved 1.2 kg CO2 | +80 points       │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ Yesterday - Home → Office            │   │
│  │ Saved 0.8 kg CO2 | +50 points       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  💡 AI Recommendation                       │
│  ┌─────────────────────────────────────┐   │
│  │ "Try leaving at 8:30 AM tomorrow    │   │
│  │ to save an extra 15 minutes and     │   │
│  │ earn 2x green points!"              │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Route / URL

```
/dashboard
```

---

## Halaman 5: Profile (🔴 P1 - High)

### Deskripsi

Halaman untuk **mengelola akun pengguna**, preferensi, dan pengaturan.

### Fungsi Utama

- Edit profil (nama, email, avatar)
- Pengaturan preferensi perjalanan default
- Ubah password
- Dark/light mode toggle
- Language preference (BM/EN)

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  👤 My Profile                              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📷 [Avatar]                         │   │
│  │ Name: Sarah Chen                    │   │
│  │ Email: sarah@example.com            │   │
│  │ Member since: March 2026            │   │
│  │ [Edit Profile]                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ⚙️ Preferences                             │
│  ┌─────────────────────────────────────┐   │
│  │ Default Travel Mode: 🌱 Eco First   │   │
│  │ Home Location: Bukit Indah          │   │
│  │ Work Location: Woodlands North      │   │
│  │ [Save Changes]                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🎨 Appearance                              │
│  ┌─────────────────────────────────────┐   │
│  │ Theme: ○ Light  ● Dark  ○ System    │   │
│  │ Language: ● English  ○ Bahasa Melayu│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🔒 Security                                │
│  ┌─────────────────────────────────────┐   │
│  │ [Change Password]                   │   │
│  │ [Enable 2FA]                        │   │
│  │ [Delete Account]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Route / URL

```
/profile
```

---

## Halaman 6: Green Points (🔴 P1 - High)

### Deskripsi

Halaman khusus untuk **mengelola poin hijau** dan reward.

### Fungsi Utama

- Menampilkan total poin & history
- Redeem reward
- Lihat challenge aktif
- Leaderboard preview

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  ⭐ My Green Points                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         🎉 2,450 Points             │   │
│  │   Level 4 - Forest Guardian         │   │
│  │   [=====     ] 450 to next level    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🎁 Redeem Rewards                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Toll    │ │ GrabEV  │ │ 🌳 Donate│      │
│  │ Discount│ │ Voucher │ │ 1 Tree  │      │
│  │ 500 pts │ │ 800 pts │ │ 500 pts │      │
│  └─────────┘ └─────────┘ └─────────┘      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Coffee  │ │ MyRapid │ │ 🎟️ Movie │      │
│  │ Voucher │ │ Top Up  │ │ Ticket  │      │
│  │ 1000 pts│ │ 1200 pts│ │ 2000 pts│      │
│  └─────────┘ └─────────┘ └─────────┘      │
│                                             │
│  🏆 Active Challenges                       │
│  ┌─────────────────────────────────────┐   │
│  │ 🌅 Early Bird: 5 trips before 8AM   │   │
│  │ Progress: 3/5 | Reward: 300 pts     │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 🚫 No Car Friday: Use public transit │   │
│  │ Progress: 2/4 | Reward: 500 pts     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📜 Points History                          │
│  ┌─────────────────────────────────────┐   │
│  │ +80 pts - Today, Bukit Indah→CIQ    │   │
│  │ +150 pts - Yesterday, Eco Route     │   │
│  │ +50 pts - Streak Bonus (3 days)     │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Route / URL

```
/points
```

---

## Halaman 7: Leaderboard (🔴 P2 - Medium)

### Deskripsi

Halaman yang menampilkan **peringkat pengguna** berdasarkan poin hijau.

### Fungsi Utama

- Top 100 pengguna dengan poin tertinggi
- Filter per wilayah (JB, Iskandar Puteri, Singapore)
- Peringkat personal user

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  🏆 Green Leaderboard                       │
│                                             │
│  Filter: [All] [Johor] [Singapore]         │
│                                             │
│  Your Rank: #42 | Points: 2,450            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ #1  🌟 Ahmad R.    12,450 pts  👑   │   │
│  │ #2  🚀 Siti N.     11,200 pts       │   │
│  │ #3  💪 Tan W.L.    10,850 pts       │   │
│  │ ...                                 │   │
│  │ #42 🟢 You         2,450 pts        │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Route / URL

```
/leaderboard
```

---

## Halaman 8: History (🔴 P1 - High)

### Deskripsi

Halaman yang menampilkan **seluruh riwayat perjalanan** pengguna.

### Fungsi Utama

- Daftar semua perjalanan yang pernah dilakukan
- Filter by date, mode, or route
- Detail perjalanan (carbon saved, points, route)
- Export ke PDF

### UI/UX Komponen

```
┌─────────────────────────────────────────────┐
│  Verdify Navbar                             │
├─────────────────────────────────────────────┤
│  📜 Journey History                         │
│                                             │
│  Filter: [Last 7 days] [All] [By Mode]     │
│  [Export to PDF]                            │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📅 April 15, 2026                   │   │
│  │ 🕐 8:00 AM - Bukit Indah → CIQ      │   │
│  │ 🚇 RTS Link + Walk                  │   │
│  │ 💚 Saved 1.2 kg CO2 | +80 points    │   │
│  │ [View Details]                      │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 📅 April 14, 2026                   │   │
│  │ 🕐 5:30 PM - Office → Home          │   │
│  │ 🚌 Public Bus                       │   │
│  │ 💚 Saved 0.8 kg CO2 | +50 points    │   │
│  │ [View Details]                      │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 📅 April 13, 2026                   │   │
│  │ 🕐 8:15 AM - Bukit Indah → CIQ      │   │
│  │ 🚗 GrabEV                           │   │
│  │ 💚 Saved 0.5 kg CO2 | +30 points    │   │
│  │ [View Details]                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Route / URL

```
/history
```

---

## Halaman 9: Technology (🔴 P2 - Medium)

### Deskripsi

Halaman informatif tentang **teknologi dan tim di balik Verdify**.

### Fungsi Utama

- Menampilkan tech stack lengkap
- Penjelasan arsitektur
- Team members (jika ada)
- Alignment dengan agenda nasional

### Route / URL

```
/technology
```

---

## Halaman 10: FAQ (🔴 P2 - Medium)

### Deskripsi

Halaman **pertanyaan umum** (bisa juga di landing page sebagai section).

### Route / URL

```
/faq
```

---

## Halaman 11: Admin Dashboard (🔴 P2 - Medium)

### Deskripsi

Halaman khusus untuk **organizer/admin** memonitor seluruh aktivitas platform.

### Fungsi Utama

- Total users, journeys, CO2 saved
- Real-time activity feed
- Manage rewards & challenges
- Export data laporan

### Route / URL

```
/admin
```

(Authentication required)

---

## Summary Halaman Berdasarkan Prioritas

| Prioritas | Halaman | Jumlah |
| --- | --- | --- |
| **P0 (Wajib MVP - 3 halaman)** | Landing Page, Route Planner, Results Page | 3 |
| **P1 (High - 5 halaman)** | Dashboard, Profile, Green Points, History | 4 |
| **P2 (Medium - 4 halaman)** | Leaderboard, Technology, FAQ, Admin Dashboard | 4 |
| **Total** |  | **11** |

---

## Sitemap / Struktur Navigasi

```
Verdify
│
├── / (Landing Page)
│
├── App (After Login)
│   ├── /dashboard (Home)
│   ├── /plan (Route Planner)
│   ├── /results (Results Page)
│   ├── /history (Journey History)
│   ├── /points (Green Points)
│   ├── /leaderboard
│   ├── /profile
│   │
│   └── Info Pages
│       ├── /technology
│       ├── /faq
│       └── /admin (restricted)
```

---

Apakah Anda ingin saya mulai membuat kode untuk salah satu halaman di atas? Misalnya:

1. **Route Planner** (Paling penting setelah landing page)
2. **Dashboard** (Halaman utama setelah login)
3. **Results Page** (Menampilkan rekomendasi AI)

# Backlog Features

# Verdify - Complete Product Backlog

## Project Overview

**Verdify** adalah AI Personal Green Navigator untuk koridor Johor-Singapore yang mengintegrasikan Google AI Ecosystem untuk memberikan solusi mobilitas berkelanjutan yang cerdas, otonom, dan berdampak.

---

## Epic 1: Core AI Navigation Engine (Prioritas Tertinggi - P0)

### Fitur 1.1: Smart Route Optimization

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | AI menganalisis dan memberikan rekomendasi rute terbaik berdasarkan emisi, waktu, biaya, dan preferensi pengguna |
| **Input** | Origin, destination, departure time, preferensi (eco/fast/cheap) |
| **Output** | 3-4 opsi rute dengan breakdown lengkap |
| **Teknologi** | Gemini Pro + Vertex AI Search RAG |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Multi-modal route combination (RTS Link + LRT + e-hailing + bike + walk)
- [ ]  Real-time traffic data integration via Google Maps API
- [ ]  Weather-aware routing (hujan → prioritaskan indoor/covered routes)
- [ ]  Live event detection (demo, kecelakaan, road closure) via RAG dari Twitter/MET
- [ ]  Historical traffic pattern analysis untuk prediksi kepadatan

### Fitur 1.2: Carbon Footprint Intelligence

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Perhitungan akurat emisi CO2 per perjalanan dengan visualisasi dampak lingkungan |
| **Input** | Mode transportasi, jarak, durasi, jumlah penumpang |
| **Output** | Kg CO2, setara pohon, perbandingan dengan rute biasa |
| **Teknologi** | Gemini Flash + Custom Calculator Function |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Per-hitungan CO2 per km untuk setiap moda transportasi
- [ ]  Carbon intensity factor berdasarkan waktu (peak hour lebih boros BBM)
- [ ]  Visual progress bar (target harian/mingguan)
- [ ]  "What if" simulator (jika naik bus instead of mobil, hemat X kg)
- [ ]  Carbon offset recommendation (donasi ke penanaman pohon)

### Fitur 1.3: Green Points & Reward System

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Sistem poin yang mendorong perilaku hijau dengan insentif yang dapat ditukar |
| **Mekanisme** | Setiap perjalanan hijau → poin → redeem reward |
| **Teknologi** | Firebase Firestore + Gemini untuk rekomendasi reward personal |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Point calculation engine (1 kg CO2 saved = 10 points)
- [ ]  Daily/Weekly streak bonus (7 hari berturut-turut → bonus 2x)
- [ ]  Challenge system ("Hindari peak hour selama 5 hari → 500 points")
- [ ]  Leaderboard per wilayah (Iskandar Puteri, JB Sentral, Woodlands)
- [ ]  Redeem options:
    - [ ]  Diskon toll (RM5 off per 1000 points)
    - [ ]  Voucher e-hailing EV (GrabEV, AirAsia Ride)
    - [ ]  Donasi ke penanaman mangrove (1 pohon = 500 points)
    - [ ]  Coffee voucher (local sustainable cafes)
    - [ ]  Public transport top-up (MyRapid card)

### Fitur 1.4: EV-First Private Fleet Policy

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Hanya kendaraan private (Ojek, Taksi, e-hailing) berbasis EV yang direkomendasikan |
| **Data** | Database partner EV fleet (GrabEV, MyCar EV, etc.) |
| **Teknologi** | Firebase Firestore + Gemini filtering |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  EV fleet database management (admin panel)
- [ ]  Real-time EV availability checker
- [ ]  Charging station locator dengan availability status
- [ ]  Estimated waiting time for EV booking
- [ ]  Price comparison between EV vs non-EV (non-EV tidak muncul)

---

## Epic 2: Congestion Mitigation System (Prioritas Tinggi - P0)

### Fitur 2.1: Peak Hour Load Balancing

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Meratakan distribusi perjalanan dengan memberikan rekomendasi waktu alternatif |
| **Mekanisme** | Identifikasi peak hour → sarankan waktu di luar peak dengan insentif poin |
| **Teknologi** | Historical traffic data + Gemini prediction |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Peak hour detection per rute (7:30-9:00, 17:00-19:00)
- [ ]  "Shift Your Trip" recommendation (berangkat 30 menit lebih awal/akhir)
- [ ]  Off-peak bonus points (2x poin untuk perjalanan di luar peak)
- [ ]  Congestion score display (0-100%) untuk setiap rute
- [ ]  Prediction: "Jika berangkat jam 7:30 => 45 menit, jam 8:30 => 25 menit"

### Fitur 2.2: Reimbursement System

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Kompensasi jika pengguna mengikuti rekomendasi rute anti-macet namun waktu tempuh lebih lama |
| **Mekanisme** | Prediksi ETA vs actual ETA → selisih >15 menit → klaim reimburs |
| **Teknologi** | Gemini untuk verifikasi + Firebase untuk tracking |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  ETA prediction engine (Gemini + real-time traffic)
- [ ]  Actual travel time tracking (user upload screenshot atau GPS)
- [ ]  Fraud detection system:
    - [ ]  Max 3 claims per hari per user
    - [ ]  Jika rute dipilih >20% lebih lama dari rute tercepat → claim ditolak
    - [ ]  Daily cap: maks RM50 reimbursement total per hari
- [ ]  Claim approval workflow (auto jika selisih >15 menit)
- [ ]  Reimburs disbursement (points atau wallet credit)

### Fitur 2.3: Alternative Longer Route Planner

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Menawarkan rute lebih panjang tapi lebih lancar sebagai solusi kemacetan |
| **Mekanisme** | Hitung trade-off: jarak tambahan vs waktu yang dihemat |
| **Teknologi** | Dijkstra algorithm + Gemini optimization |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  "Scenic Green Route" (lebih panjang tapi pemandangan hijau)
- [ ]  "Quiet Route" (hindari jalan raya utama, lebih tenang)
- [ ]  "Balancing Route" (sedikit lebih panjang, waktu hampir sama)
- [ ]  Comparison card: "Rute A: 10km, 30 menit vs Rute B: 15km, 25 menit"

---

## Epic 3: User Experience & Personalization (Prioritas Sedang - P1)

### Fitur 3.1: Personalized Dashboard

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Dashboard personal yang menampilkan statistik perjalanan, poin, dan dampak lingkungan |
| **Teknologi** | React + Recharts + Firebase |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Weekly carbon savings chart (line chart)
- [ ]  Mode transportasi breakdown (pie chart)
- [ ]  Points history & achievements
- [ ]  "This week you saved X kg CO2 = setara Y pohon"
- [ ]  Badge system (Green Warrior, Early Bird, EV Champion, etc.)
- [ ]  Monthly sustainability report (PDF download)

### Fitur 3.2: Multimodal & Accessibility

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Multiple input methods dan dukungan aksesibilitas untuk semua pengguna |
| **Teknologi** | Gemini Vision + Web Speech API + shadcn/ui |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Voice input (Bahasa Malaysia, English, Mandarin)
- [ ]  Voice output (text-to-speech untuk rekomendasi rute)
- [ ]  Image upload (foto landmark atau papan tanda → Gemini Vision analisis)
- [ ]  Accessibility mode:
    - [ ]  High contrast theme
    - [ ]  Font size adjustment
    - [ ]  Screen reader optimized
    - [ ]  Wheelchair-friendly route prioritization
- [ ]  Bahasa Malaysia toggle (full UI translation)

### Fitur 3.3: Saved Places & Favorites

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Simpan lokasi favorit untuk akses cepat |
| **Teknologi** | Firebase Firestore |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Save home, work, frequent destinations
- [ ]  Favorite routes (saved dengan preferensi)
- [ ]  Custom labels & tags
- [ ]  Quick action from dashboard

---

## Epic 4: Business & Enterprise (Prioritas Sedang - P1)

### Fitur 4.1: Employer/Fleet Integration

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Solusi untuk perusahaan yang ingin melacak dan mengurangi emisi armada/karyawan |
| **Teknologi** | Firebase + PDF generation + Gemini analytics |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Corporate dashboard (aggregate view semua karyawan)
- [ ]  Fleet emissions tracking per kendaraan
- [ ]  Weekly/Monthly ESG report (auto-generate PDF)
- [ ]  Department leaderboard (competition antar tim)
- [ ]  API for enterprise integration

### Fitur 4.2: Carbon Credit Marketplace (Future)

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Marketplace untuk membeli/jual carbon credit dari perjalanan hijau |
| **Status** | 🟡 Future (Post-MVP) |

---

## Epic 5: Social & Community (Prioritas Rendah - P2)

### Fitur 5.1: Community Features

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Fitur sosial untuk membangun komunitas green traveler |
| **Teknologi** | Firebase + Gemini untuk rekomendasi koneksi |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Green feed (aktivitas publik dari pengguna lain)
- [ ]  Group challenge ("Komuniti Taman Molek vs Taman Daya")
- [ ]  Share trip result ke social media (WhatsApp, Twitter, Telegram)
- [ ]  Event notification (car-free day, green workshop)

### Fitur 5.2: Gamification Deep

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Level, achievement, dan quest untuk engagement jangka panjang |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Level system (Seedling → Sapling → Tree → Forest)
- [ ]  Achievement badges (30+ jenis)
- [ ]  Daily/Weekly quests
- [ ]  Seasonal events (Ramadan green commuting, Earth Month)

---

## Epic 6: Data & Analytics (Prioritas Rendah - P2)

### Fitur 6.1: Admin Dashboard

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | Dashboard untuk organizer/monitor data agregat |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Total users, journeys, CO2 saved
- [ ]  Most popular routes & times
- [ ]  Mode transportasi preference trend
- [ ]  Peak hour congestion heatmap
- [ ]  Export data to CSV

### Fitur 6.2: Public API

| Aspek | Detail |
| --- | --- |
| **Deskripsi** | API publik untuk developer third-party |
| **Status** | 🟡 Future (Post-MVP) |

---

## Epic 7: Technical Foundation (Infrastructure)

### Fitur 7.1: Backend Services

| Aspek | Detail |
| --- | --- |
| **Status** | 🔴 Not Started |

**Sub-fitur:**

- [ ]  Firebase Genkit flows setup
    - [ ]  `planGreenTrip` flow (multi-step reasoning)
    - [ ]  `calculateCarbon` function
    - [ ]  `bookTransport` mock flow
    - [ ]  `generateReport` PDF flow
- [ ]  Vertex AI Search RAG setup
    - [ ]  Upload dataset (5-8 PDF dokumen nasional)
    - [ ]  Retriever configuration
- [ ]  Cloud Run deployment ready
- [ ]  Environment variables management

### Fitur 7.2: Frontend Foundation

| Aspek | Detail |
| --- | --- |
| **Status** | 🟡 Partial (Landing page done) |

**Sub-fitur:**

- [ ]  Complete landing page ✅
- [ ]  Dashboard page
- [ ]  Route planner page
- [ ]  Profile page
- [ ]  History page
- [ ]  Leaderboard page
- [ ]  Dark mode toggle
- [ ]  PWA setup (offline capable)

---

## Technical Specifications Summary

| Komponen | Teknologi | Status |
| --- | --- | --- |
| Frontend Framework | React + Vite | ✅ |
| Styling | Tailwind + shadcn/ui | ✅ |
| Animations | Framer Motion | ✅ |
| Charts | Recharts | ✅ |
| Icons | Lucide React | ✅ |
| Backend | Firebase Genkit | 🔴 |
| AI | Gemini 2.0 Flash/Pro | 🔴 |
| RAG | Vertex AI Search | 🔴 |
| Database | Firebase Firestore | 🔴 |
| Auth | Firebase Auth | 🔴 |
| Deployment | Google Cloud Run | 🔴 |
| Hosting | Firebase Hosting | 🔴 |

---

## Priority Matrix

| Priority | Epic | Jumlah Fitur | Target Penyelesaian |
| --- | --- | --- | --- |
| **P0 (Wajib MVP)** | Core AI Navigation Engine | 4 | Hari 1-2 |
| **P0 (Wajib MVP)** | Congestion Mitigation System | 3 | Hari 2-3 |
| **P1 (High)** | User Experience & Personalization | 3 | Hari 3-4 |
| **P1 (High)** | Business & Enterprise | 2 | Hari 4 |
| **P2 (Medium)** | Social & Community | 2 | Post-MVP |
| **P2 (Medium)** | Data & Analytics | 2 | Post-MVP |
| **Infrastructure** | Technical Foundation | 2 | Hari 1-5 |

---

## MVP Minimal Requirement (Untuk Lolos Top 50)

Dari backlog di atas, **minimal ini yang harus selesai** sebelum submit 21 April:

1. ✅ Landing page (sudah)
2. Smart Route Optimization (basic: Gemini + RAG sederhana)
3. Carbon Footprint Intelligence (basic calculator)
4. Green Points (simulasi, tanpa redeem dulu)
5. Peak Hour Detection (basic: hardcode jam sibuk)
6. Deployed ke Cloud Run

**Fitur yang BISA DITUNDA dulu:**

- Reimbursement system (kompleks, rawan bug)
- Voice/multimodal input (nice to have)
- Enterprise integration
- Full gamification

---

## Estimated Timeline (5 Hari)

| Hari | Fokus | Fitur Target |
| --- | --- | --- |
| Hari 1 | Setup + Core AI | Genkit flow + Gemini integration + RAG setup |
| Hari 2 | Navigation + Carbon | Route optimizer + calculator + points engine |
| Hari 3 | Congestion System | Peak hour detection + EV-first policy |
| Hari 4 | UI Polish + Dashboard | Dashboard page + history + profile |
| Hari 5 | Deployment + Testing | Cloud Run deploy + video demo + submission |

---

Apakah Anda ingin saya buatkan **detail teknis untuk salah satu fitur** di atas? Misalnya:

- Genkit flow code untuk `planGreenTrip`
- Firebase Firestore schema untuk points system
- RAG dataset template
- Dashboard component dengan Recharts

# Context Master Prompt [Frontend]

# 🌿 VERDIFY - MASTER CONTEXT PROMPTS (ENGLISH VERSION)

Berikut adalah context prompts yang ringkas, jelas, dan siap pakai untuk setiap halaman Verdify.

---

## PROMPT 1: LANDING PAGE (✅ SUDAH JADI)

```
Halaman landing page untuk Verdify sudah selesai. Tidak perlu perubahan.
```

---

## PROMPT 2: ROUTE PLANNER PAGE

```
Create a route planner page for Verdify with:

**Layout:**
- Header: "Plan Your Green Journey" with gradient text "Green"
- Subtitle: "Tell us where you're going, and we'll find the most sustainable route"

**Form Fields:**
- Origin input: "From: [placeholder: Bukit Indah]" with location icon
- Destination input: "To: [placeholder: Woodlands North]" with flag icon
- Departure date-time picker: "Departure Time" with calendar icon
- Preference radio group:
  | 🌱 Eco First (default) | ⚡ Fastest | 💰 Cheapest
- Passengers counter: "👥 Passengers: [1] [2] [3] [4+]"
- Transport modes checkbox group:
  | [✓] RTS Link | [✓] LRT | [✓] Public Bus | [✓] Walking | [✓] Biking | [✓] EV Taxi

**Quick Action Buttons (below form):**
- "🏠 Home → Work" button
- "🏢 Work → Home" button
- "🛍️ Home → Mall" button

**Submit Button:**
- Primary button: "✨ Plan My Green Route →"
- Show loading spinner with text "Analyzing routes..." when clicked
- Disabled state with opacity when loading

**Recent Places Section (optional at bottom):**
- Show 3-5 recently used locations with icons
- Click to auto-fill form

**Validation:**
- Origin and destination cannot be empty
- Origin and destination cannot be the same
- Departure time cannot be in the past
- At least one transport mode selected

**Interaction:**
- On submit, store form data in sessionStorage
- Redirect to /results page
- Show toast error if API fails

**Tech:** React + Tailwind + shadcn/ui + React Hook Form + Zod
**Output:** Complete responsive form component with all fields and validation
```

---

## PROMPT 3: RESULTS PAGE

```
Create a results page for Verdify that displays AI-generated route recommendations with:

**Layout Structure:**
- Two columns: Main content (70%) + Sidebar (30%)
- On mobile: stack vertically

**Header Section:**
- Journey summary card showing: "📍 Bukit Indah → 🏁 Woodlands North"
- Departure time: "🕐 Tomorrow, 8:00 AM"
- Edit button: "Edit Journey" (links back to /plan)

**Route Cards (3-4 options):**

Card 1 - Recommended (highlighted with green border):
- Badge: "🥇 RECOMMENDED - Best Eco" (green background)
- Mode icons row: RTS Link → Walking → Bus
- Metrics row (3 columns):
  | Time: 45 min | CO₂: 0.8 kg (-85%) | Cost: RM 12.50 | Points: +150
- Expandable section: "▼ View step-by-step directions"
  - Step 1: Walk 5 mins to Bukit Indah RTS Station
  - Step 2: Take RTS Link to Woodlands North (20 mins)
  - Step 3: Walk 10 mins to destination
- Button: "🌱 Select This Route" (primary green)

Card 2 - Fastest:
- Badge: "⚡ FASTEST" (blue background)
- Same structure as Card 1
- Metrics: Time: 30 min | CO₂: 1.2 kg | Cost: RM 18.00 | Points: +80
- Button: "⚡ Select This Route"

Card 3 - Cheapest:
- Badge: "💰 CHEAPEST" (amber background)
- Metrics: Time: 75 min | CO₂: 0.5 kg | Cost: RM 4.50 | Points: +200
- Button: "💰 Select This Route"

**Sidebar - Impact Summary:**
- Title: "🌍 Your Environmental Impact"
- Card with green gradient background:
  | CO₂ Saved This Trip: 2.5 kg
  | Progress bar: 85% (compared to driving alone)
  | Equivalent to planting: 0.1 trees 🌳
  | Green Points Earned: +150 pts
  | Money Saved: RM 8.00

**Empty State (if no routes):**
- Center icon: 🧭 Compass
- Title: "No routes found"
- Message: "Try adjusting your preferences or allowed transport modes"
- Button: "← Back to Planner"

**Loading State:**
- Skeleton loader for each route card (3 cards)
- Pulsing animation

**Interaction:**
- Select route → store in localStorage as active journey
- Show toast: "Route selected! Start your green journey"
- Redirect to /dashboard or show confirmation modal

**Tech:** React + Tailwind + Framer Motion (card animations)
**Output:** Complete responsive results page with all route cards and sidebar
```

---

## PROMPT 4: DASHBOARD PAGE

```
Create a dashboard page for logged-in Verdify users with:

**Welcome Header:**
- "Welcome back, [User Name]! 👋"
- Subtext: "Here's your sustainability progress this week"

**Stats Cards Row (4 cards):**
| Card 1: 🌿 Total CO₂ Saved | 125 kg | +15% from last month |
| Card 2: ⭐ Green Points | 2,450 | Level 4 - Forest Guardian |
| Card 3: 🏆 Current Rank | #42 | Top 15% |
| Card 4: 🔥 Active Streak | 7 days | Best: 12 days |

**Weekly Carbon Chart:**
- Line chart with Recharts
- X-axis: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Y-axis: CO₂ saved in kg (0-10)
- Data: [5.2, 3.8, 7.1, 4.5, 6.3, 2.1, 1.5]
- Area fill: light green gradient
- Line color: #059669
- Tooltip on hover shows exact value

**Quick Actions Grid (4 buttons):**
- "🗺️ Plan Trip" → links to /plan
- "📜 History" → links to /history
- "⭐ My Points" → links to /points
- "🏆 Leaderboard" → links to /leaderboard

**Recent Journeys List (5 items):**
Each item shows:
- Icon: 🌿 (green circle background)
- Route: "Bukit Indah → CIQ"
- Date: "Today, 8:00 AM"
- Points: "+80 pts" (green text)
- CO₂ saved: "1.2 kg"
- Click to view details

**AI Recommendation Card (bottom):**
- Gradient background: from-emerald-600 to-green-600
- Icon: ✨ Sparkles
- Title: "AI Suggestion"
- Text: "Try leaving at 8:30 AM tomorrow to save an extra 15 minutes and earn 2x green points!"
- Button: "Try Now →" (white/transparent)

**Empty State (if no data):**
- Center icon: 🌿 Leaf
- Title: "No journeys yet"
- Message: "Start your first green journey today!"
- Button: "Plan a Trip →" (primary)

**Loading State:**
- Skeleton for stats cards (4)
- Skeleton for chart (200px height)
- Skeleton for recent journeys (3 items)

**Tech:** React + Tailwind + Recharts + Framer Motion
**Output:** Complete dashboard with chart, stats cards, and recent journeys
```

---

## PROMPT 5: PROFILE PAGE

```
Create a profile page for Verdify users with:

**Profile Header:**
- Avatar circle: User initials (e.g., "SC") with gradient background
- Camera icon overlay (for future upload)
- User name: "Sarah Chen"
- Email: "sarah.chen@example.com"
- Member since: "March 2026"

**Edit Profile Form (Card):**
- Full Name: text input with current value
- Email: email input (disabled, show current)
- Phone Number: tel input
- Default Home Location: text input with autocomplete
- Default Work Location: text input with autocomplete
- Save Changes button (primary)

**Preferences Section (Card):**
- Title: "Travel Preferences"
- Default Travel Mode radio group:
  | 🌱 Eco First (Lowest Carbon) - default
  | ⚡ Fastest Route
  | 💰 Cheapest Route
- Transport Mode Preferences checkbox group:
  | [✓] RTS Link | [✓] LRT | [✓] Public Bus
  | [✓] Walking | [✓] Biking | [✓] EV Taxi

**Notification Settings (Card):**
- Toggle switches for:
  | Email weekly report
  | Push notifications for journey reminders
  | Green tips & recommendations
  | Challenge alerts

**Appearance Section (Card):**
- Theme toggle: Light / Dark / System (radio or switch)
- Language select: English / Bahasa Malaysia

**Danger Zone (Card with red border):**
- Title: "Danger Zone"
- Message: "Permanently delete your account and all data"
- Button: "Delete Account" (red outline, with confirmation modal)

**Interactions:**
- Save button shows toast "Profile updated successfully"
- Delete account shows modal: "Are you sure? This action cannot be undone"
- Toggle switches have smooth animation

**Tech:** React + Tailwind + shadcn/ui + React Hook Form + Zod
**Output:** Complete profile page with all sections and forms
```

---

## PROMPT 6: GREEN POINTS PAGE

```
Create a green points and rewards page for Verdify with:

**Points Summary Header (Gradient Card):**
- Center icon: ⭐ Star (white, large)
- Total points: "2,450" (large font)
- Label: "Total Green Points"
- Progress bar to next level: "1,550 points to Level 5"
- Current level: "Level 4 - Forest Guardian"

**Rewards Grid (2-4 columns):**
Each reward card:
- Icon: 🎫 / ☕ / 🌳 / 🚗
- Name: "Toll Discount" / "Coffee Voucher" / "Plant a Tree" / "GrabEV Voucher"
- Points: "500 pts" / "1,000 pts" / "500 pts" / "800 pts"
- Button: "Redeem" (primary if enough points, disabled if not)
- On redeem: show modal confirmation, deduct points

**Active Challenges Section:**
- Title: "🏆 Active Challenges"
- Each challenge card:
  | Title: "Early Bird - 5 trips before 8AM"
  | Description: "Complete 5 trips before 8:00 AM"
  | Progress bar: 3/5 completed (60%)
  | Reward: "+300 pts"
  | Button: "View Challenge"

**Points History Section:**
- Title: "📜 Points History"
- List of transactions (last 10):
  | Icon: 🌿 / 🎯 / 🔥
  | Description: "Bukit Indah → CIQ" / "Weekly Streak Bonus"
  | Date: "Today, 8:00 AM" / "Yesterday"
  | Points: "+80 pts" (green) or "+50 pts"
- Show more button: "Load More"

**Empty State (if no points):**
- Center icon: ⭐ Star (gray)
- Title: "No points yet"
- Message: "Complete your first green journey to earn points!"
- Button: "Plan a Trip →"

**Tech:** React + Tailwind + Framer Motion (card animations)
**Output:** Complete points page with rewards grid, challenges, and history
```

---

## PROMPT 7: JOURNEY HISTORY PAGE

```
Create a journey history page for Verdify with:

**Page Header:**
- Title: "Journey History"
- Subtitle: "View all your past green journeys"

**Filter Bar:**
- Date filter select: "Last 7 days" | "Last 30 days" | "All time"
- Mode filter select: "All Modes" | "RTS" | "Bus" | "EV Taxi" | "Walking"
- Export button: "📄 Export to PDF" (right side)

**Journey List (card-based):**
Each journey card shows:
- Date and time: "Monday, April 15, 2026 • 8:00 AM"
- Route: "📍 Bukit Indah → 🏁 Woodlands North"
- Mode badges: "🚇 RTS Link" + "🚶 Walking" + "🚌 Bus"
- Stats row (3 columns):
  | 🌿 1.2 kg CO₂ saved | ⭐ +80 points | 💰 Saved RM 4.50
- View Details button: "View Details →" (text link)

**Group by Date:**
- Today section
- Yesterday section
- This Week section
- Older section

**Pagination:**
- Show 10 items per page
- Previous / Next buttons
- Page indicator: "Page 1 of 5"

**Empty State:**
- Center icon: 📜 Scroll
- Title: "No journeys yet"
- Message: "Start planning your first green journey"
- Button: "Plan a Trip →"

**Export Functionality:**
- Click Export PDF → generate PDF with all journeys in selected date range
- PDF includes: user name, date range, total CO₂ saved, total points, journey list

**Tech:** React + Tailwind + jsPDF (for export) + date-fns (formatting)
**Output:** Complete history page with filters, grouping, pagination, and export
```

---

## PROMPT 8: LEADERBOARD PAGE

```
Create a leaderboard page for Verdify with:

**Page Header:**
- Title: "🏆 Green Leaderboard"
- Subtitle: "Top eco-warriors in the community"

**Filter Tabs (centered):**
| All | Johor | Singapore | Iskandar Puteri |
- Active tab has green underline and bold text

**Your Rank Card (top, highlighted):**
- Background: gradient from-emerald-50 to-green-50
- Left: Rank badge "#42" in circle
- Center: User name "Sarah Chen" + "You"
- Right: "2,450 points"
- Message: "🎯 150 points to reach #41"

**Top 3 Podium (optional, for desktop):**
- 2nd place: 🥈 User name, points
- 1st place: 👑 User name, points (larger, center)
- 3rd place: 🥉 User name, points

**Leaderboard Table:**
Columns:
| Rank | User | Trips | Points | Badge |
| #1 | 👤 Ahmad R. | 156 trips | 12,450 pts | 🏆 Champion |
| #2 | 👤 Siti N. | 142 trips | 11,200 pts | ⭐ Elite |
| #3 | 👤 Tan W.L. | 138 trips | 10,850 pts | 💪 Warrior |
| #4 | 👤 M. Kumar | 120 trips | 9,200 pts | 🌿 Guardian |
| ... | ... | ... | ... | |
| #42 | 👤 Sarah Chen (You) | 45 trips | 2,450 pts | 🌱 Seedling |

Table features:
- Current user row highlighted with green background
- Rank icons: #1-3 have medal emojis
- Hover effect on rows
- Click user to view profile (optional)

**Search Bar (above table):**
- "🔍 Search by name..." (filters table in real-time)

**Pagination:**
- Show 20 users per page
- Previous / Next / Page numbers

**Loading State:**
- Skeleton rows (10 items)

**Tech:** React + Tailwind + Framer Motion + React Table (optional)
**Output:** Complete leaderboard with podium, table, filters, and pagination
```

---

## PROMPT 9: TECHNOLOGY PAGE

```
Create a technology page for Verdify that showcases the tech stack with:

**Page Header:**
- Title: "Powered by Google AI Ecosystem"
- Subtitle: "Built with cutting-edge technology for sustainable mobility"

**Tech Stack Grid (4 cards):**
Card 1: Google Gemini
- Icon: ✨ Sparkles
- Title: "Google Gemini"
- Description: "Advanced language models for natural conversation and smart route recommendations"
- Badge: "AI Brain"

Card 2: Firebase Genkit
- Icon: 🔥 Fire
- Title: "Firebase Genkit"
- Description: "Reliable AI application framework for agentic workflows and seamless deployment"
- Badge: "Orchestrator"

Card 3: Vertex AI Search
- Icon: 🔍 Search
- Title: "Vertex AI Search"
- Description: "RAG-powered semantic search for grounded route discovery using national datasets"
- Badge: "Knowledge Base"

Card 4: Google Cloud Run
- Icon: ☁️ Cloud
- Title: "Google Cloud Run"
- Description: "Serverless containerized deployment for scalable, always-on service"
- Badge: "Infrastructure"

**Architecture Diagram (card):**
- Title: "Verdify Architecture"
- Simple visual showing:
  | Frontend (React + Vite) → Backend (Genkit) → AI (Gemini) → Data (RAG)
  | Arrows between components
  | Deployed on Cloud Run

**Why Google AI Section:**
- Title: "Why We Chose Google AI Ecosystem"
- 4 bullet points with icons:
  | ✓ Cutting-Edge AI - Latest generative models
  | ✓ Enterprise Scalability - Grows with users
  | ✓ Developer Friendly - Excellent documentation
  | ✓ Green Infrastructure - Carbon-neutral cloud

**Open Source Section (optional):**
- Title: "Open Source Commitment"
- Message: "Verdify is built on open-source technologies"
- GitHub button: "⭐ Star us on GitHub"

**Tech:** React + Tailwind + Lucide React
**Output:** Complete technology page showcasing all Google services
```

---

## PROMPT 10: NAVBAR COMPONENT

```
Create a responsive navigation bar component for Verdify with:

**Desktop Layout (>768px):**
- Logo: 🌿 Leaf icon + "Verdify" text (gradient green)
- Navigation links: "Home", "How It Works", "Features", "Technology", "FAQ"
- Auth buttons:
  | If logged out: "Log In" (outline) + "Sign Up" (primary green)
  | If logged in: Avatar circle with user initial + "Dashboard" link
- Get Started button (primary green) - hidden on mobile

**Mobile Layout (<768px):**
- Logo visible
- Hamburger menu icon (☰)
- Slide-out sidebar menu when clicked:
  | All navigation links vertical
  | Auth buttons at bottom
  | Close button (✕)

**Scroll Behavior:**
- Initial: transparent background
- After scroll > 50px: white background with shadow
- Smooth transition (0.3s)

**Active Link Highlight:**
- Current page link has green text and bottom border

**User Dropdown (when logged in):**
- Click avatar → dropdown menu:
  | Dashboard
  | Profile
  | My Points
  | History
  | Log Out (red text)

**Animations:**
- Logo hover: scale 1.05
- Links hover: underline or color change
- Mobile menu: slide from right

**Tech:** React + Tailwind + Framer Motion + Next.js Link (or react-router)
**Output:** Complete responsive Navbar component with all states
```

---

## PROMPT 11: FOOTER COMPONENT

```
Create a footer component for Verdify with:

**Layout (Desktop - 6 columns):**
- Column 1 - Brand (colspan 2):
  | Logo: 🌿 Leaf + "Verdify"
  | Tagline: "Your Personal Green Navigator for sustainable mobility in the Johor-Singapore Innovation Corridor."
  | Social icons: GitHub, Twitter, LinkedIn, Email (with links)

- Column 2 - Product:
  | Title: "Product"
  | Links: "How It Works", "Features", "Pricing", "FAQ"

- Column 3 - Company:
  | Title: "Company"
  | Links: "About", "Blog", "Careers", "Press"

- Column 4 - Resources:
  | Title: "Resources"
  | Links: "Documentation", "API Reference", "Support", "Status"

- Column 5 - Legal:
  | Title: "Legal"
  | Links: "Privacy Policy", "Terms of Service", "Cookie Policy", "Licenses"

**Bottom Bar:**
- Copyright text: "© 2026 Verdify. Built with ❤️ for a sustainable future. All rights reserved."
- Language selector: 🌐 English | Bahasa Malaysia (simple dropdown)

**Mobile Layout (<768px):**
- Stack all columns vertically
- Center align text
- Social icons centered
- Bottom bar text centered

**Interactions:**
- Social icons hover: scale 1.1, change color to green
- Links hover: underline, color change to green

**Tech:** React + Tailwind + Lucide React
**Output:** Complete responsive Footer component
```

---

## PROMPT 12: AUTH PAGES (LOGIN & SIGNUP)

```
Create login and signup pages for Verdify with:

**Shared Layout:**
- Centered card on white background
- Logo at top: 🌿 Verdify
- Toggle between Login and Signup (if combined page)

**LOGIN PAGE:**

Fields:
- Email: email input with icon 📧
- Password: password input with icon 🔒 + show/hide toggle
- Remember me checkbox
- Forgot password? link

Buttons:
- "Log In" (primary green, full width)
- "Don't have an account? Sign Up" (text link)

**SIGNUP PAGE:**

Fields:
- Full Name: text input with icon 👤
- Email: email input with icon 📧
- Password: password input with icon 🔒 (with strength indicator)
- Confirm Password: password input
- Terms checkbox: "I agree to the Terms of Service and Privacy Policy"

Buttons:
- "Create Account" (primary green, full width)
- "Already have an account? Log In" (text link)

**Password Strength Indicator (Signup only):**
- Weak (red): less than 6 chars
- Medium (yellow): 6-9 chars
- Strong (green): 10+ chars with numbers/symbols

**Form Validation:**
- Email must be valid format
- Password min 6 characters
- Passwords must match
- Terms must be checked

**Error Handling:**
- Show error messages below fields
- Toast notification for API errors
- Loading state on submit button

**Success:**
- On success, redirect to /dashboard
- Show welcome toast: "Welcome to Verdify! 👋"

**Tech:** React + Tailwind + shadcn/ui + React Hook Form + Zod
**Output:** Complete Login and Signup pages with validation
```

---

## QUICK REFERENCE: ALL PAGES SUMMARY

| # | Page Name | Filename | Key Components | Priority |
| --- | --- | --- | --- | --- |
| 1 | Landing Page | `LandingPage.jsx` | ✅ SUDAH JADI | P0 |
| 2 | Route Planner | `RoutePlanner.jsx` | Form, inputs, quick actions, validation | P0 |
| 3 | Results Page | `ResultsPage.jsx` | Route cards, impact sidebar, expandable steps | P0 |
| 4 | Dashboard | `Dashboard.jsx` | Stats cards, line chart, quick actions, AI insight | P1 |
| 5 | Profile Page | `ProfilePage.jsx` | Form, preferences, notifications, danger zone | P1 |
| 6 | Green Points | `GreenPoints.jsx` | Points summary, rewards grid, challenges, history | P1 |
| 7 | Journey History | `HistoryPage.jsx` | Filters, journey cards, grouping, pagination, export | P1 |
| 8 | Leaderboard | `Leaderboard.jsx` | Your rank card, podium, table, search, pagination | P2 |
| 9 | Technology | `TechnologyPage.jsx` | Tech stack grid, architecture diagram | P2 |
| 10 | Navbar | `Navbar.jsx` | Responsive, desktop/mobile, auth buttons, dropdown | P0 |
| 11 | Footer | `Footer.jsx` | Multi-column, social links, copyright | P0 |
| 12 | Auth Pages | `Login.jsx` + `Signup.jsx` | Forms, validation, password strength | P1 |

---

## GLOBAL DESIGN SYSTEM

```
**Colors:**
- Primary Green: #059669 (emerald-600)
- Secondary Green: #10b981 (emerald-500)
- Light Green: #ecfdf5 (emerald-50)
- Dark Green: #064e3b (emerald-900)
- White: #ffffff
- Gray Text: #6b7280 (gray-500)
- Error Red: #ef4444

**Typography:**
- Headings: 'Poppins', sans-serif (font-weight: 600-700)
- Body: 'Inter', sans-serif (font-weight: 400-500)
- Font sizes: 14px (sm), 16px (base), 20px (lg), 24px (xl), 32px (2xl), 48px (4xl)

**Spacing:**
- Container padding: px-4 sm:px-6 lg:px-8
- Section padding: py-16 md:py-24
- Card padding: p-6 md:p-8
- Gap between cards: gap-4 md:gap-6

**Border Radius:**
- Cards: rounded-2xl (1rem)
- Buttons: rounded-full (pill) or rounded-xl (0.75rem)
- Inputs: rounded-lg (0.5rem)

**Shadows:**
- Card hover: shadow-xl
- Button hover: shadow-lg
- Form focus: ring-2 ring-emerald-500

**Animations:**
- Page entrance: fadeInUp 0.5s
- Card hover: scale 1.02 + shadow increase
- Button hover: scale 1.05
- Loading: spinner with green gradient
```

---

## TEKNOLOGI YANG DIGUNAKAN

| Library | Kegunaan |
| --- | --- |
| React 18+ | Framework utama |
| Vite | Build tool |
| TypeScript | Type safety (opsional) |
| TailwindCSS | Styling |
| shadcn/ui | Component library |
| Framer Motion | Animations |
| Recharts | Charts & graphs |
| Lucide React | Icons |
| React Hook Form | Form handling |
| Zod | Validation |
| date-fns | Date formatting |
| jsPDF | PDF export |

---

Context prompts ini siap digunakan untuk membuat seluruh halaman Verdify. Setiap prompt sudah mencakup layout, komponen, data fields, interaksi, dan output yang diharapkan. 🚀🌿