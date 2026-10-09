# PCTU IMS status

Independent bilingual service status and maintenance page for PCTU IMS.

- Personal repository: [DeepMedicineUnit/ims-status](https://github.com/DeepMedicineUnit/ims-status).
- GitHub Pages: [deepmedicineunit.github.io/ims-status](https://deepmedicineunit.github.io/ims-status/).
- Canonical domain after DNS setup: [statusims.pctu.edu.vn](https://statusims.pctu.edu.vn/).

## Features

Vietnamese and English, responsive layout, accessible controls and reduced-motion support. The page shows recorded service status, response times, recent changes and 24-hour observations. Maintenance and outage messages explain that the technical team is working to restore service.

GitHub Actions checks public service endpoints on a five-minute schedule and publishes a sanitized snapshot. The browser reloads the snapshot every 60 seconds. Results older than 20 minutes are shown as unknown. Missing observations are never reported as uptime.

Only the canonical root displays the status interface. The old `/status` address redirects to the root. API routes are separate from page routes.

## Run locally

Node.js 22 or later; no dependencies need to be installed:

```shell
npm test
npm run build
npm run preview
```

The initial snapshot is unknown until monitoring runs. `npm run monitor` writes a new snapshot to `dist/status.json`.

## GitHub Pages

Use GitHub Actions as the Pages publishing source. Configure the custom domain in repository Settings → Pages, then follow [GitHub's custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

For this personal account, the subdomain CNAME target is `deepmedicineunit.github.io`, without a scheme or repository path. The repository remains `ims-status`.

Set repository variable `STATUS_SITE_URL` to the deployed page's root URL. This is used to read the previous snapshot and retain history. A `CNAME` file by itself does not configure a custom domain when publishing with a workflow.

## Configuration

`site/config.js` contains public URLs, refresh timing and an optional public support address. Never put credentials or internal infrastructure details in the site configuration.

`site/maintenance.json` configures an optional scheduled notice. Enable `active`, provide both language messages and use ISO dates with a timezone, or `null` when the time is unknown. Disable `active` when maintenance ends. No recovery time is invented automatically.

Scheduled workflows may be delayed or disabled after repository inactivity. Check Actions if the snapshot stops updating. The page reports availability observations and does not infer the physical cause of an outage.
