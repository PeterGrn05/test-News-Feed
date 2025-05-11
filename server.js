import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Правильно вычисляем __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Парсинг JSON
app.use(express.json());

// Отдаём статику (HTML/CSS/JS/картинки) из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к PostgreSQL
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     process.env.DB_PORT,
});

// Конфиг почты
const transporter = nodemailer.createTransport({
  host:     process.env.MAIL_HOST,
  port:     process.env.MAIL_PORT,
  secure:   false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// POST /subscribe
app.post('/subscribe', async (req, res) => {
  const { email, category } = req.body;
  if (!email || !category) {
    return res.status(400).json({ message: 'Не передан email или категория' });
  }

  try {
    // 1) Вставляем или получаем пользователя по email
    const userRes = await pool.query(
      `INSERT INTO Users (email)
         VALUES ($1)
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id`,
      [email]
    );
    let userId;
    if (userRes.rows.length) {
      userId = userRes.rows[0].user_id;
    } else {
      // если email уже был — достаём его user_id
      const existing = await pool.query(
        `SELECT user_id FROM Users WHERE email = $1`,
        [email]
      );
      userId = existing.rows[0].user_id;
    }

    // 2) Получаем category_id
    const catRes = await pool.query(
      `SELECT category_id FROM Categories WHERE name = $1`,
      [category]
    );
    if (!catRes.rows.length) {
      return res.status(400).json({ message: 'Категория не найдена' });
    }
    const categoryId = catRes.rows[0].category_id;

    // 3) Добавляем подписку (уникальность по (user_id, category_id) можно обеспечить на уровне БД)
    await pool.query(
      `INSERT INTO Subscriptions (user_id, category_id)
         VALUES ($1, $2)
       ON CONFLICT (user_id, category_id) DO NOTHING`,
      [userId, categoryId]
    );

    res.json({ message: 'Подписка успешно оформлена!' });
  } catch (err) {
    console.error('Ошибка в /subscribe:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// POST /send-newsletter
app.post('/send-newsletter', async (req, res) => {
  const { category, subject, content } = req.body;
  if (!category || !subject || !content) {
    return res.status(400).json({ message: 'Неполные данные для рассылки' });
  }

  try {
    // Собираем email-адреса подписчиков
    const emailsRes = await pool.query(
      `SELECT u.email
         FROM Users u
         JOIN Subscriptions s ON u.user_id = s.user_id
         JOIN Categories c     ON s.category_id = c.category_id
        WHERE c.name = $1`,
      [category]
    );
    const emails = emailsRes.rows.map(r => r.email);
    if (!emails.length) {
      return res.status(404).json({ message: 'Нет подписчиков для этой категории' });
    }

    // Шлём на все адреса одной пачкой
    await transporter.sendMail({
      from:    process.env.MAIL_FROM,
      to:      emails.join(','),
      subject,
      text:    content,
    });

    res.json({ message: 'Рассылка отправлена!' });
  } catch (err) {
    console.error('Ошибка в /send-newsletter:', err);
    res.status(500).json({ message: 'Ошибка при отправке рассылки' });
  }
});

// Обработчик ошибок по-умолчанию
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Что-то пошло не так...' });
});

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is up at http://localhost:${PORT}`);
});