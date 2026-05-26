const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true для порта 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const mailOptions = {
            from: `"Форма обратной связи" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `Сообщение от ${name}`,
            text: `Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`,
            html: `<b>Имя:</b> ${name}<br/><b>Email:</b> ${email}<br/><b>Сообщение:</b><br/>${message}`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Сообщение отправлено' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка отправки. Попробуйте позже.' });
    }
});

module.exports = router;