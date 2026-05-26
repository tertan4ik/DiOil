const bcrypt = require('bcrypt');
const User = require('../models/User');
const { generateToken } = require('../utils/helpers');

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const existing = await User.findByEmail(email);
        if (existing) return res.status(400).json({ error: 'Пользователь уже существует' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, phone });
        const token = generateToken(user);
        res.status(201).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });
        const token = generateToken(user);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};