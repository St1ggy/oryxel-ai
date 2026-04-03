# Manual checklist

- [ ] Anonymous user opening `/` is redirected to `/login`.
- [ ] Login page shows configured social providers (Google/Apple/Yandex).
- [ ] After social login, user is redirected back to original `redirectTo`.
- [ ] Sending a minor chat preference update auto-applies and refreshes UI data.
- [ ] Sending a critical chat preference update creates a pending card.
- [ ] Confirming pending update changes profile/table data without hard reload.
- [ ] Rejecting pending update removes it from active pending list.
- [ ] Locale switch still updates URL and translations correctly.
- [ ] Theme switch still persists and updates UI tokens correctly.
- [ ] Collection icon looks centered and consistent in all active themes.
