# MarketPoint — маркетплейс + ПВЗ на Firebase

MVP маркетплейса с пунктами выдачи заказов на чистом HTML/CSS/JS + Firebase.

## Возможности

- Клиентский вход по номеру телефона + SMS Firebase
- Каталог товаров, корзина, выбор ПВЗ, оформление заказа
- QR-код заказа, история заказов
- Кабинет сотрудника ПВЗ: сканирование QR, выдача, возврат
- Админ-панель: ПВЗ, товары, сотрудники, заказы

## Настройка Firebase

1. Создайте проект в Firebase Console.
2. **Authentication → Sign-in method**: включите **Email/Password** и **Phone**.
3. **Authentication → Settings → Authorized domains**: добавьте `slava253.github.io`.
4. **Firestore Database**: создайте базу, опубликуйте `firestore.rules`.
5. **Storage**: создайте бакет (для будущих фото товаров).
6. Скопируйте конфигурацию веб-приложения в `js/firebase.js`.

## Создание администратора

1. **Authentication → Users → Add user**:
   - Email: `2347@marketpoint.local`
   - Password: `2203`
2. Скопируйте UID пользователя.
3. **Firestore → users → Add document**:
   - Document ID: UID
   - Поля:
     ```json
     {
       "role": "admin",
       "login": "2347",
       "name": "Администратор",
       "active": true
     }
     ```

## Создание сотрудника ПВЗ

1. **Authentication → Users → Add user**:
   - Email: `логин@marketpoint.local`
   - Password: придумайте
2. Скопируйте UID.
3. **Firestore → users → Add document** с ID = UID:
   ```json
   {
     "role": "employee",
     "login": "pvz001",
     "name": "Иван",
     "pvzId": "ID_ПВЗ",
     "active": true
   }
   ```

## Структура Firestore

- `users` — пользователи (клиенты, сотрудники, админы)
- `products` — товары
- `pvz` — пункты выдачи
- `orders` — заказы

### Пример товара
```json
{
  "name": "Наушники",
  "description": "Беспроводные наушники",
  "price": 2990,
  "stock": 10,
  "image": "https://...",
  "active": true
}
```

### Пример ПВЗ
```json
{
  "name": "ПВЗ №1",
  "address": "Москва, ул. Центральная, 1",
  "active": true
}
```

## Деплой на GitHub Pages

1. Загрузите все файлы в репозиторий.
2. **Settings → Pages → Deploy from branch → main → /root**.
3. Откройте: `https://slava253.github.io/wb01/login.html`

## Вход

- **Администратор:** логин `2347`, пароль `2203`
- **Сотрудник:** логин, указанный при создании, пароль из Auth
- **Клиент:** номер телефона + SMS-код

## Ограничения MVP

- Создание сотрудников из админ-панели не реализовано: Firebase клиентский SDK не позволяет создавать пользователей Auth без выхода из аккаунта админа. Нужна Cloud Function с Admin SDK.
- Правила Firestore в `firestore.rules` — базовые, для продакшена нужно ужесточить.
