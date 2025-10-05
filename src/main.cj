package lrr4cj

import lrr4cj.routes.*
import lrr4cj.config.*
import std.env.*
import std.convert.*
import cjoy.*
import dotenv.Dotenv

main(): Int64 {
    // 引用 DatabaseConfig 以触发其静态初始化器，加载环境变量
    let _ = DatabaseConfig.host
    
    // 从环境变量读取配置
    Dotenv.config()
    let host = getVariable("HOST") ?? "0.0.0.0"
    let portStr = getVariable("PORT") ?? "8081"
    let port = UInt16.parse(portStr)
    
    println("Starting server on ${host}:${port}")
    println("Database: ${DatabaseConfig.host}:${DatabaseConfig.port}/${DatabaseConfig.database}")
    
    // 创建 joy 实例并配置路由
    let joy = Joy.default()
    
    // 注册所有路由
    Routes.register(joy.router)
    
    // 启动服务器
    joy.run(host, port)
    
    return 0
}
