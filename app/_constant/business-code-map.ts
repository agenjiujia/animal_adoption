import { BusinessCodeEnum } from "@/types";

/**
 * 错误信息映射（可选：用于自动生成默认错误提示）
 */
export const BusinessCodeMsgMap: Record<BusinessCodeEnum, string> = {
  [BusinessCodeEnum.Success]: "操作成功",
  // 1xxx 通用基础错误
  [BusinessCodeEnum.OperationFailed]: "操作失败",
  [BusinessCodeEnum.ParameterValidationFailed]: "参数校验失败",
  [BusinessCodeEnum.DataFormatError]: "数据格式错误",
  [BusinessCodeEnum.InternalServerError]: "服务器内部错误",
  [BusinessCodeEnum.ServiceUnavailable]: "服务暂不可用，请稍后重试",
  [BusinessCodeEnum.RequestFrequencyExceeded]: "请求频率过高，请稍后重试",
  [BusinessCodeEnum.ApiDeprecated]: "该接口已废弃，请使用新版接口",
  [BusinessCodeEnum.VersionIncompatible]: "版本不兼容，请升级客户端",

  // 2xxx 用户/认证相关错误
  [BusinessCodeEnum.NotLoggedIn]: "未登录，请先登录",
  [BusinessCodeEnum.TokenInvalid]: "登录状态失效，请重新登录",
  [BusinessCodeEnum.TokenExpired]: "登录已过期，请重新登录",
  [BusinessCodeEnum.UserNotExist]: "用户不存在",
  [BusinessCodeEnum.PasswordError]: "密码错误",
  [BusinessCodeEnum.UserAccountDisabled]: "账号已被禁用，请联系管理员",
  [BusinessCodeEnum.UserAccountDeleted]: "账号已注销",
  [BusinessCodeEnum.UserAlreadyExist]: "该用户已存在",
  [BusinessCodeEnum.VerifyCodeError]: "验证码错误或已过期",
  [BusinessCodeEnum.LoginAttemptsExceeded]: "登录次数过多，请10分钟后再试",

  // 3xxx 数据操作相关错误
  [BusinessCodeEnum.DataNotExist]: "数据不存在",
  [BusinessCodeEnum.DataAlreadyExist]: "数据已存在，请勿重复提交",
  [BusinessCodeEnum.DataUpdateFailed]: "数据更新失败，请刷新后重试",
  [BusinessCodeEnum.DataDeleteFailed]: "数据删除失败，存在关联数据",
  [BusinessCodeEnum.DataInsertFailed]: "数据新增失败",
  [BusinessCodeEnum.DataPermissionDenied]: "无该数据操作权限",
  [BusinessCodeEnum.DataLimitExceeded]: "数据超出限制",

  // 4xxx 权限/访问控制相关错误
  [BusinessCodeEnum.PermissionDenied]: "权限不足，无法访问",
  [BusinessCodeEnum.AdminPermissionDenied]: "无管理员权限，无法访问",
  [BusinessCodeEnum.RoleNotExist]: "角色不存在",
  [BusinessCodeEnum.RoleBindUser]: "该角色已绑定用户，无法删除",
  [BusinessCodeEnum.MenuNotExist]: "菜单不存在",
  [BusinessCodeEnum.ApiPermissionNotConfigured]: "接口访问权限未配置",

  // 5xxx 资源/服务相关错误
  [BusinessCodeEnum.ResourceNotExist]: "资源不存在",
  [BusinessCodeEnum.ResourceOccupied]: "资源已被占用",
  [BusinessCodeEnum.ResourceUploadFailed]: "资源上传失败",
  [BusinessCodeEnum.ResourceDownloadFailed]: "资源下载失败",
  [BusinessCodeEnum.ResourceSizeExceeded]: "资源大小超出限制",
  [BusinessCodeEnum.ThirdPartyServiceError]: "第三方服务调用失败",
  [BusinessCodeEnum.NetworkRequestFailed]: "网络请求失败",

  // 6xxx 服务器业务错误
  [BusinessCodeEnum.ServerBusinessError]: "服务器业务错误",
};
