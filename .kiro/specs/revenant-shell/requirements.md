# Requirements: Revenant Shell (desktop + haunted IM UI)

## Introduction
The desktop experience of Revenant IM: a resurrected early-2000s instant messenger whose
buddies are AI models. This spec covers windows, look and feel, sound, and key management.
Model calls and the review loop are in the `revenant-orchestrator` spec.

## Requirements

### Requirement 1: Sign-on
**User story:** As a user, I want a sign-on screen so starting the app feels like signing on to a messenger.
1. WHEN the app launches THEN the system SHALL show the Sign-On window with the Revenant logo, a screen-name field and a "Sign On" button.
2. WHEN no API key has been saved THEN the system SHALL show a "Summon your first spirit" link that opens Preferences > Keys.
3. WHEN the user signs on THEN the system SHALL play the synthesized "creaking door" sign-on sound and open the Buddy List.
4. IF sound is muted in Preferences THEN the system SHALL NOT play any sound.

### Requirement 2: In-app window manager
**User story:** As a user, I want draggable retro windows so the app feels like a real 2000s desktop.
1. The system SHALL render every window (Buddy List, IM, Preferences, Ledger) with retro chrome: title bar, minimize and close buttons.
2. WHEN the user drags a title bar THEN the window SHALL move and stay within the app bounds.
3. WHEN the user clicks a window THEN it SHALL come to the front.
4. WHEN the user minimizes a window THEN it SHALL collapse to a taskbar button at the bottom and restore on click.
5. The system SHALL remember window positions between launches.

### Requirement 3: Buddy List
**User story:** As a user, I want my models shown as buddies so I can see my agent team at a glance.
1. The Buddy List SHALL show groups "Main" (exactly one model) and "Buddies" (zero or more subagent models).
2. Each buddy SHALL show a name, provider icon and status: Online, Away (with away message), Busy, Offline.
3. WHEN a buddy is working on a task THEN its away message SHALL describe it, e.g. "away: fixing the login form, try 2 of 3".
4. WHEN the user double-clicks a buddy THEN the system SHALL open an IM window with that buddy.
5. The user SHALL be able to drag a buddy into "Main" to make it the main model.

### Requirement 4: IM windows
**User story:** As a user, I want to chat with Main and watch buddies work, in classic IM windows.
1. The Main IM window SHALL be where the user sends requests.
2. Messages SHALL show screen name, timestamp and text, with Markdown and code blocks rendered.
3. WHILE a model is responding THE system SHALL show "<name> is typing...".
4. A buddy's IM window SHALL show the contract it received, each attempt, and Main's review verdict.
5. WHEN a message arrives in an unfocused window THEN the taskbar button SHALL flash and the message sound SHALL play.

### Requirement 5: Preferences and API keys
**User story:** As a user, I want to add several API keys and choose models so I can build my team.
1. Preferences > Keys SHALL let the user add, label, test and delete keys for providers: Anthropic, OpenAI, DeepSeek, OpenRouter, Groq, Ollama (no key, local URL), and Custom (OpenAI-compatible base URL).
2. WHEN a key is saved THEN the system SHALL encrypt it with the OS keychain via Electron `safeStorage` and never send it back to the renderer.
3. WHEN the user presses "Test" THEN the system SHALL make a minimal request and show OK or the error kind.
4. Preferences > Team SHALL let the user add buddies by choosing a key and a model ID, and choose which buddy is Main.
5. Preferences > Rules SHALL let the user set the max attempts before escalation (default 2) and the escalation target.

### Requirement 6: Haunted theme
**User story:** As a judge, I want the theme to look intentional and polished.
1. The system SHALL use a dark purple / ghost green palette with pixel-style window chrome.
2. Sign-on, incoming message, buddy sign-on and sign-off sounds SHALL be synthesized with Web Audio (no recorded or third-party audio).
3. The UI SHALL NOT contain third-party trademarks (AIM, AOL, the running-man logo).
4. A subtle fog animation SHALL run behind the desktop and respect `prefers-reduced-motion`.
