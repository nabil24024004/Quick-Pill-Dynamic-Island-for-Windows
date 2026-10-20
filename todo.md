FEATURE
- [x] cara membuka quickpill jika tertutup (System Tray click/double-click, menu "Show Quick Pill", single-instance reopen focus, dan Alt+Shift+M hotkey)
- [x] tambahkan shortcut didekstop (Tersedia tombol "Buat Shortcut di Desktop" di General Settings yang langsung membuat Quick Pill.lnk)


BUGS 
- [x] saat item di shelf ditarik keluar, ia malah forceclose dan menutup quickpill (Fixed: e.preventDefault() pada DOM drag event dan validasi fallback image non-empty pada native startDrag)


Next Time
- [] Pengaturan AI, sediakan groq untuk opsi AI (kecuali diriku karena aku ada JARVIS)