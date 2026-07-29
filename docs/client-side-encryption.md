# Fondasi enkripsi sisi klien

Status: **belum aktif untuk data produksi**.

Dokumen ini mendefinisikan transisi TitipSandi dari enkripsi sisi server menuju vault
yang hanya dapat dibuka di perangkat pengguna. Kolom dan primitive kriptografi fase
pertama bersifat aditif; API lama tetap menjadi jalur aktif sampai seluruh kebutuhan
recovery dan akses darurat siap.

## Batas kepercayaan

Target akhirnya:

- plaintext entry dan kunci vault tidak pernah dikirim ke API;
- database hanya menyimpan ciphertext, IV, versi protokol, dan kunci vault yang sudah
  dibungkus;
- server tetap menangani autentikasi, sinkronisasi ciphertext, rate limit, dan metadata
  operasional minimum;
- perubahan ciphertext, pemindahan entry antar-pengguna, atau antar-entry terdeteksi
  oleh AES-GCM.

Password asli tidak dikirim ke server. Browser menurunkan authentication secret
terpisah untuk login, sedangkan API vault hanya menerima ciphertext. Klaim keamanan
tetap harus dibatasi sampai migrasi production dan audit independen selesai.

## Hierarki kunci versi 1

1. Browser membuat `vaultKey` acak 256-bit per pengguna.
2. Browser menurunkan key-encryption key (KEK) dari password dengan
   PBKDF2-HMAC-SHA-256, salt acak 128-bit, dan 600.000 iterasi.
3. KEK membungkus `vaultKey` menggunakan AES-256-GCM.
4. `vaultKey` mengenkripsi payload setiap entry menggunakan AES-256-GCM dan IV acak
   96-bit.
5. Associated authenticated data (AAD) mengikat kunci ke pengguna, serta ciphertext
   entry ke pengguna, ID entry, dan versi protokol.

PBKDF2 dipakai pada versi awal karena tersedia secara native melalui Web Crypto API.
Format dibuat berversi agar Argon2id dapat ditambahkan tanpa menafsirkan ulang
ciphertext lama.

## Invariant keamanan

- IV tidak boleh digunakan ulang dengan kunci yang sama.
- Parameter KDF versi 1 harus tepat 600.000 iterasi; nilai dari database tidak boleh
  menurunkan biaya derivasi.
- Material mentah `vaultKey` hanya diekspor sementara di memori saat membuat pembungkus
  akses darurat, lalu buffer sementara dibersihkan.
- Kegagalan autentikasi AES-GCM harus menghentikan dekripsi.
- Server tidak boleh melakukan pencarian terhadap plaintext. Pencarian dilakukan pada
  data yang sudah dibuka di browser.
- Metadata rahasia, termasuk kategori dan judul, berada di dalam payload terenkripsi.

## Tahapan rollout

1. **Fondasi tidak aktif:** primitive, test vector, serta kolom database opsional.
2. **Provisioning:** buat dan simpan protected vault key setelah autentikasi ulang.
3. **Dual read/write terkontrol:** migrasikan entry satu per satu di browser, tandai
   progres, dan verifikasi sebelum menghapus ciphertext lama.
4. **Recovery:** sediakan recovery key yang dibuat di browser. Reset password tanpa
   recovery key tidak boleh diam-diam menghancurkan akses ke vault.
5. **Emergency access:** ganti bearer code dengan request, masa tunggu, dan salinan
   vault key yang dibungkus menggunakan public key kontak tepercaya.
6. **Cutover:** hentikan penerimaan plaintext oleh API, hapus dekripsi sisi server,
   bersihkan kolom lama, lalu lakukan audit.

## Keputusan UX yang masih harus diwujudkan

- Pengguna wajib diberi tahu bahwa kehilangan password dan recovery key dapat
  menyebabkan isi vault tidak dapat dipulihkan.
- Perubahan password membungkus ulang `vaultKey`; tidak mengenkripsi ulang seluruh
  entry.
- Reset password administratif tidak otomatis membuka vault lama.
- Akses darurat hanya tersedia jika pemilik mengaturnya sebelum kehilangan akses.
