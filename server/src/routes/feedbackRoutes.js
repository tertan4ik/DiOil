const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// ВРЕМЕННО: Жёстко задаём параметры SMTP (для теста)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',        // замените на ваш SMTP хост
    port: 587 ,                    // или 587
    secure: true,                 // true для 465, false для 587
    auth: {
        user: 'dioilcompany@gmail.com',  // ваш полный email
        pass: 'bnevveksgdxacstu ', // пароль приложения, НЕ обычный пароль!
    },
    tls: {
        rejectUnauthorized: false   // отключаем проверку сертификата (только для теста)
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const mailOptions = {
            from: `"Форма обратной связи" <${'dioilcompany@gmail.com'}>`,
            to: 'paveleremeev856@gmail.com',   // куда отправляем (можно тот же ящик)
            subject: `Сообщение от ${name}`,
            text: `Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`,
            html: `<b>Имя:</b> ${name}<br/><b>Email:</b> ${email}<br/><b>Сообщение:</b><br/>${message}`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Сообщение отправлено' });
    } catch (err) {
        console.error('Ошибка при отправке письма:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;