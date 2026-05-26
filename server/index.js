const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const favoriteRoutes = require('./src/routes/favoriteRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const unitRoutes = require('./src/routes/unitRoutes');
const brandRoutes = require('./src/routes/brandRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Публичные маршруты
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/brands', brandRoutes);

// Защищённые маршруты
app.use('/api/cart', cartRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);

// Админ
app.use('/api/admin', adminRoutes);

// Health check
//app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

const path = require('path');
// После всех API маршрутов:
app.use(express.static(path.join(__dirname, 'public')));
// Для всех остальных запросов (не начинающихся с /api) отдаём index.html
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        next();
    }
});

const PORT = process.env.APP_PORT || 5000;
const HOST = process.env.APP_IP || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});