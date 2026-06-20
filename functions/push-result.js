function summarizePushResponse(response) {
    return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errorCodes: response.responses
            .filter(item => !item.success && item.error)
            .map(item => item.error.code)
    };
}

module.exports = { summarizePushResponse };
