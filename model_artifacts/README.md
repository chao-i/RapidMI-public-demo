# Private model artifacts are not distributed

Do not place trained model files in Git. If an authorized collaborator needs to
run an approved artifact locally, store it in a separate protected location and
set `RAPIDMI_MODEL_PATH` to that path at runtime.

This directory intentionally contains no model, preprocessing object, feature
medians, validation outputs, or source data.
