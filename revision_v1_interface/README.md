# RapidMI revised V1 interface source

This directory contains the non-sensitive frontend assets used by the revised online research prototype. It includes the two synthetic report illustrations. The source uses 13 model inputs; QTc and RV5+SV1 are derived from their component values. The V1 decision threshold is 0.312, and the displayed Hospital AUC is 0.899.

Visit the running prototype at https://rapidmi-app-ba3imnrsjpmcyxpsxesqyx.streamlit.app/ without registration. You can load a synthetic example, verify the parameters, and run the deployed model without uploading a report. If Community Cloud shows a sleep page, select “Yes, get this app back up!” and allow the application to start.

These files are a Streamlit component frontend, not a standalone prediction service. The private server-side numerical pipeline and trained model artifact are not distributed here. Opening index.html alone does not reproduce arbitrary V1 predictions. PUBLIC_VERSIONS.json records the input rules, deployed artifact checksum and interface checksums. The model checksum identifies a version; it does not supply the model or establish clinical validity.

The root Flask interface, rapidmi/predictor.py and their 0.286 threshold are retained as a historical V0 reference. The recorded V0 example outputs must not be interpreted as current V1 predictions. Neither version establishes prospective acute-MI/OMI diagnosis, individual disease probability, or safety for clinical exclusion.
