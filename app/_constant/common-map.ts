import {
  // 用户表相关枚举
  UserRoleEnum,
  UserStatusEnum,
  UserGenderEnum,
  // 宠物表相关枚举
  PetStatusEnum,
  PetVaccineStatusEnum,
  PetNeuteredEnum,
  PetSpeciesEnum,
  PetGenderEnum,
  // 领养申请表相关枚举
  AdoptionApplyAuditStatusEnum,
  AdoptionApplyStatusEnum,
  // 审核记录表相关枚举
  AuditRecordTypeEnum,
  AuditRecordResultEnum,
  // 系统通用枚举
  CommonIsDeletedEnum,
  CommonOperateTypeEnum,
  // HTTP状态码/业务错误码枚举
  HttpCodeEnum,
  BusinessCodeEnum,
} from "@/types";

// ===================== 1. 用户表（user）相关枚举映射 =====================
/** 用户角色 - 对象映射（key: 枚举值，value: {label, value}） */
export const UserRoleMap = {
  [UserRoleEnum.OrdinaryAdopter]: {
    label: "普通领养人",
    value: UserRoleEnum.OrdinaryAdopter,
  },
  [UserRoleEnum.Admin]: { label: "管理员", value: UserRoleEnum.Admin },
  [UserRoleEnum.Auditor]: { label: "审核员", value: UserRoleEnum.Auditor },
};

/** 用户角色 - 数组映射（下拉框/选择器专用） */
export const UserRoleOptions = Object.values(UserRoleMap);

/** 用户状态 - 对象映射 */
export const UserStatusMap = {
  [UserStatusEnum.Disabled]: { label: "禁用", value: UserStatusEnum.Disabled },
  [UserStatusEnum.Normal]: { label: "正常", value: UserStatusEnum.Normal },
  [UserStatusEnum.Pending]: { label: "待审核", value: UserStatusEnum.Pending },
};

/** 用户状态 - 数组映射 */
export const UserStatusOptions = Object.values(UserStatusMap);

/** 用户性别 - 对象映射 */
export const UserGenderMap = {
  [UserGenderEnum.Unknown]: { label: "未知", value: UserGenderEnum.Unknown },
  [UserGenderEnum.Male]: { label: "男", value: UserGenderEnum.Male },
  [UserGenderEnum.Female]: { label: "女", value: UserGenderEnum.Female },
};

/** 用户性别 - 数组映射 */
export const UserGenderOptions = Object.values(UserGenderMap);

// ===================== 2. 宠物表（pet）相关枚举映射 =====================

/** 宠物性别 - 对象映射 */
export const PetGenderMap = {
  [PetGenderEnum.Female]: { label: "母", value: PetGenderEnum.Female },
  [PetGenderEnum.Male]: { label: "公", value: PetGenderEnum.Male },
};

/** 宠物性别 - 数组映射 */
export const PetGenderOptions = Object.values(PetGenderMap);

/** 宠物状态 - 对象映射 */
export const PetStatusMap = {
  [PetStatusEnum.Pending]: { label: "待审核", value: PetStatusEnum.Pending },
  [PetStatusEnum.Available]: {
    label: "可领养",
    value: PetStatusEnum.Available,
  },
  [PetStatusEnum.Adopted]: { label: "已领养", value: PetStatusEnum.Adopted },
  [PetStatusEnum.Offline]: { label: "已下架", value: PetStatusEnum.Offline },
  [PetStatusEnum.Rejected]: {
    label: "审核驳回",
    value: PetStatusEnum.Rejected,
  },
};

/** 宠物状态 - 数组映射 */
export const PetStatusOptions = Object.values(PetStatusMap);

/** 宠物疫苗状态 - 对象映射 */
export const PetVaccineStatusMap = {
  [PetVaccineStatusEnum.Unvaccinated]: {
    label: "未接种",
    value: PetVaccineStatusEnum.Unvaccinated,
  },
  [PetVaccineStatusEnum.Partial]: {
    label: "部分接种",
    value: PetVaccineStatusEnum.Partial,
  },
  [PetVaccineStatusEnum.Complete]: {
    label: "完全接种",
    value: PetVaccineStatusEnum.Complete,
  },
};

