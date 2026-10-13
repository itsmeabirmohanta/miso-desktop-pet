# Public repository review

Reviewed on 13 October 2026 for MISO 1.0.6, before publication of the README changes. This is a publication and secret-exposure review, not a comprehensive application security assessment.

## Findings

- All 107 tracked files and 146 unique historical text blobs were checked for private credential/profile file names and common credential signatures. No matching private files or secret signatures were found.
- Gitleaks v8.30.1 was downloaded from its official release with its archive checksum verified. Its all-ref Git history scan completed with zero findings; report values were redacted and reports remain in ignored `artifacts/`.
- The final 109-file publication snapshot, including the redesigned README, review report, and sanitized banner, also passed a Gitleaks directory scan with zero findings. Ignored local files were excluded from that snapshot.
- Commit author/committer metadata uses GitHub noreply addresses. No non-noreply email addresses were found in the available commit history, and the current repository Git identity uses a noreply address.
- Both published release descriptions and the repository description were checked for common secret signatures. None were found. The repository had no issue or pull-request bodies to inspect at review time.
- The latest release installer, checksum, and user guide matched their local SHA-256 digests. The packaged archive/runtime-fuse audit passed with default Google sign-in configuration present. The archive excludes development/test modules, personal profiles, source maps, and test screenshots.
- `.env.example` contains empty values. Real `.env` files, credential JSON, private keys, generated bundles/installers, profiles, logs, and test artifacts are ignored by Git.
- Outdated documentation claiming the installer contains no default OAuth configuration was corrected.
- The supplied README banner contained the owner's name and design-export identifiers in hidden XMP metadata. That XMP segment was removed before adding the banner to Git. The JPEG's compressed image data is unchanged; the original is retained only under ignored `artifacts/`. Remaining EXIF tags contain no GPS, author, or description fields.
- Metadata checks of 17 artwork files found the owner's name in four existing PNG exports: `src/assets/branding/icon.png`, `src/assets/branding/tray.png`, `src/assets/icon.png`, and `src/assets/tray.png`. No emails, local paths, or GPS fields were found in those metadata chunks. These are identity disclosures, not account credentials. The files already exist in Git history and published installers; original application artwork was retained for this README-only change. Removing every older copy would require a separate history/release cleanup, not just a new commit.

## What becomes public

Making this repository public exposes its source code, tests with synthetic examples, original branding/mascot assets, package dependencies, workflow definitions, README/docs, and Git history. GitHub also provides source archives alongside releases. These files are intended repository content; public visibility does not itself assign an open-source license.

The application artwork's existing creator metadata can disclose the owner's name. This review does not certify that the repository is anonymous, and a noreply email does not conceal commit author names.

The installer intentionally contains Desktop OAuth app configuration. Its client ID and desktop client secret are extractable even though the settings UI hides the default values. This is separate from personal refresh/access tokens, Google account passwords, and user calendar data. Google authorization can display the application's support/developer contact and its client ID regardless of repository visibility.

GitHub Actions secret values are not repository files. Publisher builds explicitly receive only the public Desktop OAuth build configuration. Keep personal account tokens, AI keys, service-account keys, and confidential server credentials out of that build configuration. Third-party pull requests must not receive private secrets; the current workflow uses `pull_request`, not `pull_request_target`, and labels its unconfigured PR artifacts as test builds.

## Maintaining the boundary

- Share release installers rather than profiles or ignored workspace folders. Keep downloaded scan reports and diagnostic artifacts private.
- Keep using a GitHub noreply commit address. Review any new screenshots, attachments, issue text, or logs before publishing them.
- Enable GitHub secret scanning and push protection where available after the repository becomes public, and investigate alerts rather than bypassing them.
- Re-run a redacted all-history secret scan and packaged release audit before publishing a new version. Pattern scanners cannot identify every possible secret or personal document.
- Google production verification and support-contact branding are separate Cloud project settings. Passing repository or installer checks does not approve Google consent permissions.

## References

- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [GitHub commit email privacy](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
- [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)
- [Google Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google OAuth branding](https://support.google.com/cloud/answer/15549049?hl=en)
