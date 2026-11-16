# TalkHub Codebase Review & Architecture Analysis

## 1. Project Structure & Module Breakdown

TalkHub is a real-time messaging application built with **Next.js 16 (App Router)**, **React 19**, **Supabase (Auth, PostgreSQL, Storage, Realtime)**, **TanStack React Query v5**, **Tailwind CSS v4**, and **next-intl**.

### Directory Tree Overview

```text
talkhub/
├── middleware.ts                  # Root Next.js middleware (delegates to src/proxy.ts)
├── messages/                      # Active i18n translation strings (en.json)
├── components/                    # Root shadcn UI primitives (button, input, alert-dialog)
│   └── ui/
├── lib/                           # Root utility (re-exports cn from "cn")
│   └── utils.ts
├── supabase/                      # Database configuration & SQL migrations
│   ├── config.toml
│   └── migrations/                # Schema DDL, triggers, and RPC functions
├── src/
│   ├── app/                       # Next.js App Router (pages, layout, globals)
│   │   ├── (auth)/                # Route group: /login, /register
│   │   ├── chat/                  # Authenticated chat page
│   │   ├── layout.tsx             # Root layout with providers & font setup
│   │   ├── page.tsx               # Root redirector
│   │   └── color.ts               # (Dead code) Legacy Tailwind color definition
│   ├── components/                # Application domain components
│   │   ├── chat/                  # ChatSidebar, ChatWindow, MessageList, MessageItem, MessageInput...
│   │   ├── modal/                 # ConfirmationModal, ConversationInfoModal
│   │   └── icons/                 # Custom SVG icons
│   ├── hooks/                     # Custom React hooks (React Query & Supabase)
│   ├── lib/                       # Supabase client/server/middleware configs & legacy schemas
│   ├── providers/                 # QueryProvider (React Query client)
│   ├── schemas/                   # Zod schemas (auth, modals)
│   ├── screen/                    # Screen-level composition containers
│   ├── store/                     # (Unused) Zustand store (chat.store.ts)
│   ├── types/                     # TypeScript definitions (chat, profile, form, modals)
│   └── utils/                     # Validation helpers, regex definitions
```

### Purpose of Major Modules

| Module / Directory | Key Files | Purpose |
| :--- | :--- | :--- |
| **Routing & Auth Middleware** | `middleware.ts`, `src/proxy.ts`, `src/lib/supabase/middleware.ts` | Intercepts all requests, syncs Supabase SSR session cookies, redirects unauthenticated users to `/login`, and redirects authenticated users away from auth pages to `/chat`. |
| **Authentication Flow** | `src/app/(auth)/login`, `register`, `useLogin.ts`, `useSignup.ts` | User registration and email/password login using Supabase Auth, client-side Zod validation, and automatic profile creation. |
| **Chat Screen & Presentation** | `src/screen/chat/ChatScreen.tsx`, `ChatLayout.tsx` | Main orchestrator coordinating the sidebar conversation list, the active chat window, real-time message subscriptions, and read-receipt synchronization. |
| **Chat UI Components** | `ChatSidebar.tsx`, `ChatWindow.tsx`, `MessageList.tsx`, `MessageItem.tsx`, `MessageInput.tsx` | Specialized UI modules managing message rendering, multi-image grids, infinite scroll history, attachment handling, emoji picker, context menus, and typing indicators. |
| **Data Layer (Hooks)** | `useConversations.ts`, `useChat.ts`, `useRealtimeChat.ts`, `useOnlineUsers.ts` | TanStack Query queries and mutations for fetching conversations, sending text/attachments/image groups, and managing Supabase WebSocket channels. |
| **Database & Migrations** | `supabase/migrations/*.sql` | PostgreSQL schema definitions: `profiles`, `conversations`, `conversation_members`, `messages`, `message_deletions`, Row Level Security (RLS) policies, storage buckets, and RPC functions. |

---

## 2. How the Main Parts Work & Interact

