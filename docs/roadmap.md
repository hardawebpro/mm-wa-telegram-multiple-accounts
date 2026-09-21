# MM WA Telegram Multiple Accounts — Product Roadmap

**Last updated:** 2026-09-22  
**Version context:** `0.1.0-beta`  
**Canonical spec:** [about.md](../about.md)

This roadmap tracks product ideas and delivery status. It is a living document for reconsideration — not a commitment to build everything listed.

---

## ID convention

| Prefix     | Stage              | Meaning                                                           |
| ---------- | ------------------ | ----------------------------------------------------------------- |
| `IDEA-###` | **Idea**           | Raw concept; not yet evaluated for scope or design                |
| `CON-###`  | **Considering**    | Under evaluation — needs product decision, design, or risk review |
| `IMPL-###` | **Implementation** | Approved and planned/in progress                                  |
| `DEL-###`  | **Delivered**      | Shipped in a released build                                       |

When an item moves stages, keep the same ID and update its section.

---

## Idea

Early concepts. No approval, no timeline.

### Help center & knowledge (Answer Helper)

| ID       | Title                                   | Summary                                                                                                                                                                             |
| -------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDEA-001 | Answer Helper (Ctrl+K command palette)  | Overlay search in app shell (Tailwind-docs style). Staff types keywords (e.g. `harga`) and picks an official snippet to insert into the active chat composer. Human sends manually. |
| IDEA-002 | Source of truth — flat `knowledge.json` | Single local JSON file: `id`, `title`, `category`, `keywords`, `body`. Minimal admin effort; shared via project folder or network copy.                                             |
| IDEA-003 | Fuzzy local search (no Algolia)         | In-memory index + fuzzy match on title, keywords, category, body. Synonyms via `keywords` array (e.g. `harga`, `price`, `biaya`).                                                   |
| IDEA-004 | Knowledge reload without restart        | “Reload knowledge” action after admin edits `knowledge.json`.                                                                                                                       |
| IDEA-005 | Category filters in Answer Helper       | Filter results by Pricing, Shipping, Policy, etc.                                                                                                                                   |
| IDEA-006 | Recent & favorite snippets              | Surface frequently used entries for faster support replies.                                                                                                                         |
| IDEA-007 | Insert snippet into WA/TG composer      | Main-process script inserts selected `body` into active WebContentsView composer; staff edits before send.                                                                          |
| IDEA-008 | Shared vs per-account knowledge         | Option: one global knowledge base or different files per Business account.                                                                                                          |
| IDEA-009 | Help center persona documentation       | User guides and onboarding tuned for support staff (not generic multi-account users).                                                                                               |

### AI-assisted support (deferred)

| ID       | Title                            | Summary                                                                                                                      |
| -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| IDEA-010 | AI suggest reply (manual assist) | User pastes customer question → AI suggests draft based on selected knowledge entry or RAG context. Staff reviews and sends. |
| IDEA-011 | Multi-provider AI (API token)    | OpenAI, Claude, DeepSeek via user-supplied API keys in Settings. Keys stored encrypted in main process only.                 |
| IDEA-012 | AI auto-answer (full automation) | Detect incoming message → AI reply → auto-send. High ToS/ban risk; likely out of scope unless heavily gated.                 |
| IDEA-013 | RAG over local knowledge         | Retrieve relevant `knowledge.json` entries before AI call to reduce hallucination.                                           |

### Templates & productivity (from about.md)

| ID       | Title                      | Summary                                                                 |
| -------- | -------------------------- | ----------------------------------------------------------------------- |
| IDEA-014 | Text templates module      | Categorized reusable replies (Greeting, Pricing, Address, Follow Up).   |
| IDEA-015 | Quick replies              | One-click or shortcut-triggered template insertion.                     |
| IDEA-016 | Placeholder variables      | Snippets with `{name}`, `{order_id}`, etc., filled before insert.       |
| IDEA-017 | Account-specific templates | Different template sets per WhatsApp Business / support account.        |
| IDEA-018 | Template search UI         | Search templates outside Ctrl+K (Settings or sidebar panel).            |
| IDEA-019 | Custom Auto Text           | Automated text insertion rules (scope TBD — must not become bulk/spam). |

### Platform & distribution

| ID       | Title                             | Summary                                                             |
| -------- | --------------------------------- | ------------------------------------------------------------------- |
| IDEA-020 | Signed Windows installer (`.exe`) | Optional installer beyond portable Phase 1 model.                   |
| IDEA-021 | Application auto-update           | Updater module (permanently low priority per about.md).             |
| IDEA-022 | Backup / restore module           | Export accounts metadata + knowledge + settings (`backup/` module). |
| IDEA-023 | Workspace / profiles module       | Separate workspaces for different teams (`workspace/` module).      |
| IDEA-024 | macOS / Linux builds              | Expand beyond Windows 10+ primary platform.                         |

