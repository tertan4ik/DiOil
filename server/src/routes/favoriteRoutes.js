const express = require('express');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/:productId', removeFavorite);

module.exports = router;