```mermaid
flowchart TD
    subgraph Client["Client Browser (Next.js / React 19)"]
        UI["ChatScreen & Components"]
        RQ["TanStack React Query Cache"]
        Realtime["Supabase Realtime Listeners"]
    end

    subgraph Server["Next.js Server / Edge"]
        MW["Middleware (src/proxy.ts)"]
        RSC["Server Components (src/app/chat/page.tsx)"]
    end

    subgraph Backend["Supabase Platform"]
        Auth["Supabase Auth"]
        PG["PostgreSQL Database & RLS"]
        Storage["Storage Buckets (chat-files / avatars)"]
        WS["Supabase Realtime (WebSocket)"]
    end

    Client -->|1. Route Request| MW
    MW -->|Sync Session / Protect| Auth
    MW -->|Authorized| RSC
    RSC -->|Render with userId| UI
    
    UI -->|Mutations (Send message, upload)| RQ
    RQ -->|Write Rows / Invoke RPC| PG
    UI -->|Upload Files| Storage
    Storage -->|Signed URLs| UI

    Realtime -->|Subscribe to INSERT/UPDATE/DELETE| WS
    WS -->|Postgres Changes| Realtime
    Realtime -->|Update / Invalidate| RQ
    RQ -->|Re-render UI| UI
```

1. **Authentication & Session Management**:
   - `src/lib/supabase/middleware.ts` runs on each request to refresh tokens using `@supabase/ssr`.
   - `src/proxy.ts` evaluates session status: `/` redirects to `/chat` or `/login`; `/chat` requires an active session; logged-in users visiting `/login` or `/register` are redirected to `/chat`.
   - On the client, `useLogin` and `useSignup` handle credentials against `supabase.auth`.

2. **Conversation & Message Flow**:
   - `ChatScreen.tsx` receives `currentUserId` from the server component `ChatPage`.
   - `useConversations(currentUserId)` queries the database for user memberships, conversations, and other participants' profiles.
   - When a conversation is selected, `useMessages(selectedId)` triggers an infinite query with cursor pagination (`created_at` timestamp).
   - Sending messages (`useSendMessage`, `useSendAttachment`, `useSendImageGroup`) performs optimistic updates directly on the React Query cache before syncing with Supabase.

3. **Realtime & Presence**:
   - **Messages**: `useRealtimeMessages` listens to `postgres_changes` on the `messages` table filtered by `conversation_id`.
   - **Global Events**: `useRealtimeConversations` listens for message inserts/updates across the user's chats to update sidebar badges and last message previews.
   - **Presence**: `useOnlineUsers` connects to a Supabase Presence channel (`global-online-users`) tracking online user IDs.
   - **Typing Indicator**: `useTypingIndicator` uses Supabase Broadcast events on `talkhub-typing:<conversationId>`.

---

## 3. Critical Issues & Areas for Improvement

### Issue 1: RPC Function Name Mismatches Breaking Core Features
* **What's wrong:**
  1. In `src/screen/chat/ChatScreen.tsx` (line 114), the client calls:
     ```ts
     await supabase.rpc("mark_conversation_messages_read", { p_conversation_id: selectedId });
     ```
     However, the database migration (`20261103000400_message_status_tracking.sql`) defines this function as `mark_messages_as_read`.
  2. In `src/hooks/useRealtimeChat.ts` (line 400), the client calls:
     ```ts
     await supabase.rpc("mark_conversation_messages_delivered", { p_conversation_id: message.conversation_id });
     ```
     The migration defines this function as `mark_messages_as_delivered`.
* **Why it matters:** Read receipts and delivery receipts fail in production with database RPC errors (`function ... does not exist`), logging errors and failing to persist message statuses.
* **How to improve:** Align the RPC function names between the frontend callers and the SQL definitions, and generate typed database schemas using `supabase gen types typescript` to catch RPC name mismatches at compile time.
* **Affected files:**
  - `src/screen/chat/ChatScreen.tsx`
  - `src/hooks/useRealtimeChat.ts`
  - `supabase/migrations/20261103000400_message_status_tracking.sql`

---

### Issue 2: Database Schema Mismatches (Missing Columns & RPCs)
* **What's wrong:**
  1. **Attachment metadata**: `useSendAttachment` and `useSendImageGroup` in `src/hooks/useChat.ts` insert `attachment_name`, `attachment_type`, `attachment_size`, and `media_group_id` into `public.messages`. None of these columns exist in `supabase/migrations/20261027000100_talkhub_schema.sql` (only `attachment_path` exists), and no subsequent migration adds them.
  2. **Profile phone number**: `useSignup.ts` and `useConversations.ts` query and insert `phone` on `public.profiles`. The `profiles` schema has no `phone` column.
  3. **Group creation RPC missing**: `useCreateGroupConversation` calls `supabase.rpc("create_group_conversation")`. The file `supabase/migrations/20261102000100_chat_features.sql` was checked in as an empty (0-byte) file, and this function does not exist in any migration.
  4. **Storage bucket mismatch**: `useChat.ts` uploads to bucket `"chat-attachments"`, while the database schema and RLS policies configure bucket `"chat-files"`.
  5. **Missing DELETE RLS policy**: `useDeleteMessage` attempts to run `.from("messages").delete()`, but the migration specifically states `-- Intentionally NO client UPDATE or DELETE policies`, and no DELETE policy was added.
