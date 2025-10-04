package lrr4cj.models

/**
 * 用户数据模型
 */
public class User {
    public var id: Int64
    public var name: String
    public var email: String
    public var createdAt: String

    public init(id: Int64, name: String, email: String, createdAt: String) {
        this.id = id
        this.name = name
        this.email = email
        this.createdAt = createdAt
    }

    /**
     * 转换为 JSON 字符串
     */
    public func toJson(): String {
        return "{\"id\": ${id}, \"name\": \"${name}\", \"email\": \"${email}\", \"createdAt\": \"${createdAt}\"}"
    }
}

/**
 * 用户数据访问层
 */
public class UserModel {
    private static var users: Array<User> = [
        User(1, "张三", "zhangsan@example.com", "2024-01-01 10:00:00"),
        User(2, "李四", "lisi@example.com", "2024-01-02 11:00:00"),
        User(3, "王五", "wangwu@example.com", "2024-01-03 12:00:00")
    ]
    private static var nextId: Int64 = 4

    /**
     * 获取所有用户
     */
    public static func getAllUsers(): Array<User> {
        return users
    }

    /**
     * 根据 ID 获取用户
     */
    public static func getUserById(id: Int64): Option<User> {
        for (user in users) {
            if (user.id == id) {
                return Some(user)
            }
        }
        return None
    }

    /**
     * 创建新用户
     */
    public static func createUser(name: String, email: String): User {
        let now = "2024-01-01 10:00:00" // 简化时间处理
        let user = User(nextId, name, email, now)
        let newUsers = Array<User>(users.size + 1, { _ => User(0, "", "", "") })
        for (i in 0..users.size) {
            newUsers[i] = users[i]
        }
        newUsers[users.size] = user
        users = newUsers
        nextId++
        return user
    }

    /**
     * 更新用户
     */
    public static func updateUser(id: Int64, name: String, email: String): Option<User> {
        for (i in 0..users.size) {
            if (users[i].id == id) {
                users[i].name = name
                users[i].email = email
                return Some(users[i])
            }
        }
        return None
    }

    /**
     * 删除用户
     */
    public static func deleteUser(id: Int64): Bool {
        for (i in 0..users.size) {
            if (users[i].id == id) {
                let newUsers = Array<User>(users.size - 1, { _ => User(0, "", "", "") })
                var newIndex = 0
                for (j in 0..users.size) {
                    if (j != i) {
                        newUsers[newIndex] = users[j]
                        newIndex++
                    }
                }
                users = newUsers
                return true
            }
        }
        return false
    }
}