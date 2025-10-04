package lrr4cj

import lrr4cj.routes.*
import std.env.*
import std.convert.*
import cjoy.*

main(): Int64 {
    // 从环境变量读取配置
    let host = getVariable("HOST") ?? "0.0.0.0"
    let portStr = getVariable("PORT") ?? "8081"
    let port = UInt16.parse(portStr)
    
    println("Starting server on ${host}:${port}")
    println("Database: ${getVariable("DB_HOST") ?? "localhost"}:${getVariable("DB_PORT") ?? "5432"}/${getVariable("DB_NAME") ?? "lgr"}")
    
    // 创建 joy 实例并配置路由
    let joy = Joy.default()
    
    // 注册所有路由
    Routes.register(joy.router)
    
    // 启动服务器
    joy.run(host, port)
    
    return 0
}