### Notifications & tray

| ID       | Title                            | Summary                                                                        |
| -------- | -------------------------------- | ------------------------------------------------------------------------------ |
| IDEA-025 | Enhanced notification management | Per-chat mute, quiet hours, notification grouping beyond current shell toasts. |
| IDEA-026 | Extended tray integration        | Rich tray menu: unread summary, quick account switch, Answer Helper shortcut.  |

---

## Considering

Evaluated concepts or **about.md requirements not yet fully implemented**. Needs decision before implementation.

### Help center — recommended next track

| ID      | Title                         | Summary                                                       | Open questions                                                                |
| ------- | ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| CON-001 | Answer Helper MVP             | `IDEA-001` + `IDEA-002` + `IDEA-003` + `IDEA-007` as one MVP. | File location: project `knowledge/` vs `userData`? Global shortcut conflicts? |
| CON-002 | Knowledge authoring workflow  | Who edits JSON — admin only or in-app editor later?           | Start with external JSON only vs Settings CRUD?                               |
| CON-003 | Snippet preview before insert | Modal preview of full `body` before inserting into composer.  | Required for long policy text?                                                |

### about.md gaps (spec written, app incomplete)

| ID      | Title                          | Spec reference                    | Current state                                                                                          |
| ------- | ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| CON-004 | Launch at startup              | Settings → General                | Toggle exists in UI/types; **not wired** to OS login (`app.setLoginItemSettings` or equivalent).       |
| CON-005 | Start minimized                | Settings → General                | Toggle exists; **not applied** on app launch.                                                          |
| CON-006 | Per-account zoom factor        | Account settings                  | Slider saved in settings; **not applied** to `WebContentsView` (`setZoomFactor`).                      |
| CON-007 | Account enabled / disabled     | Account model                     | `enabled` field used on restore; **no UI toggle** to disable account without delete.                   |
| CON-008 | Custom account avatar          | Sidebar spec                      | Only `PlatformIcon` shown; `avatar` field in model **unused** in UI.                                   |
| CON-009 | Account background suspension  | `backgroundMode: suspended`       | Type/schema exist; **no suspension logic** for inactive views (about.md: future optional).             |
| CON-010 | Clear account cache (Advanced) | Settings → Advanced               | Only “clear session” / logout path exists; **separate cache clear** not exposed.                       |
| CON-011 | Platform-aware reload label    | Account settings                  | Button text says “Reload WhatsApp” for **all** platforms including Telegram.                           |
| CON-012 | Account “Open” action          | Account settings list in about.md | No dedicated Open button in Settings → Accounts (switch via sidebar/tabs only).                        |
| CON-013 | Optional future modules layout | about.md module folders           | Folders `templates/`, `backup/`, `workspace/`, etc. **not created** — organizational decision pending. |

### AI integration (explicitly deferred)

| ID      | Title                                | Summary                 | Notes                                                                                                                 |
| ------- | ------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CON-014 | AI suggest reply only (no auto-send) | `IDEA-010` + `IDEA-011` | Aligns with support QA; avoids Phase 1 automation exclusions.                                                         |
| CON-015 | AI auto-answer                       | `IDEA-012`              | Conflicts with about.md “AI chatbot” out of Phase 1; WhatsApp/Telegram ToS risk. **Likely reject** unless draft-only. |

### Product boundaries (reconfirm before any work)

| ID      | Title                          | Summary                                                                                       |
| ------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| CON-016 | Scope revision for help center | Update `about.md` if primary persona shifts from generic multi-account to **support staff**.  |
| CON-017 | Cloud dependency approval      | Any AI API or remote sync requires explicit approval per project rules.                       |
| CON-018 | Automation vs manual send      | All reply features must keep **manual send** default to respect Phase 1 anti-spam boundaries. |

---

## Implementation

Approved work **not yet started** or **in progress**.

| ID  | Title | Status | Notes                                 |
| --- | ----- | ------ | ------------------------------------- |
| —   | —     | —      | No items in implementation queue yet. |

**Suggested promotion order (for discussion only):**

1. `CON-001` Answer Helper MVP
2. `CON-004` / `CON-005` startup settings wiring
3. `CON-006` zoom factor application
4. `CON-014` AI suggest (if approved after Answer Helper)

---

## Delivered

Features **shipped** in current beta (`0.1.0-beta`). Mapped to about.md where applicable.

### Core messaging

| ID      | Title                                      | Notes                                            |
| ------- | ------------------------------------------ | ------------------------------------------------ |
| DEL-001 | Multi-account WhatsApp Personal / Business | WebContentsView per account, isolated partitions |
| DEL-002 | Telegram support                           | Same architecture as WhatsApp                    |
| DEL-003 | Persistent sessions                        | Login survives app restart                       |
| DEL-004 | Add / rename / delete account              | Including confirmation on delete                 |
| DEL-005 | Account tabs                               | Open, close tab without logout                   |
| DEL-006 | Switch account (sidebar + tabs)            |                                                  |
| DEL-007 | Platform icons on tabs                     | WhatsApp green / Telegram blue                   |