* **Why it matters:** Sending grouped images, saving attachments, saving phone numbers, creating group chats, and deleting messages will fail with PostgreSQL constraint/column/RLS errors.
* **How to improve:**
  - Create a migration adding the missing columns to `messages` (`attachment_name text`, `attachment_type text`, `attachment_size bigint`, `media_group_id uuid`) and `profiles` (`phone text`).
  - Implement `create_group_conversation(p_title text, p_member_ids uuid[])` in SQL.
  - Standardize the storage bucket name to `chat-files` (or `chat-attachments`) across both SQL and TypeScript.
  - Add a DELETE policy on `messages`:
    ```sql
    create policy "Senders can delete their own messages"
    on public.messages for delete to authenticated
    using (sender_id = (select auth.uid()));
    ```
* **Affected files:**
  - `supabase/migrations/`
  - `src/hooks/useChat.ts`
  - `src/hooks/useSignup.ts`
  - `src/hooks/useConversations.ts`

---

### Issue 3: Severe Scalability & Performance Bottleneck in `useConversations`
* **What's wrong:**
  In `src/hooks/useConversations.ts` (lines 61–76), step 4 executes:
  ```ts
  const { data: allMessages } = await supabase
    .from("messages")
    .select(...)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });
  ```
  It queries **every message in every conversation the user belongs to into browser memory** without a limit, solely to compute `lastMessage` and `unreadCount`.
* **Why it matters:** If a user has 10 conversations with 1,000 messages each, 10,000 rows are fetched on initial load and on every query invalidation. This causes network saturation, high database load, and browser memory exhaustion.
* **How to improve:**
  - Delegate conversation summaries to the database using a PostgreSQL view or a dedicated RPC function (e.g., `get_user_conversations`) utilizing `DISTINCT ON (conversation_id)` or lateral joins for the last message, and a subquery for unread counts.
  - Alternatively, store denormalized `last_message_content`, `last_message_at`, `last_message_sender_id` directly on the `conversations` table, maintained via a database trigger on message insert.
* **Affected files:**
  - `src/hooks/useConversations.ts`
  - `supabase/migrations/`

---

### Issue 4: Global Realtime Listener Without Database Filter
* **What's wrong:**
  In `src/hooks/useRealtimeChat.ts` (lines 375–381), `useRealtimeConversations` subscribes to:
  ```ts
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages",
  }, ...)
  ```
  There is no `filter` clause on this channel.
* **Why it matters:** The client receives a WebSocket event for **every message inserted across the entire platform**, including chats the user is not a participant of. Even if RLS limits data payload, this causes client event flooding and unnecessary query invalidations.
* **How to improve:** Filter Realtime changes by user conversation IDs, or broadcast new message events via user-specific Supabase Realtime broadcast channels (`user:<userId>`).
* **Affected files:**
  - `src/hooks/useRealtimeChat.ts`

---

### Issue 5: Sidebar Renders All Users Instead of Conversations
* **What's wrong:**
  In `src/components/chat/ChatSidebar.tsx` (lines 94–120):
  - `usersToDisplay` maps over `filteredUsers` (fetched from `useUsers()`, which returns every profile in the database).
  - It matches each user to a conversation: `c.other_user_id === user.id`.
  - It filters out any conversation where `c.is_group === true` (`!c.is_group`).
* **Why it matters:**
  1. Group chats can never be seen or accessed in the sidebar.
  2. If the platform has 5,000 registered users, the sidebar attempts to render 5,000 items even if the current user has only chatted with 1 person.
* **How to improve:**
  - The sidebar should iterate directly over `conversations` (which includes both 1:1 and group chats).
  - User search should only trigger when the user opens a "New Chat" modal or explicitly searches for new contacts.
* **Affected files:**
  - `src/components/chat/ChatSidebar.tsx`
  - `src/components/chat/UserListItem.tsx`

---

### Issue 6: Typing Indicator Effect Memory Leak / Socket Churn
* **What's wrong:**
  In `src/hooks/useTypingIndicator.ts` (lines 17, 99):
  ```ts
  const supabase = createClient();
  // ...
  useEffect(() => { ... }, [conversationId, currentUserId, supabase]);
  ```
  `createClient()` is called inside the hook body without `useMemo`. Because a new client instance is created on every render, the `useEffect` cleans up and re-establishes the WebSocket channel on every render of `ChatWindow`.
