# Quest 8 Марта 💐

Одностраничный сайт-квест в стиле чат-диалога с ИИ. Разработан как интерактивный подарок на 8 Марта.

---

## Установка и запуск

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev

# Собрать продакшен-билд
npm run build

# Предпросмотр билда
npm run preview
```

---

## Структура проекта

```
quest/
├── public/
│   ├── models/          ← face-api.js модели (скачать вручную, см. ниже)
│   └── reveal.jpg       ← фото места подарка (добавить вручную)
├── src/
│   ├── components/
│   │   ├── Actions.tsx
│   │   ├── BootLoader.tsx
│   │   ├── CameraSmileCheck.tsx
│   │   ├── Chat.tsx
│   │   ├── CodeModal.tsx
│   │   ├── FixedBottomButton.tsx
│   │   ├── PhotoReveal.tsx
│   │   ├── TapArea.tsx
│   │   └── TypingMessage.tsx
│   ├── hooks/
│   │   └── useMessageQueue.ts
│   ├── App.tsx
│   ├── constants.ts     ← все параметры квеста
│   ├── main.tsx
│   ├── storage.ts
│   ├── styles.css
│   └── types.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Параметры квеста (src/constants.ts)

| Константа | Значение по умолчанию | Описание |
|---|---|---|
| `BOY_NAME` | `'Савелий'` | Имя парня |
| `GIRL_FULLNAME` | `'Лейченко Анастасия Евгеньевна'` | Полное имя девушки |
| `DAYS_COUNT` | `152` | Количество дней знакомства |
| `SMILE_THRESHOLD` | `0.7` | Порог улыбки для face-api (0–1) |
| `CODE_DIGITS` | `[1, 4, 3, 7]` | Правильный код |
| `FINAL_PHOTO_PATH` | `'/reveal.jpg'` | Путь к финальному фото |

---

## Добавить финальное фото

Положи изображение места подарка в:

```
public/reveal.jpg
```

Поддерживаемые форматы: JPG, PNG, WebP. Рекомендуемый размер — не шире 1200px.

---

## Модели face-api.js

> Модели нужны для сканирования улыбки. Без них камера не заработает.

Скачай следующие файлы с GitHub face-api.js и положи в папку `public/models/`:

**Репозиторий:** https://github.com/justadudewhohacks/face-api.js/tree/master/weights

### Нужные файлы (обязательно все 4):

```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_expression_recognition_model-weights_manifest.json
└── face_expression_recognition_model-shard1
```

### Быстрая загрузка через curl:

```bash
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
mkdir -p public/models

curl -o public/models/tiny_face_detector_model-weights_manifest.json "$BASE/tiny_face_detector_model-weights_manifest.json"
curl -o public/models/tiny_face_detector_model-shard1 "$BASE/tiny_face_detector_model-shard1"
curl -o public/models/face_expression_recognition_model-weights_manifest.json "$BASE/face_expression_recognition_model-weights_manifest.json"
curl -o public/models/face_expression_recognition_model-shard1 "$BASE/face_expression_recognition_model-shard1"
```

---

## iOS Safari

Камера работает на iOS Safari при условии:

1. Сайт открыт по **HTTPS** (или localhost)
2. При первом запросе нажать **«Разрешить»** доступ к камере
3. Если отказано — зайти в `Настройки → Safari → Камера → Разрешить`

При ошибке доступа к камере отображается понятное сообщение с инструкцией.

---

## Сценарий квеста

```
boot → intro → scan → scan_success → tap → tap_success → hints → await_code → success
```

| Этап | Описание |
|---|---|
| `boot` | Анимация загрузки |
| `intro` | Приветствие от ИИ |
| `scan` | Сканирование лица через камеру (нужно улыбнуться) |
| `scan_success` | Подтверждение личности + 1-я цифра кода |
| `tap` | Проверка: тапнуть N раз (= дни знакомства) |
| `tap_success` | Подтверждение + 2-я цифра кода |
| `hints` | Подсказки для нахождения 3-й и 4-й цифр |
| `await_code` | Ожидание ввода кода |
| `success` | Конфетти + фото + расшифровка 1437 |

Код **1437** = «I love you forever».

---

## LocalStorage

Прогресс сохраняется автоматически под ключом `quest_v1`.
При перезагрузке страницы квест продолжается с места остановки.

Чтобы сбросить прогресс (для тестирования):

```js
// В консоли браузера:
localStorage.removeItem('quest_v1'); location.reload();
```

---

## Технологии

- **React 18** + **TypeScript** (strict mode)
- **Vite** — сборщик
- **framer-motion** — анимации
- **face-api.js** — детекция улыбки
- **canvas-confetti** — конфетти
- Кастомный CSS (glassmorphism, CSS variables, адаптив)
