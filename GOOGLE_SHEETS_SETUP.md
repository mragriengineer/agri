# Manage website enquiries in Google Sheets

The website form saves enquiries to the Mr Agri Engineer spreadsheet owned by your Google account. It does not use another company's spreadsheet. The current spreadsheet is [Mr Agri Engineer — Enquiries](https://docs.google.com/spreadsheets/d/1nzBQTJWt8TZ7BjL5RRSNDV-okuqQOscJtjTa7l4fR90/edit).

## Set up the sheet and endpoint

1. Sign in to the Google account that owns the enquiry sheet and open the existing Agri Engineer Apps Script project at [script.google.com](https://script.google.com).
2. Replace the editor contents with the updated [`google-apps-script/Code.gs`](./google-apps-script/Code.gs), then save the project.
3. Select and run `setupAgriEnquiries`. Approve the additional Google Sheets and email permissions when prompted. This updates the existing `Enquiries` tab, preserves enquiry rows, adds the `Source`, `Notes`, and `Updated` columns, applies status/source dropdowns, and creates or refreshes the `Dashboard` tab. It must not create a replacement spreadsheet.
4. Open the existing `Enquiries` tab to manage each lead. Choose a status from its dropdown; editing Status or Notes records the latest edit time in `Updated`. The Dashboard summarizes enquiry counts by status, source, and service, and shows recent enquiries.
5. Choose **Deploy → Manage deployments**, edit the existing web app deployment, select **New version**, set **Execute as** to your account and **Who has access** to **Anyone**, then deploy. Keep the existing `/exec` URL in [`config.js`](./config.js); it remains the website endpoint.
6. Submit a test enquiry with a valid email. Confirm the row appears in `Enquiries`, the Dashboard updates, and email arrives at `mragriengineer@gmail.com` and at the submitted customer address. Keep the spreadsheet private; only the Apps Script endpoint needs public access.

The status choices are `New`, `Contacted`, `Site Visit Planned`, `Proposal Sent`, `Follow-up`, `Confirmed`, `In Progress`, `Completed`, and `Not Proceeding`. The owner and customer acknowledgement emails are sent after the row is stored. Email notification failures are logged and returned separately; the form still confirms that an enquiry was saved when sheet storage succeeded. A valid customer email address is required for the acknowledgement workflow.

## If the form reports “Failed to fetch”

The configured deployment must be publicly reachable. In Apps Script, open **Deploy → Manage deployments**, edit the web app deployment, choose **Execute as: Me** and **Who has access: Anyone**, select a new version, and deploy. Keep the resulting `/exec` URL in `config.js`, reload the website, and test again. If Google Workspace does not offer **Anyone**, the account administrator must allow public web-app deployments or the script must be deployed from an account that permits them.
