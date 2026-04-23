# VERDIFY RAG KNOWLEDGE ARCHITECTURE

## Multi-Layer Retrieval System (Policy + Infrastructure + Data + Intelligence + Real-Time)

---

# 1. SYSTEM OVERVIEW

Verdify menggunakan pendekatan multi-layer knowledge untuk membangun sistem Retrieval-Augmented Generation yang lebih akurat dan kontekstual.

Struktur utama terdiri dari:

1. Policy Layer
2. Infrastructure Layer
3. Data Layer
4. Intelligence Layer
5. Real-Time Layer

Setiap layer memiliki fungsi spesifik dalam mendukung reasoning dan decision-making.

---

# 2. POLICY LAYER

## Description

Policy Layer berisi dokumen strategis, regulasi, dan roadmap jangka panjang terkait mobilitas rendah karbon dan keberlanjutan.

## Data Sources

### Low Carbon Mobility Blueprint (LCMB)

* Fokus pada strategi pengurangan emisi sektor transportasi di Malaysia
* Mencakup elektrifikasi kendaraan, efisiensi energi, dan bahan bakar alternatif

### Net Zero 2050 Malaysia

* Target nasional untuk mencapai net-zero carbon emissions pada tahun 2050
* Menjadi baseline untuk semua keputusan terkait sustainability

### Johor–Singapore Special Economic Zone (JS-SEZ)

* Inisiatif pengembangan kawasan lintas negara berbasis ekonomi hijau
* Mendorong integrasi transportasi dan smart mobility

## Key Characteristics

* Static atau jarang berubah
* Bersifat strategis dan jangka panjang
* Digunakan untuk reasoning dan justifikasi

## RAG Function

* Memberikan konteks kebijakan
* Mendukung penjelasan berbasis regulasi
* Menjadi dasar rekomendasi berbasis sustainability

---

# 3. INFRASTRUCTURE LAYER

## Description

Infrastructure Layer berisi sistem transportasi fisik dan jaringan mobilitas yang digunakan dalam pergerakan manusia dan barang.

## Data Sources

### RTS Link (Johor–Singapore)

* Sistem rail lintas negara
* Mengurangi beban lalu lintas di Causeway
* Kapasitas tinggi dan efisiensi waktu

### Transport Network

* MRT (Singapore)
* Bus systems
* Road networks
* Pedestrian pathways

## Key Characteristics

* Semi-static
* Berubah secara bertahap
* Representasi struktur mobilitas

## RAG Function

* Memberikan opsi rute
* Mendukung multi-modal routing
* Menghubungkan policy dengan real-world execution

---

# 4. DATA LAYER

## Description

Data Layer berisi data kuantitatif yang digunakan untuk menghitung, mengukur, dan mengevaluasi emisi serta kondisi transportasi.

## Data Sources

### Carbon Monitor

* Dataset emisi CO2 global secara real-time
* Mencakup sektor transportasi

### Emission Factors

* IPCC emission factors
* DEFRA carbon conversion factors
* Digunakan untuk menghitung emisi per km atau per mode transportasi

### Weather Data (MET Malaysia)

* Data cuaca seperti hujan, suhu, kelembaban
* Mempengaruhi kondisi lalu lintas dan efisiensi bahan bakar

## Key Characteristics

* Numerik dan terstruktur
* Dapat bersifat statis maupun dinamis
* Digunakan untuk perhitungan

## RAG Function

* Menghitung estimasi emisi
* Memberikan data kuantitatif
* Mendukung analisis berbasis angka

---

# 5. INTELLIGENCE LAYER

## Description

Intelligence Layer berisi pengetahuan analitis, pola, dan hasil penelitian yang digunakan untuk reasoning tingkat tinggi.

## Data Sources

### Smart Mobility Research

* Studi terkait penggunaan AI dan IoT dalam transportasi
* Optimasi sistem mobilitas

### Behavioral and Optimization Studies

* Analisis perilaku pengguna transportasi
* Strategi perubahan perilaku menuju transportasi berkelanjutan

## Key Characteristics

* Semi-static
* Berbasis insight dan pola
* Digunakan untuk reasoning kompleks

## RAG Function

* Memberikan insight
* Mendukung rekomendasi cerdas
* Menghubungkan data dengan keputusan

---

# 6. REAL-TIME LAYER

## Description

Real-Time Layer berisi data yang selalu diperbarui dan sangat kontekstual terhadap kondisi saat ini.

## Data Sources

* Live traffic data
* Weather updates
* RTS schedule updates
* Transport delays
* Real-time carbon intensity

## Key Characteristics

* Dynamic dan frequently updated
* Sangat sensitif terhadap waktu
* Berubah secara cepat

## RAG Function

* Memberikan konteks saat ini
* Menentukan relevansi keputusan
* Menjadi faktor utama dalam rekomendasi langsung

---

# 7. INTER-LAYER RELATIONSHIP

Setiap layer saling terhubung dan tidak berdiri sendiri.

## Relationship Mapping

* Policy Layer
  → menentukan tujuan dan batasan

* Infrastructure Layer
  → menyediakan jalur implementasi

* Data Layer
  → menyediakan angka dan metrik

* Intelligence Layer
  → mengolah data menjadi insight

* Real-Time Layer
  → menentukan kondisi aktual

---

# 8. RAG RETRIEVAL STRATEGY

## Query Processing Flow

1. User query diterima

2. Query diklasifikasikan menjadi:

   * policy
   * real-time
   * hybrid

3. Retrieval dilakukan berdasarkan layer:

### Policy Query

* Ambil dari Policy Layer
* Fokus pada reasoning

### Real-Time Query

* Ambil dari Real-Time Layer
* Fokus pada kondisi terkini

### Hybrid Query

* Ambil dari:

  * Policy Layer
  * Infrastructure Layer
  * Data Layer
  * Real-Time Layer

* Context digabungkan dan diranking

---

## Context Composition

Final context yang dikirim ke model:

* Real-Time Context
* Infrastructure Context
* Data Context
* Policy Context
* Intelligence Context

---

# 9. EXAMPLE USE CASE

## Query

"Best low emission route from Johor to Singapore right now"

## Retrieval

* Real-Time Layer:

  * Traffic congestion
  * Weather

* Infrastructure Layer:

  * RTS Link availability
  * MRT connections

* Data Layer:

  * Emission factors

* Policy Layer:

  * Low carbon mobility strategy

* Intelligence Layer:

  * Multi-modal optimization insight

## Output

* Rekomendasi rute berbasis:

  * emisi rendah
  * kondisi saat ini
  * kebijakan sustainability

---

# 10. IMPLEMENTATION NOTES

## Index Structure (Recommended)

Pisahkan index di Vertex AI:

* verdify_policy_index
* verdify_infrastructure_index
* verdify_data_index
* verdify_intelligence_index
* verdify_realtime_index

## Retrieval Logic

* Single index untuk query sederhana
* Multi-index untuk query kompleks
* Hybrid merging untuk output akhir

---

# 11. FINAL INSIGHT

Pendekatan ini mengubah sistem dari:

* sekadar retrieval berbasis dokumen

menjadi:

* sistem reasoning berbasis multi-layer knowledge

Hasilnya:

* lebih akurat
* lebih kontekstual
* lebih relevan dengan kondisi nyata