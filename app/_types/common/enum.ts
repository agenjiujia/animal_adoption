// ===================== 1. 用户表（user）相关枚举 =====================
/**
 * 用户表（user）- 角色字段（role）
 */
export enum UserRoleEnum {
  /** 普通领养人（user.role = 0） */
  OrdinaryAdopter = 0,
  /** 管理员（user.role = 1） */
  Admin = 1,
  /** 审核员（user.role = 2） */
  Auditor = 2,
}

/**
 * 用户表（user）- 状态字段（status）
 */
export enum UserStatusEnum {
  /** 禁用（user.status = 0，账号不可用） */
  Disabled = 0,
  /** 正常（user.status = 1，账号可使用） */
  Normal = 1,
  /** 待审核（user.status = 2，新注册用户待审核） */
  Pending = 2,
}

/**
 * 用户表（user）- 性别字段（gender）
 */
export enum UserGenderEnum {
  /** 未知（user.gender = 0） */
  Unknown = 0,
  /** 男（user.gender = 1） */
  Male = 1,
  /** 女（user.gender = 2） */
  Female = 2,
}

// ===================== 2. 宠物表（pet）相关枚举 =====================
/**
 * 宠物表 pet.status（与 DDL 一致：0 待领养 / 1 已领养 / 2 下架）
 */
export enum PetStatusEnum {
  ForAdoption = 0,
  Adopted = 1,
  Offline = 2,
}

/**
 * pet.vaccine_status：0 未知 / 1 已打 / 2 未打
 */
export enum PetVaccineStatusEnum {
  Unknown = 0,
  Vaccinated = 1,
  Unvaccinated = 2,
}

/**
 * pet.neutered：0 未知 / 1 已绝育 / 2 未绝育
 */
export enum PetNeuteredEnum {
  Unknown = 0,
  Neutered = 1,
  NotNeutered = 2,
}

/**
 * 宠物表（pet）- 类型字段（species）
 */
export enum PetSpeciesEnum {
  /** 猫（pet.species = 1） */
  Cat = 1,
  /** 狗（pet.species = 2） */
  Dog = 2,
  /** 其他（pet.species = 3，兔子/仓鼠等） */
  Other = 3,
}

/**
 * 宠物操作类型枚举（对应pet_history表的operate_type字段）
 */
export enum PetOperateTypeEnum {
  /** 管理员修改状态（pet_history.operate_type = 0） */
  STATUS_CHANGE = 0,
  /** 发布者修改内容（pet_history.operate_type = 1） */
  CONTENT_EDIT = 1,
}

// ===================== 3. 领养申请表（adoption_apply）相关枚举 =====================

/**
 * 宠物表（pet）- 性别字段（gender）
 */
export enum PetGenderEnum {
  /** 母（pet.gender = 0） */
  Female = 0,
  /** 公（pet.gender = 1） */
  Male = 1,
}

/**
 * 领养申请表（adoption_apply）- 审核状态字段（audit_status）
 */
export enum AdoptionApplyAuditStatusEnum {
  /** 待审核（adoption_apply.audit_status = 0） */
  Pending = 0,
  /** 审核通过（adoption_apply.audit_status = 1） */
  Approved = 1,
  /** 审核驳回（adoption_apply.audit_status = 2） */
  Rejected = 2,
  /** 已取消（adoption_apply.audit_status = 3，申请人主动取消） */
  Canceled = 3,
}

/**
 * 领养申请表（adoption_apply）- 领养状态字段（adoption_status）
 */
export enum AdoptionApplyStatusEnum {
  /** 待领养（adoption_apply.adoption_status = 0） */
  Pending = 0,
  /** 已领养（adoption_apply.adoption_status = 1） */
  Adopted = 1,
  /** 领养失败（adoption_apply.adoption_status = 2） */
  Failed = 2,
}

// ===================== 4. 审核记录表（audit_record）相关枚举 =====================
/**
 * 审核记录表（audit_record）- 审核类型字段（audit_type）
 */
export enum AuditRecordTypeEnum {
  /** 宠物发布审核（audit_record.audit_type = 1） */
  PetPublish = 1,
  /** 用户注册审核（audit_record.audit_type = 2） */
  UserRegister = 2,
  /** 领养申请审核（audit_record.audit_type = 3） */
  AdoptionApply = 3,
}

/**
 * 审核记录表（audit_record）- 审核结果字段（audit_result）
 */
export enum AuditRecordResultEnum {
  /** 通过（audit_record.audit_result = 1） */
  Approved = 1,
  /** 驳回（audit_record.audit_result = 2） */
  Rejected = 2,
}

// ===================== 5. 系统通用枚举（跨表使用） =====================
/**
 * 通用 - 删除状态（is_deleted），所有表的软删除字段通用
 */
export enum CommonIsDeletedEnum {
  /** 未删除（is_deleted = 0） */
  No = 0,
  /** 已删除（is_deleted = 1） */
  Yes = 1,
}

/**
 * 通用 - 操作类型（operate_type），日志/记录类表通用
 */
