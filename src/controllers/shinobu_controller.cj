package lrr4cj.controllers

import cjoy.*
import lrr4cj.models.*
import lrr4cj.views.*

/**
 * Shinobu控制器
 */
public class ShinobuController {
    /**
     * 获取Shinobu状态
     */
    public static func getShinobuStatus(ctx: JoyContext) {
        let status = ShinobuModel.getShinobuStatus()
        ctx.json(status.toJson())
    }
    
    /**
     * 停止Shinobu
     */
    public static func stopShinobu(ctx: JoyContext) {
        let success = ShinobuModel.stopShinobu()
        if (success) {
            let response = "{\"operation\":\"shinobu_stop\",\"success\":1}"
            ctx.json(response)
        } else {
            let response = "{\"operation\":\"shinobu_stop\",\"success\":0}"
            ctx.json(response)
        }
    }
    
    /**
     * 重启Shinobu
     */
    public static func restartShinobu(ctx: JoyContext) {
        let result = ShinobuModel.restartShinobu()
        ctx.json(result.toJson())
    }
}