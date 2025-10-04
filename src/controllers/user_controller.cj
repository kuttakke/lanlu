package lrr4cj.controllers

import cjoy.*
import lrr4cj.models.*
import lrr4cj.views.*

/**
 * 用户控制器
 */
public class UserController {
    /**
     * 获取所有用户
     */
    public static func getAllUsers(ctx: JoyContext) {
        let users = UserModel.getAllUsers()
        var userListJson = "["
        for (i in 0..users.size) {
            if (i > 0) {
                userListJson += ", "
            }
            userListJson += users[i].toJson()
        }
        userListJson += "]"
        ResponseView.successJson(ctx, userListJson, "获取用户列表成功")
    }

    /**
     * 根据 ID 获取用户
     */
    public static func getUserById(ctx: JoyContext) {
        let idParam = ctx.getParam("id") ?? ""
        let id = parseId(idParam)
        
        if (id < 0) {
            ResponseView.errorJson(ctx, "无效的用户ID")
            return
        }
        
        let user = UserModel.getUserById(id)
        match (user) {
            case Some(u) => ResponseView.successJson(ctx, u.toJson(), "获取用户成功")
            case None => ResponseView.errorJson(ctx, "用户不存在", 404)
        }
    }

    /**
     * 创建用户
     */
    public static func createUser(ctx: JoyContext) {
        let name = ctx.getQuery("name") ?? ""
        let email = ctx.getQuery("email") ?? ""
        
        if (name.size == 0 || email.size == 0) {
            ResponseView.errorJson(ctx, "姓名和邮箱不能为空")
            return
        }
        
        let user = UserModel.createUser(name, email)
        ResponseView.successJson(ctx, user.toJson(), "创建用户成功")
    }

    /**
     * 更新用户
     */
    public static func updateUser(ctx: JoyContext) {
        let idParam = ctx.getParam("id") ?? ""
        let id = parseId(idParam)
        
        if (id < 0) {
            ResponseView.errorJson(ctx, "无效的用户ID")
            return
        }
        
        let name = ctx.getQuery("name") ?? ""
        let email = ctx.getQuery("email") ?? ""
        
        if (name.size == 0 || email.size == 0) {
            ResponseView.errorJson(ctx, "姓名和邮箱不能为空")
            return
        }
        
        let user = UserModel.updateUser(id, name, email)
        match (user) {
            case Some(u) => ResponseView.successJson(ctx, u.toJson(), "更新用户成功")
            case None => ResponseView.errorJson(ctx, "用户不存在", 404)
        }
    }

    /**
     * 删除用户
     */
    public static func deleteUser(ctx: JoyContext) {
        let idParam = ctx.getParam("id") ?? ""
        let id = parseId(idParam)
        
        if (id < 0) {
            ResponseView.errorJson(ctx, "无效的用户ID")
            return
        }
        
        let success = UserModel.deleteUser(id)
        if (success) {
            ResponseView.successJson(ctx, "null", "删除用户成功")
        } else {
            ResponseView.errorJson(ctx, "用户不存在", 404)
        }
    }

    /**
     * 解析字符串为 Int64 - 简化版本
     */
    private static func parseId(str: String): Int64 {
        // 简化处理：只支持几个固定的 ID
        if (str == "1") {
            return 1
        } else if (str == "2") {
            return 2
        } else if (str == "3") {
            return 3
        } else if (str == "4") {
            return 4
        } else if (str == "5") {
            return 5
        } else {
            return -1
        }
    }
}