* **Why it matters:** Rapid channel creation and removal causes WebSocket thrashing, lost broadcast events, and client-side lag during typing.
* **How to improve:** Memoize the Supabase client:
  ```ts
  const supabase = useMemo(() => createClient(), []);
  ```
  or omit `supabase` from the dependency array if using a stable singleton instance.
* **Affected files:**
  - `src/hooks/useTypingIndicator.ts`

---

### Issue 7: Query Key Mismatch in `EditProfileModal`
* **What's wrong:**
  In `src/components/chat/EditProfileModal.tsx` (line 148):
  ```ts
  await queryClient.invalidateQueries({ queryKey: ["users"] });
  ```
  However, in `src/hooks/useUsers.ts` (line 11), the query key is defined as:
  ```ts
  queryKey: ["chat-users"]
  ```
* **Why it matters:** Editing a user's name or avatar does not invalidate the user list query; stale profile information remains in the sidebar until manual page reload.
* **How to improve:** Define shared query key constants (e.g. `QUERY_KEYS = { users: ["chat-users"], conversations: ["conversations"] }`).
* **Affected files:**
  - `src/components/chat/EditProfileModal.tsx`
  - `src/hooks/useUsers.ts`

---

## 4. Structural Improvements & Project Organization

### 1. Resolve Duplicate Directory Paths (`components` vs `src/components`, `lib` vs `src/lib`)
* **Problem:** Shadcn CLI created root-level directories `./components/ui` and `./lib/utils.ts` because `components.json` is configured with `@/*` aliases pointing to the root directory while all application code lives in `./src/`.
* **Action:**
  1. Move `./components/ui` to `./src/components/ui`.
  2. Move `./lib/utils.ts` to `./src/lib/utils.ts`.
  3. Delete the root `./components` and `./lib` directories.
  4. Update `components.json` and `tsconfig.json` so `@/*` maps to `./src/*`.

### 2. Clean Up Orphaned, Duplicate, and Dead Files
* **`talkhub-project.zip`**: A 230KB archive file in the root directory that should not be tracked in version control.
* **`src/screen/ChatScreen.tsx`**: A 2-line file merely re-exporting `src/screen/chat/ChatScreen.tsx`. Delete and import directly from `src/screen/chat`.
* **`src/app/color.ts`**: An unused 354-line Tailwind v3 config file sitting in the Next.js App Router folder. Remove it.
* **`src/store/chat.store.ts`**: A Zustand store that is never imported or used. Either adopt Zustand and remove redundant state from hooks, or remove Zustand and its dependency from `package.json`.
* **`src/lib/validations/`**: Contains unused schemas (`chat.schema.ts`, `group.schema.ts`, `message.schema.ts`) that conflict in convention with `src/schemas/auth.ts`.
* **`src/i18n/textConstatn.ts` & `src/i18n/en.json`**: `textConstatn.ts` is an unused file with a typo. `src/i18n/en.json` contains only `{"LOGIN": "Login"}` while the real dictionary is at `messages/en.json`. Consolidate all translations in `messages/`.
* **Empty 0-byte files**: Remove `src/lib/utils/chat.ts`, `src/lib/utils/file.ts`, `src/utils/enum.ts`, and `supabase/migrations/20261102000100_chat_features.sql`.

### Recommended Target Directory Structure

```text
src/
├── app/                           # Only Next.js App Router routes & layouts
│   ├── (auth)/                    # (auth)/login, (auth)/register
│   ├── chat/                      # chat/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                        # Shadcn UI primitives (button, input, dialog)
│   ├── chat/                      # Chat domain components
│   ├── modal/                     # Shared modal components
│   └── icons/                     # Shared SVG icons
├── hooks/                         # Data & feature hooks (useChat, useConversations, etc.)
├── lib/
│   ├── supabase/                  # client.ts, server.ts, middleware.ts
│   └── utils.ts                   # Class merging (cn) & common formatters
├── schemas/                       # All Zod validation schemas
├── types/                         # TypeScript domain models & database contracts
└── i18n/                          # request.ts (locales stay in /messages)
```

---

## 5. Code Quality, Maintainability & Reusability

### 1. Component Over-Responsibility & Decomposition
* **`MessageItem.tsx` (869 lines):**
  - **Current issue:** Combines context menu handling, clipboard fallbacks, image lightbox/gallery with keyboard controls, file download triggers, message truncation ("read more/less"), and deletion modal handling in a single component.
  - **Fix:** Split into sub-components:
    - `<MessageContextMenu />`
    - `<MessageImageGallery />`
    - `<MessageAttachment />`
    - `<MessageTextContent />`