export enum CommonOperateTypeEnum {
  /** 创建（operate_type = 1） */
  Create = 1,
  /** 修改（operate_type = 2） */
  Update = 2,
  /** 删除（operate_type = 3） */
  Delete = 3,
  /** 审核（operate_type = 4） */
  Audit = 4,
}

/**
 * HTTP状态码枚举（配合业务错误码使用）
 */
export enum HttpCodeEnum {
  /** 成功 */
  Success = 200,
  /** 创建成功 */
  Created = 201,
  /** 参数错误 */
  BadRequest = 400,
  /** 未授权（登录失效/密码错误） */
  Unauthorized = 401,
  /** 禁止访问（权限不足/账号禁用） */
  Forbidden = 403,
  /** 资源不存在 */
  NotFound = 404,
  /** 冲突（资源已存在） */
  Conflict = 409,
  /** 请求方法不允许 */
  MethodNotAllowed = 405,
  /** 请求频率过高 */
  TooManyRequests = 429,
  /** 服务器内部错误 */
  ServerError = 500,
  /** 服务不可用 */
  ServiceUnavailable = 503,
}

/**
 * 通用业务错误码枚举
 * 编码规则：
 * - 1xxx：通用基础错误（全业务通用）
 * - 2xxx：用户/认证相关错误
 * - 3xxx：数据操作相关错误（CRUD）
 * - 4xxx：权限/访问控制相关错误
 * - 5xxx：资源/服务相关错误
 * - 6xxx+：各业务线专属错误（如订单、商品、支付等）
 */
export enum BusinessCodeEnum {
  /** 成功 */
  Success = 0,
  // ===================== 1xxx 通用基础错误 =====================
  /** 操作失败（通用兜底） */
  OperationFailed = 1000,
  /** 参数校验失败（格式/必填/长度等） */
  ParameterValidationFailed = 1001,
  /** 数据格式错误（JSON解析/类型转换失败） */
  DataFormatError = 1002,
  /** 服务器内部错误（未知异常） */
  InternalServerError = 1003,
  /** 服务暂不可用（维护/过载） */
  ServiceUnavailable = 1004,
  /** 请求频率过高（限流） */
  RequestFrequencyExceeded = 1005,
  /** 接口已废弃 */
  ApiDeprecated = 1006,
  /** 版本不兼容 */
  VersionIncompatible = 1007,

  // ===================== 2xxx 用户/认证相关错误 =====================
  /** 未登录/登录状态失效 */
  NotLoggedIn = 2000,
  /** Token无效/伪造/被篡改 */
  TokenInvalid = 2001,
  /** Token已过期 */
  TokenExpired = 2002,
  /** 用户不存在 */
  UserNotExist = 2003,
  /** 密码错误 */
  PasswordError = 2004,
  /** 账号已被禁用/冻结 */
  UserAccountDisabled = 2005,
  /** 账号已注销 */
  UserAccountDeleted = 2006,
  /** 用户名/手机号已存在（注册） */
  UserAlreadyExist = 2007,
  /** 验证码错误/过期 */
  VerifyCodeError = 2008,
  /** 登录次数过多（临时锁定） */
  LoginAttemptsExceeded = 2009,

  // ===================== 3xxx 数据操作相关错误 =====================
  /** 数据不存在（查询/删除） */
  DataNotExist = 3000,
  /** 数据已存在（新增/重复提交） */
  DataAlreadyExist = 3001,
  /** 数据更新失败（乐观锁/版本冲突） */
  DataUpdateFailed = 3002,
  /** 数据删除失败（关联数据存在） */
  DataDeleteFailed = 3003,
  /** 数据插入失败（约束违规） */
  DataInsertFailed = 3004,
  /** 数据权限不足（只能操作自己的数据） */
  DataPermissionDenied = 3005,
  /** 数据超出限制（数量/大小/长度） */
  DataLimitExceeded = 3006,

  // ===================== 4xxx 权限/访问控制相关错误 =====================
  /** 权限不足（无接口访问权限） */
  PermissionDenied = 4000,
  /** 无管理员权限 */
  AdminPermissionDenied = 4001,
  /** 角色不存在 */
  RoleNotExist = 4002,
  /** 角色已绑定用户（无法删除） */
  RoleBindUser = 4003,
  /** 菜单不存在 */
  MenuNotExist = 4004,
  /** 接口访问权限未配置 */
  ApiPermissionNotConfigured = 4005,

  // ===================== 5xxx 资源/服务相关错误 =====================
  /** 资源不存在（文件/图片/链接） */
  ResourceNotExist = 5000,
  /** 资源已被占用 */
  ResourceOccupied = 5001,
  /** 资源上传失败 */
  ResourceUploadFailed = 5002,
  /** 资源下载失败 */
  ResourceDownloadFailed = 5003,
  /** 资源超出大小限制 */
  ResourceSizeExceeded = 5004,
  /** 第三方服务调用失败（支付/短信/OSS） */
  ThirdPartyServiceError = 5005,
  /** 网络请求失败（跨服务调用） */
  NetworkRequestFailed = 5006,

  // ===================== 6xxx 服务器业务错误 =====================
  /** 服务器业务错误（未知业务异常） */
  ServerBusinessError = 6000,
}
