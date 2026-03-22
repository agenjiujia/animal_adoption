import { UserRoleEnum, UserStatusEnum } from "@/types/common/enum";

export interface UserInfo {
  user_id: number;
  username: string;
  phone: string;
  password: string;
  role: UserRoleEnum; // 0=普通用户，1=管理员，2=审核员
  status: UserStatusEnum; // 0=禁用，1=正常
  address: string;
  email: string;
}