/** 宠物疫苗状态 - 数组映射 */
export const PetVaccineStatusOptions = Object.values(PetVaccineStatusMap);

/** 宠物绝育状态 - 对象映射 */
export const PetNeuteredMap = {
  [PetNeuteredEnum.No]: { label: "未绝育", value: PetNeuteredEnum.No },
  [PetNeuteredEnum.Yes]: { label: "已绝育", value: PetNeuteredEnum.Yes },
  [PetNeuteredEnum.Unknown]: { label: "未知", value: PetNeuteredEnum.Unknown },
};

/** 宠物绝育状态 - 数组映射 */
export const PetNeuteredOptions = Object.values(PetNeuteredMap);

/** 宠物种类 - 对象映射 */
export const PetSpeciesMap = {
  [PetSpeciesEnum.Cat]: { label: "猫", value: PetSpeciesEnum.Cat },
  [PetSpeciesEnum.Dog]: { label: "狗", value: PetSpeciesEnum.Dog },
  [PetSpeciesEnum.Other]: { label: "其他", value: PetSpeciesEnum.Other },
};

/** 宠物种类 - 数组映射 */
export const PetSpeciesOptions = Object.values(PetSpeciesMap);

// ===================== 3. 领养申请表（adoption_apply）相关枚举映射 =====================
/** 领养申请审核状态 - 对象映射 */
export const AdoptionApplyAuditStatusMap = {
  [AdoptionApplyAuditStatusEnum.Pending]: {
    label: "待审核",
    value: AdoptionApplyAuditStatusEnum.Pending,
  },
  [AdoptionApplyAuditStatusEnum.Approved]: {
    label: "审核通过",
    value: AdoptionApplyAuditStatusEnum.Approved,
  },
  [AdoptionApplyAuditStatusEnum.Rejected]: {
    label: "审核驳回",
    value: AdoptionApplyAuditStatusEnum.Rejected,
  },
  [AdoptionApplyAuditStatusEnum.Canceled]: {
    label: "已取消",
    value: AdoptionApplyAuditStatusEnum.Canceled,
  },
};

/** 领养申请审核状态 - 数组映射 */
export const AdoptionApplyAuditStatusOptions = Object.values(
  AdoptionApplyAuditStatusMap
);

/** 领养申请状态 - 对象映射 */
export const AdoptionApplyStatusMap = {
  [AdoptionApplyStatusEnum.Pending]: {
    label: "待领养",
    value: AdoptionApplyStatusEnum.Pending,
  },
  [AdoptionApplyStatusEnum.Adopted]: {
    label: "已领养",
    value: AdoptionApplyStatusEnum.Adopted,
  },
  [AdoptionApplyStatusEnum.Failed]: {
    label: "领养失败",
    value: AdoptionApplyStatusEnum.Failed,
  },
};

/** 领养申请状态 - 数组映射 */
export const AdoptionApplyStatusOptions = Object.values(AdoptionApplyStatusMap);

// ===================== 4. 审核记录表（audit_record）相关枚举映射 =====================
/** 审核类型 - 对象映射 */
export const AuditRecordTypeMap = {
  [AuditRecordTypeEnum.PetPublish]: {
    label: "宠物发布审核",
    value: AuditRecordTypeEnum.PetPublish,
  },
  [AuditRecordTypeEnum.UserRegister]: {
    label: "用户注册审核",
    value: AuditRecordTypeEnum.UserRegister,
  },
  [AuditRecordTypeEnum.AdoptionApply]: {
    label: "领养申请审核",
    value: AuditRecordTypeEnum.AdoptionApply,
  },
};

/** 审核类型 - 数组映射 */
export const AuditRecordTypeOptions = Object.values(AuditRecordTypeMap);

/** 审核结果 - 对象映射 */
export const AuditRecordResultMap = {
  [AuditRecordResultEnum.Approved]: {
    label: "通过",
    value: AuditRecordResultEnum.Approved,
  },
  [AuditRecordResultEnum.Rejected]: {
    label: "驳回",
    value: AuditRecordResultEnum.Rejected,
  },
};

/** 审核结果 - 数组映射 */
export const AuditRecordResultOptions = Object.values(AuditRecordResultMap);

