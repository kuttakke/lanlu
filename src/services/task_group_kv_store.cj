package lrr4cj.services

import std.sync.*
import std.collection.*
import std.time.*

/**
 * KV 存储条目
 */
public class KVEntry {
    public var value: String
    public var createdAt: Int64
    public var ttlSeconds: Int64  // 生存时间（秒），0 表示永不过期

    public init(value: String, ttlSeconds!: Int64 = 0) {
        this.value = value
        this.createdAt = DateTime.now().toUnixTimeStamp().toSeconds()
        this.ttlSeconds = ttlSeconds
    }

    public func isExpired(): Bool {
        if (ttlSeconds <= 0) {
            return false
        }
        let now = DateTime.now().toUnixTimeStamp().toSeconds()
        return (now - createdAt) > ttlSeconds
    }
}

/**
 * Task 组 KV 存储
 * 提供内存中的临时存储，用于 task 组内共享数据
 * 数据在组释放时自动清理
 */
public class TaskGroupKVStore {
    private static var instance: Option<TaskGroupKVStore> = Option.None
    private static let instanceMutex: Mutex = Mutex()

    // groupId -> (key -> KVEntry)
    private var stores: HashMap<String, HashMap<String, KVEntry>>
    private let storeMutex: Mutex = Mutex()

    // 组引用计数
    private var groupRefCounts: HashMap<String, Int32>

    private init() {
        stores = HashMap<String, HashMap<String, KVEntry>>()
        groupRefCounts = HashMap<String, Int32>()
    }

    /**
     * 获取单例实例
     */
    public static func getInstance(): TaskGroupKVStore {
        instanceMutex.lock()
        match (instance) {
            case Some(s) =>
                instanceMutex.unlock()
                return s
            case None =>
                let s = TaskGroupKVStore()
                instance = Some(s)
                instanceMutex.unlock()
                return s
        }
    }

    /**
     * 获取组的 KV store 引用
     * 如果不存在则创建
     */
    public func acquireGroup(groupId: String): Unit {
        storeMutex.lock()
        match (groupRefCounts.get(groupId)) {
            case Some(count) =>
                groupRefCounts[groupId] = count + 1
            case None =>
                groupRefCounts[groupId] = 1
                stores[groupId] = HashMap<String, KVEntry>()
        }
        storeMutex.unlock()
    }

    /**
     * 释放组的 KV store 引用
     * 引用计数归零时自动清理
     */
    public func releaseGroup(groupId: String): Unit {
        storeMutex.lock()
        match (groupRefCounts.get(groupId)) {
            case Some(count) =>
                if (count <= 1) {
                    groupRefCounts.remove(groupId)
                    stores.remove(groupId)
                } else {
                    groupRefCounts[groupId] = count - 1
                }
            case None => ()
        }
        storeMutex.unlock()
    }

    /**
     * 设置值
     */
    public func set(groupId: String, key: String, value: String, ttlSeconds!: Int64 = 0): Bool {
        storeMutex.lock()
        match (stores.get(groupId)) {
            case Some(store) =>
                store[key] = KVEntry(value, ttlSeconds: ttlSeconds)
                storeMutex.unlock()
                return true
            case None =>
                storeMutex.unlock()
                return false
        }
    }

    /**
     * 获取值
     */
    public func get(groupId: String, key: String): Option<String> {
        storeMutex.lock()
        match (stores.get(groupId)) {
            case Some(store) =>
                match (store.get(key)) {
                    case Some(entry) =>
                        if (entry.isExpired()) {
                            store.remove(key)
                            storeMutex.unlock()
                            return Option.None
                        }
                        let value = entry.value
                        storeMutex.unlock()
                        return Option<String>.Some(value)
                    case None =>
                        storeMutex.unlock()
                        return Option.None
                }
            case None =>
                storeMutex.unlock()
                return Option.None
        }
    }

    /**
     * 删除键
     */
    public func delete(groupId: String, key: String): Bool {
        storeMutex.lock()
        match (stores.get(groupId)) {
            case Some(store) =>
                store.remove(key)
                storeMutex.unlock()
                return true
            case None =>
                storeMutex.unlock()
                return false
        }
    }

    /**
     * 检查组是否存在
     */
    public func hasGroup(groupId: String): Bool {
        storeMutex.lock()
        let exists = stores.contains(groupId)
        storeMutex.unlock()
        return exists
    }

    /**
     * 获取组内所有键
     */
    public func getKeys(groupId: String): Array<String> {
        storeMutex.lock()
        match (stores.get(groupId)) {
            case Some(store) =>
                var keys = ArrayList<String>()
                for ((k, _) in store) {
                    keys.add(k)
                }
                storeMutex.unlock()
                return keys.toArray()
            case None =>
                storeMutex.unlock()
                return Array<String>()
        }
    }
}
