# driftcheck

> Detect configuration drift between live infrastructure and Terraform plans in your CI pipeline.

---

## Installation

```bash
npm install -g driftcheck
```

Or as a dev dependency:

```bash
npm install --save-dev driftcheck
```

---

## Usage

Run `driftcheck` against a Terraform plan output and your live infrastructure state:

```bash
# Generate a Terraform plan file
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > plan.json

# Run driftcheck
driftcheck --plan plan.json --state terraform.tfstate
```

### CI Pipeline Example (GitHub Actions)

```yaml
- name: Check for infrastructure drift
  run: |
    terraform plan -out=tfplan.binary
    terraform show -json tfplan.binary > plan.json
    npx driftcheck --plan plan.json --state terraform.tfstate --fail-on-drift
```

The `--fail-on-drift` flag exits with a non-zero code when drift is detected, blocking the pipeline.

### Options

| Flag | Description |
|------|-------------|
| `--plan` | Path to the Terraform plan JSON file |
| `--state` | Path to the Terraform state file |
| `--fail-on-drift` | Exit with code 1 if drift is detected |
| `--output` | Output format: `text` (default), `json`, `table` |

---

## Output Example

```
[DRIFT DETECTED] aws_instance.web_server
  Expected ami: ami-0abcdef1234567890
  Actual  ami: ami-0deadbeef00000000

2 resource(s) checked. 1 drift(s) found.
```

---

## License

[MIT](./LICENSE)