* **`MessageInput.tsx` (514 lines):**
  - **Current issue:** Handles drag-and-drop file upload, file size formatting, emoji picker popup, textarea auto-resize, editing mode states, and typing throttle triggers all in one place.
  - **Fix:** Extract `<AttachmentPreviewList />` and `<EmojiPickerPopover />`.

### 2. State Inconsistency in `MessageItem.tsx`
* In `MessageItem.tsx` (line 39):
  ```ts
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  ```
  In line 200:
  ```ts
  setContextMenu(false); // Type mismatch (boolean assigned to object | null)
  ```
  In line 328:
  ```ts
  onClick={() => setContextMenu((prev) => !prev)} // Toggles between boolean and object
  ```
  This creates erratic menu positioning behavior. Replace this state with a clean boolean toggle for the hover menu and separate coordinates only if using an explicit right-click context menu.

### 3. Missing `messages` Prop on `NextIntlClientProvider`
* In `src/app/layout.tsx` (line 48):
  ```tsx
  <NextIntlClientProvider>{children}</NextIntlClientProvider>
  ```
  `NextIntlClientProvider` is invoked without passing `messages`. While server components work, client components utilizing `useTranslations` without messages passed through the root provider can encounter hydration mismatches or missing key errors. Pass `messages = await getMessages()` in `RootLayout`.

---

## 6. Best Practices & Security Audit

### 1. Database Row Level Security (RLS) Review
* **Unrestricted SELECT on Profiles**: `20261103000100_profiles_view_all.sql` created:
  ```sql
  create policy "Anyone can view all profiles"
  on public.profiles for select to authenticated using (true);
  ```
  This exposes all user profiles (including usernames and phone numbers if added) to any authenticated user. If TalkHub is intended for closed networks or friend-only chats, profiles should be restricted to users who share conversations or through the explicit search RPC `search_chat_users`.

### 2. File Upload Validation
* In `useChat.ts` (`useSendAttachment`), validation on file size and extension is done purely on the client.
* **Security Improvement:** Add Supabase Storage bucket constraints (`file_size_limit` and `allowed_mime_types`) directly in the bucket configuration:
  ```sql
  update storage.buckets
  set file_size_limit = 10485760, -- 10MB
      allowed_mime_types = '{image/*,application/pdf,text/plain}'
  where id = 'chat-files';
  ```

### 3. Hardcoded Display Text in UI Components
Several user-facing strings bypass `next-intl`:
* In `src/components/chat/MessageList.tsx`: `"Today"` and `"Yesterday"` are hardcoded in `getDateLabel()` despite translation keys existing.
* In `src/components/chat/MessageItem.tsx`: `"Text copied!"`, `"Edit"`, `"Delete"`, `"Image"` are hardcoded English literals.
* Standardize all visible strings across the app to use `t(...)`.

---

## 7. Recommended Implementation Plan

1. **Phase 1: Database & RPC Alignment (High Priority)**
   - Add missing columns (`attachment_name`, `attachment_type`, `attachment_size`, `media_group_id`, `phone`) to Supabase migrations.
   - Align RPC function names (`mark_messages_as_read`, `mark_messages_as_delivered`).
   - Add the `create_group_conversation` function and message DELETE policy.
   - Sync the storage bucket name (`chat-files`).

2. **Phase 2: Conversation Loading & Realtime Optimization**
   - Replace client-side message scanning in `useConversations` with an efficient PostgreSQL query/RPC.
   - Refactor `ChatSidebar` to render actual conversation threads (including groups) rather than the global user list.
   - Add conversation-scoped filtering to `useRealtimeConversations`.
   - Fix the `supabase` instance dependency in `useTypingIndicator`.

3. **Phase 3: Directory Cleanup & Alias Alignment**
   - Move root `./components/ui` and `./lib/utils.ts` into `src/`.
   - Update `tsconfig.json` and `components.json`.
   - Remove unused/dead files (`color.ts`, `chat.store.ts`, unused schemas, 0-byte files, `talkhub-project.zip`).

4. **Phase 4: Component Refactoring & Type Safety**
   - Decompose `MessageItem.tsx` and `MessageInput.tsx`.
   - Fix `contextMenu` type mismatch and `["users"]` query key mismatch.
   - Ensure complete i18n coverage across all message views.

