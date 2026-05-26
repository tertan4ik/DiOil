const express = require('express');
const { createOrder, getOrders } = require('../controllers/orderController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/', createOrder);
router.get('/', getOrders);

module.exports = router;