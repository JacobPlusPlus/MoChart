# 📈 MoChart - Twój Prywatny Portfel Inwestycyjny

**MoChart** to szybka, nowoczesna i w 100% prywatna aplikacja webowa do śledzenia Twoich inwestycji. Nie korzysta z żadnego zewnętrznego backendu ani baz danych – wszystkie Twoje finansowe informacje są bezpieczne i zapisywane wyłącznie w pamięci Twojej przeglądarki (localStorage).

Dzięki wsparciu PWA (Progressive Web App), możesz zainstalować MoChart na swoim telefonie lub komputerze i korzystać z niej jak z natywnej aplikacji, nawet **bez dostępu do Internetu**!

---

## ✨ Główne funkcje

* 📊 **Wiele klas aktywów:** Śledź kryptowaluty (z cenami pobieranymi na żywo z API!), ETF-y, surowce, obligacje i gotówkę.
* 🌙 **Dark Mode:** Elegancki tryb ciemny, który dba o Twoje oczy podczas wieczornego sprawdzania portfela.
* 📱 **Wsparcie Offline (PWA):** Instaluj aplikację na ekranie głównym i przeglądaj dane w dowolnym miejscu.
* 🎯 **Cele finansowe:** Wyznaczaj kwoty docelowe i obserwuj na żywo pasek postępu do ich realizacji.
* 💾 **Import / Eksport:** Łatwy backup wszystkich transakcji i celów do jednego pliku `.json`. Twoje dane, pełna kontrola.
* 📈 **Interaktywne Wykresy:** Piękne wizualizacje składu portfela i historii wartości za pomocą Chart.js.
* 📑 **Paginacja Historii:** Płynne przeglądanie setek transakcji bez spadków wydajności.

## 🛠 Technologie

* **HTML5 & CSS3**
* **Vanilla JavaScript** (bez ciężkich frameworków!)
* **Tailwind CSS** (stylowanie i RWD)
* **Chart.js** (wykresy)
* **Phosphor Icons** (nowoczesne ikony)

## 🚀 Jak uruchomić projekt?

Projekt jest w 100% statyczny, co oznacza, że jego uruchomienie jest banalnie proste:

1. Sklonuj to repozytorium lub pobierz pliki `.zip`.
2. Otwórz plik `index.html` w dowolnej nowoczesnej przeglądarce.
3. *Gotowe!* *(Zalecana uwaga: Aby funkcja Service Worker (PWA) zadziałała na komputerze deweloperskim, uruchom projekt przez lokalny serwer, np. wtyczkę **Live Server** w VS Code).*

## 📁 Struktura plików

\`\`\`text
MoChart/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── icons/
│       └── icon.png
├── index.html
├── manifest.json
├── service-worker.js
└── README.md
\`\`\`

## 🛡 Prywatność i Bezpieczeństwo

Aplikacja wykonuje zapytania sieciowe **wyłącznie** w celu pobrania aktualnych kursów kryptowalut i metali szlachetnych (odpytuje publiczne API Binance oraz Gold-API). Żadne dane wprowadzane przez użytkownika nie opuszczają urządzenia.

---
*Zbudowane z pasją do finansów i czystego kodu. 🚀*