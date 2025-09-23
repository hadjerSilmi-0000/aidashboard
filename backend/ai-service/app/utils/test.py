from app.utils.helpers import safe_json, hash_payload, now_iso
from app.utils.validators import validate_job_input
from app.utils.data_processor import sanitize_dataset


sample_job = {
    "type": "question",
    "dataset": {
        "question": "What is the average salary?",
        "context": {"summary": {"salary": {"mean": 5500}}},
        "_id": "should-be-removed",
    },
}

print("now_iso:", now_iso())
print("hash:", hash_payload(sample_job))
print("validate:", validate_job_input(sample_job))
print("sanitized dataset:", safe_json(sanitize_dataset(sample_job["dataset"])))