### Shell UI

| ID      | Title                              | Notes                                           |
| ------- | ---------------------------------- | ----------------------------------------------- |
| DEL-008 | Sidebar expanded / compact         | With tooltips in compact mode                   |
| DEL-009 | Light / dark / system theme        |                                                 |
| DEL-010 | Font size presets (XS / S / M / L) | Shell UI only                                   |
| DEL-011 | Settings panel                     | General, Appearance, Accounts, About, Advanced  |
| DEL-012 | Add Account modal                  | Platform + type selection                       |
| DEL-013 | Restore UI state                   | Last active account, opened tabs (configurable) |
| DEL-014 | About section + GitHub links       | Bug report, repository                          |
| DEL-015 | Window maximize on first load      |                                                 |
| DEL-016 | Tailwind CSS shell                 | No restyling of WA/TG web clients               |

### Notifications

| ID      | Title                                    | Notes                               |
| ------- | ---------------------------------------- | ----------------------------------- |
| DEL-017 | Shell desktop notifications              | Not native WA/TG web toasts; tray reliability: poll-driven flush, baseline-safe show, retry on failed toast |
| DEL-018 | Block web notification permission        | Avoid duplicate toasts              |
| DEL-019 | Unread badges (sidebar + tabs)           | DOM + title polling                 |
| DEL-020 | Notification preview per account         | Chat name + message snippet from chat list DOM; works in tray when **Notification preview** enabled |
| DEL-021 | Notification click → restore + open chat | Tray restore, focus chat with retry |
| DEL-022 | Platform notification icons              | WA/TG icon on toast body            |
| DEL-023 | Windows AppUserModelID + shortcuts       | Start Menu / Desktop shortcut setup |

### Tray & system

| ID      | Title                   | Notes       |
| ------- | ----------------------- | ----------- |
| DEL-024 | Minimize to tray        | TrayManager shell hide/show callbacks + window hide/show handlers |
| DEL-025 | Close to tray           |             |
| DEL-026 | System tray icon + menu | Show / Quit |

### Account settings (partial)

| ID      | Title                                 | Notes                                               |
| ------- | ------------------------------------- | --------------------------------------------------- |
| DEL-027 | Notifications + sound toggles         | Per account                                         |
| DEL-028 | Voice / video call permission toggles | Electron media permissions                          |
| DEL-029 | Reload account                        | Session reload                                      |
| DEL-030 | Logout (clear session)                |                                                     |
| DEL-031 | Zoom factor UI                        | **Saved only** — apply to view tracked as `CON-006` |

### Security & architecture

| ID      | Title                                | Notes                                |
| ------- | ------------------------------------ | ------------------------------------ |
| DEL-032 | Secure IPC + preload bridge          | Validated channels                   |
| DEL-033 | No auth tokens in config files       | Partitions only                      |
| DEL-034 | Navigation guard for messaging views | Allowed origins only                 |
| DEL-035 | Portable distribution model          | `setup-first-time.bat`, no installer |

### Documentation & release

| ID      | Title                              | Notes                           |
| ------- | ---------------------------------- | ------------------------------- |
| DEL-036 | README + about.md (EN / ID)        | Beta, portable, troubleshooting |
| DEL-037 | HOW_TO_USE guides + CARA-PAKAI.txt |                                 |
| DEL-038 | Beta version label (`0.1.0-beta`)  | Title bar, sidebar, About       |

---

## Explicitly out of scope ([about.md](http://about.md))

Not on roadmap unless product decision changes:

- Paid licensing / subscriptions / in-app purchases
- Cloud sync
- Analytics / telemetry
- CRM
- Bulk sender
- Contact scraping
- Unofficial WhatsApp / Telegram API
- AI chatbot (full auto) — see `CON-015`
- Auto updater — see `IDEA-021`

---

## How to use this document

1. New concept → add under **Idea** with next `IDEA-###` ID.
2. Ready for evaluation → move to **Considering** (keep ID or cross-reference).
3. Approved to build → move to **Implementation** as `IMPL-###` (same feature, new ID if preferred).
4. Shipped → move to **Delivered** as `DEL-###` with release version.
5. Revisit **Considering** items when planning next beta.

---

## Revision log

| Date       | Change                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| 2026-03-15 | Initial roadmap: Answer Helper concept, AI deferred, about.md gap analysis vs `0.1.0-beta` |
| 2026-03-22 | Tray notification fix: shell-visible views, wake polling, catch-up coalescing |
| 2026-09-22 | Tray toast hardening: poll-driven debounce, tray always-notify rule, safe baseline after show, TrayManager callbacks; tray message preview re-enabled with bounded DOM poll |
