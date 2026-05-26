const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.getAll();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки категорий' });
    }
};