const isAdminOrManager = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора или менеджера.' });
    }
    next();
};

// Проверка, что пользователь — admin (полный доступ)
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
    }
    next();
};

// Проверка, что пользователь — manager (не может удалять товары физически)
const isManager = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права менеджера.' });
    }
    next();
};

module.exports = { isAdmin, isAdminOrManager, isManager };