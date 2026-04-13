/**
 * Global Error Handler Middleware
 * Chuẩn hóa tất cả error responses
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Lỗi hệ thống, vui lòng thử lại sau.';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} không tồn tại`
    });
};

export { errorHandler, notFoundHandler };
