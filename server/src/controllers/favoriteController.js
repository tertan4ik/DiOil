const Favorite = require('../models/Favorite');

exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.getByUser(req.user.id);
        res.json(favorites);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const { productId } = req.body;
        await Favorite.add(req.user.id, productId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка добавления в избранное' });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        await Favorite.remove(req.user.id, req.params.productId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка удаления из избранного' });
    }
};