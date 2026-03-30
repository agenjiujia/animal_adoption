import { describe, expect, it } from "vitest";
import { PetOperateTypeEnum } from "../app/_types";

describe("PetOperateTypeEnum", () => {
  it("matches DB convention 0=status 1=content", () => {
    expect(PetOperateTypeEnum.STATUS_CHANGE).toBe(0);
    expect(PetOperateTypeEnum.CONTENT_EDIT).toBe(1);
  });
});
