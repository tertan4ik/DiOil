const Cart = require('../models/Cart');

exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.getByUser(req.user.id);
        res.json(cart);
    } catch (err) {
        console.error('Cart error:', err); // выведет ошибку в консоль сервера
        res.status(500).json({ error: 'Ошибка загрузки корзины' });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        await Cart.addItem(req.user.id, productId, quantity);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        await Cart.updateQuantity(req.user.id, req.params.productId, quantity);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления корзины' });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        await Cart.removeItem(req.user.id, req.params.productId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления из корзины' });
    }
};