// ===================== 5. 系统通用枚举（跨表使用）映射 =====================
/** 通用删除状态 - 对象映射 */
export const CommonIsDeletedMap = {
  [CommonIsDeletedEnum.No]: { label: "未删除", value: CommonIsDeletedEnum.No },
  [CommonIsDeletedEnum.Yes]: {
    label: "已删除",
    value: CommonIsDeletedEnum.Yes,
  },
};

/** 通用删除状态 - 数组映射 */
export const CommonIsDeletedOptions = Object.values(CommonIsDeletedMap);

/** 通用操作类型 - 对象映射 */
export const CommonOperateTypeMap = {
  [CommonOperateTypeEnum.Create]: {
    label: "创建",
    value: CommonOperateTypeEnum.Create,
  },
  [CommonOperateTypeEnum.Update]: {
    label: "修改",
    value: CommonOperateTypeEnum.Update,
  },
  [CommonOperateTypeEnum.Delete]: {
    label: "删除",
    value: CommonOperateTypeEnum.Delete,
  },
  [CommonOperateTypeEnum.Audit]: {
    label: "审核",
    value: CommonOperateTypeEnum.Audit,
  },
};

/** 通用操作类型 - 数组映射 */
export const CommonOperateTypeOptions = Object.values(CommonOperateTypeMap);

// ===================== 6. HTTP状态码枚举映射 =====================
/** HTTP状态码 - 对象映射（仅核心常用） */
export const HttpCodeMap = {
  [HttpCodeEnum.Success]: { label: "成功", value: HttpCodeEnum.Success },
  [HttpCodeEnum.Created]: { label: "创建成功", value: HttpCodeEnum.Created },
  [HttpCodeEnum.BadRequest]: {
    label: "参数错误",
    value: HttpCodeEnum.BadRequest,
  },
  [HttpCodeEnum.Unauthorized]: {
    label: "未授权",
    value: HttpCodeEnum.Unauthorized,
  },
  [HttpCodeEnum.Forbidden]: {
    label: "禁止访问",
    value: HttpCodeEnum.Forbidden,
  },
  [HttpCodeEnum.NotFound]: {
    label: "资源不存在",
    value: HttpCodeEnum.NotFound,
  },
  [HttpCodeEnum.Conflict]: { label: "冲突", value: HttpCodeEnum.Conflict },
  [HttpCodeEnum.ServerError]: {
    label: "服务器内部错误",
    value: HttpCodeEnum.ServerError,
  },
};

/** HTTP状态码 - 数组映射 */
export const HttpCodeOptions = Object.values(HttpCodeMap);

// ===================== 7. 通用业务错误码枚举映射（核心常用） =====================
/** 业务错误码 - 对象映射（仅核心常用，可按需扩展） */
export const BusinessCodeMap = {
  [BusinessCodeEnum.Success]: {
    label: "成功",
    value: BusinessCodeEnum.Success,
  },
  [BusinessCodeEnum.ParameterValidationFailed]: {
    label: "参数校验失败",
    value: BusinessCodeEnum.ParameterValidationFailed,
  },
  [BusinessCodeEnum.NotLoggedIn]: {
    label: "未登录/登录状态失效",
    value: BusinessCodeEnum.NotLoggedIn,
  },
  [BusinessCodeEnum.UserNotExist]: {
    label: "用户不存在",
    value: BusinessCodeEnum.UserNotExist,
  },
  [BusinessCodeEnum.AdminPermissionDenied]: {
    label: "无管理员权限",
    value: BusinessCodeEnum.AdminPermissionDenied,
  },
  [BusinessCodeEnum.DataNotExist]: {
    label: "数据不存在",
    value: BusinessCodeEnum.DataNotExist,
  },
  [BusinessCodeEnum.DataAlreadyExist]: {
    label: "数据已存在",
    value: BusinessCodeEnum.DataAlreadyExist,
  },
  [BusinessCodeEnum.InternalServerError]: {
    label: "服务器内部错误",
    value: BusinessCodeEnum.InternalServerError,
  },
};

/** 业务错误码 - 数组映射 */
export const BusinessCodeOptions = Object.values(BusinessCodeMap);
