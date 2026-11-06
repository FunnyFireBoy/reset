<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Android uses Capacitor to load the published HTTPS web app with native plugins; this preserves the existing hosted server functionality rather than attempting an offline static export.
- Produce Android download builds in temporary staging, run Capacitor copy/update before Gradle, and verify APK signing and embedded configuration before delivery; generated native assets must exist for plugin registration.
- Web notifications use a messaging-only worker and tap-triggered permission requests, not an offline app-shell cache; background scheduled reminders remain native-only.
- Android calendar handoffs use a registered native INSERT plugin in Capacitor and explicit INSERT intents in mobile browsers; AppLauncher does not parse Android intent strings.
