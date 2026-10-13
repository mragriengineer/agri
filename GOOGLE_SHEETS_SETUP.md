# Connect website enquiries to Google Sheets

The website form saves enquiries to a new spreadsheet owned by your Google account. It does not use another company's spreadsheet.

## Set up the sheet and endpoint

1. Sign in to the Google account that should own the enquiry sheet and open [script.google.com](https://script.google.com).
2. Create a new Apps Script project and replace the editor contents with [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
3. Run `setupAgriEnquiries` once and approve the requested Google Sheets permissions. Open the execution log to get the URL of the newly created **Mr Agri Engineer — Enquiries** spreadsheet.
4. In Apps Script, choose **Deploy → New deployment → Web app**. Set **Execute as** to your account and access to **Anyone** so website visitors can submit enquiries. Deploy and copy the web app URL ending in `/exec`.
5. Paste that URL as the `SCRIPT_URL` value in [`config.js`](./config.js), keeping the surrounding quotes.
6. Publish the website and submit a test enquiry. Confirm it appears in the spreadsheet's `Enquiries` tab. Keep the spreadsheet itself private; only the Apps Script endpoint needs public access.

The sheet records an enquiry ID, submission time, contact details, land details, requested service, budget, message, and a `New` status. If the form is not connected yet, the website directs visitors to email `mragriengineer@gmail.com` rather than claiming the enquiry was saved.

## If the form reports “Failed to fetch”

The configured deployment must be publicly reachable. In Apps Script, open **Deploy → Manage deployments**, edit the web app deployment, choose **Execute as: Me** and **Who has access: Anyone**, select a new version, and deploy. Keep the resulting `/exec` URL in `config.js`, reload the website, and test again. If Google Workspace does not offer **Anyone**, the account administrator must allow public web-app deployments or the script must be deployed from an account that permits them.
