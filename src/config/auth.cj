package lrr4cj.config

import std.env.getVariable
import cjdotenv.load

/**
 * 认证相关配置
 */
public class AuthConfig {
    public static var tokenPepper: String

    static init() {
        load()
        // 复用现有 JWT_SECRET 作为 pepper，避免将 token/hash 直接暴露为可离线撞库的 SHA256(token)
        tokenPepper = getVariable("JWT_SECRET") ?? ""
    }
}

