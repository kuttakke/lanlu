package lrr4cj.middleware

import cjoy.*
import lrr4cj.views.*

/**
 * 认证中间件
 */
public class AuthMiddleware {
    /**
     * 检查API密钥
     */
    public static func checkApiKey(ctx: JoyContext): Bool {
        let authHeader = ctx.getHeader("Authorization") ?? ""
        let expectedKey = "copurcomic"
        
        if (authHeader.contains(expectedKey)) {
            return true
        }
        
        ResponseView.errorJson(ctx, "This API is protected and requires login or an API Key.")
        return false
    }
    
    /**
     * 可选认证中间件
     */
    public static func optionalAuth(ctx: JoyContext) {
        // 可选认证，不做任何处理
    }
    
    /**
     * 必需认证中间件
     */
    public static func requiredAuth(ctx: JoyContext) {
        if (!checkApiKey(ctx)) {
            // 如果认证失败，已经返回了错误响应
            return
        }
    }
}