# RapidMI public interface resources

## Current revised research prototype

**The revised manuscript and online application use V1, with a fixed threshold of 0.312 and Hospital AUC of 0.899.** The public online research prototype is available at:

https://rapidmi-app-ba3imnrsjpmcyxpsxesqyx.streamlit.app/

No registration or report upload is needed to explore the two synthetic examples and model inference. Optional upload and manual entry require verification of the source report values. Community Cloud may hibernate when idle; if a sleep page appears, select “Yes, get this app back up!” and allow startup.

The current non-sensitive frontend source and synthetic illustrations are in [revision_v1_interface](revision_v1_interface/). See [PUBLIC_VERSIONS.json](PUBLIC_VERSIONS.json) for the interface checksums, input derivations and deployed model-artifact checksum. The hospital records, private backend and trained V1 model are not distributed in this repository. This is an interface-source release, not a complete numerical reproduction of the study.

## Historical root interface

The root Flask application, rapidmi/predictor.py and their 0.286 threshold are preserved as **historical V0** source. Their stored example outputs and the Hospital AUC of 0.916 belong to that earlier version; they are not the revised manuscript or current deployed model. The earlier documentation is archived as [README_legacy_V0.md](README_legacy_V0.md). Opening or running the root application does not evaluate the current V1 pipeline.

The model score is an uncalibrated research classification output for source-defined MI-related ECG phenotypes. It is not an individual MI probability and does not establish prospective acute-MI/OMI diagnosis or clinical rule-out safety. Public interface source and synthetic examples do not include patient images or records. Existing licensing and use restrictions continue to apply; no additional rights to private resources are granted.
