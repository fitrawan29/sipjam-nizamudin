# Git Workflow Rule

Setiap kali Anda (AI Agent) selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini (menyelesaikan suatu tugas/fitur), Anda DIWAJIBKAN untuk secara otomatis:
1. Mengecek status git (`git status`)
2. Melakukan staging pada file yang berubah (`git add .`)
3. Membuat commit dengan pesan yang deskriptif dan sesuai (`git commit -m "..."`)
4. Melakukan push ke origin branch pengembangan: **`git push origin dev`**.

### Aturan Promosi ke Main:
- **JANGAN PERNAH** langsung push atau merge ke branch `main`.
- Semua pembaruan/fitur baru WAJIB dilempar ke branch **`dev`** terlebih dahulu.
- Merge ke branch **`main`** HANYA dilakukan setelah ada instruksi/konfirmasi eksplisit dari user (misal: "antar ke main", "merge ke main", atau "rilis ke main").
- Jangan meminta izin untuk push ke `dev` (lakukan push ke `dev` secara otomatis).
