# TalkHub: Feature Implementation Specification & Roadmap

## Use this guide to implement the four new features: **Message Emoji Reactions**, **Quoted Reply**, **Message Forwarding (with Audit Trail)**, and **Giphy Stickers**.

## 1. Database Migrations (Supabase)

Create a new migration file: `supabase/migrations/20261125000100_chat_enhancements.sql`.

### A. Message Schema Extensions (Reply & Forwarding Columns)

```sql
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forward_count integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_original_msg ON public.messages(original_message_id);
```

### B. Message Emoji Reactions Table

```sql
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions(user_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow members to view reactions" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND public.is_member(m.conversation_id)
    )
  );
CREATE POLICY "Allow users to add their own reaction" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to remove their own reaction" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

### C. Message Forwarding Audit Table

```sql
CREATE TABLE public.message_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  new_message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  forwarded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  to_conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_forwards_original ON public.message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_user ON public.message_forwards(forwarded_by);
ALTER TABLE public.message_forwards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to view forward records" ON public.message_forwards
  FOR SELECT TO authenticated
  USING (auth.uid() = forwarded_by OR public.is_member(to_conversation_id));
CREATE POLICY "Allow users to record forwards" ON public.message_forwards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = forwarded_by);
```

---

## 2. Package Dependencies

Run in the project root:

```bash
npm install @giphy/js-fetch-api @giphy/react-components
```

Environment variable required in `.env.local`:

```env
NEXT_PUBLIC_GIPHY_API_KEY="your-giphy-sdk-key"
```

---

## 3. Implementation Parts by Feature

---

### Feature 1: Message Emoji Reactions

#### Affected Files:

- `src/types/chat.ts` — Update reaction typing structure (`emoji`, `user_ids: string[]`, `count: number`).
- `src/hooks/useReactions.ts` _(New)_ — React Query mutations to toggle emoji reactions (`POST` if not reacted, `DELETE` if already reacted).
- `src/components/chat/message/ReactionPicker.tsx` _(New)_ — Quick hover floating bar with top 6 emojis (`👍`, `❤️`, `😂`, `😮`, `😢`, `🔥`) and `+` button.
- `src/components/chat/message/MessageItem.tsx` — Mount hover bar and wire click handlers to the existing reaction pills section (L263–270).
- `src/hooks/useRealtimeMessages.ts` — Subscribe to `postgres_changes` on `message_reactions` to update reactions live without page refresh.

---

### Feature 2: Quoted Reply ("Reply to Message")

#### Affected Files:

- `src/types/chat.ts` — Add `reply_to?: { id: string; sender_name: string; content: string; message_type: string }` to `ChatMessage`.
- `src/components/chat/message/MessageContextMenu.tsx` — Add `"Reply"` option to the menu.
- `src/components/chat/ChatWindow.tsx` — Add `replyingToMessage: ChatMessage | null` state.
- `src/components/chat/message-input/ReplyPreviewBar.tsx` _(New)_ — Render a banner above the text input showing the sender's name, message preview, and an `X` cancel button.
- `src/components/chat/MessageInput.tsx` — Pass `reply_to_id` when submitting the message.
- `src/components/chat/message/MessageItem.tsx` — Render the quote card inside the message bubble; clicking it scrolls smoothly (`element.scrollIntoView({ behavior: 'smooth' })`) to the referenced message ID and applies a temporary highlight animation.

---

### Feature 3: Forward Message (with Audit Tracking)

#### Affected Files:

- `src/components/chat/message/MessageContextMenu.tsx` — Add `"Forward"` menu item.
- `src/components/modal/ForwardMessageModal.tsx` _(New)_:
  - Modal displaying a search input and list of active conversations (direct chats and groups).
  - Checkbox/radio selection to choose one or more destination conversations.
  - Preview of the message/attachment being forwarded.
- `src/hooks/useForwardMessage.ts` _(New)_:
  - Mutation that creates the new message copies in destination conversation(s) with `is_forwarded: true`, `original_sender_id`, and `original_message_id`.
  - Inserts the audit rows into `public.message_forwards`.
  - Increments `forward_count` on the original message.
- `src/components/chat/message/MessageItem.tsx` — Display a subtle `↗ Forwarded` (or _"Forwarded from [Name]"_) label above the message text.

---

### Feature 4: Giphy Stickers & GIFs

#### Affected Files:

- `src/lib/giphy.ts` _(New)_ — Initialize `GiphyFetch` instance with `NEXT_PUBLIC_GIPHY_API_KEY`.
- `src/components/chat/message-input/GiphyStickerPicker.tsx` _(New)_:
  - Uses `@giphy/react-components` (`Grid` or `Carousel`) with search bar and categories (Stickers / GIFs).
  - Sets `fetchGifs` to query the Giphy Stickers endpoint (`gf.animate('stickers', ...)`).
- `src/components/chat/message-input/EmojiPickerPopover.tsx`:
  - Add a tab switcher at the top: **[ 😊 Emojis | 🎭 Stickers ]**.
  - Renders `EmojiPicker` when on the emoji tab, and `GiphyStickerPicker` when on the stickers tab.
- `src/components/chat/MessageInput.tsx` — Add handler for when a user clicks a sticker: immediately sends a message with `message_type: 'sticker'` and `content: stickerUrl`.
- `src/components/chat/message/MessageItem.tsx` — Add renderer for `message_type === 'sticker'`: renders the animated image transparently (without chat bubble background or border).

---

## 4. Suggested Execution Order

1. **Step 1: Run SQL Migration** — Apply the SQL tables and alter statements in the Supabase Dashboard SQL Editor or via CLI.
2. **Step 2: TypeScript Types** — Update `src/types/chat.ts` to include `reply_to`, `reactions`, `is_forwarded`, and `'sticker'` message type.
3. **Step 3: Emoji Reactions** — Build `useReactions.ts` hook and `ReactionPicker.tsx`, then wire into `MessageItem.tsx`.
4. **Step 4: Quoted Reply** — Build `ReplyPreviewBar.tsx`, hook it into `ChatWindow.tsx` and `MessageInput.tsx`, then add the quote block in `MessageItem.tsx`.
5. **Step 5: Forwarding Modal** — Build `ForwardMessageModal.tsx` and `useForwardMessage.ts`, and display the forward label in `MessageItem.tsx`.
6. **Step 6: Giphy Stickers** — Install `@giphy/react-components`, build `GiphyStickerPicker.tsx`, embed it in the emoji popover, and handle sticker rendering.
