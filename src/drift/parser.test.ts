import { parsePlanJson, ParsedPlan } from "./parser";

const VALID_PLAN_JSON = JSON.stringify({
  format_version: "1.0",
  resource_changes: [
    {
      address: "aws_instance.web",
      type: "aws_instance",
      name: "web",
      change: {
        actions: ["update"],
        before: { instance_type: "t2.micro", ami: "ami-123" },
        after: { instance_type: "t3.small", ami: "ami-123" },
      },
    },
    {
      address: "aws_s3_bucket.assets",
      type: "aws_s3_bucket",
      name: "assets",
      change: {
        actions: ["no-op"],
        before: { bucket: "my-assets" },
        after: { bucket: "my-assets" },
      },
    },
    {
      address: "aws_security_group.sg",
      type: "aws_security_group",
      name: "sg",
      change: {
        actions: ["create"],
        before: null,
        after: { name: "web-sg" },
      },
    },
  ],
});

describe("parsePlanJson", () => {
  it("parses a valid plan JSON and returns resources", () => {
    const result: ParsedPlan = parsePlanJson(VALID_PLAN_JSON);
    expect(result.formatVersion).toBe("1.0");
    expect(result.resources).toHaveLength(3);
  });

  it("correctly maps update action", () => {
    const result = parsePlanJson(VALID_PLAN_JSON);
    const web = result.resources.find((r) => r.address === "aws_instance.web");
    expect(web?.action).toBe("update");
    expect(web?.priorValues).toEqual({ instance_type: "t2.micro", ami: "ami-123" });
    expect(web?.plannedValues).toEqual({ instance_type: "t3.small", ami: "ami-123" });
  });

  it("correctly maps no-op action", () => {
    const result = parsePlanJson(VALID_PLAN_JSON);
    const bucket = result.resources.find((r) => r.address === "aws_s3_bucket.assets");
    expect(bucket?.action).toBe("no-op");
  });

  it("correctly maps create action and handles null prior values", () => {
    const result = parsePlanJson(VALID_PLAN_JSON);
    const sg = result.resources.find((r) => r.address === "aws_security_group.sg");
    expect(sg?.action).toBe("create");
    expect(sg?.priorValues).toBeUndefined();
  });

  it("correctly maps resource type and name fields", () => {
    const result = parsePlanJson(VALID_PLAN_JSON);
    const web = result.resources.find((r) => r.address === "aws_instance.web");
    expect(web?.type).toBe("aws_instance");
    expect(web?.name).toBe("web");
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePlanJson("not-json")).toThrow("Failed to parse Terraform plan JSON");
  });

  it("throws when format_version is missing", () => {
    const invalid = JSON.stringify({ resource_changes: [] });
    expect(() => parsePlanJson(invalid)).toThrow("Invalid Terraform plan: missing format_version");
  });

  it("returns empty resources array when resource_changes is absent", () => {
    const minimal = JSON.stringify({ format_version: "1.0" });
    const result = parsePlanJson(minimal);
    expect(result.resources).toHaveLength(0);
  });
});
