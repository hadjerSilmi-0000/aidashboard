ALLOWED_JOB_TYPES = {"analysis", "insights", "patterns", "question"}


def validate_job_input(body: dict) -> tuple[bool, list[str]]:
    """
    Validate job input.
    Returns (valid, errors).
    """
    errors = []

    if not isinstance(body, dict):
        return False, ["Request body must be a JSON object."]

    job_type = body.get("type")
    if not job_type:
        errors.append("`type` is required (analysis | insights | patterns | question).")
    elif job_type not in ALLOWED_JOB_TYPES:
        errors.append(f"Unsupported `type`. Allowed: {', '.join(ALLOWED_JOB_TYPES)}")

    dataset = body.get("dataset")
    if dataset is None:
        errors.append("`dataset` is required.")
    elif job_type == "question":
        if "question" not in dataset:
            errors.append("For type `question`, `dataset.question` is required.")
        if "context" not in dataset:
            errors.append("For type `question`, `dataset.context` is recommended.")

    return len(errors) == 0, errors
