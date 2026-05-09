import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  saveBaseline,
  loadBaseline,
  baselineExists,
  compareWithBaseline,
  Baseline,
} from "./baseline";
import { DriftReport } from "./types";

const makeMockReport = (): DriftReport => ({
  planHash: "abc123",
  hasDrift: false,
  resources: [
    {
      address: "aws_instance.web",
      plannedAttributes: { instance_type: "t3.micro" },
      liveAttributes: { instance_type: "t3.micro" },
      driftedAttributes: [],
    },
  ],
  generatedAt: new Date().toISOString(),
});

describe("baseline", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "driftcheck-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and loads a baseline", () => {
    const report = makeMockReport();
    const filePath = path.join(tmpDir, "baseline.json");

    saveBaseline(report, filePath);
    const loaded = loadBaseline(filePath);

    expect(loaded.planHash).toBe("abc123");
    expect(loaded.resources["aws_instance.web"]).toBeDefined();
    expect(loaded.resources["aws_instance.web"].instance_type).toBe("t3.micro");
  });

  it("throws when baseline file does not exist", () => {
    expect(() => loadBaseline("/nonexistent/path/baseline.json")).toThrow(
      "Baseline file not found"
    );
  });

  it("detects whether baseline exists", () => {
    const filePath = path.join(tmpDir, "baseline.json");
    expect(baselineExists(filePath)).toBe(false);
    saveBaseline(makeMockReport(), filePath);
    expect(baselineExists(filePath)).toBe(true);
  });

  it("identifies new resources not in baseline", () => {
    const baseline: Baseline = {
      createdAt: new Date().toISOString(),
      planHash: "abc123",
      resources: { "aws_instance.web": { instance_type: "t3.micro" } },
    };

    const current = {
      "aws_instance.web": { instance_type: "t3.micro" },
      "aws_s3_bucket.logs": { bucket: "my-logs" },
    };

    const newResources = compareWithBaseline(current, baseline);
    expect(newResources).toEqual(["aws_s3_bucket.logs"]);
  });
});
