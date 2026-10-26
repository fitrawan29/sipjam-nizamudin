# Git Workflow Rule

Setiap kali Anda (AI Agent) selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini (menyelesaikan suatu tugas/fitur), Anda DIWAJIBKAN untuk secara otomatis:
1. Mengecek status git (`git status`)
2. Melakukan staging pada file yang berubah (`git add .`)
3. Membuat commit dengan pesan yang deskriptif dan sesuai (`git commit -m "..."`)
4. Melakukan push langsung ke branch utama: **`git push origin main`**.

### Catatan:
- Semua pembaruan/fitur langsung diarahkan dan di-push ke branch **`main`**.
- Tidak memerlukan konfirmasi tambahan untuk push ke `main`.
