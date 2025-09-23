from copy import deepcopy


def sanitize_dataset(dataset: dict, max_array: int = 1000) -> dict:
    """
    - deep clone dataset
    - remove mongo-like fields
    - cap array sizes
    """
    if not isinstance(dataset, dict):
        return dataset

    data = deepcopy(dataset)

    # Remove Mongo internals if present
    for key in ["_id", "__v", "createdAt", "updatedAt"]:
        data.pop(key, None)

    # Cap large arrays
    for k, v in data.items():
        if isinstance(v, list) and len(v) > max_array:
            data[k] = v[:max_array]

    return data
